# arc6assistant — Claude Instructions

## Project Overview
arc6assistant is an AI assistant product by Arc6AI. It consists of:
- **Desktop app** (`apps/desktop`): Electron + React + Tailwind — system tray icon on Mac/Windows/Linux
- **Mobile app** (`apps/mobile`): React Native + Expo SDK 52 — iOS and Android
- **Backend** (`apps/backend`): Cloudflare Workers API
- **Shared library** (`packages/shared`): TypeScript types + ApiClient used by all apps

## Tech Stack
- Language: TypeScript throughout
- LLM: OpenAI API (`gpt-4o`) via Chat Completions with streaming
- File storage: Cloudflare R2
- Session storage: Cloudflare KV
- Web search: Brave Search API
- Desktop: Electron + electron-vite + React 18
- Mobile: Expo SDK 52 + Expo Router
- Monorepo: npm workspaces

## Dev Commands

```bash
# Install all dependencies (run from repo root)
npm install

# Backend (Cloudflare Workers) — runs at localhost:8787
npm run dev:backend

# Desktop (Electron) — opens the app in dev mode
npm run dev:desktop

# Mobile (Expo) — opens QR code for Expo Go
npm run dev:mobile

# Deploy backend to Cloudflare
npm run deploy:backend
```

## Backend Setup (one-time)
```bash
cd apps/backend

# Create KV namespace and update wrangler.toml with the ID
wrangler kv:namespace create SESSIONS

# Create R2 bucket
wrangler r2 bucket create arc6assistant-files

# Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put BRAVE_SEARCH_API_KEY
```

## Architecture & Key Patterns

### Streaming
The `/chat` endpoint uses the same SSE→plain-text streaming pattern as `arc6bot_basic`.
OpenAI returns SSE; the Worker strips it to plain UTF-8 chunks (`Content-Type: text/plain`).
Clients read with `response.body.getReader()` — no SSE parsing needed.

### File Processing
| Format | Strategy |
|--------|----------|
| PDF / DOCX | Upload to OpenAI Files API → store `file_id` → reference in chat |
| XLSX / XLS | SheetJS parse in Worker → CSV text appended to message |
| Images | Base64 inline `image_url` content part (vision) |

### Tool Calling
The `/chat` route uses OpenAI function calling with two tools:
- `web_search` — calls Brave Search API, returns top 5 results
- `generate_file` — creates DOCX/XLSX/PDF in R2, returns download URL

### Session Management
Sessions stored in Cloudflare KV:
- `session:{sessionId}` — metadata (title, messageCount, timestamps)
- `history:{sessionId}` — conversation history (max 40 messages, 7-day TTL)
- `file:{fileId}` — uploaded file metadata + openaiFileId or extractedText

### API Endpoints
```
POST /chat          → text/plain stream
POST /upload        → { fileId, fileName, fileType, extractedText? }
POST /search        → { results: [{ title, url, snippet }] }
POST /generate      → { fileId, downloadUrl, fileName, format }
GET  /download/:id  → binary file
POST /sessions      → { sessionId, createdAt, ... }
GET  /sessions/:id  → session info
DELETE /sessions/:id
```

## Directory Structure
```
arc6assistant/
├── apps/
│   ├── backend/        # Cloudflare Workers
│   │   └── src/
│   │       ├── index.ts          # Router
│   │       ├── routes/           # chat, upload, search, generate, sessions, download
│   │       └── lib/              # cors, kv, r2, openai, fileProcessing
│   ├── desktop/        # Electron app
│   │   └── src/
│   │       ├── main/             # index, tray, ipc, updater
│   │       ├── preload/          # contextBridge API
│   │       └── renderer/src/     # React UI components + hooks
│   └── mobile/         # React Native + Expo
│       ├── app/(tabs)/           # chat, files, settings screens
│       ├── components/           # ChatBubble, MessageInput
│       └── hooks/                # useChat, useSettings
└── packages/
    └── shared/         # Types + ApiClient + streamChat()
```

## Code Conventions
- Follow existing patterns in `arc6bot_basic` for any Worker changes
- All Worker endpoints must include CORS headers (use helpers from `lib/cors.ts`)
- Use `ctx.waitUntil()` for post-response work (saving history, cleanup)
- Desktop renderer communicates with main process only via `contextBridge` — never expose raw IPC
- No hardcoded API keys — always use Wrangler secrets

## After Adding Features
Per company policy: run tests and check logs until every new function works properly.

```bash
# Backend: test streaming
curl -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'

# TypeScript check
cd apps/backend && npx tsc --noEmit
cd apps/desktop && npx tsc --noEmit
```
