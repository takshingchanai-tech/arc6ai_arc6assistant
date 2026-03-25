import type { Env } from '../types.js'
import { jsonResponse, errorResponse } from '../lib/cors.js'

interface BraveWebResult {
  title: string
  url: string
  description: string
  age?: string
}

interface BraveSearchResponse {
  web?: { results: BraveWebResult[] }
}

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  if (!env.BRAVE_SEARCH_API_KEY) {
    return errorResponse('BRAVE_SEARCH_API_KEY is not configured', 503)
  }

  let body: { query?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const { query } = body
  if (!query?.trim()) {
    return errorResponse('Missing query', 400)
  }

  const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('count', '5')
  searchUrl.searchParams.set('safesearch', 'moderate')

  let data: BraveSearchResponse
  try {
    const res = await fetch(searchUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY,
      },
    })
    if (!res.ok) {
      const err = await res.text()
      return errorResponse(`Brave Search error: ${err}`, 502)
    }
    data = await res.json() as BraveSearchResponse
  } catch (e) {
    return errorResponse(`Search request failed: ${String(e)}`, 500)
  }

  const results = (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
    publishedDate: r.age,
  }))

  return jsonResponse({ results })
}
