import type { Env } from '../types.js'
import { CORS, errorResponse } from '../lib/cors.js'
import { getFileMeta } from '../lib/kv.js'

export async function handleDownload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const fileId = parts[1] // /download/:fileId

  if (!fileId) return errorResponse('Missing fileId', 400)

  // Look up file metadata to get the R2 key and original filename
  const meta = await getFileMeta(env, fileId)
  if (!meta) return errorResponse('File not found', 404)

  // Search R2 for the file (try both generated and uploaded paths)
  const possiblePrefixes = [
    `generated/${fileId}/`,
    `files/${fileId}/`,
  ]

  let object: R2ObjectBody | null = null

  for (const prefix of possiblePrefixes) {
    const listed = await env.FILES.list({ prefix })
    if (listed.objects.length > 0) {
      object = await env.FILES.get(listed.objects[0].key)
      if (object) break
    }
  }

  // Also try session-scoped paths
  if (!object) {
    const listed = await env.FILES.list({ prefix: `sessions/` })
    for (const obj of listed.objects) {
      if (obj.key.includes(`/${fileId}/`)) {
        object = await env.FILES.get(obj.key)
        if (object) break
      }
    }
  }

  if (!object) return errorResponse('File data not found in storage', 404)

  const contentDisposition = `attachment; filename="${encodeURIComponent(meta.fileName)}"`

  return new Response(object.body, {
    headers: {
      ...CORS,
      'Content-Type': meta.mimeType,
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
