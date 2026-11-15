# FRD — Nhập tài liệu

Nguồn: [[BRD]], [[SPEC-v5]]. Liên quan: [[FRD-export]], [[FRD-doc]], [[FRD-sitemap]], [[FRD-wiki-link]].

## Mục tiêu

Người dùng đưa file markdown có sẵn (từ máy, từ Obsidian, từ công cụ khác) vào Nodus thành doc. Giai đoạn này chỉ nhập **file `.md` thành doc**; không nhập folder hay zip.

## Yêu cầu

### 1. Nhập file `.md`

- `POST /workspaces/:workspaceId/docs/import` (`multipart/form-data`): các file ở field `files` (1–20 file) và field `parentId` (folder, doc, hoặc bỏ trống = root, giống tạo doc — [[FRD-doc]]).
- Mỗi file thành **1 doc mới** dưới `parentId`, nối vào cuối danh sách cùng cha theo thứ tự file trong request.
- Chỉ nhận file đuôi `.md` (không phân biệt hoa thường), tối đa 1 MB mỗi file, nội dung phải là UTF-8 (bỏ BOM nếu có).
- Nội dung giữ nguyên, kể cả frontmatter (không đọc, không bỏ).
- Title lấy từ tên file bỏ đuôi `.md`:
  - bỏ khoảng trắng hai đầu; ký tự cấm trong title (`/ # | [ ]`, [[FRD-doc]]) thay bằng `-`; dài quá 200 ký tự thì cắt;
  - title rỗng sau khi xử lý → file đó lỗi `invalid_title`;
  - trùng tên với node cùng cha (kể cả trùng giữa các file trong cùng request, không phân biệt hoa thường) thì thêm `-2`, `-3` ([[FRD-sitemap]]).
- Tiền tố số kiểu `01-` trong tên file **không bị bỏ**: nằm nguyên trong title.
- Link `[[...]]` được dựng lại sau khi tạo ([[FRD-wiki-link]]): nối được ngay nếu doc đích có trong workspace, nếu chưa có thì giữ ở dạng chưa nối và tự nối khi doc đích xuất hiện. **Không chuyển đổi nội dung**: link markdown thường (`[chữ](./file.md)`) giữ nguyên là link markdown, không thành `[[...]]`.

### 2. Kết quả và lỗi

- Lỗi của từng file **không làm hỏng cả lượt**: file hợp lệ vẫn được tạo (cùng một transaction), file lỗi nằm trong danh sách `failed`. Response: `{ "created": [{ "id", "title", "fileName" }], "failed": [{ "fileName", "code" }] }`.
- Mã lỗi từng file: `invalid_file_type` (không phải `.md`), `file_too_large` (quá 1 MB), `invalid_encoding` (không phải UTF-8), `invalid_title`.
- Lỗi cả request (không tạo gì): quá 20 file hoặc không có file → `400 invalid_params`; `parentId` không tồn tại → `404 folder_not_found` / `doc_not_found`; vượt độ sâu tối đa như tạo doc ([[FRD-sitemap]]); không phải member ([[FRD-account]]).
- Mọi quy tắc đặt chỗ kiểm tra ở server, không tin UI ([[FRD-doc]]).

### 3. Giao diện

- Menu **Import docs** trên folder, doc (nhập thành doc con) và vùng root của sidebar; mở hộp chọn nhiều file `.md`.
- Sau khi nhập hiện kết quả: số doc đã tạo và danh sách file lỗi kèm lý do; cây sidebar cập nhật.

## Ngoài phạm vi

- Nhập folder hoặc zip (dựng lại cây từ thư mục); khôi phục y nguyên bản đã xuất ([[FRD-export]] không đảm bảo round-trip).
- Chuyển link markdown tương đối thành `[[wiki-link]]`; đọc frontmatter (title, thứ tự).
- Nhập ảnh đính kèm ([[FRD-image]]) và nhập từ Google Drive ([[FRD-storage]]).
