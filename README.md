# do-test

Full-stack chat on **Cloudflare Workers** with:

- **Postgres + Drizzle** — durable source of truth (rooms, messages)
- **Durable Objects** — per-room WebSocket fanout (realtime)
- **Hono** — API + WS upgrade routing
- **React + Vite** — UI, served as Workers static assets

One process for local dev (`bun run dev` → Cloudflare Vite plugin / `workerd`).

## Architecture

```
Browser ──HTTP──► Worker (Hono) ──► Postgres (rooms, messages)
   │                    │
   └──WS──► Worker ─────┴──► ChatRoom DO ──broadcast──► other browsers
```

1. Create/list rooms & load history → **Postgres**
2. Send message → Worker **inserts Postgres**, then **`ChatRoom.broadcast`**
3. Live clients receive via **WebSocket** on that room’s DO

## Setup

```bash
# 1. env
cp .env.example .env

# 2. install
bun install

# 3. database
bun run db:up
bun run db:push

# 4. app (Workers runtime + React HMR)
bun run dev
```

Open the URL Vite prints (usually http://localhost:5173).  
API and WebSockets are same-origin (`/api/*`, `/ws/rooms/:id`).

## Scripts

| Script | What |
|--------|------|
| `bun run dev` | Full-stack local (Workers + UI) |
| `bun run build` | Production build |
| `bun run deploy` | Build + `wrangler deploy` |
| `bun run db:up` / `db:down` | Docker Postgres |
| `bun run db:push` | Push Drizzle schema |
| `bun run cf-typegen` | Generate Worker binding types |

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health |
| `GET` | `/api/rooms` | List rooms |
| `POST` | `/api/rooms` | Create room `{ "name": "general" }` |
| `GET` | `/api/rooms/:id/messages` | History (Postgres) |
| `POST` | `/api/rooms/:id/messages` | Send (Postgres + DO fanout) |
| `GET` | `/ws/rooms/:id` | WebSocket (live events) |

## Postgres from Workers

Locally, `wrangler.jsonc` uses Hyperdrive’s **`localConnectionString`** against Docker Postgres.

For production, create a Hyperdrive config pointing at your DB and set its id in `wrangler.jsonc` under `hyperdrive[0].id`.
