# Arc6 Assistant

An AI assistant desktop and mobile app by [Arc6AI](https://arc6ai.com). Available as a **system tray app** on Mac, Windows, and Linux, and as a mobile app on iOS and Android.

## Features

- **Chat with AI** — Conversational assistant powered by GPT-4o with streaming responses
- **File analysis** — Upload PDF, Word (.docx), Excel (.xlsx), and images for AI analysis
- **Web search** — Real-time internet search via Brave Search
- **Generate files** — Export AI responses as Word documents, Excel spreadsheets, or PDFs

## Project Structure

```
arc6assistant/
├── apps/
│   ├── backend/        # Cloudflare Workers API
│   ├── desktop/        # Electron desktop app (Mac / Windows / Linux)
│   └── mobile/         # React Native mobile app (iOS / Android)
└── packages/
    └── shared/         # Shared TypeScript types and API client
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron + React 18 + Tailwind CSS |
| Mobile | React Native + Expo SDK 52 |
| Backend | Cloudflare Workers + R2 + KV |
| AI | OpenAI GPT-4o (Chat Completions + Files API) |
| Search | Brave Search API |
| Language | TypeScript |
| Monorepo | npm workspaces |

## Getting Started

### Prerequisites
- Node.js 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- A Cloudflare account
- OpenAI API key
- Brave Search API key

### 1. Clone and install

```bash
git clone https://github.com/takshingchanai-tech/arc6ai_arc6assistant.git
cd arc6ai_arc6assistant
npm install
```

### 2. Set up the backend

```bash
cd apps/backend

# Create KV namespace for sessions
wrangler kv:namespace create SESSIONS
# → Copy the returned ID into wrangler.toml under [[kv_namespaces]]

# Create R2 bucket for file storage
wrangler r2 bucket create arc6assistant-files

# Set API key secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put BRAVE_SEARCH_API_KEY
```

### 3. Run locally

```bash
# Terminal 1 — Backend (localhost:8787)
npm run dev:backend

# Terminal 2 — Desktop app
npm run dev:desktop

# Terminal 3 — Mobile app (scan QR with Expo Go)
npm run dev:mobile
```

### 4. Deploy backend

```bash
npm run deploy:backend
# → Note your Worker URL: https://arc6assistant.<your-account>.workers.dev
```

Update the `VITE_API_URL` in `apps/desktop` or use the **Settings** screen in the mobile app to point to your deployed Worker URL.

## Building for Distribution

**Desktop:**
```bash
npm run build:desktop              # all platforms
npm -w apps/desktop run package:mac    # macOS DMG
npm -w apps/desktop run package:win    # Windows installer
npm -w apps/desktop run package:linux  # Linux AppImage
```

**Mobile:**
```bash
# Requires EAS CLI: npm install -g eas-cli
cd apps/mobile
eas build --platform ios
eas build --platform android
```

## API Reference

All endpoints are on the Cloudflare Worker:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Streaming chat (plain text chunks) |
| `POST` | `/upload` | Upload file for analysis |
| `POST` | `/search` | Web search via Brave |
| `POST` | `/generate` | Generate DOCX / XLSX / PDF |
| `GET` | `/download/:id` | Download a generated file |
| `POST` | `/sessions` | Create a new session |
| `GET` | `/sessions/:id` | Get session info |
| `DELETE` | `/sessions/:id` | Delete session |

## License

Proprietary — © 2025 Arc6AI. All rights reserved.
