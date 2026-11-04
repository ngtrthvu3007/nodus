# FRD — Xuất tài liệu

Nguồn: [[BRD]], [[SPEC-v5]]. Liên quan: [[FRD-storage]], [[FRD-sitemap]], [[FRD-editor-preview]].

## Mục tiêu

Người dùng mang tài liệu ra khỏi Nodus bất cứ lúc nào, đúng nguyên tắc "dữ liệu là markdown thuần, không khóa người dùng" ([[BRD]] mục 7).

## Yêu cầu

### 1. Xuất markdown

- Phạm vi: **1 note**, **1 folder**, hoặc **toàn bộ** tài liệu của tài khoản.
- 1 note → 1 file `.md`. Folder/toàn bộ → 1 file `.zip`.
- Zip **giữ cây** như sitemap ([[FRD-sitemap]]): folder → thư mục; note gốc có con → thư mục cùng tên chứa file của note gốc và các note con.
- Nội dung giữ nguyên markdown gốc, kể cả `[[wiki-link]]`, mermaid, code block, HTML/SVG.
- Ảnh do Nodus lưu ([[FRD-image]]) được đưa vào zip, đường dẫn ảnh trong markdown đổi sang đường dẫn tương đối tới file trong zip.
- Thứ tự sitemap được giữ (ví dụ bằng tiền tố số trong tên file hoặc file mục lục kèm theo).

### 2. Xuất PDF

- Phạm vi: **1 note** mỗi lần.
- PDF giống bản preview: heading, bảng, code block có tô màu, mermaid và SVG đã vẽ thành hình, ảnh.
- `[[wiki-link]]` trong PDF hiển thị thành chữ (không bấm được).
- HTML/SVG trong PDF đi qua cùng bộ lọc của [[FRD-editor-preview]].

### 3. Tài liệu lưu trên Google Drive

- Tài liệu ở chế độ Drive ([[FRD-storage]]) **vốn đã là file markdown** trong Drive của người dùng — người dùng lấy trực tiếp từ Drive được, không phụ thuộc chức năng xuất.
- Chức năng xuất vẫn áp dụng như trên cho cả 2 chế độ lưu trữ.

## Cần duyệt

- API xuất (thay đổi API contract).
- Thư viện/công cụ tạo PDF (dependency mới, hoặc dùng in trang của trình duyệt).

## Chưa chốt

- Tạo PDF ở server hay dùng "In → Lưu PDF" của trình duyệt (rẻ nhất, không cần dependency).
- Xuất PDF cho cả folder (gộp nhiều trang theo thứ tự sitemap) có làm không.
- Quy ước đặt tên file khi title có ký tự không hợp lệ cho tên file.

## Ngoài phạm vi

- Xuất sang định dạng khác (Word, HTML site tĩnh).
- Nhập (import) tài liệu.
