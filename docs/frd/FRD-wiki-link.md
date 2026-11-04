# FRD — Wiki-link & Backlink

Nguồn: [[SPEC-v3]], [[SPEC-v5]]. Flow code chi tiết: `docs/features/note-links.md`.

## Mục tiêu

Cho phép tài liệu trỏ tới nhau bằng `[[Title]]`, và từ 1 tài liệu biết được tài liệu nào đang trỏ tới nó (backlink), để người dùng tự bấm qua xem có cần sửa gì không.

## Yêu cầu (đã implement)

- Cú pháp `[[Title]]` trong nội dung markdown. Link resolve theo **title**, không theo ID.
- Link **luôn suy ra từ nội dung**: mỗi lần save note (`PUT /notes/:id`), parse lại toàn bộ `[[...]]`, xóa link cũ, ghi link mới. Không có API thêm/xóa link thủ công.
- Title chưa tồn tại → **không** tạo link, preview hiển thị dạng "broken link", không tự tạo note.
- Cùng 1 title xuất hiện nhiều lần → 1 link duy nhất.
- Gõ `[[` trong editor → gợi ý tối đa 10 title khớp **tiền tố** (`GET /notes/autocomplete?q=`), chọn → chèn `Title]]`.
- **Tab Backlinks** ở panel phải: danh sách note đang trỏ tới note hiện tại, bấm để mở. Đây là cách duy nhất Nodus hỗ trợ "xem chỗ liên quan" — Nodus **không** tự theo dõi hay tự đề xuất chỗ cần sửa ([[BRD]] mục 5).

## API

| Method | Path | Việc |
| --- | --- | --- |
| GET | `/notes/:id/links` | `backlinks` (note trỏ tới note này) + `outgoing` (note này trỏ tới) |
| GET | `/notes/autocomplete?q=` | Gợi ý title khi gõ `[[` |

## Hạn chế hiện tại

| # | Hạn chế | Hệ quả |
| --- | --- | --- |
| 1 | Viết `[[X]]` trước khi tạo note X | Tạo X sau đó link vẫn không nối, phải save lại note nguồn |
| 2 | Đổi title note | `[[Title cũ]]` ở note khác thành broken link ở lần save kế tiếp |
| 3 | So khớp phân biệt hoa thường (`title = $1`) | `[[aws]]` không khớp note "AWS" |
| 4 | Không chặn trùng title | Hai note cùng title → link trỏ vào note nào không xác định |
| 5 | Autocomplete chỉ khớp tiền tố | Gõ "RDS" không ra "AWS RDS" |
| 6 | Update content và rebuild link không chung transaction | Lỗi giữa 2 bước → link lệch tới lần save sau. [[SPEC-v3]] ghi "cùng transaction", code thực tế không — chấp nhận để code đơn giản |

## Chưa chốt

- Có xử lý hạn chế 1–5 không. Hạn chế 1, 3, 4 cần đổi schema (`note_links.target_title`, `target_note_id` nullable, unique `lower(title)`) → cần duyệt.
- Link tới heading `[[Note#Heading]]` — xem [[FRD-page-toc]].
- Alias `[[Title|chữ hiển thị]]`.
