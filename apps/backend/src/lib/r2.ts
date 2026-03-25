import type { Env } from '../types.js'

export async function uploadToR2(
  env: Env,
  key: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<void> {
  await env.FILES.put(key, data, {
    httpMetadata: { contentType },
  })
}

export async function getFromR2(env: Env, key: string): Promise<R2ObjectBody | null> {
  return env.FILES.get(key)
}

export async function deleteFromR2(env: Env, key: string): Promise<void> {
  await env.FILES.delete(key)
}

/**
 * Returns a download URL path that the client can fetch.
 * Since R2 doesn't have public URLs by default, we proxy through our Worker.
 */
export function getDownloadUrl(baseUrl: string, fileId: string): string {
  return `${baseUrl}/download/${fileId}`
}
