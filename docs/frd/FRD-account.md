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

## Cần duyệt

- Auth/permissions; schema (`users`, `user_identities` cho các phương thức đăng nhập, `sessions`, token xác minh/đặt lại mật khẩu, cột `user_id` ở `folders`/`notes`); toàn bộ API đổi sang yêu cầu đăng nhập.
- Đăng ký OAuth app với Google, GitHub, GitLab (client ID/secret là secret, không commit).
- Dịch vụ gửi email (xác minh, đặt lại mật khẩu).

## Chưa chốt

- Hỗ trợ GitLab tự host (khác gitlab.com) không.
- Đăng nhập không mật khẩu (magic link qua email) thay cho/song song với mật khẩu.
- Xác thực 2 bước (2FA).
- Dữ liệu đang có trong DB (chưa có chủ) chuyển cho tài khoản nào khi bật auth.
- Cơ chế session (cookie phía server hay token).
