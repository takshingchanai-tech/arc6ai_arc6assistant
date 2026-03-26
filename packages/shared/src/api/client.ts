import type {
  ChatRequest,
  SearchRequest,
  SearchResponse,
  GenerateRequest,
  GenerateResponse,
  UploadResponse,
  SessionInfo,
  ApiError,
} from '../types/api.js'

export class ApiClient {
  private sessionId: string | undefined

  constructor(
    private baseUrl: string,
    sessionId?: string
  ) {
    this.sessionId = sessionId
  }

  getSessionId(): string | undefined {
    return this.sessionId
  }

  setSessionId(id: string): void {
    this.sessionId = id
  }

  /**
   * Returns a ReadableStream of plain text chunks.
   * Use streamChat() from streaming.ts to iterate.
   */
  async chat(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, sessionId: this.sessionId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as ApiError
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.body!
  }

  async upload(file: File | Blob, fileName: string): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file, fileName)
    if (this.sessionId) formData.append('sessionId', this.sessionId)

    const res = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as ApiError
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<UploadResponse>
  }

  async search(query: string): Promise<SearchResponse> {
    const request: SearchRequest = { query, sessionId: this.sessionId }
    const res = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as ApiError
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<SearchResponse>
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, sessionId: this.sessionId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as ApiError
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<GenerateResponse>
  }

  async createSession(): Promise<SessionInfo> {
    const res = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as ApiError
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const session = await res.json() as SessionInfo
    this.sessionId = session.sessionId
    return session
  }

  async getSession(sessionId: string): Promise<SessionInfo> {
    const res = await fetch(`${this.baseUrl}/sessions/${sessionId}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as ApiError
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<SessionInfo>
  }

  async deleteSession(sessionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/sessions/${sessionId}`, { method: 'DELETE' })
  }
}
