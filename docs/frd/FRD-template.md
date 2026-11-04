# FRD — Tạo tài liệu từ mẫu

Nguồn: [[SPEC-v5]]. Liên quan: [[FRD-note-hierarchy]], [[FRD-sitemap]].

## Mục tiêu

Tạo tài liệu mới theo khung có sẵn thay vì bắt đầu từ trang trắng, để các tài liệu cùng loại có cấu trúc đồng nhất.

## Yêu cầu

### 1. Tạo note từ mẫu

- Khi tạo note mới: chọn **Trang trắng** hoặc **1 mẫu**.
- Note tạo từ mẫu = note bình thường: copy nội dung mẫu vào note mới, sau đó **không còn liên kết** với mẫu (sửa mẫu không ảnh hưởng note đã tạo).
- Vị trí note mới tuân theo quy tắc tạo note hiện có ([[FRD-note-hierarchy]]): folder, note cha.
- Title note mới do người dùng nhập; mẫu chỉ cung cấp nội dung.

### 2. Mẫu có sẵn

- Do Nodus **tự viết**, đi kèm hệ thống, người dùng không sửa/xóa được.
- Tối thiểu: **Spec**, **FRD**, **Test case**, **API**.
- Nội dung mẫu là markdown thuần (heading, bảng, code block, mermaid), không có cú pháp riêng.

### 3. Mẫu của người dùng

- Người dùng biến **1 note của mình** thành mẫu ("Lưu làm mẫu").
- Mẫu của người dùng chỉ thấy trong tài khoản của họ.
- Người dùng đổi tên, sửa nội dung, xóa mẫu của mình. Xóa mẫu không ảnh hưởng note đã tạo từ mẫu đó.

## Ngoài phạm vi

- **Thư viện mẫu công khai** / chia sẻ mẫu giữa các tài khoản: không làm, rủi ro bản quyền nội dung do người dùng đóng góp ([[BRD]]).
- Biến trong mẫu (`{{date}}`, `{{title}}`…) và mẫu tạo nhiều note cùng lúc.

## Cần duyệt

- Schema lưu mẫu của người dùng (bảng riêng, hoặc cờ đánh dấu trên `notes`).
- API danh sách mẫu, tạo note từ mẫu (thay đổi API contract).

## Chưa chốt

- Mẫu của người dùng lưu ở đâu khi tài khoản dùng chế độ Google Drive ([[FRD-storage]]).
- Mẫu có sẵn viết bằng tiếng Việt, tiếng Anh, hay cả hai.
