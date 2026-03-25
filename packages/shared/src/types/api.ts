import type { WireMessage, AttachmentRef } from './messages.js'
import type { FileType, OutputFormat } from './files.js'

// ── Request types ────────────────────────────────────────────────

export interface ChatRequest {
  messages: WireMessage[]
  sessionId?: string
  attachments?: AttachmentRef[]
}

export interface SearchRequest {
  query: string
  sessionId?: string
}

export interface GenerateRequest {
  format: OutputFormat
  content: string
  filename?: string
  sessionId?: string
}

// ── Response types ───────────────────────────────────────────────

export interface UploadResponse {
  fileId: string
  fileName: string
  fileType: FileType
  extractedText?: string
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

export interface SearchResponse {
  results: SearchResult[]
}

export interface GenerateResponse {
  fileId: string
  downloadUrl: string
  fileName: string
  format: OutputFormat
}

export interface SessionInfo {
  sessionId: string
  createdAt: number
  updatedAt: number
  title?: string
  messageCount: number
}

export interface ApiError {
  error: string
  code?: string
}
