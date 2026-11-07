# FRD — MCP server

Nguồn: README mục "MCP server", [[SPEC-v5]]. Code: `go-nodus/cmd/mcp/` (`main.go`, `tools.go`, `client.go`).

## Mục tiêu

Cho AI agent bên ngoài (Claude Code, Claude Desktop, Cursor…) đọc và ghi tài liệu Nodus qua giao thức MCP.

## Hiện trạng (đã implement)

- Chạy qua **stdio**, JSON-RPC 2.0 tự viết (không dùng thư viện MCP) — sẽ chuyển sang MCP Go SDK ([[ADR-001-tech-stack]]). stdout chỉ dành cho protocol, log ra stderr.
- Method hỗ trợ: `initialize`, `ping`, `tools/list`, `tools/call`. Capability chỉ có `tools`.
- Không truy cập DB trực tiếp: mọi tool **gọi HTTP API của backend** → đi qua đúng middleware và quy tắc nghiệp vụ như UI. Backend phải đang chạy.
- Địa chỉ API lấy từ biến môi trường `NODUS_API_BASE`, mặc định `http://localhost:8080`. Timeout 15 giây.
- `initialize` trả `instructions` mô tả Nodus cho AI: note nằm trong folder hoặc root, có 1 cấp note con; link bằng `[[Exact Title]]` chỉ nối được tới note đã tồn tại nên phải tạo note đích trước; tool nhận ID, dùng `search_notes` để tìm ID.

## Tool

| Tool | Tham số | Việc |
| --- | --- | --- |
| `search_notes` | `query?` | Tìm theo title/content (substring, không phân biệt hoa thường), mới cập nhật lên trước, chỉ trả preview. `query` rỗng → trả **mọi** note |
| `get_note` | `id` | Nội dung đầy đủ + `outgoing` và `backlinks` |
| `create_note` | `title`, `content?`, `folderId?`, `parentNoteId?` | Tạo note; có `parentNoteId` thì kế thừa folder của cha |
| `update_note` | `id`, `title?`, `content?` | Thay title/content; `content` thay **toàn bộ** nội dung |
| `append_to_note` | `id`, `text` | Nối text vào cuối nội dung (cách 1 dòng trống) |
| `move_note` | `id`, `folderId?`, `parentNoteId?` | Di chuyển note theo [[FRD-move]]; bỏ trống cả 2 → lên top level |
| `delete_note` | `id` | Xóa note, link biến khỏi backlink của note khác |
| `list_folders` | — | Danh sách folder kèm số note |
| `get_folder` | `id` | Folder + các note gốc bên trong |
| `create_folder` | `name` | Tạo folder |
| `rename_folder` | `id`, `name` | Đổi tên folder |
| `delete_folder` | `id` | Xóa **vĩnh viễn** folder và mọi note bên trong |

## Hạn chế hiện tại

- Chỉ chạy **local** (stdio), phải build binary và cấu hình trong client.
- **Không có auth**: ai chạy binary và trỏ tới API là đọc/sửa/xóa được mọi dữ liệu (cùng hạn chế với API, xem [[FRD-account]]).
- `search_notes` với `query` rỗng trả toàn bộ note, không có `limit` hay lọc theo thời gian — kho lớn sẽ làm ngập ngữ cảnh của AI.
- Chưa có MCP prompts, resources.

## Yêu cầu khi có tài khoản

- Mọi tool chạy với quyền của 1 tài khoản cụ thể, không có đường vào dữ liệu của tài khoản khác.
- MCP local xác thực bằng **personal access token** (PAT) có phạm vi quyền (`docs:read`, `docs:write`) — [[FRD-account]].
- `update_note`/`append_to_note` gửi kèm `version` của tài liệu; tài liệu đã bị sửa ở nơi khác → báo xung đột, không ghi đè (tiêu chí ở [[ADR-001-tech-stack]] mục 6).
- Bộ tool là dùng chung với chat AI trong app ([[FRD-ai-chat]]).

## Chưa chốt / để sau

- **Remote MCP** qua HTTP, xác thực OAuth 2.1 theo đặc tả MCP: dùng được từ máy khác hoặc Claude web mà không cần chạy Nodus local.
- Tool ghi của MCP hiện áp dụng ngay, không qua bước duyệt trong Nodus như [[FRD-ai-chat]] — có cần cơ chế duyệt ([[BRD]] mục 7) hay dựa vào xác nhận của client MCP.
- **MCP prompts** (mẫu lệnh có sẵn trong client).
- Thêm `limit`/lọc theo thời gian cho `search_notes` (đổi API contract `GET /notes` → cần duyệt).
- Đổi `instructions` khi các hạn chế của [[FRD-wiki-link]] được xử lý (ví dụ cho phép link tới note chưa tồn tại).
