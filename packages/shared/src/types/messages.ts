export type Role = 'user' | 'assistant' | 'system'

export interface AttachmentRef {
  fileId: string
  fileName: string
  fileType: FileType
}

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  attachments?: AttachmentRef[]
}

export interface Conversation {
  sessionId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  title?: string
}

// Minimal wire format sent to/from backend (no id/timestamp needed in transit)
export type WireMessage = Pick<Message, 'role' | 'content'>

import type { FileType } from './files.js'
