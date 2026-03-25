export type FileType = 'pdf' | 'docx' | 'xlsx' | 'image'
export type OutputFormat = 'pdf' | 'docx' | 'xlsx'

export interface UploadedFile {
  fileId: string
  fileName: string
  fileType: FileType
  mimeType: string
  sizeBytes: number
  uploadedAt: number
  openaiFileId?: string  // ID in OpenAI Files API (for PDF/docx)
  extractedText?: string // For xlsx (CSV) or image description
}

export interface GeneratedFile {
  fileId: string
  fileName: string
  format: OutputFormat
  downloadUrl: string
  generatedAt: number
  sizeBytes?: number
}

export function mimeToFileType(mimeType: string): FileType | null {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx'
  if (mimeType === 'application/vnd.ms-excel') return 'xlsx'
  if (mimeType.startsWith('image/')) return 'image'
  return null
}
