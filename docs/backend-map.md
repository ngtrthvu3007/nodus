# Backend map — `go-nodus`

Gin + GORM + Postgres, theo [[ADR-001-tech-stack]]. Mỗi domain là **một package** (`internal/modules/auth`, `internal/modules/workspace`, `internal/modules/folder`, `internal/modules/doc`, `internal/modules/link`, `internal/modules/tree`, `internal/modules/export`) gồm handler + service; `internal/httpx` chỉ giữ phần HTTP dùng chung; **`cmd/api`** dựng mọi dependency bằng constructor (DI viết tay, không framework) và chạy server. Quy tắc nghiệp vụ từng tính năng xem `docs/frd/`.

## Cấu trúc

```text
go-nodus/
├── cmd/
│   ├── api/
│   │   ├── main.go        # đọc config, newApp, chạy tới khi nhận SIGINT/SIGTERM
│   │   ├── app.go         # composition root: mở GORM, dựng router + http.Server, graceful shutdown
│   │   └── modules.go     # dựng service rồi handler của từng module (DI bằng constructor)
│   └── mcp/               # MCP server (stdio) — gọi HTTP API, không đụng DB
├── internal/
│   ├── httpx/             # HTTP dùng chung, không chứa domain
│   │   ├── server.go      # NewRouter(origin, modules...), interface Module, response envelope, httpx.Error, FindByID
│   │   └── middleware.go  # ParseWorkspaceID / ParseResourceID, ParseJSONBody, GetWorkspaceID / GetResourceID / GetBody
│   ├── modules/           # các module nghiệp vụ, mỗi module một package (handler + service + types)
│   │   ├── auth/          # đăng ký, đăng nhập, session, PAT; middleware Authenticate → Principal
│   │   │   ├── handler.go, service.go               # /auth/*, /me
│   │   │   ├── token_handler.go, token_service.go   # /tokens
│   │   │   ├── middleware.go  # Authenticate (Origin, cookie hoặc Bearer → Principal), RequireSession
│   │   │   ├── password.go    # quy tắc mật khẩu, argon2id (PHC string), common_passwords.txt nhúng bằng go:embed
│   │   │   └── secret.go      # sinh session token / PAT `nod_…`, băm SHA-256
│   │   ├── workspace/     # workspace, member, và CanAccess — hàm kiểm tra quyền duy nhất của mọi route tài liệu
│   │   │   ├── access.go          # CanAccess, CanAccessResource, Guard (RequireRead / RequireWrite cho route :workspaceId)
│   │   │   ├── handler.go, service.go               # /workspaces
│   │   │   └── member_service.go  # /workspaces/:id/members, chặn owner cuối cùng (409 last_owner)
│   │   ├── tree/          # cây workspace + quy tắc dùng chung cho folder và doc
│   │   │   ├── handler.go     # chỉ có route GET /workspaces/:id/tree
│   │   │   ├── service.go     # GetTree, LoadIndex, LockWorkspace, PlaceNew, CheckNameFree, MoveItem
│   │   │   ├── repository.go  # truy vấn GORM của tree (nhận tx của caller)
│   │   │   ├── logic.go       # phần thuần, không đụng DB: Index (cây nạp sẵn) và quy tắc độ sâu, tên duy nhất, vị trí
│   │   │   └── types.go       # Node, Item, MoveRequest, Moved
│   │   ├── folder/        # /folders (đổi tên, move, xóa gọi link.RelinkWorkspace)
│   │   ├── doc/           # /docs (tạo, sửa, move, xóa gọi link.RelinkWorkspace)
│   │   ├── link/          # wiki-link: backlink, autocomplete, headings, RelinkWorkspace
│   │   └── export/        # tải doc, nhiều doc, folder về file markdown (layout, đặt tên, ghi zip streaming)
│   ├── ratelimit/         # đếm số lần theo key trong cửa sổ thời gian, trong bộ nhớ (đăng nhập sai)
│   ├── apidocs/           # Swagger do `make swagger` sinh từ annotation (không sửa tay)
│   ├── config/config.go   # biến môi trường
│   └── db/
│       ├── models.go          # model GORM — nguồn schema chính
│       └── extra_schema.sql   # index/CHECK viết tay mà tag GORM không diễn đạt được (`make schema` nối vào schema cho Atlas)
├── migrations/            # SQL do Atlas sinh + atlas.sum
├── atlas.hcl              # cấu hình Atlas (môi trường `local`)
└── docker-compose.yml     # postgres; atlas-migrate-runner, atlas-dev-db (chỉ chạy khi migrate)
```

