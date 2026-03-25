import { useState, useCallback, useRef } from 'react'
import { ApiClient, streamChat } from '@arc6assistant/shared'
import type { AttachmentRef } from '@arc6assistant/shared'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: AttachmentRef[]
  isStreaming?: boolean
}

export function useChat(apiUrl: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<ApiClient | null>(null)

  const getClient = useCallback(async (): Promise<ApiClient> => {
    if (!clientRef.current) {
      const client = new ApiClient(apiUrl)
      const session = await client.createSession()
      clientRef.current = client
      console.log('Session created:', session.sessionId)
    }
    return clientRef.current
  }, [apiUrl])

  const sendMessage = useCallback(
    async (text: string, attachments: AttachmentRef[] = []) => {
      if (!text.trim() && attachments.length === 0) return
      setError(null)

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        attachments,
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ])

      try {
        const client = await getClient()
        const stream = await client.chat({
          messages: [{ role: 'user', content: text }],
          attachments,
        })

        let fullContent = ''
        for await (const chunk of streamChat(stream)) {
          fullContent += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
          )
        }

        // Mark streaming done
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        )
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Something went wrong'
        setError(errMsg)
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      } finally {
        setIsLoading(false)
      }
    },
    [getClient]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    clientRef.current = null
  }, [])

  return { messages, isLoading, error, sendMessage, clearMessages }
}
