# FRD — Tìm kiếm

Nguồn: [[SPEC-v5]]. Liên quan: [[FRD-mcp]], [[FRD-wiki-link]], [[FRD-storage]].

## Mục tiêu

Tìm doc theo title và nội dung — cho người dùng và cho AI qua MCP — mà không làm ngập ngữ cảnh khi kho lớn.

## Yêu cầu

- Tìm trong một workspace ([[FRD-account]]): `GET /workspaces/:workspaceId/docs?q=`.
- Tìm theo **title và nội dung**, substring, không phân biệt hoa thường. Ký tự `%` và `_` trong từ khóa được coi là chữ thường, không phải ký tự đặc biệt.
- Kết quả sắp theo mới cập nhật trước.
- Mỗi kết quả gồm `id`, `title`, `path` (tên các folder/doc cha, ví dụ `Dự án / Backend`), `snippet` (khoảng 160 ký tự văn bản thuần quanh chỗ khớp đầu tiên trong nội dung; nếu chỉ khớp title thì lấy đầu nội dung) và `updatedAt`. Không trả toàn bộ nội dung.
- **Có phân trang**: `limit` (mặc định 20, tối đa 100) và `offset`; response có `hasMore`. Từ khóa rỗng cũng bị giới hạn như vậy, không trả toàn bộ kho.
- Chỉ trả doc đang hiện hữu (không gồm doc đã xóa) trong workspace; chỉ member của workspace tìm được. Người xem qua share không dùng tìm kiếm ([[FRD-share]]).
- Tool `search_docs` của [[FRD-mcp]] dùng chung quy tắc này, có tham số `limit`/`offset`.

## Chưa chốt

- Xếp kết quả khớp title lên trước khớp nội dung.
- Tìm không dấu cho tiếng Việt (gõ "kien truc" ra "Kiến trúc").
- Khớp từ / xếp hạng theo độ liên quan, hoặc chỉ substring.
- Khi có import/export Google Drive ([[FRD-storage]]) nội dung vẫn nằm trong DB nên không cần chỉ mục riêng.
