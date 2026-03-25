import { useCallback, useRef } from 'react'

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return types[ext ?? ''] || 'application/octet-stream'
}
import { useChat } from '../hooks/useChat.js'
import { useFileUpload } from '../hooks/useFileUpload.js'
import MessageList from './MessageList.js'
import MessageInput from './MessageInput.js'
import FileDropZone from './FileDropZone.js'

interface Props {
  apiUrl: string
}

export default function ChatWindow({ apiUrl }: Props): JSX.Element {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat(apiUrl)
  const sessionIdRef = useRef<string | undefined>(undefined)

  const { uploads, isUploading, uploadError, uploadFile, removeUpload } = useFileUpload(
    apiUrl,
    () => sessionIdRef.current
  )

  const handleFileDrop = useCallback(
    async (file: File) => {
      // Ensure MIME type is set even for drag-dropped files
      const typed = file.type
        ? file
        : new File([file], file.name, { type: getMimeType(file.name) })
      await uploadFile(typed)
    },
    [uploadFile]
  )

  const handleFileSelect = useCallback(async () => {
    const result = await window.arc6.openFile()
    if (!result) return

    const file = new File([result.buffer], result.name, { type: getMimeType(result.name) })
    await uploadFile(file)
  }, [uploadFile])

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text, uploads)
      // Clear pending attachments after sending
      uploads.forEach((u) => removeUpload(u.fileId))
    },
    [sendMessage, uploads, removeUpload]
  )

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Title bar — draggable for window movement */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">Arc6 Assistant</span>
        </div>
        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={clearMessages}
            className="text-gray-400 hover:text-gray-600 text-xs px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
            title="New chat"
          >
            New
          </button>
          <button
            onClick={() => window.arc6.minimizeWindow()}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <rect y="5" width="12" height="1.5" rx="0.75" />
            </svg>
          </button>
          <button
            onClick={() => window.arc6.closeWindow()}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {(error || uploadError) && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs text-red-600 flex-shrink-0">
          {error || uploadError}
        </div>
      )}

      {/* Message area with drag-and-drop */}
      <FileDropZone onFileDrop={handleFileDrop}>
        <MessageList messages={messages} />
      </FileDropZone>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-100">
        <MessageInput
          onSend={handleSend}
          onFileSelect={handleFileSelect}
          pendingAttachments={uploads}
          onRemoveAttachment={removeUpload}
          isLoading={isLoading}
          isUploading={isUploading}
        />
      </div>
    </div>
  )
}
