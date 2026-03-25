import type { Env } from '../types.js'
import { jsonResponse, errorResponse } from '../lib/cors.js'
import { uploadToR2, getDownloadUrl } from '../lib/r2.js'
import { saveFileMeta } from '../lib/kv.js'

type OutputFormat = 'docx' | 'xlsx' | 'pdf'

export async function handleGenerate(request: Request, env: Env): Promise<Response> {
  let body: { format?: OutputFormat; content?: string; filename?: string; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const { format, content, filename = 'document', sessionId } = body

  if (!format || !['docx', 'xlsx', 'pdf'].includes(format)) {
    return errorResponse('format must be one of: docx, xlsx, pdf', 400)
  }
  if (!content?.trim()) {
    return errorResponse('Missing content', 400)
  }

  const fileId = crypto.randomUUID()
  const fileName = `${filename}.${format}`
  let fileBytes: Uint8Array
  let mimeType: string

  try {
    if (format === 'docx') {
      ({ bytes: fileBytes, mimeType } = await generateDocx(content))
    } else if (format === 'xlsx') {
      ({ bytes: fileBytes, mimeType } = await generateXlsx(content))
    } else {
      ({ bytes: fileBytes, mimeType } = await generatePdf(content))
    }
  } catch (e) {
    return errorResponse(`File generation failed: ${String(e)}`, 500)
  }

  // Store in R2
  const r2Key = sessionId
    ? `sessions/${sessionId}/generated/${fileId}/${fileName}`
    : `generated/${fileId}/${fileName}`
  await uploadToR2(env, r2Key, fileBytes, mimeType)

  // Save metadata
  await saveFileMeta(env, {
    fileId,
    fileName,
    fileType: format === 'xlsx' ? 'xlsx' : format === 'docx' ? 'docx' : 'pdf',
    mimeType,
    uploadedAt: Date.now(),
  })

  const baseUrl = new URL(request.url).origin
  const downloadUrl = getDownloadUrl(baseUrl, fileId)

  return jsonResponse({ fileId, downloadUrl, fileName, format })
}

async function generateDocx(content: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx')

  const lines = content.split('\n')
  const children = lines.map((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      return new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 })
    }
    if (trimmed.startsWith('## ')) {
      return new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 })
    }
    if (trimmed.startsWith('### ')) {
      return new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 })
    }
    return new Paragraph({
      children: [new TextRun(trimmed || '')],
    })
  })

  const doc = new Document({
    sections: [{ children }],
  })

  const buffer = await Packer.toBuffer(doc)
  return {
    bytes: new Uint8Array(buffer),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
}

async function generateXlsx(content: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const XLSX = await import('xlsx')

  // Parse content as CSV or structured text
  const rows = content
    .split('\n')
    .filter((l) => l.trim())
    .map((line) =>
      line.split('\t').length > 1
        ? line.split('\t')
        : line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    )

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return {
    bytes: new Uint8Array(buffer),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}

async function generatePdf(content: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  // Minimal PDF generation using raw PDF syntax (no dependencies)
  // For production, consider using jsPDF or a Worker-compatible library
  const lines = content.split('\n').filter((l) => l.trim())

  const pageWidth = 595  // A4 in points
  const margin = 50
  const lineHeight = 18
  const maxWidth = pageWidth - margin * 2

  let yPos = 750
  const pdfLines: string[] = []

  for (const line of lines) {
    // Wrap long lines
    const words = line.split(' ')
    let currentLine = ''
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word
      if (test.length * 6 > maxWidth && currentLine) {
        pdfLines.push(`BT /F1 12 Tf ${margin} ${yPos} Td (${escapePdfText(currentLine)}) Tj ET`)
        yPos -= lineHeight
        currentLine = word
      } else {
        currentLine = test
      }
    }
    if (currentLine) {
      pdfLines.push(`BT /F1 12 Tf ${margin} ${yPos} Td (${escapePdfText(currentLine)}) Tj ET`)
      yPos -= lineHeight
    }
    if (!line.trim()) yPos -= lineHeight / 2  // extra space for blank lines
  }

  const streamContent = pdfLines.join('\n')
  const pdf = [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pageWidth} 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj`,
    `4 0 obj<</Length ${streamContent.length}>>stream\n${streamContent}\nendstream endobj`,
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000266 00000 n ',
    `${(266 + streamContent.length + 20).toString().padStart(10, '0')} 00000 n `,
    'trailer<</Size 6/Root 1 0 R>>',
    'startxref',
    '0',
    '%%EOF',
  ].join('\n')

  const encoder = new TextEncoder()
  return { bytes: encoder.encode(pdf), mimeType: 'application/pdf' }
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
