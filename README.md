# Arc6 Assistant

An AI assistant desktop and mobile app by [Arc6AI](https://arc6ai.com). Available as a **system tray app** on Mac, Windows, and Linux, and as a mobile app on iOS and Android.

## Features

- **Chat with AI** — Conversational assistant powered by GPT-4o with streaming responses
- **File analysis** — Upload PDF, Word (.docx), Excel (.xlsx), and images for AI analysis
- **Web search** — Real-time internet search via Brave Search
- **Generate files** — Export AI responses as Word documents, Excel spreadsheets, or PDFs

## Live Backend

| Resource | Details |
|----------|---------|
| Worker URL | `https://arc6assistant.takshingchanai.workers.dev` |
| KV (sessions) | `arc6assistant` / `SESSIONS` namespace |
| R2 (files) | `arc6assistant-files` bucket |
| Auto-deploy | Cloudflare Git integration on push to `main` |

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

### 1. Clone and install

```bash
git clone https://github.com/takshingchanai-tech/arc6ai_arc6assistant.git
cd arc6ai_arc6assistant
npm install
```

### 2. Run locally

```bash
# Terminal 1 — Backend (localhost:8787)
npm run dev:backend

# Terminal 2 — Desktop app
npm run dev:desktop

# Terminal 3 — Mobile app (scan QR with Expo Go)
npm run dev:mobile
```

### 3. Deploy backend

Push to `main` — Cloudflare Git integration auto-deploys the Worker.

Or deploy manually:
```bash
npm run deploy:backend
```

## Distribution Status

| App | Status | How |
|-----|--------|-----|
| Desktop | Not yet published | Needs GitHub Release via `electron-builder` + `GH_TOKEN` |
| iOS | Not yet published | Needs EAS Build + App Store submission |
| Android | Not yet published | Needs EAS Build + Google Play submission |

See [`electron-builder.yml`](apps/desktop/electron-builder.yml) — desktop targets GitHub Releases at `arc6ai/arc6assistant`. Auto-updater (`electron-updater`) is already integrated and will push updates to installed clients once releases exist.

## Building for Distribution

**Desktop:**
```bash
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

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Streaming chat (plain text chunks) |
| `POST` | `/upload` | Upload file for analysis (PDF, DOCX, XLSX, images) |
| `POST` | `/search` | Web search via Brave |
| `POST` | `/generate` | Generate DOCX / XLSX / PDF |
| `GET` | `/download/:id` | Download a generated file |
| `POST` | `/sessions` | Create a new session |
| `GET` | `/sessions/:id` | Get session info |
| `DELETE` | `/sessions/:id` | Delete session |

## License

Proprietary — © 2026 Arc6AI. All rights reserved.
