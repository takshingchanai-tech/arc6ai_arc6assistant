import { useState, useRef, type KeyboardEvent } from 'react'
import type { AttachmentRef } from '@arc6assistant/shared'
import type { UploadedAttachment } from '../hooks/useFileUpload.js'

interface Props {
  onSend: (text: string, attachments: AttachmentRef[]) => void
  onFileSelect: () => void
  pendingAttachments: UploadedAttachment[]
  onRemoveAttachment: (fileId: string) => void
  isLoading: boolean
  isUploading: boolean
}

export default function MessageInput({
  onSend,
  onFileSelect,
  pendingAttachments,
  onRemoveAttachment,
  isLoading,
  isUploading,
}: Props): JSX.Element {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = (): void => {
    if ((!text.trim() && pendingAttachments.length === 0) || isLoading || isUploading) return
    onSend(text.trim(), pendingAttachments)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (): void => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const canSend = (text.trim() || pendingAttachments.length > 0) && !isLoading && !isUploading

  return (
    <div className="px-3 pb-3 pt-1">
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {pendingAttachments.map((att) => (
            <div
              key={att.fileId}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5"
            >
              <span>📎 {att.fileName}</span>
              <button
                onClick={() => onRemoveAttachment(att.fileId)}
                className="ml-0.5 text-blue-400 hover:text-blue-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2">
        <button
          onClick={onFileSelect}
          disabled={isUploading}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mb-0.5"
          title="Attach file"
        >
          {isUploading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          )}
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Message Arc6 Assistant..."
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none text-gray-800 placeholder-gray-400 min-h-[20px] max-h-[120px]"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex-shrink-0 rounded-full w-7 h-7 flex items-center justify-center transition-colors mb-0.5 ${
            canSend ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-300 text-gray-400'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
