import type { Env } from './types.js'
import { corsPreflightResponse, errorResponse } from './lib/cors.js'
import { handleChat } from './routes/chat.js'
import { handleUpload } from './routes/upload.js'
import { handleSearch } from './routes/search.js'
import { handleGenerate } from './routes/generate.js'
import { handleSessions } from './routes/sessions.js'
import { handleDownload } from './routes/download.js'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsPreflightResponse()
    }

    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/chat'      && request.method === 'POST')   return handleChat(request, env, ctx)
    if (path === '/upload'    && request.method === 'POST')   return handleUpload(request, env)
    if (path === '/search'    && request.method === 'POST')   return handleSearch(request, env)
    if (path === '/generate'  && request.method === 'POST')   return handleGenerate(request, env)
    if (path.startsWith('/download/') && request.method === 'GET') return handleDownload(request, env)
    if (path.startsWith('/sessions'))                         return handleSessions(request, env)

    return errorResponse('Not found', 404)
  },
}