## Khởi động

```mermaid
flowchart LR
    Main[cmd/api/main.go<br/>bắt SIGINT/SIGTERM] --> Cfg[config.Load]
    Cfg --> New[newApp]
    New --> DB[openDB<br/>GORM + Postgres]
    DB --> Mods["modules(db, origin)<br/>auth: NewService(db, loginLimiters), NewHandler(service, origin)<br/>workspace: NewGuard(db); NewService(db, memberLimiter)<br/>tree.NewRepository → tree.NewService<br/>folder, doc, export: NewService(db, treeService); link: NewService(db)<br/>tree, folder, doc, link, export: NewHandler(service, guard)"]
    Mods --> Router["httpx.NewRouter(origin, authenticate, modules...)<br/>middleware + RegisterRoutes"]
    Router --> Run[app.run<br/>http.Server]
    Run -- nhận tín hiệu --> Stop[Shutdown ≤ 10s<br/>rồi đóng DB]
```

- `main.go` chỉ đọc config và chạy; wiring nằm ở `cmd/api/modules.go`.
- Mỗi domain có `Handler` implement `httpx.Module` (có `RegisterRoutes`), nhận `Service` qua constructor; `Service` nhận `*gorm.DB`. Không có biến toàn cục giữ DB. Chỉ `tree` có `Repository` (truy vấn tách khỏi quy tắc); `folder`, `doc`, `link` gọi GORM trực tiếp trong service.
- `folder` và `doc` nhận `*tree.Service` qua constructor (quy tắc cây dùng chung, truyền `tx` của mình vào); `folder` và `doc` import thêm `link` (`link.RelinkWorkspace` khi ghi cây hoặc nội dung). `tree` không import ngược lại; `link` chỉ import `tree` để dùng `GetDocParent`/`GetParentID`.
- Tắt êm: ngừng nhận kết nối mới, chờ request đang chạy xong (tối đa 10 giây), rồi đóng pool DB.

## Thêm domain mới

1. Tạo package `internal/modules/<domain>/`: `handler.go` (`Handler`, `NewHandler(service)`, `RegisterRoutes`, handler mỏng), `service.go` (`Service`, `NewService(db)`, quy tắc + GORM), `types.go`.
2. Thêm `<domain>.NewHandler(<domain>.NewService(database))` vào `cmd/api/modules.go`.
3. Có bảng mới → sửa `internal/db/models.go` và sinh migration (mục **Dữ liệu**).
4. Viết annotation swaggo trên từng handler rồi chạy `make swagger` (xem **API docs** dưới đây).
5. Cập nhật bảng **Route** dưới đây và FRD liên quan.

## Luồng một request

```mermaid
flowchart LR
    Req[HTTP request] --> MW[Middleware<br/>Logger, Recovery, CORS, handleErrors]
    MW --> Auth["auth.Authenticate<br/>Origin → route public? → cookie / Bearer → Principal"]
    Auth --> Parse[ParseWorkspaceID / ParseResourceID<br/>ParseJSONBody / ParseJSONBodyRequiringKeys]
    Parse --> H[Handler<br/>gọi service với ctx]
    H --> S[Service<br/>kiểm tra quy tắc → GORM]
    S --> Tx{Ghi nhiều bước?}
    Tx -- có --> Trans["db.Transaction<br/>khóa workspace → kiểm tra → ghi → RelinkWorkspace"]
    Tx -- không --> Query[GORM]
    Trans --> Res[httpx.WriteOK / c.Error]
    Query --> Res
```

