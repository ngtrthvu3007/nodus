# Nodus

A tool for writing **linked technical docs**: markdown + mermaid, `[[wiki-links]]` with backlinks, a sitemap tree, share/publish by URL, and an MCP server for AI agents. Product direction: [docs/BRD.md](docs/BRD.md).

> **Status (2026-11):** migrating to a new stack per [ADR-001](docs/adr/ADR-001-tech-stack.md): the backend moves from Fiber to Gin, and `next-nodus` (Next.js) replaces `web-nodus` (Nuxt).

## Stack

| Layer | Current | Target (ADR-001) |
| --- | --- | --- |
| Backend | Go 1.26 + Fiber v3 | Go + Gin + swaggo |
| Database | Postgres 16, sqlc + pgx/v5 | unchanged |
| Migrations | golang-migrate via `cmd/migrate` | unchanged |
| Auth | none | Session cookie + PAT, OAuth Google/GitHub/GitLab |
| Frontend | `web-nodus`: Nuxt 4 + Nuxt UI 4 + Tailwind 4 | `next-nodus`: Next.js 16 + antd v6 + Tailwind v4 + TanStack Query |

## Structure

```text
nodus/
├── docs/          # BRD, SPEC, FRD, ADR (Vietnamese)
├── go-nodus/      # Backend API, MCP server (cmd/mcp), migration tool (cmd/migrate)
│   ├── internal/  # one package per domain; internal/db is sqlc-generated
│   └── migrations/
├── next-nodus/    # New frontend (Next.js) — in progress
└── web-nodus/     # Current frontend (Nuxt) — maintenance only, to be removed
```

Backend layers per domain: handler → service → repository (sqlc) → Postgres. See [docs/backend-map.md](docs/backend-map.md).

## Install

| Tool | Version | Used for |
| --- | --- | --- |
| [Go](https://go.dev/dl/) | 1.26+ | Backend. An older Go downloads the right toolchain automatically (`GOTOOLCHAIN=auto`) |
| [Docker](https://docs.docker.com/get-docker/) | any recent | Postgres |
| `make` | any | Task shortcuts (built into macOS/Linux; on Windows use WSL) |
| [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/installation) | Node 20+, pnpm 11 | `next-nodus` (`corepack enable` picks the pnpm version from `package.json`) |
| [Bun](https://bun.sh) | any recent | `web-nodus` only |

Nothing else: sqlc, swag, Air and golang-migrate are pinned in `go-nodus/go.mod` and run through `go tool` / `go run`, downloaded on first use.

## Getting Started

### 1. Backend (`go-nodus`)

```bash
cd go-nodus
cp .env.example .env     # defaults work as-is with docker compose
docker compose up -d     # Postgres on localhost:5432
make migrate-up          # create the schema
make dev                 # API with hot reload on http://localhost:8080
```

Check it: `curl localhost:8080/health` → `{"status":"ok"}`.

If port 5432 is already taken by a local Postgres, change the published port in `docker-compose.yml` and the port in `DATABASE_URL`.

### 2. Frontend (`next-nodus`)

```bash
cd next-nodus
cp .env.example .env.local
pnpm install
pnpm dev                 # http://localhost:4000
```

The browser calls the API directly, so `ALLOWED_ORIGIN` in `go-nodus/.env` must be `http://localhost:4000` (the default).

### 3. Old frontend (`web-nodus`, optional)

```bash
cd web-nodus
cp .env.example .env     # NUXT_NODUS_API_BASE=http://localhost:8080
bun install
bun run dev              # http://localhost:3000 — goes through the Nuxt proxy, no CORS needed
```

### 4. MCP server (optional)

With the backend running:

```bash
cd go-nodus
go build -o bin/nodus-mcp ./cmd/mcp
claude mcp add nodus -e NODUS_API_BASE=http://localhost:8080 -- "$(pwd)/bin/nodus-mcp"
```

## Common commands

`go-nodus` (run inside `go-nodus/`):

| Command | Does |
| --- | --- |
| `make dev` | API with hot reload (Air) |
| `make sqlc` | Regenerate `internal/db` after changing `internal/db/queries/*.sql` or migrations |
| `make swag` | Regenerate Swagger docs from handler annotations |
| `make migrate-up` | Apply pending migrations |
| `make migrate-down N=1` | Roll back N migrations |
| `make migrate-create NAME=add_x` | Create the next `00N_add_x.up.sql` / `.down.sql` pair |
| `make migrate-version` | Show the current schema version |
| `make migrate-force V=3` | Set the version without running SQL — only for a database migrated by hand |

`next-nodus` (run inside `next-nodus/`):

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server on port 4000 |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |
| `pnpm tokens` | Regenerate `shared/theme/tokens.css` after changing `shared/theme/tokens.ts` |

## Docs

- [docs/BRD.md](docs/BRD.md): product direction
- [docs/SPEC-v5.md](docs/SPEC-v5.md): current scope and FRD list
- [docs/adr/](docs/adr/): architecture decisions
- [docs/frd/](docs/frd/): feature specs
- [CLAUDE.md](CLAUDE.md): rules for AI coding agents
