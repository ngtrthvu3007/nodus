# Nodus

A tool for writing **linked technical docs**: markdown + mermaid, `[[wiki-links]]` with backlinks, a sitemap tree, share/publish by URL, and an MCP server for AI agents. Product direction: [docs/BRD.md](docs/BRD.md).

> **Status (2026-11):** migrating to a new stack per [ADR-001](docs/adr/ADR-001-tech-stack.md). The setup below describes the current code and will change after phase 0 of the ADR.

## Stack

| Layer | Current | Target (ADR-001) |
| --- | --- | --- |
| Backend | Go 1.26 + Fiber v3 | Go + Gin + swaggo |
| Database | Postgres 16, sqlc + pgx/v5 | unchanged |
| Migrations | Plain SQL, applied per file (`make migrate-apply`) | golang-migrate (`go run ./cmd/migrate`) |
| Auth | none | Session cookie + PAT, OAuth Google/GitHub/GitLab |
| Frontend | `web-nodus`: Nuxt 4 + Nuxt UI 4 + Tailwind 4 | `next-nodus`: Next.js + antd v6 + Tailwind v4 + TanStack Query |

## Structure

```text
nodus/
├── docs/          # BRD, SPEC, FRD, ADR (Vietnamese)
├── go-nodus/      # Backend API + MCP server (cmd/mcp)
│   ├── internal/  # one package per domain; internal/db is sqlc-generated
│   └── migrations/
├── web-nodus/     # Current frontend (Nuxt), to be replaced
└── next-nodus/    # New frontend (Next.js 16 + antd v6 + Tailwind v4, scaffolded)
```

Backend layers per domain: handler → service → repository (sqlc) → Postgres. See [docs/backend-map.md](docs/backend-map.md).

## Getting Started

Requires Go 1.26+, Docker, [Bun](https://bun.sh) (`web-nodus`), [pnpm](https://pnpm.io) (`next-nodus`). [Air](https://github.com/air-verse/air) is optional (hot reload).

### 1. Database

```bash
cd go-nodus
cp .env.example .env   # set POSTGRES_*, DATABASE_URL, PORT (default 8080), ALLOWED_ORIGIN=http://localhost:4000 (next-nodus)
docker compose up -d
make migrate-apply FILE=001_init_notes.up.sql
make migrate-apply FILE=002_init_folders.up.sql
make migrate-apply FILE=003_note_links.up.sql
```

`make migrate-apply` hardcodes user `nodus_admin_user` and database `nodus_local`; use the same values in `.env` or edit the `Makefile`.

### 2. Backend

```bash
air              # or: go run ./cmd
curl localhost:8080/health
```

After editing `internal/db/queries/*.sql` or migrations, regenerate with `make sqlc-generate`.

### 3. Frontend

```bash
cd web-nodus
cp .env.example .env   # NUXT_NODUS_API_BASE=http://localhost:8080
bun install
bun run dev            # http://localhost:3000 — calls the API through the Nuxt proxy, no CORS needed
```

New frontend (`next-nodus`, in progress):

```bash
cd next-nodus
pnpm install
pnpm dev               # http://localhost:4000 — calls the API directly, needs ALLOWED_ORIGIN
```

### 4. MCP server (optional)

The backend must be running.

```bash
cd go-nodus
go build -o bin/nodus-mcp ./cmd/mcp
claude mcp add nodus -e NODUS_API_BASE=http://localhost:8080 -- "$(pwd)/bin/nodus-mcp"
```

## Docs

- [docs/BRD.md](docs/BRD.md): product direction
- [docs/SPEC-v5.md](docs/SPEC-v5.md): current scope and FRD list
- [docs/adr/](docs/adr/): architecture decisions
- [docs/frd/](docs/frd/): feature specs
- [CLAUDE.md](CLAUDE.md): rules for AI coding agents
