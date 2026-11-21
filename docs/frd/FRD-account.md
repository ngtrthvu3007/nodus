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
- Đăng xuất; đăng xuất khỏi mọi thiết bị (gồm cả thiết bị đang dùng, không thu hồi PAT).
- Xóa tài khoản: xóa các workspace mà tài khoản là `owner` duy nhất cùng toàn bộ dữ liệu bên trong; rời các workspace còn lại.
- Dữ liệu demo hiện có (workspace `Default` tạo sẵn trước khi có tài khoản) bị **xóa** khi bật kiểm tra quyền theo workspace, không gán cho ai.
- MCP và chat AI ([[FRD-mcp]], [[FRD-ai-chat]]) dùng cùng quyền của tài khoản, không có đường vào riêng.

### Workspace và thành viên

- Một tài khoản tạo được nhiều workspace và thuộc nhiều workspace. Mọi folder, doc, link thuộc về một workspace. Người tạo workspace là `owner` của nó.
- Tên workspace: bỏ khoảng trắng đầu/cuối, dài 1–100 ký tự; sai → `400 invalid_params`. Hai workspace được trùng tên.
- Thông tin người dùng hiện tại (`/me`) kèm danh sách workspace mà người dùng là member (id, tên, role của người dùng trong workspace đó).
- Role: `owner` (đổi tên và xóa workspace, thêm/xóa member, đổi role) và `member` (đọc và sửa mọi folder/doc trong workspace). Workspace luôn có ít nhất một `owner`; xóa hoặc hạ `owner` cuối cùng bị từ chối (`409 last_owner`).
- Xóa workspace xóa luôn toàn bộ folder, doc, link bên trong, không giữ lại gì. Để tránh xóa nhầm, giao diện bắt gõ lại tên workspace trước khi xóa.
- Member được tự rời workspace (xóa chính mình); vẫn áp `last_owner`.
- Thêm member bằng **email của tài khoản đã có**, không gửi email mời. Email chưa có tài khoản → `404 user_not_found`; đã là member → `409 already_member`. Thêm member có giới hạn tốc độ riêng để không dò được email nào đã có tài khoản.
- Người không phải member không đọc/sửa được gì của workspace; API trả `404` (không tiết lộ workspace có tồn tại hay không), trừ phạm vi được share ([[FRD-share]]) hoặc publish ([[FRD-publish]]).
- Mọi API đọc/ghi doc, folder, link, tìm kiếm, export đi qua **một hàm kiểm tra quyền duy nhất**; share mở rộng hàm này, không sửa từng truy vấn.
- Thứ tự kiểm tra lỗi: chưa đăng nhập → `401`; không phải member → `404`; là member nhưng thiếu role hoặc quyền token → `403`.
- Giai đoạn này không có màn hình quản trị team ngoài trang thành viên của workspace; chưa có lời mời qua email.

### Gộp tài khoản theo email

- Đăng nhập bằng phương thức mới mà email **đã xác minh** trùng với tài khoản đang có → **không tự gộp** (`409 account_exists`); yêu cầu đăng nhập bằng phương thức cũ rồi gắn thêm từ trang cài đặt (tự gộp theo email cho phép chiếm tài khoản nếu provider trả email chưa xác minh).

### Email + mật khẩu

- Mật khẩu dài 12–64 ký tự; không ép quy tắc thành phần (hoa, số, ký tự đặc biệt), chặn mật khẩu phổ biến. Lưu bằng hàm băm chậm, không bao giờ lưu dạng đọc được ([[ADR-002-auth]]).
- Xác minh email bằng link gửi qua email, link hết hạn, dùng một lần.
- Quên mật khẩu: gửi link đặt lại, dùng một lần, hết hạn; đặt lại xong thì đăng xuất mọi phiên cũ.
- Giới hạn số lần đăng nhập sai theo email và IP.
- Thông báo lỗi đăng nhập không tiết lộ email có tồn tại hay không. Đăng ký bằng email đã có trả `email_taken` (lộ email đã đăng ký): chấp nhận ở giai đoạn này.

### Personal access token (PAT)

Dùng cho công cụ ngoài trình duyệt (MCP local, remote MCP, CLI) — [[FRD-mcp]].

- Người dùng tạo token trong trang cài đặt: đặt tên, chọn quyền (`docs:read` chỉ đọc, `docs:write` đọc và ghi). Token có quyền trên mọi workspace mà tài khoản là member.
- Token chỉ gọi được API docs và danh sách workspace (`GET /workspaces`). Đăng nhập, quản lý token, quản lý workspace và member chỉ nhận phiên đăng nhập, không nhận token.
- Token chỉ hiện **một lần** lúc tạo; sau đó chỉ thấy tên, quyền, ngày tạo, lần dùng cuối. Token đã thu hồi không còn trong danh sách.
- Thu hồi bất cứ lúc nào, có hiệu lực ngay. Token chỉ làm được trong phạm vi quyền đã chọn; vượt quyền (ví dụ `docs:read` ghi dữ liệu) → `403 insufficient_scope`. Thu hồi token của người khác → `404`.
- Tạo PAT, đổi mật khẩu, gắn/gỡ phương thức đăng nhập, xóa tài khoản đều yêu cầu xác thực lại. Sai mật khẩu lúc xác thực lại trả `403 invalid_password`, không phải `401`, để giao diện không hiểu nhầm là hết phiên.

## Chưa chốt

- Hỗ trợ GitLab tự host (khác gitlab.com) không.
- Xác thực 2 bước (2FA).
- Lời mời thành viên qua email.
- Mở rộng workspace, làm sau (NOD-83): role `viewer` (người trong workspace chỉ đọc cả workspace, khác [[FRD-share]] là người ngoài đọc một phần và [[FRD-publish]] là ai có URL cũng đọc); giới hạn số workspace do user sở hữu (kiểm tra ở một chỗ, giá trị theo gói khi có subscription, xem [[FRD-billing]]); chuyển quyền `owner`, và chặn xóa tài khoản của `owner` duy nhất khi workspace còn member khác. Còn cần chốt: workspace cá nhân có quy tắc riêng không.
