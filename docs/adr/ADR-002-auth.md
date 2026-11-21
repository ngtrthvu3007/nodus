# ADR-002 — Cơ chế xác thực

> Trạng thái: **Đã chốt** — 2026-11-07 (chuyển từ [[FRD-account]]; quyết định gốc ở [[ADR-001-tech-stack]]). Yêu cầu người dùng thấy xem [[FRD-account]].

## Quyết định

**Session cho trình duyệt, PAT cho công cụ, JWT chỉ dùng nội bộ giữa service.**

| Client | Cách xác thực |
| --- | --- |
| Web | Session ID ngẫu nhiên trong cookie `nodus_session` (`httpOnly; Secure; SameSite=Lax`); bảng `sessions` lưu bản băm, thiết bị/IP, hết hạn sau 14 ngày không dùng (tính từ `last_used_at`) và tối đa 30 ngày (`expires_at`) |
| MCP local, remote MCP, CLI | Personal access token (PAT): `nod_` + 32 byte ngẫu nhiên base64url (prefix để công cụ quét secret nhận ra), lưu bản băm SHA-256, **một** phạm vi quyền (`docs:read` hoặc `docs:write`, `docs:write` gồm đọc; cột `scope text` kèm CHECK), thu hồi được, ghi lần dùng cuối. Remote MCP gửi PAT dạng bearer; OAuth 2.1 theo đặc tả MCP làm sau |
| Service nội bộ (khi tách) | JWT sống ngắn do API Go cấp, có `aud` theo service, ký bất đối xứng + JWKS |

## Quy tắc

- Auth middleware quy mọi loại thông tin xác thực về một `Principal` (`userId`, `scopes`, `authMethod`); handler chỉ làm việc với `Principal`.
- Token sinh từ nguồn ngẫu nhiên an toàn (≥ 32 byte), chỉ lưu bản băm SHA-256 (đã ngẫu nhiên nên không cần băm chậm; mỗi request đều phải tra token). `last_used_at` của session và PAT chỉ ghi khi lần ghi trước cách quá 1 phút.
- Mật khẩu băm bằng **argon2id** (khởi điểm `m=19MiB, t=2, p=1` theo OWASP), lưu dạng PHC string (`$argon2id$v=19$m=…,t=…,p=…$salt$hash`) để đổi tham số sau này không làm hỏng hash cũ. `users.password_hash` nullable cho tài khoản chỉ đăng nhập bằng OAuth. Mật khẩu 12–64 ký tự, không ép quy tắc thành phần, chặn danh sách mật khẩu phổ biến (list nhúng trong code); sai → `400 invalid_params`.
- Phân quyền theo `Principal`: PAT chỉ gọi API docs và `GET /workspaces`; `/auth/*`, `/tokens`, quản lý workspace và member chỉ nhận session (kiểm tra bằng `authMethod`). Thứ tự lỗi `401` → `404` → `403` xem [[FRD-account]].
- Rate limit lưu trong bộ nhớ (hiện chỉ chạy một instance; chuyển sang kho dùng chung khi chạy nhiều instance): đăng nhập sai theo email và IP; thêm member có limiter riêng để chống dò email.
- Đăng nhập xong luôn cấp session mới (chống session fixation).
- CSRF: `SameSite=Lax` + kiểm tra `Origin` cho mọi request thay đổi dữ liệu; FE và BE cùng site (`app.` / `api.` cùng tên miền).
- Xác thực lại cho thao tác nhạy cảm: đổi mật khẩu, gắn/gỡ phương thức đăng nhập, xóa tài khoản, tạo PAT.
- Nhật ký bảo mật: đăng nhập, đăng xuất, tạo/thu hồi PAT, đổi mật khẩu (chưa làm ở lõi tài khoản, làm sau).
- Secret lưu ở server (refresh token Google Drive; API key BYOK nếu [[FRD-ai-chat]] chọn lưu ở server) mã hóa khi lưu (envelope encryption, khóa chính ngoài DB).
- Chủ sở hữu dữ liệu là **workspace**: một user thuộc nhiều workspace, một workspace có nhiều user (bảng thành viên với role `owner`/`member`); mỗi tài khoản mới tự có một workspace cá nhân. Mọi bảng của người dùng mang `workspace_id` và lọc qua một scope chung ([[ADR-001-tech-stack]] mục 6).
- Quyền đọc/ghi một doc đi qua **một hàm kiểm tra duy nhất** (`Principal` có đọc/ghi được doc này không). Mọi API đọc (doc, link, backlink, tìm kiếm, autocomplete) gọi hàm này; hiện chỉ trả lời "là thành viên workspace" (không phải member thì `404`), [[FRD-share]] mở rộng sau mà không sửa từng truy vấn. Mọi transaction ghi cây khóa dòng `workspaces` để serial hóa ghi trong một workspace.
- Cách API biết workspace: route cần workspace mà không có dòng nào để suy ra (`tree`, tạo doc/folder) đặt id trong path (`/workspaces/:workspaceId/…`); route theo id (`/docs/:id`, `/folders/:id`, `move`) suy workspace từ chính dòng đó rồi kiểm tra member. Không dùng header `X-Workspace-Id`: path mở rộng được khi workspace thêm tài nguyên.

## OAuth Google / GitHub / GitLab

- Luồng Authorization Code + PKCE, do Go xử lý: `GET /auth/:provider/start` → provider → `GET /auth/:provider/callback` → tạo session → redirect về app (chỉ tới domain trong danh sách cho phép).
- `state` + PKCE verifier lưu trong cookie tạm 10 phút; client secret chỉ ở Go.
- Google, GitLab: OIDC, xác minh ID token, khóa định danh `sub`. GitHub: `GET /user` + `GET /user/emails` (email chính, đã xác minh), khóa định danh `id` dạng số (không dùng username).
- Scope đăng nhập không gồm Drive; "Kết nối Google Drive" xin `drive.file` riêng ([[FRD-storage]]).

## Dữ liệu cũ

Dữ liệu hiện có (chưa có chủ) chỉ là dữ liệu demo: migration thêm `workspace_id` **xóa dữ liệu cũ**, không gán cho tài khoản nào.
