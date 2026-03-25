import { useState, type DragEvent, type ReactNode } from 'react'

interface Props {
  onFileDrop: (file: File) => void
  children: ReactNode
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export default function FileDropZone({ onFileDrop, children }: Props): JSX.Element {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent): void => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx|xlsx|xls|jpg|jpeg|png|gif|webp)$/i)) {
      return
    }

    onFileDrop(file)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex flex-col min-h-0"
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center text-blue-600">
            <div className="text-4xl mb-1">📎</div>
            <p className="text-sm font-medium">Drop file to analyze</p>
          </div>
        </div>
      )}
    </div>
  )
}
