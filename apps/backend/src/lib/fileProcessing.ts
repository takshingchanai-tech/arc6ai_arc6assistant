import { uploadFileToOpenAI } from './openai.js'

export type ProcessedFile =
  | { strategy: 'openai_file'; openaiFileId: string }
  | { strategy: 'csv_text'; extractedText: string }
  | { strategy: 'inline_image'; base64DataUrl: string }

/**
 * Processes an uploaded file into a form that can be sent to OpenAI.
 *
 * - PDF/DOCX: uploaded to OpenAI Files API, returns file_id
 * - XLSX: parsed with SheetJS, returns CSV text
 * - Images: converted to base64 data URL for inline vision
 */
export async function processFile(
  fileBytes: Uint8Array,
  fileName: string,
  mimeType: string,
  openaiApiKey: string
): Promise<ProcessedFile> {
  if (mimeType === 'application/pdf' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const openaiFileId = await uploadFileToOpenAI(openaiApiKey, fileBytes, fileName, mimeType)
    return { strategy: 'openai_file', openaiFileId }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel') {
    const csvText = await parseExcelToCSV(fileBytes)
    return { strategy: 'csv_text', extractedText: csvText }
  }

  if (mimeType.startsWith('image/')) {
    const base64 = arrayBufferToBase64(fileBytes.buffer as ArrayBuffer)
    const dataUrl = `data:${mimeType};base64,${base64}`
    return { strategy: 'inline_image', base64DataUrl: dataUrl }
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

/**
 * Converts an uploaded file into an OpenAI message content part
 * that can be included in a chat message.
 */
export function fileToMessageContent(processed: ProcessedFile): object {
  if (processed.strategy === 'openai_file') {
    return { type: 'file', file: { file_id: processed.openaiFileId } }
  }
  if (processed.strategy === 'inline_image') {
    return { type: 'image_url', image_url: { url: processed.base64DataUrl } }
  }
  // csv_text — returned as plain text to be appended to the user message
  return { type: 'text', text: `[File contents as CSV]\n${processed.extractedText}` }
}

async function parseExcelToCSV(fileBytes: Uint8Array): Promise<string> {
  // Dynamic import to avoid issues if xlsx is not available
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(fileBytes, { type: 'buffer' })
  const lines: string[] = []

  for (const sheetName of workbook.SheetNames) {
    lines.push(`Sheet: ${sheetName}`)
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    lines.push(csv)
    lines.push('')
  }

  return lines.join('\n')
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