- `auth.Authenticate` chạy trên mọi route, theo thứ tự: request ghi có `Origin` lạ → `403 forbidden` (cả route public); route public (`/health`, `/swagger/*`, `/auth/register`, `/auth/login`) đi qua; còn lại đọc cookie `nodus_session` hoặc `Authorization: Bearer nod_…`, không hợp lệ → `401 unauthenticated`; hợp lệ → lưu `Principal` (`auth.GetPrincipal`). Route chỉ nhận session gắn thêm `auth.RequireSession()` (PAT → `403 forbidden`). Cơ chế xem [[ADR-002-auth]].
- Quyền theo workspace đi qua một hàm `workspace.CanAccess(tx, principal, workspaceID, write)`: không phải member → `404`; `write` với token `docs:read` → `403 insufficient_scope` (sau membership, giữ thứ tự 401 → 404 → 403; auth middleware không kiểm tra scope). Route có `:workspaceId` gắn `guard.RequireRead()` / `guard.RequireWrite()` ngay sau `ParseWorkspaceID`; route theo id (`/docs/:id`, `/folders/:id`, `move`, `links`, `headings`, `export`) để service tải dòng rồi gọi `workspace.CanAccessResource(…, notFound)` — người ngoài nhận `doc_not_found` / `folder_not_found` như khi không có dòng đó. Route ghi tài liệu **phải** gọi với `write = true`. `workspace` import `auth`, không có chiều ngược lại; module `link` import nó với tên `workspaceaccess` vì đã có type `workspace`.
- Handler chỉ bind, gọi một method của service, trả response. Lỗi thì `_ = c.Error(err)` rồi return; middleware `handleErrors` trả response lỗi.
- Quy tắc cây (`tree.PlaceNew`, `tree.MoveItem`, `tree.CheckNameFree`…) và `link.RelinkWorkspace` nhận `*gorm.DB` làm tham số nên chạy trong transaction của `folder`/`doc`.
- Mọi ghi vào cây (tạo, đổi tên, move, xóa) chạy trong transaction và khóa dòng workspace (`FOR UPDATE`), nên các kiểm tra độ sâu và trùng tên không bị race. Cây nạp cả workspace mỗi lần ghi (xem chú thích `ponytail:` trong `tree/logic.go`).
- Response: `{ "success": true, "data": … }` (DELETE trả `204` không body); lỗi: `{ "success": false, "error": { "code", "message" } }`.
- Lỗi quy tắc là `httpx.Error` (status + `code` ổn định, vd. `folder_not_found`, `max_depth_exceeded`, `name_conflict`); lỗi khác ghi log và trả 500 chung, không lộ chi tiết DB.
- id sai định dạng → 404 (`folder_not_found`, `doc_not_found` hoặc `workspace_not_found` tùy route).

## Route

