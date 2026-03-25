export interface Env {
  // KV namespace for sessions + conversation history
  SESSIONS: KVNamespace
  // R2 bucket for uploaded and generated files
  FILES: R2Bucket
  // Secrets (set via wrangler secret put)
  OPENAI_API_KEY: string
  BRAVE_SEARCH_API_KEY: string
  // Vars from wrangler.toml
  MAX_HISTORY_MESSAGES: string
  SESSION_TTL_SECONDS: string
}

export type WireMessage = { role: string; content: string | ContentPart[] }

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { file_id: string } }
