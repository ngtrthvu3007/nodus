# go-nodus

Backend của Nodus: HTTP API (Gin + GORM + Postgres) và MCP server. Migration dùng [Atlas](https://atlasgo.io), chạy trong Docker.

Cần: Go, Docker, `make`.

## Structure

```text
go-nodus/
├── cmd/
│   ├── api/               # main.go, app.go (mở DB, router, graceful shutdown), modules.go (wiring)
│   └── mcp/               # MCP server (stdio), gọi HTTP API
├── internal/
│   ├── httpx/             # HTTP dùng chung: NewRouter, Module, CORS, response, lỗi, middleware
│   ├── modules/           # module nghiệp vụ, mỗi module một package (handler, service, types)
│   │   ├── tree/          # cây workspace + quy tắc dùng chung (rules)
│   │   ├── folder/
│   │   ├── doc/
│   │   └── link/          # wiki-link, backlink, autocomplete
│   ├── apidocs/           # Swagger sinh bởi `make swagger` (không sửa tay)
│   ├── config/config.go   # env
│   └── db/models.go       # GORM models — nguồn schema
├── migrations/            # SQL do Atlas sinh + atlas.sum
├── atlas.hcl
└── docker-compose.yml
```

Routes: [docs/backend-map.md](../docs/backend-map.md) · Rules: [docs/frd/](../docs/frd/) · Decisions: [ADR-001](../docs/adr/ADR-001-tech-stack.md)

## Architecture

- `cmd/api` wiring mọi dependency bằng constructor (không DI framework): `modules.go` ghép service vào handler.
- Mỗi domain là một package: `Handler` (implement `httpx.Module`) → `Service` → GORM. Chỉ `tree` có `Repository`; các module khác gọi GORM trong service.
- Handler: bind → gọi service → response. Service: check rules → GORM; ghi nhiều bước dùng `db.Transaction`.
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

## API docs (Swagger)

Bật cùng API: chạy `make dev` rồi mở **http://localhost:8080/swagger/index.html** (cổng theo `PORT`; URL cũng được log khi API khởi động). Bấm **Try it out** để gọi thử từng route. Workspace mặc định có id `00000000-0000-0000-0000-000000000001`.

Sau khi sửa route, request hoặc response type, sinh lại docs rồi commit `internal/apidocs/` (file sinh ra, không sửa tay):

```bash
make swagger
```

Mỗi handler cần annotation `@Summary`, `@Tags`, `@Param`, `@Success`, `@Failure`, `@Router` (xem `internal/modules/folder/handler.go`).

## Env

| Biến | Ghi chú |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Container Postgres |
| `POSTGRES_PORT` | Cổng host của container, mặc định `5432`. Đổi khi máy đã có Postgres chiếm 5432 (nhớ đổi cổng trong `DATABASE_URL`) |
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
