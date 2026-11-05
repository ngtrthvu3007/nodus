# FRD — Tài khoản

Nguồn: [[BRD]], [[SPEC-v5]].

## Mục tiêu

Mỗi người dùng có dữ liệu riêng. Đây là điều kiện bắt buộc trước [[FRD-storage]], [[FRD-share]], [[FRD-publish]], [[FRD-billing]]. Hiện Nodus **chưa có auth**: mọi note dùng chung, ai truy cập server cũng đọc/sửa/xóa được.

## Phương thức đăng nhập

| Phương thức | Ghi chú |
| --- | --- |
| Google | OAuth |
| GitHub | OAuth |
| GitLab | OAuth (gitlab.com) |
| Email + mật khẩu | Bắt buộc xác minh email trước khi dùng |

**Đăng nhập tách khỏi quyền Google Drive.** Đăng nhập bằng bất kỳ phương thức nào cũng dùng được Nodus. Muốn lưu vào Drive ([[FRD-storage]]) thì bấm "Kết nối Google Drive" riêng — kể cả người đăng nhập bằng Google cũng chỉ xin quyền Drive lúc này, không xin ngay khi đăng nhập.

## Yêu cầu

### Tài khoản

- Lần đầu đăng nhập → tự tạo tài khoản.
- Mọi folder, note, link thuộc về đúng 1 tài khoản. API chỉ trả và chỉ cho sửa dữ liệu của tài khoản đang đăng nhập.
- 1 tài khoản gắn được **nhiều phương thức đăng nhập** (ví dụ vừa Google vừa GitHub), gắn thêm/gỡ bớt trong trang cài đặt. Không cho gỡ phương thức cuối cùng.
- Đăng xuất; đăng xuất khỏi mọi thiết bị.
- Xóa tài khoản: xóa toàn bộ dữ liệu lưu trên Nodus, không đụng file trên Drive của người dùng.
- MCP và AI chat ([[FRD-mcp]], [[FRD-ai-chat]]) dùng cùng quyền của tài khoản, không có đường vào riêng.

### Gộp tài khoản theo email

- Đăng nhập bằng phương thức mới mà email **đã xác minh** trùng với tài khoản đang có → **không tự gộp**; yêu cầu đăng nhập bằng phương thức cũ rồi gắn thêm từ trang cài đặt.
- Lý do: tự gộp theo email cho phép chiếm tài khoản nếu 1 provider trả email chưa xác minh (GitHub cho phép email ẩn/chưa xác minh).

### Email + mật khẩu

- Mật khẩu tối thiểu 8 ký tự; lưu bằng hàm băm chậm (argon2id hoặc bcrypt), không bao giờ lưu dạng đọc được.
- Xác minh email bằng link gửi qua email, link hết hạn.
- Quên mật khẩu: gửi link đặt lại qua email, link dùng 1 lần, hết hạn; đặt lại xong thì đăng xuất mọi phiên cũ.
- Giới hạn số lần đăng nhập sai theo email và IP.
- Thông báo lỗi không tiết lộ email có tồn tại hay không.

## Cơ chế xác thực

Chốt ở [[ADR-001-tech-stack]]: **session cho trình duyệt, PAT cho công cụ, JWT chỉ dùng nội bộ giữa service**.

| Client | Cách xác thực |
| --- | --- |
| Web | Session ID ngẫu nhiên trong cookie `httpOnly; Secure; SameSite=Lax`; bảng `sessions` lưu bản băm, thiết bị/IP, hết hạn khi không dùng và hết hạn tuyệt đối |
| MCP local, CLI | Personal access token (PAT): ngẫu nhiên, lưu bản băm, có phạm vi quyền (`docs:read`, `docs:write`), thu hồi được, ghi lần dùng cuối |
| Remote MCP (để sau) | OAuth 2.1 theo đặc tả MCP |
| Service nội bộ (khi tách) | JWT sống ngắn do API Go cấp, có `aud` theo service, ký bất đối xứng + JWKS |

- Auth middleware quy mọi loại thông tin xác thực về một `Principal` (`userId`, `scopes`, `authMethod`); handler/service chỉ làm việc với `Principal`.
- Token sinh từ nguồn ngẫu nhiên an toàn (≥ 32 byte), chỉ lưu bản băm.
- Đăng nhập xong luôn cấp session mới (chống session fixation).
- CSRF: `SameSite=Lax` + kiểm tra `Origin` cho mọi request thay đổi dữ liệu; FE và BE cùng site (`app.` / `api.` cùng tên miền).
- Xác thực lại cho thao tác nhạy cảm: đổi mật khẩu, gắn/gỡ phương thức đăng nhập, xóa tài khoản, tạo PAT.
- Nhật ký bảo mật: đăng nhập, đăng xuất, tạo/thu hồi PAT, đổi mật khẩu.
- Secret lưu ở server (refresh token Google Drive; API key BYOK nếu [[FRD-ai-chat]] chọn lưu ở server) mã hóa khi lưu (envelope encryption, khóa chính ngoài DB).

### OAuth Google / GitHub / GitLab

- Luồng Authorization Code + PKCE, do Go xử lý: `GET /auth/:provider/start` → provider → `GET /auth/:provider/callback` → tạo session → redirect về app (chỉ tới domain trong danh sách cho phép).
- `state` + PKCE verifier lưu trong cookie tạm 10 phút; client secret chỉ ở Go.
- Google, GitLab: OIDC, xác minh ID token, khóa định danh `sub`. GitHub: `GET /user` + `GET /user/emails` (email chính, đã xác minh), khóa định danh `id` dạng số (không dùng username).
- Scope đăng nhập không gồm Drive; "Kết nối Google Drive" xin `drive.file` riêng ([[FRD-storage]]).

## Cần duyệt

- Auth/permissions; schema (`users`, `user_identities` cho các phương thức đăng nhập, `sessions`, token xác minh/đặt lại mật khẩu, cột `user_id` ở `folders`/`notes`); toàn bộ API đổi sang yêu cầu đăng nhập.
- Đăng ký OAuth app với Google, GitHub, GitLab (client ID/secret là secret, không commit).
- Dịch vụ gửi email (xác minh, đặt lại mật khẩu).

## Chưa chốt

- Hỗ trợ GitLab tự host (khác gitlab.com) không.
- Đăng nhập không mật khẩu (magic link qua email) thay cho/song song với mật khẩu.
- Xác thực 2 bước (2FA).
- Dữ liệu đang có trong DB (chưa có chủ) chuyển cho tài khoản nào khi bật auth.
