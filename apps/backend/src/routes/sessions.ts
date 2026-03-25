import type { Env } from '../types.js'
import { jsonResponse, errorResponse } from '../lib/cors.js'
import { getSession, saveSession, deleteSession } from '../lib/kv.js'

export async function handleSessions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const sessionId = parts[1] // /sessions/:sessionId

  if (request.method === 'POST' && !sessionId) {
    // Create new session
    const newSessionId = crypto.randomUUID()
    const session = {
      sessionId: newSessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    }
    await saveSession(env, session)
    return jsonResponse(session)
  }

  if (request.method === 'GET' && sessionId) {
    const session = await getSession(env, sessionId)
    if (!session) return errorResponse('Session not found', 404)
    return jsonResponse(session)
  }

  if (request.method === 'DELETE' && sessionId) {
    await deleteSession(env, sessionId)
    return new Response(null, { status: 204 })
  }

  return errorResponse('Not found', 404)
}
