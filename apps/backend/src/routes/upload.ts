import type { Env } from '../types.js'
import { jsonResponse, errorResponse } from '../lib/cors.js'
import { uploadToR2 } from '../lib/r2.js'
import { processFile } from '../lib/fileProcessing.js'
import { saveFileMeta } from '../lib/kv.js'
import { mimeToFileType } from '@arc6assistant/shared'

export async function handleUpload(request: Request, env: Env): Promise<Response> {
  if (!env.OPENAI_API_KEY) {
    return errorResponse('OPENAI_API_KEY is not configured', 503)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Expected multipart/form-data', 400)
  }

  const file = formData.get('file') as File | string | null
  const sessionId = formData.get('sessionId') as string | null

  if (!file || typeof file === 'string') {
    return errorResponse('Missing file in form data', 400)
  }

  const mimeType = file.type || 'application/octet-stream'
  const fileType = mimeToFileType(mimeType)

  if (!fileType) {
    return errorResponse(
      `Unsupported file type: ${mimeType}. Supported: PDF, DOCX, XLSX, images`,
      415
    )
  }

  const fileId = crypto.randomUUID()
  const fileBytes = new Uint8Array(await file.arrayBuffer())

  // Store raw file in R2
  const r2Key = sessionId
    ? `sessions/${sessionId}/${fileId}/${file.name}`
    : `files/${fileId}/${file.name}`
  await uploadToR2(env, r2Key, fileBytes, mimeType)

  // Process file for LLM use
  let openaiFileId: string | undefined
  let extractedText: string | undefined

  try {
    const processed = await processFile(fileBytes, file.name, mimeType, env.OPENAI_API_KEY)
    if (processed.strategy === 'openai_file') {
      openaiFileId = processed.openaiFileId
    } else if (processed.strategy === 'csv_text') {
      extractedText = processed.extractedText
    }
    // inline_image: base64 is regenerated on demand, not stored in KV
  } catch (e) {
    return errorResponse(`File processing failed: ${String(e)}`, 500)
  }

  // Save metadata to KV
  await saveFileMeta(env, {
    fileId,
    fileName: file.name,
    fileType,
    mimeType,
    r2Key,
    openaiFileId,
    extractedText,
    uploadedAt: Date.now(),
  })

  return jsonResponse({
    fileId,
    fileName: file.name,
    fileType,
    extractedText: extractedText?.slice(0, 500), // preview only
  })
}
