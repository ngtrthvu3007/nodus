# Nodus

Personal knowledge base với wiki-link (`[[Title]]`), backlink tự động, và local graph — xem [SPEC-v3.md](SPEC-v3.md) cho spec mới nhất.

Repo gồm 2 service độc lập:

```
nodus/
├── go-nodus/    # Backend API (Go + Fiber + sqlc + Postgres)
└── web-nodus/   # Frontend (Nuxt 3 + Nuxt UI + Tailwind)
```

## Yêu cầu

- Go 1.26+
- Node.js + [Bun](https://bun.sh) (frontend dùng `bun.lock`)
- Docker (chạy Postgres qua `docker-compose`)
- [Air](https://github.com/air-verse/air) (hot-reload cho Go, tùy chọn nhưng khuyến nghị): `go install github.com/air-verse/air@latest`

## Chạy dự án lần đầu

### 1. Backend (`go-nodus/`)

```
cd go-nodus
cp .env.example .env    # điền POSTGRES_USER/PASSWORD/DB, DATABASE_URL, ALLOWED_ORIGIN
docker compose up -d    # khởi động Postgres
```

Áp toàn bộ migration theo thứ tự (chưa có lệnh tự động chạy hết, mỗi file cần gọi riêng):

```
make migrate-apply FILE=001_init_notes.up.sql
make migrate-apply FILE=002_init_folders.up.sql
make migrate-apply FILE=003_note_links.up.sql
```

Sinh code Go từ SQL query (chỉ cần chạy lại khi sửa file trong `internal/db/queries/`):

```
make sqlc-generate
```

Chạy server (hot-reload qua Air):

```
air
```

Hoặc chạy trực tiếp không hot-reload:

```
go run ./cmd
```

Mặc định lắng nghe ở `:8080` (đổi qua biến `PORT` trong `.env`).

### 2. Frontend (`web-nodus/`)

```
cd web-nodus
cp .env.example .env    # điền NUXT_NODUS_API_BASE (mặc định http://localhost:8080)
bun install
bun run dev
```

Mặc định chạy ở `http://localhost:3000`, gọi API qua Nitro proxy (`/api/*`) tới `NUXT_NODUS_API_BASE`.

## Lệnh thường dùng

**Backend** (`go-nodus/`):

| Lệnh | Việc |
| --- | --- |
| `air` | Chạy dev server, tự rebuild khi sửa `.go` |
| `go build -o bin/nodus ./cmd` | Build binary |
| `make sqlc-generate` | Sinh lại code Go từ `internal/db/queries/*.sql` |
| `make migrate-apply FILE=<tên file>` | Áp 1 migration cụ thể lên Postgres đang chạy |

**Frontend** (`web-nodus/`):

| Lệnh | Việc |
| --- | --- |
| `bun run dev` | Dev server |
| `bun run build` | Build production (SSR) |
| `bun run generate` | Static generate |
| `bun run preview` | Chạy thử bản đã build |

## MCP server (cho AI agent)

`go-nodus/cmd/mcp` là MCP server chạy qua stdio, gọi vào HTTP API của backend — backend phải đang chạy. Expose tool: search/get/create/update/append/move/delete note, list/get/create/rename/delete folder.

```
cd go-nodus
go build -o bin/nodus-mcp ./cmd/mcp
claude mcp add nodus -e NODUS_API_BASE=http://localhost:8080 -- "$(pwd)/bin/nodus-mcp"
```

Client khác (Claude Desktop, Cursor...) cấu hình tương tự: `command` = đường dẫn tuyệt đối tới `bin/nodus-mcp`, env `NODUS_API_BASE` (mặc định `http://localhost:8080`).

## Tài liệu thêm

- [SPEC-v1.md](SPEC-v1.md) → [SPEC-v4.md](SPEC-v4.md) — lịch sử spec qua từng giai đoạn.
- [docs/backend-map.md](docs/backend-map.md) — sơ đồ module backend.
- [docs/features/](docs/features/) — chi tiết flow từng tính năng (create note, move note, wiki-link/backlink...).
- [AGENTS.md](AGENTS.md) — quy tắc làm việc chung cho AI coding agent trong repo này.
