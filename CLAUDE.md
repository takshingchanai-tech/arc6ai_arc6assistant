# arc6assistant — Claude Instructions

## Project Overview
arc6assistant is an AI assistant product by Arc6AI. It consists of:
- **Desktop app** (`apps/desktop`): Electron + React + Tailwind — system tray icon on Mac/Windows/Linux
- **Mobile app** (`apps/mobile`): React Native + Expo SDK 52 — iOS and Android
- **Backend** (`apps/backend`): Cloudflare Workers API
- **Shared library** (`packages/shared`): TypeScript types + ApiClient used by all apps

## Live Deployment
- **Worker URL:** `https://arc6assistant.takshingchanai.workers.dev`
- **KV namespace:** `32b9d15a04c947f3a8e77676e730eca4` (binding: `SESSIONS`)
- **R2 bucket:** `arc6assistant-files` (binding: `FILES`)
- **Auto-deploy:** Cloudflare Git integration — pushes to `main` auto-deploy the Worker
- **Secrets set:** `OPENAI_API_KEY` (via Cloudflare Dashboard)

## Tech Stack
- Language: TypeScript throughout
- LLM: OpenAI API (`gpt-4o`) via Chat Completions with streaming
- File storage: Cloudflare R2 (`arc6assistant-files` bucket)
- Session storage: Cloudflare KV
- Web search: Brave Search API (set `BRAVE_SEARCH_API_KEY` secret when ready)
- Desktop: Electron + electron-vite + `@electron-toolkit/utils` + React 18 + Tailwind
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

# Deploy backend to Cloudflare manually
npm run deploy:backend
```

## Backend Setup (already done — for reference only)
```bash
cd apps/backend

# KV namespace — ID already set in wrangler.toml
wrangler kv:namespace create SESSIONS

# R2 bucket — already created
wrangler r2 bucket create arc6assistant-files

# Secrets — OPENAI_API_KEY already set via Cloudflare Dashboard
wrangler secret put OPENAI_API_KEY
wrangler secret put BRAVE_SEARCH_API_KEY  # set when Brave Search is needed
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

**Important:** File MIME type must be explicitly set when creating `File` objects in the desktop renderer. Use `getMimeType(fileName)` helper in `ChatWindow.tsx` — do not create `new File([buffer], name)` without the `{ type }` option or the backend will reject with "unsupported file type".

### Tool Calling
The `/chat` route uses OpenAI function calling with two tools:
- `web_search` — calls Brave Search API, returns top 5 results
- `generate_file` — creates DOCX/XLSX/PDF in R2, returns download URL

### Session Management
Sessions stored in Cloudflare KV:
- `session:{sessionId}` — metadata (title, messageCount, timestamps)
- `history:{sessionId}` — conversation history (max 40 messages, 7-day TTL)
- `file:{fileId}` — uploaded file metadata + openaiFileId or extractedText or r2Key (for images)

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

## Known Issues Fixed
- `@electron-toolkit/utils` must be in `dependencies` (not devDependencies) — required at runtime by main process
- File MIME type must be set explicitly in desktop renderer when creating File objects from IPC buffers
- `electron-vite` requires `vite@^5` — do not upgrade to vite 6
- `packages/shared/src/api/client.ts` — `res.json()` returns `Promise<unknown>`; cast with `as ApiError` not `const err: ApiError =`
- `apps/backend/src/routes/upload.ts` — CF Workers types `FormData.get()` as `string | null`; cast to `File | string | null` and use `typeof` guard instead of `instanceof`
- **Image vision was broken** — chat route only handled `openaiFileId` and `extractedText`; images (inline strategy) were silently dropped. Fix: store `r2Key` in `FileMeta`, fetch from R2 in chat route, inline as base64 `image_url` content part
- **Mobile file upload sent empty Blob** — `chat.tsx` built FormData with real `{ uri, name, type }` ref but then ignored it and passed `new Blob([])` to `client.upload()`. Fix: use direct `fetch` with the FormData
- **Mobile `sessionIdRef` never populated** — uploaded files had no session association. Fix: expose `getSessionId()` from `useChat`, pass result to upload FormData
- **Mobile wrong default API URL** — `useSettings.ts` had `https://arc6assistant.workers.dev` (missing subdomain). Fix: `https://arc6assistant.takshingchanai.workers.dev`

## Code Conventions
- Follow existing patterns in `arc6bot_basic` for any Worker changes
- All Worker endpoints must include CORS headers (use helpers from `lib/cors.ts`)
- Use `ctx.waitUntil()` for post-response work (saving history, cleanup)
- Desktop renderer communicates with main process only via `contextBridge` — never expose raw IPC
- No hardcoded API keys — always use Wrangler secrets

## After Adding Features
Per company policy: run tests and check logs until every new function works properly.

```bash
# Test live Worker endpoints
curl -X POST https://arc6assistant.takshingchanai.workers.dev/sessions \
  -H "Content-Type: application/json" -d '{}'

curl -X POST https://arc6assistant.takshingchanai.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'

# Watch live Worker logs
npx wrangler tail arc6assistant --format pretty

# TypeScript check
cd apps/backend && npx tsc --noEmit
cd apps/desktop && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```
