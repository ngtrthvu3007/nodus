# go-nodus

Backend của Nodus: HTTP API (Gin + GORM + Postgres) và MCP server. Migration dùng [Atlas](https://atlasgo.io), chạy trong Docker.

Cần: Go, Docker, `make`.

## Structure

```text
go-nodus/
├── cmd/
│   ├── api/main.go        # bootstrap
│   └── mcp/               # MCP server (stdio), gọi HTTP API
├── internal/
│   ├── app/
│   │   ├── app.go         # mở DB, dựng router + http.Server, graceful shutdown
│   │   └── modules.go     # wiring dependency
│   ├── api/
│   │   ├── server.go      # NewRouter, Module, CORS, response, error, bind
│   │   ├── notes.go       # NoteHandler — /notes
│   │   ├── folders.go     # FolderHandler — /folders
│   │   └── links.go       # LinkHandler — wiki-link, backlink, autocomplete
│   ├── config/config.go   # env
│   └── db/models.go       # GORM models — nguồn schema
├── migrations/            # SQL do Atlas sinh + atlas.sum
├── atlas.hcl
└── docker-compose.yml
```

Routes: [docs/backend-map.md](../docs/backend-map.md) · Rules: [docs/frd/](../docs/frd/) · Decisions: [ADR-001](../docs/adr/ADR-001-tech-stack.md)

## Architecture

- `main.go` chỉ bootstrap: `app.New(cfg).Run(ctx)`.
- `internal/app` wiring mọi dependency bằng constructor (không DI framework).
- `internal/api`: mỗi domain một handler struct, implement `api.Module`.
- Handler: bind → check rules → GORM → response. Ghi nhiều bước dùng `db.Transaction`.
- Response: `{ "success": true, "data": … }` / `{ "success": false, "error": { "code", "message" } }`.

## Getting started

```bash
# Windows: dùng WSL2 mới chạy được make
cp .env.example .env
docker compose up -d     # Postgres :5432
make migrate-up
make dev                 # http://localhost:8080
curl localhost:8080/health
```

## Env

| Biến | Ghi chú |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Container Postgres |
| `DATABASE_URL` | API kết nối DB |
| `PORT` | Mặc định `8080` |
| `ALLOWED_ORIGIN` | Frontend gọi API (`http://localhost:4000`) |
| `GIN_MODE=release` | Production |

## Schema changes

```bash
# 1. Sửa internal/db/models.go

# 2. Sinh migration
make migrate-diff NAME=add_note_position

# 3. Review SQL, nếu sửa tay thì chạy:
make migrate-hash

# 4. Apply
make migrate-up

# Rollback (đã push): revert model rồi sinh migration mới
make migrate-diff NAME=revert_note_position

# Rollback (chỉ local): xem SQL trước rồi mới chạy
make migrate-down-plan N=1
make migrate-down N=1
```

## MCP server

```bash
# 1. Build (build lại khi sửa cmd/mcp hoặc models)
go build -o bin/nodus-mcp ./cmd/mcp

# 2. Thêm vào Claude Code (API phải đang chạy)
claude mcp add nodus -e NODUS_API_BASE=http://localhost:8080 -- "$(pwd)/bin/nodus-mcp"
```

## Commands

| Lệnh | Việc |
| --- | --- |
| `make dev` | API + hot reload (Air) |
| `make migrate-diff NAME=<name>` | Sinh migration từ models |
| `make migrate-up` | Apply migration |
| `make migrate-status` | Trạng thái migration |
| `make migrate-hash` | Cập nhật `atlas.sum` sau khi sửa tay |
| `make migrate-down-plan N=1` | Xem SQL rollback |
| `make migrate-down N=1` | Rollback (chỉ local) |
| `make migrate-clean` | Xóa container Atlas bị sót |
| `go vet ./...` | Static check |
