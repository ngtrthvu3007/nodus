# FRD — Xuất tài liệu

Nguồn: [[BRD]], [[SPEC-v5]]. Liên quan: [[FRD-sitemap]], [[FRD-editor-preview]], [[FRD-import]].

## Mục tiêu

Người dùng mang tài liệu ra khỏi Nodus bất cứ lúc nào, đúng nguyên tắc "dữ liệu là markdown thuần, không khóa người dùng" ([[BRD]] mục 7).

Giai đoạn này làm theo cách đơn giản nhất, chạy ngay trong API hiện có. Khi cần tách thành service riêng (publish, export, ảnh) thì tách sau; yêu cầu bên dưới không đổi.

Xuất ra là để đọc và mang đi, **không đảm bảo nhập lại y nguyên**: tên file không phải title gốc (ký tự cấm bị thay, tên dài bị cắt), tiền tố số chỉ để giữ thứ tự ([[FRD-import]]).

## Yêu cầu

### 1. Xuất markdown

- Phạm vi: **1 doc**, **nhiều doc**, hoặc **1 folder** (kèm nhánh):
  - `GET /docs/:id/export` → 1 file `.md`, chỉ nội dung của chính doc đó, **không kèm doc con**.
  - `POST /workspaces/:workspaceId/docs/export` với body `{ "ids": [...] }` (1–200 id) → 1 file `.zip` **phẳng** (không có cây), chỉ các doc được chọn, không kèm doc con; zip đặt tên theo title của doc đầu tiên trong `ids`.
  - `GET /folders/:id/export` → 1 file `.zip` giữ cây.
- Không có xuất cả workspace. Doc nằm ở root xuất bằng cách chọn nhiều doc.
- Response là file (`Content-Disposition: attachment`), lỗi vẫn là JSON.
- Zip của folder **giữ cây** như sitemap ([[FRD-sitemap]]): folder → thư mục; doc có con → thư mục cùng tên chứa file của chính doc đó (`00-Tên.md`) và các doc con. Nội dung zip là các node nằm trong folder (không có thư mục bọc thêm), zip đặt tên theo folder.
- Thứ tự sitemap được giữ bằng **tiền tố số trong tên file/thư mục** của zip folder (`01-`, `02-`…, 3 chữ số khi từ 100 trở lên). Zip phẳng của nhiều doc và file `.md` đơn không có tiền tố.
- Nội dung giữ nguyên markdown gốc, kể cả `[[wiki-link]]`, mermaid, code block, HTML/SVG.
- **Tên file tải về** (`.md`, `.zip`) là chữ thường, không dấu, các từ nối bằng `-` (`Tổng quan` → `tong-quan.md`; title chỉ có ký hiệu → `export`). Tên các file bên trong zip giữ title dễ đọc theo quy tắc dưới đây.
- Tên file lấy từ title/tên folder; ký tự không hợp lệ cho tên file (`\ : * ? " < > |` và ký tự điều khiển) bị thay bằng `-`, tên dài quá 100 ký tự bị cắt; hai tên đụng nhau sau khi thay (cùng thư mục trong zip) thì thêm `-2`, `-3`. Trong zip folder tiền tố số đã làm mọi tên cùng thư mục khác nhau, nên quy tắc này chủ yếu áp dụng cho zip nhiều doc. Title và tên folder đã cấm `/` nên không gây thư mục ngoài ý muốn ([[FRD-doc]]).
- Bỏ doc đã xóa; chỉ xuất dữ liệu của workspace trong request và chỉ cho member ([[FRD-account]]).
- Lỗi: `doc_not_found`, `folder_not_found`, `workspace_not_found` (`404`); `ids` rỗng hoặc quá 200 → `400 invalid_params`; body không phải JSON hợp lệ hoặc `ids` không phải mảng UUID → `400 invalid_body`; có id không phải doc đang tồn tại trong workspace → `404 doc_not_found` và không trả file nào.

### 2. Xuất PDF

- Dùng chức năng **in của trình duyệt → Lưu PDF** trên bản đọc: giống bản preview (heading, bảng, code có tô màu, mermaid và SVG đã vẽ), không thêm dependency, không có service tạo PDF.
- Chế độ in có style riêng: ẩn thanh công cụ, sidebar, tab; chỉ còn nội dung doc.
- 1 doc mỗi lần. `[[wiki-link]]` trong PDF hiển thị thành chữ.

### 3. Giao diện

- Menu **Export** trên doc (xuất `.md`, in PDF) và trên folder (xuất `.zip`).
- Sidebar chọn được nhiều doc; thanh thao tác khi đang chọn có nút xuất nhiều doc (`.zip` phẳng). Chọn folder không nằm trong lựa chọn xuất nhiều doc. Khi chỉ chọn **1 doc**, nút xuất tải thẳng file `.md` của doc đó (như xuất 1 doc), không tạo zip.
- Menu doc ghi rõ "chỉ doc này" để người dùng không nhầm là xuất cả doc con.

## Chưa chốt

- Xuất PDF cho cả folder (gộp theo thứ tự sitemap) có làm không — cần công cụ tạo PDF phía server, để sau.
- Xuất cả workspace một lần ("Export all"): làm khi có nhu cầu; hiện đã đủ cách mang dữ liệu ra bằng folder và chọn nhiều doc.

## Ngoài phạm vi

- Ảnh trong zip (khi có [[FRD-image]]) và import/export Google Drive ([[FRD-storage]]): làm khi các FRD đó được làm.
- Xuất sang định dạng khác (Word, HTML site tĩnh).
- Nhập tài liệu: xem [[FRD-import]].