| Method | Path | Module | Ghi chú |
| --- | --- | --- | --- |
| GET | `/health` | `httpx` | |
| GET | `/swagger/index.html` | `cmd/api` | Giao diện Swagger; URL cũng được log khi API khởi động |
| POST | `/auth/register` | `auth` | Public. Tạo user + workspace `Personal` (owner) + session trong 1 transaction, set cookie `nodus_session` → `201 { id, email }`; trùng email → `409 email_taken` — [[FRD-account]] |
| POST | `/auth/login` | `auth` | Public. Sai email hoặc mật khẩu → `401 invalid_credentials`; quá giới hạn (5 lần / 15 phút theo email, 20 theo IP) → `429 rate_limited`; luôn cấp session mới |
| POST | `/auth/logout`, `/auth/logout-all` | `auth` | Session. Xóa session hiện tại / mọi session của user (PAT giữ nguyên) → `204` |
| GET | `/me` | `auth` | Session. `{ id, email, workspaces: [{ id, name, role }] }` — trùng dữ liệu với `GET /workspaces` (chấp nhận), FE phải invalidate cả hai khi workspace hoặc member đổi |
| GET, POST | `/tokens` | `auth` | Session. GET: danh sách PAT chưa thu hồi; POST `{ name, scope, password }` → `201`, token `nod_…` chỉ có trong response này; sai mật khẩu → `403 invalid_password` |
| DELETE | `/tokens/:id` | `auth` | Session. Thu hồi ngay → `204`; token của người khác hoặc đã thu hồi → `404 token_not_found` |
| GET | `/workspaces` | `workspace` | Session hoặc PAT. Các workspace user là member `[{ id, name, role }]`, cũ nhất trước — cùng truy vấn với `workspaces` của `GET /me` (`auth.ListWorkspaces`) |
| POST | `/workspaces` | `workspace` | Session. `{ name }` (trim, 1–100 ký tự, sai → `400 invalid_params`) → `201`, người tạo là `owner` |
| PATCH, DELETE | `/workspaces/:workspaceId` | `workspace` | Session, chỉ `owner` (member → `403 forbidden`, người ngoài → `404`). DELETE xóa luôn folder/doc/link/member (FK cascade) → `204` — [[FRD-account]] |
| GET, POST | `/workspaces/:workspaceId/members` | `workspace` | Session. GET: member xem được `[{ userId, email, role }]`. POST `{ email, role? }` chỉ `owner`, giới hạn 20 lần / 15 phút mỗi owner → `201`; email chưa có tài khoản → `404 user_not_found`; đã là member → `409 already_member` |
| PATCH, DELETE | `/workspaces/:workspaceId/members/:userId` | `workspace` | Session. PATCH `{ role }` chỉ `owner`; DELETE: `owner` xóa bất kỳ ai, member tự rời (`userId` của mình). Hạ hoặc xóa `owner` cuối cùng → `409 last_owner` (khóa dòng workspace để hai owner không hạ nhau cùng lúc) |
| GET | `/workspaces/:workspaceId/tree` | `tree` | Danh sách phẳng folder + doc, xếp theo `position` |
| POST | `/workspaces/:workspaceId/folders` | `folder` | Quy tắc: tên 1–200 ký tự không chứa `/ # \| [ ]`, độ sâu tối đa 4, không trùng tên cùng cha — [[FRD-folder]] |
| GET, PATCH, DELETE | `/folders/:id` | `folder` | GET kèm `children`; PATCH đổi `name`/`description`; DELETE xóa cứng, FK cascade |
| PATCH | `/folders/:id/move` | `folder` | Bắt buộc gửi đủ `parentId`, `afterId` (cho phép null) — [[FRD-move]] |
| POST | `/workspaces/:workspaceId/docs` | `doc` | Tạo doc + dựng wiki-link **trong 1 transaction** — [[FRD-doc]] |
| GET, PUT, DELETE | `/docs/:id` | `doc` | GET kèm `prev`/`next` theo thứ tự đọc và `version`; PUT sửa `content` kèm `version` (sai → `409 version_conflict`) và dựng lại wiki-link — [[FRD-autosave]]; DELETE soft delete cả doc con |
| PATCH | `/docs/:id/title` | `doc` | Đổi tên doc, không cần `version`, dựng lại wiki-link — [[FRD-doc]] |
| PATCH | `/docs/:id/move` | `doc` | Như move folder — [[FRD-move]] |
| GET | `/docs/:id/links` | `link` | `backlinks` (`id`, `title`, `path`; mỗi doc nguồn một dòng, không tính self-link) + `outgoing` (`ref`, `doc` hoặc `null` nếu broken), sắp theo chữ — [[FRD-wiki-link]] |
| GET | `/workspaces/:workspaceId/docs?q=&limit=&offset=` | `doc` | Tìm theo title/nội dung, phân trang, kèm `path` và `snippet` — [[FRD-search]] |
| GET | `/workspaces/:workspaceId/docs/autocomplete?q=` | `link` | Tối đa 10 doc có title chứa `q`, kèm `path` và `ref` ngắn nhất để chèn |
| GET | `/docs/:id/headings` | `link` | Heading ATX (`level`, `text`), bỏ heading trong code fence |
| GET | `/docs/:id/export` | `export` | File `.md` chỉ chứa chính doc (không kèm con); response là file, lỗi vẫn là JSON — [[FRD-export]] |
| POST | `/workspaces/:workspaceId/docs/export` | `export` | Body `{ "ids": [...] }` (1–200) → `.zip` phẳng; id không phải doc đang tồn tại trong workspace → `404 doc_not_found`, không trả file |
| GET | `/folders/:id/export` | `export` | `.zip` giữ cây (tiền tố số theo thứ tự sitemap, doc có con → thư mục chứa `00-Tên.md`) |

