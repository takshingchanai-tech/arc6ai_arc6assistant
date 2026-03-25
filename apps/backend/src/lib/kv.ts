import type { Env, WireMessage } from '../types.js'

export interface SessionMeta {
  sessionId: string
  createdAt: number
  updatedAt: number
  title?: string
  messageCount: number
}

// ── Session metadata ─────────────────────────────────────────────

export async function getSession(env: Env, sessionId: string): Promise<SessionMeta | null> {
  const raw = await env.SESSIONS.get(`session:${sessionId}`)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function saveSession(env: Env, session: SessionMeta): Promise<void> {
  const ttl = parseInt(env.SESSION_TTL_SECONDS || '604800')
  await env.SESSIONS.put(`session:${session.sessionId}`, JSON.stringify(session), {
    expirationTtl: ttl,
  })
}

export async function deleteSession(env: Env, sessionId: string): Promise<void> {
  await Promise.all([
    env.SESSIONS.delete(`session:${sessionId}`),
    env.SESSIONS.delete(`history:${sessionId}`),
    env.SESSIONS.delete(`files:${sessionId}`),
  ])
}

// ── Conversation history ─────────────────────────────────────────

export async function getHistory(env: Env, sessionId: string): Promise<WireMessage[]> {
  const raw = await env.SESSIONS.get(`history:${sessionId}`)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

export async function saveHistory(
  env: Env,
  sessionId: string,
  messages: WireMessage[]
): Promise<void> {
  const maxMessages = parseInt(env.MAX_HISTORY_MESSAGES || '40')
  const ttl = parseInt(env.SESSION_TTL_SECONDS || '604800')
  await env.SESSIONS.put(
    `history:${sessionId}`,
    JSON.stringify(messages.slice(-maxMessages)),
    { expirationTtl: ttl }
  )
}

// ── File metadata ────────────────────────────────────────────────

export interface FileMeta {
  fileId: string
  fileName: string
  fileType: string
  mimeType: string
  openaiFileId?: string
  extractedText?: string
  uploadedAt: number
}

export async function getFileMeta(env: Env, fileId: string): Promise<FileMeta | null> {
  const raw = await env.SESSIONS.get(`file:${fileId}`)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function saveFileMeta(env: Env, meta: FileMeta): Promise<void> {
  const ttl = parseInt(env.SESSION_TTL_SECONDS || '604800') * 4 // files live 4x longer
  await env.SESSIONS.put(`file:${meta.fileId}`, JSON.stringify(meta), {
    expirationTtl: ttl,
  })
}
