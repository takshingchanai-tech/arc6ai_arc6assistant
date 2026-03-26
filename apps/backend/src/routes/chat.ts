import type { Env, WireMessage } from '../types.js'
import { CORS, errorResponse } from '../lib/cors.js'
import { getHistory, saveHistory, getFileMeta, getSession, saveSession } from '../lib/kv.js'
import { streamChat, chat, type ToolCall } from '../lib/openai.js'
import { getFromR2 } from '../lib/r2.js'

const SYSTEM_PROMPT = `You are Arc6 Assistant, a powerful AI assistant by Arc6AI.
You help users analyze documents, search the web, and generate output files.
Be concise, helpful, and professional.
When a user uploads a file, analyze its contents thoroughly.
When you need current information, use the web_search tool.
When a user wants a document output, use the generate_file tool.`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the internet for current information, news, or any topic',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_file',
      description: 'Create a downloadable Word document, Excel spreadsheet, or PDF file for the user',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['docx', 'xlsx', 'pdf'], description: 'Output file format' },
          content: { type: 'string', description: 'The content to put in the file (markdown or plain text)' },
          filename: { type: 'string', description: 'Suggested filename without extension' },
        },
        required: ['format', 'content', 'filename'],
      },
    },
  },
]

export async function handleChat(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return errorResponse('OPENAI_API_KEY is not configured', 503)
  }

  let body: { messages?: WireMessage[]; sessionId?: string; attachments?: Array<{ fileId: string }> }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const { messages = [], sessionId, attachments = [] } = body

  // Build full message list: history + any file attachments + new user message
  const history: WireMessage[] = sessionId ? await getHistory(env, sessionId) : []
  const newUserMessage = messages[messages.length - 1]

  // If there are attachments, enrich the user message with file content parts
  let enrichedUserMessage: WireMessage = newUserMessage
  if (attachments.length > 0 && newUserMessage?.role === 'user') {
    const contentParts: object[] = [{ type: 'text', text: newUserMessage.content as string }]
    for (const att of attachments) {
      const fileMeta = await getFileMeta(env, att.fileId)
      if (!fileMeta) continue
      if (fileMeta.openaiFileId) {
        contentParts.push({ type: 'file', file: { file_id: fileMeta.openaiFileId } })
      } else if (fileMeta.extractedText) {
        contentParts.push({ type: 'text', text: `\n[File: ${fileMeta.fileName}]\n${fileMeta.extractedText}` })
      } else if (fileMeta.fileType === 'image' && fileMeta.r2Key) {
        const obj = await getFromR2(env, fileMeta.r2Key)
        if (obj) {
          const bytes = await obj.arrayBuffer()
          const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
          const dataUrl = `data:${fileMeta.mimeType};base64,${b64}`
          contentParts.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } })
        }
      }
    }
    enrichedUserMessage = { role: 'user', content: contentParts as never }
  }

  const allMessages: WireMessage[] = [
    ...history,
    enrichedUserMessage,
  ]

  // Check if we need to run a tool call loop (non-streaming first pass)
  const initialRes = await chat({
    apiKey: env.OPENAI_API_KEY,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...allMessages],
    tools: TOOLS,
  })

  let finalMessages = allMessages

  if (initialRes.finishReason === 'tool_calls' && initialRes.toolCalls?.length) {
    // Execute tools and build follow-up messages
    const toolMessages = await executeTools(initialRes.toolCalls, env, request)
    finalMessages = [
      ...allMessages,
      { role: 'assistant', content: initialRes.content ?? '' } as WireMessage,
      ...toolMessages,
    ]
  }

  // Now stream the final answer
  const openaiRes = await streamChat({
    apiKey: env.OPENAI_API_KEY,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...finalMessages],
  })

  if (!openaiRes.ok) {
    const err = await openaiRes.text()
    return errorResponse(`OpenAI error: ${err}`, 502)
  }

  // SSE → plain text stream (identical pattern to arc6bot_basic)
  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openaiRes.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const chunk = JSON.parse(data)
              const content = chunk.choices?.[0]?.delta?.content ?? ''
              if (content) {
                fullResponse += content
                controller.enqueue(encoder.encode(content))
              }
            } catch {}
          }
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  // Save history after stream completes
  if (sessionId) {
    ctx.waitUntil(
      (async () => {
        const updatedHistory: WireMessage[] = [
          ...allMessages,
          { role: 'assistant', content: fullResponse },
        ]
        await saveHistory(env, sessionId, updatedHistory)
        const session = await getSession(env, sessionId)
        if (session) {
          await saveSession(env, {
            ...session,
            updatedAt: Date.now(),
            messageCount: updatedHistory.length,
          })
        }
      })()
    )
  }

  return new Response(stream, {
    headers: {
      ...CORS,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

async function executeTools(
  toolCalls: ToolCall[],
  env: Env,
  request: Request
): Promise<WireMessage[]> {
  const results: WireMessage[] = []
  const baseUrl = new URL(request.url).origin

  for (const toolCall of toolCalls) {
    let toolResult = ''
    try {
      const args = JSON.parse(toolCall.function.arguments)

      if (toolCall.function.name === 'web_search') {
        const res = await fetch(`${baseUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: args.query }),
        })
        const data = await res.json() as { results: Array<{ title: string; url: string; snippet: string }> }
        toolResult = data.results
          .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
          .join('\n\n')
      } else if (toolCall.function.name === 'generate_file') {
        const res = await fetch(`${baseUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: args.format, content: args.content, filename: args.filename }),
        })
        const data = await res.json() as { downloadUrl: string; fileName: string }
        toolResult = `File generated: ${data.fileName}\nDownload URL: ${data.downloadUrl}`
      }
    } catch (e) {
      toolResult = `Error executing tool: ${String(e)}`
    }

    results.push({
      role: 'tool' as never,
      content: toolResult,
    } as WireMessage)
  }

  return results
}
