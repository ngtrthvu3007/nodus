# Backend map — `go-nodus`

Gin + GORM + Postgres, theo [[ADR-001-tech-stack]]. Cả HTTP API là **một package `internal/api`**, mỗi domain một file (một handler struct); **`internal/app`** dựng mọi dependency bằng constructor (DI viết tay, không framework) và chạy server. Quy tắc nghiệp vụ từng tính năng xem `docs/frd/`.

## Cấu trúc

```text
go-nodus/
├── cmd/
│   ├── api/main.go        # bootstrap: đọc config, app.New, chạy tới khi nhận SIGINT/SIGTERM
│   └── mcp/               # MCP server (stdio) — gọi HTTP API, không đụng DB
├── internal/
│   ├── app/
│   │   ├── app.go         # composition root: mở GORM, dựng router + http.Server, graceful shutdown
│   │   └── modules.go     # dựng từng module với dependency (DI bằng constructor)
│   ├── api/
│   │   ├── server.go      # NewRouter(origin, modules...), interface Module, CORS, response/lỗi, bind, escape LIKE
│   │   ├── notes.go       # NoteHandler — /notes: CRUD, move, quy tắc cây 2 cấp, validate title
│   │   ├── folders.go     # FolderHandler — /folders: CRUD, noteCount
│   │   └── links.go       # LinkHandler — /notes/:id/links, /notes/autocomplete, dựng lại wiki-link
│   ├── config/config.go   # biến môi trường
│   └── db/models.go       # model GORM — nguồn schema duy nhất
├── migrations/            # SQL do Atlas sinh + atlas.sum
├── atlas.hcl              # cấu hình Atlas (môi trường `local`)
└── docker-compose.yml     # postgres; atlas-migrate-runner, atlas-dev-db (chỉ chạy khi migrate)
```

## Khởi động

```mermaid
flowchart LR
    Main[cmd/api/main.go<br/>bắt SIGINT/SIGTERM] --> Cfg[config.Load]
    Cfg --> New[app.New]
    New --> DB[openDB<br/>GORM + Postgres]
    DB --> Mods["modules(db)<br/>NewNoteHandler, NewFolderHandler, NewLinkHandler"]
    Mods --> Router["api.NewRouter(origin, modules...)<br/>middleware + RegisterRoutes"]
    Router --> Run[app.Run<br/>http.Server]
    Run -- nhận tín hiệu --> Stop[Shutdown ≤ 10s<br/>rồi đóng DB]
```

- `main.go` chỉ bootstrap; mọi wiring nằm ở `internal/app`.
- Mỗi domain là một `api.Module` (có `RegisterRoutes`), nhận dependency qua constructor (`NewXHandler(db)`). Không có biến toàn cục giữ DB.
- Tắt êm: ngừng nhận kết nối mới, chờ request đang chạy xong (tối đa 10 giây), rồi đóng pool DB.

## Thêm domain mới

1. Tạo `internal/api/<domain>.go`: `type XHandler struct{ db *gorm.DB }`, `NewXHandler`, `RegisterRoutes`, các handler và quy tắc trong cùng file.
2. Thêm `api.NewXHandler(database)` vào `internal/app/modules.go`.
3. Có bảng mới → sửa `internal/db/models.go` và sinh migration (mục **Dữ liệu**).
4. Cập nhật bảng **Route** dưới đây và FRD liên quan.

## Luồng một request

```mermaid
flowchart LR
    Req[HTTP request] --> MW[Middleware<br/>Logger, Recovery, CORS]
    MW --> Bind[bindJSON / pathID<br/>normalizeTitle]
    Bind --> Tx{Ghi nhiều bước?}
    Tx -- có --> Trans["db.Transaction<br/>kiểm tra quy tắc (khóa dòng khi cần)<br/>→ ghi → rebuildLinks"]
    Tx -- không --> Query[Kiểm tra quy tắc → GORM]
    Trans --> Res[writeOK / writeError]
    Query --> Res
```

- Quy tắc dùng chung (`checkRootParent`, `checkFolderExists`, `rebuildLinks`…) nhận `*gorm.DB` làm tham số nên chạy được trong transaction.
- Tạo note, sửa note, move note chạy trong transaction. Move khóa note đang move (`FOR UPDATE`); tạo note con và move khóa note cha và folder đích (`FOR SHARE`) để request đồng thời không tạo ra cây 3 cấp.

- Response: `{ "success": true, "data": … }`; lỗi: `{ "success": false, "error": { "code", "message" } }`.
- Lỗi quy tắc là `apiError` (status + `code` ổn định, vd. `note_not_found`, `parent_not_root`); lỗi khác ghi log và trả 500 chung, không lộ chi tiết DB.
- id sai định dạng → 404 (như khi route còn ràng buộc `guid`).

## Route

| Method | Path | File | Ghi chú |
| --- | --- | --- | --- |
| GET | `/health` | `server.go` | |
| GET | `/notes?q=` | `notes.go` | Mới cập nhật trước; `q` lọc title/content (đã escape `%`, `_`) |
| POST | `/notes` | `notes.go` | Có `parentNoteId` → note con, `folder_id` lưu NULL; tạo note + dựng wiki-link **trong 1 transaction** |
| GET, PUT, DELETE | `/notes/:id` | `notes.go` | PUT cập nhật content + dựng lại wiki-link **trong 1 transaction**; DELETE soft delete cả note con |
| PATCH | `/notes/:id/move` | `notes.go` | Bắt buộc gửi đủ `folderId`, `parentNoteId` (cho phép null) — [[FRD-move]]. Kiểm tra + cập nhật trong 1 transaction: khóa note (`FOR UPDATE`), note cha và folder đích (`FOR SHARE`) |
| GET | `/notes/:id/links` | `links.go` | Backlinks (không tính self-link) + outgoing, mới nhất trước |
| GET | `/notes/autocomplete?q=` | `links.go` | Tối đa 10 title khớp tiền tố |
| GET, POST | `/folders` | `folders.go` | Sắp theo tên; kèm `noteCount` (note gốc trong folder) |
| GET, PATCH, DELETE | `/folders/:id` | `folders.go` | GET kèm danh sách note gốc; DELETE xóa cứng, FK cascade xóa note bên trong |

## Dữ liệu

- `Note.HasChildren`, `Folder.NoteCount` là trường **tính trong query** (`->;-:migration`), không phải cột.
- GORM tự lọc soft delete (`deleted_at`) với query qua model; `Raw` (trong `links.go`) tự thêm `deleted_at IS NULL`.
- Đổi schema: sửa `internal/db/models.go` → `make migrate-diff NAME=…` → review SQL → `make migrate-up`. Rollback local: `make migrate-down-plan` rồi `make migrate-down`; migration đã chia sẻ thì roll forward.