## API docs

- Mỗi handler có annotation swaggo (`@Summary`, `@Tags`, `@Param`, `@Success`, `@Failure`, `@Router`). `make swagger` sinh `internal/apidocs/` (file sinh ra, được commit, không sửa tay).
- Mở `/swagger/index.html` trên cổng của API (mặc định http://localhost:8080/swagger/index.html) để xem và gọi thử route. `uuid.UUID` được khai báo là `string` trong `.swaggo`.
- Sửa route, request hoặc response type thì chạy lại `make swagger`.

## Dữ liệu

- Tài khoản (migration `accounts`): `users` (email unique, app lưu đã trim + lowercase; `password_hash` argon2id, nullable cho OAuth), `sessions` và `personal_access_tokens` (chỉ lưu `token_hash` SHA-256, unique; FK cascade theo `users`), `workspace_members` (PK `workspace_id, user_id`, index `user_id`). CHECK `role IN ('owner','member')` và `scope IN ('docs:read','docs:write')` khai báo ở `extra_schema.sql`.
- FK `workspace_id` của `folders` và `docs` là `ON DELETE CASCADE` (migration `workspace_access`): xóa workspace xóa luôn bên trong. Cùng migration đó xóa workspace seed `Default` (`…0001`) cùng dữ liệu demo ([[ADR-002-auth]], mục Dữ liệu cũ).
- Bảng: `workspaces`, `folders`, `docs`, `doc_links`. Doc nằm ở gốc, trong folder (`folder_id`) hoặc trong doc khác (`parent_doc_id`), không bao giờ cả hai (CHECK `docs_one_parent`).
- `doc_links`: `source_doc_id`, `target_ref` (chữ trong `[[...]]`, bỏ `#heading`; `[[...]]` trong code span/code fence không tính), `target_doc_id` (NULL = broken link, FK `SET NULL`). Unique `(source_doc_id, lower(target_ref))` viết tay trong migration. Mỗi lần ghi cây hoặc nội dung, `link.RelinkWorkspace` xóa và dựng lại link của cả workspace trong cùng transaction (xem `ponytail:` trong `link/relink.go`).
- Tên folder và title doc không trùng (không phân biệt hoa thường) trong cùng một cha: unique index viết tay trong migration, khai báo thêm ở `internal/db/extra_schema.sql` để Atlas không đề nghị xóa.
- Tìm kiếm ([[FRD-search]]): extension `pg_trgm` và hai index GIN `gin_trgm_ops` (`docs.title`, `docs.content`, partial `deleted_at IS NULL`) viết tay trong migration `search_trgm_indexes` và khai báo ở `extra_schema.sql`. `CREATE EXTENSION` chỉ nằm trong migration (Atlas bản miễn phí không khai báo được extension trong schema); DB tạm của Atlas cài sẵn `pg_trgm` qua `go-nodus/atlas-dev-init.sql` (gắn trong `docker-compose.yml`) để Atlas hiểu `gin_trgm_ops` và không đề nghị xóa hai index này.
- GORM tự lọc soft delete (`deleted_at`) với mọi query qua model, kể cả `Preload`; không còn câu SQL thô nào phải tự thêm `deleted_at IS NULL`.
- Đổi schema: sửa `internal/db/models.go` → `make migrate-diff NAME=…` → review SQL → `make migrate-up`. Rollback local: `make migrate-down-plan` rồi `make migrate-down`; migration đã chia sẻ thì roll forward.
