# FRD — Folder

Nguồn: [[SPEC-v2]], [[SPEC-v5]]. Quy tắc đặt chỗ và độ sâu xem [[FRD-sitemap]]. Route và schema xem [[backend-map]].

## Mục tiêu

Folder là chỗ chứa để tổ chức doc. Folder **không phải doc**: không có nội dung markdown, chỉ có tên và mô tả.

## Yêu cầu

- Folder thuộc về một workspace ([[FRD-account]]). Có `name` (bắt buộc) và `description` (tùy chọn, văn bản thường).
- CRUD: tạo, đổi tên, sửa mô tả, xóa, xem chi tiết. `PATCH` gửi field nào đổi field đó.
- Folder nằm ở root hoặc trong một Folder khác (lồng nhiều cấp, tối đa theo [[FRD-sitemap]]). Folder không nằm trong doc.
- `name` dài 1–200 ký tự, duy nhất trong cùng cha, tính chung với doc, không phân biệt hoa thường ([[FRD-sitemap]]). Không chứa `/`, `#`, `|`, `[`, `]` (ký tự của cú pháp link — [[FRD-wiki-link]]).
- Bấm vào folder → hiện **danh sách con trực tiếp** (folder con và doc con, theo thứ tự sitemap) kèm `description`. Không có nội dung để soạn.
- Folder không tồn tại → `404 folder_not_found`.
- Trang folder cho sửa `description` ngay tại chỗ (lưu bằng nút hoặc phím tắt, hủy không ghi gì) và có nút tạo node mới trong folder; folder trống hiện trạng thái trống kèm nút đó.
- Tên nhập khi tạo hoặc đổi tên được client kiểm tra trước theo đúng quy tắc trên (rỗng, quá 200 ký tự, ký tự cấm) để báo lỗi ngay; server vẫn kiểm tra lại và là bên quyết định. Lỗi `400`/`409` từ server hiện thành thông báo, ô nhập giữ nguyên để sửa.

## Xóa folder

- Folder còn node bên trong: client hiện **cảnh báo trước** (có số node bên trong); người dùng có thể chuyển node cần giữ ra ngoài ([[FRD-move]]).
- Người dùng xác nhận xóa bất chấp cảnh báo → xóa folder **cùng toàn bộ nhánh bên dưới** (folder con, doc, doc con). Không giữ lại gì.
