# FRD — Xuất tài liệu

Nguồn: [[BRD]], [[SPEC-v5]]. Liên quan: [[FRD-sitemap]], [[FRD-editor-preview]].

## Mục tiêu

Người dùng mang tài liệu ra khỏi Nodus bất cứ lúc nào, đúng nguyên tắc "dữ liệu là markdown thuần, không khóa người dùng" ([[BRD]] mục 7).

Giai đoạn này làm theo cách đơn giản nhất, chạy ngay trong API hiện có. Khi cần tách thành service riêng (publish, export, ảnh) thì tách sau; yêu cầu bên dưới không đổi.

## Yêu cầu

### 1. Xuất markdown

- Phạm vi: **1 doc** (kèm doc con), **1 folder** (kèm nhánh), hoặc **toàn bộ workspace**: `GET /docs/:id/export`, `GET /folders/:id/export`, `GET /workspaces/:workspaceId/export`.
- 1 doc không có con → 1 file `.md`. Còn lại → 1 file `.zip`. Response là file (`Content-Disposition: attachment`), lỗi vẫn là JSON.
- Zip **giữ cây** như sitemap ([[FRD-sitemap]]): folder → thư mục; doc có con → thư mục cùng tên chứa file của chính doc đó (`00-Tên.md`) và các doc con.
- Thứ tự sitemap được giữ bằng **tiền tố số trong tên file/thư mục** (`01-`, `02-`…, 3 chữ số khi từ 100 trở lên).
- Nội dung giữ nguyên markdown gốc, kể cả `[[wiki-link]]`, mermaid, code block, HTML/SVG.
- Tên file lấy từ title/tên folder; ký tự không hợp lệ cho tên file (`\ : * ? " < > |` và ký tự điều khiển) bị thay bằng `-`, tên dài quá 100 ký tự bị cắt; hai tên đụng nhau sau khi thay thì thêm `-2`, `-3`. Title và tên folder đã cấm `/` nên không gây thư mục ngoài ý muốn ([[FRD-doc]]).
- Bỏ doc đã xóa; chỉ xuất dữ liệu của workspace trong request và chỉ cho member ([[FRD-account]]).

### 2. Xuất PDF

- Dùng chức năng **in của trình duyệt → Lưu PDF** trên bản đọc: giống bản preview (heading, bảng, code có tô màu, mermaid và SVG đã vẽ), không thêm dependency, không có service tạo PDF.
- Chế độ in có style riêng: ẩn thanh công cụ, sidebar, tab; chỉ còn nội dung doc.
- 1 doc mỗi lần. `[[wiki-link]]` trong PDF hiển thị thành chữ.

## Chưa chốt

- Xuất PDF cho cả folder (gộp theo thứ tự sitemap) có làm không — cần công cụ tạo PDF phía server, để sau.

## Ngoài phạm vi

- Ảnh trong zip (khi có [[FRD-image]]) và import/export Google Drive ([[FRD-storage]]): làm khi các FRD đó được làm.
- Xuất sang định dạng khác (Word, HTML site tĩnh).
- Nhập (import) tài liệu.
