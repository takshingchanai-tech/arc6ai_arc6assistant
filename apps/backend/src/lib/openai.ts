import type { WireMessage } from '../types.js'

const OPENAI_BASE = 'https://api.openai.com/v1'

export interface StreamChatOptions {
  apiKey: string
  messages: WireMessage[]
  tools?: object[]
  model?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Calls OpenAI Chat Completions with stream: true.
 * Returns the raw OpenAI response (SSE stream).
 * Caller is responsible for parsing SSE lines into plain text.
 */
export async function streamChat(options: StreamChatOptions): Promise<Response> {
  const {
    apiKey,
    messages,
    tools,
    model = 'gpt-4o',
    maxTokens = 2048,
    temperature = 0.65,
  } = options

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  return fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
}

/**
 * Calls OpenAI Chat Completions without streaming (for tool results).
 */
export async function chat(options: Omit<StreamChatOptions, 'stream'>): Promise<{
  content: string | null
  toolCalls?: ToolCall[]
  finishReason: string
}> {
  const { apiKey, messages, tools, model = 'gpt-4o', maxTokens = 2048, temperature = 0.65 } = options

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    max_tokens: maxTokens,
    temperature,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json() as OpenAIResponse
  const choice = data.choices?.[0]
  return {
    content: choice?.message?.content ?? null,
    toolCalls: choice?.message?.tool_calls,
    finishReason: choice?.finish_reason ?? 'stop',
  }
}

/**
 * Uploads a file to OpenAI Files API.
 * Returns the file_id to reference in chat messages.
 */
export async function uploadFileToOpenAI(
  apiKey: string,
  fileBytes: Uint8Array,
  fileName: string,
  mimeType: string
): Promise<string> {
  const formData = new FormData()
  formData.append('file', new Blob([fileBytes], { type: mimeType }), fileName)
  formData.append('purpose', 'assistants')

  const res = await fetch(`${OPENAI_BASE}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI Files API error: ${err}`)
  }

  const data = await res.json() as { id: string }
  return data.id
}

// ── Internal types ───────────────────────────────────────────────

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }>
}
