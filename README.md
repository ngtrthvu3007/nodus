# Nodus

A tool for writing **linked technical docs**: markdown + mermaid, `[[wiki-links]]` with backlinks, a sitemap tree, share/publish by URL, and an MCP server for AI agents. Product direction: [docs/BRD.md](docs/BRD.md).

> **Status (2026-11):** migrating to the stack in [ADR-001](docs/adr/ADR-001-tech-stack.md). The backend is done (Gin + GORM + Atlas); `next-nodus` (Next.js) is being built to replace `web-nodus` (Nuxt).

## Stack

| Part | Stack |
| --- | --- |
| Backend (`go-nodus`) | Go, Gin, GORM, Postgres 16, Atlas migrations |
| Frontend (`next-nodus`) | Next.js 16, antd v6, Tailwind v4, TanStack Query |
| Old frontend (`web-nodus`) | Nuxt 4, Nuxt UI — maintenance only, to be removed |
| Auth (planned) | Session cookie + PAT, OAuth Google/GitHub/GitLab |

## Structure

```text
nodus/
├── docs/          # BRD, SPEC, FRD, ADR (Vietnamese)
├── go-nodus/      # Backend API + MCP server — see go-nodus/README.md
├── next-nodus/    # New frontend — see next-nodus/README.md
└── web-nodus/     # Old frontend
```

## Install

| Tool | Version | Used for |
| --- | --- | --- |
| [Go](https://go.dev/dl/) | 1.26+ | Backend (an older Go downloads the right toolchain automatically) |
| [Docker](https://docs.docker.com/get-docker/) | any recent | Postgres and migrations |
| `make` | any | Backend commands (built into macOS/Linux; on Windows use WSL) |
| [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/installation) | Node 20+, pnpm 11 | `next-nodus` (`corepack enable` picks the pnpm version) |
| [Bun](https://bun.sh) | any recent | `web-nodus` only |

## Getting Started

### 1. Start the backend

```bash
cd go-nodus
cp .env.example .env
docker compose up -d
make migrate-up
make dev                 # http://localhost:8080
```

How the backend works, schema changes and rollback: [go-nodus/README.md](go-nodus/README.md).

### 2. Start the frontend

```bash
cd next-nodus
cp .env.example .env.local
pnpm install
pnpm dev                 # http://localhost:4000
```

More: [next-nodus/README.md](next-nodus/README.md).

### Old frontend (optional)

```bash
cd web-nodus
cp .env.example .env
bun install
bun run dev              # http://localhost:3000
```

## Docs

- [docs/BRD.md](docs/BRD.md): product direction
- [docs/SPEC-v5.md](docs/SPEC-v5.md): current scope and FRD list
- [docs/adr/](docs/adr/): architecture decisions
- [docs/frd/](docs/frd/): feature specs
- [docs/backend-map.md](docs/backend-map.md): backend routes and data
- [CLAUDE.md](CLAUDE.md): rules for AI coding agents
