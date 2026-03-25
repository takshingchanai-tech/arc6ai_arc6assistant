import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../hooks/useChat.js'

interface Props {
  messages: ChatMessage[]
}

export default function MessageList({ messages }: Props): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <div className="text-3xl mb-2">✦</div>
          <p>How can I help you today?</p>
          <p className="text-xs mt-1 opacity-60">Upload files or ask anything</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 selectable">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}
          >
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {msg.attachments.map((att) => (
                  <span
                    key={att.fileId}
                    className="text-xs bg-white/20 rounded px-1.5 py-0.5"
                  >
                    📎 {att.fileName}
                  </span>
                ))}
              </div>
            )}
            {msg.content}
            {msg.isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
