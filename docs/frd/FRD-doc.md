# FRD — Doc

Nguồn: [[SPEC-v2]], [[SPEC-v5]]. Liên quan: [[FRD-folder]], [[FRD-sitemap]] (cấu trúc cây), [[FRD-move]], [[FRD-wiki-link]], [[FRD-autosave]]. Route và schema xem [[backend-map]].

## Mục tiêu

Doc là đơn vị tài liệu: có title và nội dung markdown. Đây là FRD của quy tắc doc; vị trí trong cây (folder, doc cha, độ sâu) xem [[FRD-sitemap]].

> Thuật ngữ: giao diện và API gọi là **doc**. Bảng DB `notes` được đổi tên thành `docs`.

## Yêu cầu

### Nội dung và title

- Doc thuộc về một workspace ([[FRD-account]]).
- Nội dung là markdown thuần (không có rich-text riêng — rich-text không convert lossless về markdown).
- Title: bỏ khoảng trắng hai đầu rồi lưu; sau khi bỏ phải dài 1–200 ký tự, sai → `400 invalid_params`.
- Title **không được chứa** `/`, `#`, `|`, `[`, `]` (ký tự của cú pháp link — [[FRD-wiki-link]]), sai → `400 invalid_params`.
- Title phải duy nhất trong cùng cha (tính chung với folder, không phân biệt hoa thường), sai → `409 name_conflict` ([[FRD-sitemap]]). Title có thể trùng giữa các doc khác cha; cách chọn khi `[[Tên]]` khớp nhiều doc xem [[FRD-wiki-link]].
- Doc không tồn tại (hoặc đã xóa) → `404 doc_not_found`.

### Vị trí khi tạo

- Tạo doc chỉ định đúng một nơi chứa qua `parentId`: một folder, một doc cha, hoặc root (`null`). Server tra `parentId` ở folder rồi ở doc.
- Nơi chứa phải tồn tại cùng workspace; tạo xong không được vượt độ sâu tối đa ([[FRD-sitemap]]).
- Server **không tin UI** đã chặn đúng: mọi quy tắc đặt chỗ kiểm tra lại ở server.
- Mọi thao tác ghi cây (tạo, move, xóa) chạy tuần tự trong một workspace (khóa dòng workspace) nên hai request đồng thời không thể làm cây vượt quy tắc hay tạo hai node trùng tên.

### Sửa doc

- `PUT /docs/:id` chỉ sửa `content`, không đổi vị trí (đổi vị trí xem [[FRD-move]]). Lưu kèm `version`, sai version → `409 version_conflict` — xem [[FRD-autosave]].
- `PATCH /docs/:id/title` đổi tên doc, theo cùng quy tắc tên như lúc tạo (1–200 ký tự, không chứa `/ # | [ ]`, không trùng tên cùng cha); không cần `version`.
- Mỗi lần ghi nội dung hoặc đổi tên, link `[[...]]` được dựng lại cùng transaction ([[FRD-wiki-link]]).

### Hiển thị

- Trang doc hiện title, nội dung, đường dẫn (breadcrumb) và hai liên kết **Previous/Next** theo thứ tự đọc của [[FRD-sitemap]]; doc đầu hoặc cuối cây thì thiếu liên kết tương ứng.
- Đường dẫn (breadcrumb) chỉ liệt kê các thư mục cha; tên của chính doc nằm ở tiêu đề (rút gọn bằng "…" nếu dài). Khi sidebar đóng, nút mở sidebar không đè lên đường dẫn và tiêu đề.
- Doc chưa có nội dung: editor hiện chữ gợi ý để bắt đầu viết, preview hiện câu báo trống; nút Format và toàn màn hình bị khóa cho tới khi có chữ ([[FRD-editor-preview]]).

### Xóa doc

- Xóa doc → xóa luôn mọi doc con bên dưới, không cần xác nhận từng con.
- Dùng soft delete (`deleted_at`) nên khóa ngoại cascade của DB không chạy; câu lệnh xóa tự soft delete cả nhánh con.
