# AssetGen Pixel Foundry (MVP)

A dual-stack MVP that lets makers benchmark large language models by generating pixel art sprites from prompts, publish the results to a shared gallery, and climb a lightweight leaderboard. The architecture is designed to grow into additional asset types (SVGs, music, shaders, etc.).

## Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS (folder: `web`)
- **Backend**: Go (1.23+) + Gin (folder: `server`)
- **AI**: OpenRouter (users supply their own API key directly in the browser)
- **Storage**: JSON file-based store (easily swappable for Postgres/S3 later)

## Getting Started

### Backend

```bash
cd server
export PORT=8080             # optional
export DATA_PATH=data/artworks.json  # optional, defaults to ./data/artworks.json
go run ./cmd/api
```

The API exposes:

- `GET /healthz`
- `GET /api/artworks`
- `POST /api/artworks`
- `GET /api/artworks/:id`
- `POST /api/artworks/:id/like`
- `GET /api/leaderboard?limit=5`

### Frontend

```bash
cd web
npm install             # already run once, repeat after pulling updates
npm run dev             # serves http://localhost:3000
```

Environment variables:

- `NEXT_PUBLIC_API_BASE` (default `http://localhost:8080`)
- `NEXT_PUBLIC_APP_ORIGIN` (default `http://localhost:3000`, used for OpenRouter referer header)

### One-command dev loop

Alternatively run the helper script from the repo root:

```bash
./scripts/dev.sh
```

It will:

- stop any previous dev processes that were launched by the script
- start the Go API (`backend.log`) and Next.js dev server (`frontend.log`) under `var/log/`
- set sane defaults for `DATA_PATH`, `NEXT_PUBLIC_API_BASE`, and `NEXT_PUBLIC_APP_ORIGIN`
- keep running until you press `Ctrl+C`, at which point both processes are terminated cleanly

### OpenRouter Usage Flow

1. Generate an API key at https://openrouter.ai/keys
2. Paste the key into the "配置 OpenRouter" field in the UI (stored in `localStorage`, never sent to the backend)
3. Enter a prompt, pick a model, then click **生成像素图**
4. Inspect the rendered grid + palette, tweak the title, and click **发布到社区** to persist via the Go API
5. Like sprites to influence the leaderboard (ties broken by recency)

## Extensibility Notes

- `server/internal/artwork` centralizes domain logic so new asset kinds can be added without touching handlers
- `server/internal/storage` currently writes to JSON; swap in another `Store` implementation (Postgres, S3, etc.) to scale
- `web/src/lib/openrouter.ts` encapsulates prompt/schema logic, making it easy to plug in SVG/music/shader blueprints later
- UI copy and layout already reference the broader asset-generation vision to signal upcoming modules

## Validation

- `go test ./...` (passes)
- `npm run typecheck` (passes)
- `npm run lint` currently requires Node >= 18.17; upgrade Node to run Next.js linting locally
