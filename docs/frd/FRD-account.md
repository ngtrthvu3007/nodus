# FRD — Tài khoản & workspace

Nguồn: [[BRD]], [[SPEC-v5]]. Cơ chế kỹ thuật (session, PAT, OAuth, CSRF): [[ADR-002-auth]].

## Mục tiêu

Mỗi người dùng có tài khoản riêng, và dữ liệu thuộc về **workspace** — một tài khoản tham gia được nhiều workspace, một workspace có nhiều tài khoản — để team nhỏ cùng viết một bộ docs. Đây là điều kiện bắt buộc trước [[FRD-share]] và [[FRD-publish]]. Hiện Nodus **chưa có auth**: mọi doc dùng chung, ai truy cập server cũng đọc/sửa/xóa được.

## Phương thức đăng nhập

Làm theo thứ tự:

| # | Phương thức | Ghi chú |
| --- | --- | --- |
| 1 | Email + mật khẩu | **Làm trước.** Xác minh email làm sau lõi; từ đó bắt buộc trước khi dùng |
| 2 | GitHub | OAuth |
| 3 | Google | OAuth |
| 4 | GitLab | OAuth (gitlab.com) |

Không có đăng nhập không mật khẩu (magic link). Đăng nhập tách khỏi Google Drive: import/export Drive ([[FRD-storage]]) xin quyền riêng.

## Yêu cầu

### Tài khoản

- Đăng ký bằng email + mật khẩu; lần đầu đăng nhập bằng OAuth → tự tạo tài khoản.
- Mỗi tài khoản mới tự có **một workspace cá nhân** (tài khoản là `owner`).
- 1 tài khoản gắn được **nhiều phương thức đăng nhập**, gắn thêm/gỡ bớt trong trang cài đặt. Không cho gỡ phương thức cuối cùng.
- Đăng xuất; đăng xuất khỏi mọi thiết bị.
- Xóa tài khoản: xóa các workspace mà tài khoản là `owner` duy nhất cùng toàn bộ dữ liệu bên trong; rời các workspace còn lại.
- Dữ liệu demo hiện có bị **xóa** khi bật tài khoản, không gán cho ai.
- MCP và chat AI ([[FRD-mcp]], [[FRD-ai-chat]]) dùng cùng quyền của tài khoản, không có đường vào riêng.

### Workspace và thành viên

- Một tài khoản tạo được nhiều workspace và thuộc nhiều workspace. Mọi folder, doc, link thuộc về một workspace.
- Role: `owner` (đổi tên và xóa workspace, thêm/xóa member, đổi role) và `member` (đọc và sửa mọi folder/doc trong workspace). Workspace luôn có ít nhất một `owner`; xóa hoặc hạ `owner` cuối cùng bị từ chối (`409 last_owner`).
- Thêm member bằng **email của tài khoản đã có**, không gửi email mời. Email chưa có tài khoản → `404`.
- Người không phải member không đọc/sửa được gì của workspace; API trả `404` (không tiết lộ workspace có tồn tại hay không), trừ phạm vi được share ([[FRD-share]]) hoặc publish ([[FRD-publish]]).
- Mọi API đọc/ghi doc, folder, link, tìm kiếm, export đi qua **một hàm kiểm tra quyền duy nhất**; share mở rộng hàm này, không sửa từng truy vấn.
- Giai đoạn này không có màn hình quản trị team ngoài trang thành viên của workspace; chưa có lời mời qua email.

### Gộp tài khoản theo email

- Đăng nhập bằng phương thức mới mà email **đã xác minh** trùng với tài khoản đang có → **không tự gộp** (`409 account_exists`); yêu cầu đăng nhập bằng phương thức cũ rồi gắn thêm từ trang cài đặt (tự gộp theo email cho phép chiếm tài khoản nếu provider trả email chưa xác minh).

### Email + mật khẩu

- Mật khẩu tối thiểu 8 ký tự; lưu bằng hàm băm chậm, không bao giờ lưu dạng đọc được.
- Xác minh email bằng link gửi qua email, link hết hạn, dùng một lần.
- Quên mật khẩu: gửi link đặt lại, dùng một lần, hết hạn; đặt lại xong thì đăng xuất mọi phiên cũ.
- Giới hạn số lần đăng nhập sai theo email và IP.
- Thông báo lỗi không tiết lộ email có tồn tại hay không.

### Personal access token (PAT)

Dùng cho công cụ ngoài trình duyệt (MCP local, remote MCP, CLI) — [[FRD-mcp]].

- Người dùng tạo token trong trang cài đặt: đặt tên, chọn quyền (`docs:read` chỉ đọc, `docs:write` đọc và ghi). Token có quyền trên mọi workspace mà tài khoản là member.
- Token chỉ hiện **một lần** lúc tạo; sau đó chỉ thấy tên, quyền, ngày tạo, lần dùng cuối.
- Thu hồi bất cứ lúc nào, có hiệu lực ngay. Token chỉ làm được trong phạm vi quyền đã chọn.
- Tạo PAT, đổi mật khẩu, gắn/gỡ phương thức đăng nhập, xóa tài khoản đều yêu cầu xác thực lại.

## Chưa chốt

- Hỗ trợ GitLab tự host (khác gitlab.com) không.
- Xác thực 2 bước (2FA).
- Lời mời thành viên qua email, role chỉ đọc cho member.
