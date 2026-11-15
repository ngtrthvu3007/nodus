# FRD — Tìm kiếm

Nguồn: [[SPEC-v5]]. Liên quan: [[FRD-mcp]], [[FRD-wiki-link]], [[FRD-storage]].

## Mục tiêu

Tìm doc theo title và nội dung — cho người dùng và cho AI qua MCP — mà không làm ngập ngữ cảnh khi kho lớn.

## Yêu cầu

- Tìm trong một workspace ([[FRD-account]]): `GET /workspaces/:workspaceId/docs?q=`.
- Tìm theo **title và nội dung**, substring, không phân biệt hoa thường. Ký tự `%` và `_` trong từ khóa được coi là chữ thường, không phải ký tự đặc biệt.
- Kết quả sắp theo mới cập nhật trước.
- Mỗi kết quả gồm `id`, `title`, `path`, `snippet` và `updatedAt`. Không trả toàn bộ nội dung.
- `path`: tên các folder/doc cha nối bằng ` / ` (có khoảng trắng hai bên), ví dụ `Dự án / Backend`; doc ở root thì rỗng. Tên không chứa `/` ([[FRD-doc]], [[FRD-folder]]) nên không cần escape. Cây tối đa 4 cấp nên tối đa 3 cha; server chỉ dựng path cho các doc của trang kết quả, không nạp cả cây.
- `snippet`: khoảng 160 ký tự **tính theo ký tự Unicode (rune), không theo byte**, quanh chỗ khớp đầu tiên trong nội dung (khoảng 60 ký tự trước chỗ khớp), thêm `…` ở đầu/cuối phía bị cắt. Nếu chỉ khớp title hoặc `q` rỗng thì lấy 160 ký tự đầu của nội dung. Là văn bản thuần: bỏ ký hiệu đầu dòng (`#`, `>`, `-`, `*`), rào code (```), đổi `[[Tên]]` thành `Tên`, gộp xuống dòng thành một khoảng trắng.
- **Có phân trang**: `limit` (mặc định 20, tối đa 100) và `offset`; response có `hasMore`. Từ khóa rỗng cũng bị giới hạn như vậy, không trả toàn bộ kho.
- Chỉ trả doc đang hiện hữu (không gồm doc đã xóa) trong workspace; chỉ member của workspace tìm được. Người xem qua share không dùng tìm kiếm ([[FRD-share]]).
- Tool `search_notes` của [[FRD-mcp]] (giữ tên hiện có) dùng chung quy tắc này, có tham số `limit`/`offset`.
- Lỗi: `workspace_not_found` (404), `invalid_params` (400, `limit`/`offset` không phải số hoặc âm). `limit` lớn hơn 100 thì cắt còn 100, không báo lỗi.

## Chỉ mục

- Bật extension `pg_trgm`; đánh GIN `gin_trgm_ops` trên `docs.title` và `docs.content`, chỉ doc chưa xóa (`WHERE deleted_at IS NULL`), để `ILIKE '%…%'` không quét toàn bảng. Từ khóa dưới 3 ký tự không dùng được chỉ mục (quét tuần tự, `limit` dừng sớm).
- Chỉ có trong migration viết tay, không khai báo ở `extra_schema.sql` (Atlas bản miễn phí không khai báo được extension); cách xử lý khi `migrate-diff` đề nghị xóa chúng xem [[backend-map]].

## Chưa chốt

- Xếp kết quả khớp title lên trước khớp nội dung.
- Tìm không dấu cho tiếng Việt (gõ "kien truc" ra "Kiến trúc").
- Khớp từ / xếp hạng theo độ liên quan, hoặc chỉ substring.
- Khi có import/export Google Drive ([[FRD-storage]]) nội dung vẫn nằm trong DB nên không cần chỉ mục riêng.
