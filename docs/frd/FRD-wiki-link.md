# FRD — Wiki-link & Backlink

Nguồn: [[SPEC-v3]], [[SPEC-v5]]. Flow code của bản Fiber cũ: `docs/archive/features/note-links.md`. Cây folder và doc: [[FRD-sitemap]].

## Mục tiêu

Cho phép tài liệu trỏ tới nhau bằng `[[...]]`, và từ 1 tài liệu biết được tài liệu nào đang trỏ tới nó (backlink), để người dùng tự bấm qua xem có cần sửa gì không.

## Cú pháp

| Viết | Ý nghĩa |
| --- | --- |
| `[[Tên]]` | Doc tên "Tên" — chọn theo quy tắc gần nhất bên dưới |
| `[[Folder/Tên]]` | Doc "Tên" có cha trực tiếp là "Folder" |
| `[[A/B/Tên]]` | Khớp **phần cuối** của đường dẫn: viết ngắn cũng được (`[[Backend/Tổng quan]]` ra cả khi doc nằm ở `Dự án/Backend/Tổng quan`). Tối đa 4 đoạn (bằng độ sâu tối đa của cây) |
| `[[Tên#Heading]]` | Link tới một heading trong doc (xem mục dưới); kết hợp được với đường dẫn |

- Mỗi đoạn là **title doc hoặc tên folder**, không phân biệt hoa thường. Đoạn cha có thể là folder hoặc doc.
- Không dùng slug: gõ đúng tên như thấy ở sidebar.
- Khoảng trắng hai đầu mỗi đoạn bị bỏ; `[[ ]]` rỗng bị bỏ qua.
- Title doc và tên folder **không được chứa** `/`, `#`, `|`, `[`, `]` (đã là ký tự của cú pháp; xem [[FRD-doc]], [[FRD-folder]]).

## Yêu cầu

### Chọn doc đích

- Link chỉ tìm đích trong **cùng workspace**.
- `[[Tên]]` (không có `/`) khớp nhiều doc → chọn theo thứ tự: (1) doc cùng cha với doc đang viết; (2) doc gần nhất trong cùng nhánh (chung nhiều cấp cha nhất với doc đang viết); (3) doc tạo sớm nhất. Luôn ra đúng một kết quả, không báo mơ hồ.
- `[[... /Tên]]` có đường dẫn khớp nhiều doc → chọn doc tạo sớm nhất.
- Không khớp doc nào → **không** nối; preview hiển thị "broken link", không tự tạo doc.
- Cùng một đích xuất hiện nhiều lần trong nội dung → tính 1 link.

### Link luôn phản ánh trạng thái hiện tại

- Link **luôn suy ra từ nội dung**: mỗi lần tạo hoặc lưu doc, parse lại toàn bộ `[[...]]` và ghi lại link — cùng transaction với việc ghi doc. Không có API thêm/xóa link thủ công.
- Link được lưu cả khi **chưa nối được** (chữ gốc của đích được giữ lại), nên khi doc đích xuất hiện thì link tự nối mà không cần lưu lại doc nguồn.
- Link cập nhật khi **doc đích** thay đổi: tạo doc mới, đổi title, move, xóa; và khi folder trên đường dẫn đổi tên, move, xóa. Nodus không sửa chữ trong nội dung doc nguồn; link chỉ nối hoặc thành broken link.
- Link được tìm đích trong **phạm vi người xem được** (workspace của họ, hoặc phạm vi share/publish — [[FRD-share]], [[FRD-publish]]), không lộ doc ngoài phạm vi.

### Gợi ý khi gõ

- Gõ `[[` → gợi ý tối đa 10 doc khớp **chứa chữ** đã gõ (gõ "RDS" ra "AWS RDS"), không phân biệt hoa thường; mỗi gợi ý hiện đường dẫn để phân biệt doc cùng tên. Chọn → chèn đường dẫn ngắn nhất đủ để chỉ đúng doc đó.
- Gõ `[[Tên#` → gợi ý danh sách heading của doc (BE trả chữ heading, FE tính slug bằng bộ render — [[FRD-editor-preview]]).

### Backlink

- Doc tự link tới chính nó: vẫn render thành link trong preview, nhưng **không** tính là backlink của chính nó.
- **Backlinks** (tab Links của panel phải, cùng danh sách Outgoing): doc đang trỏ tới doc hiện tại, bấm để mở trong app. Outgoing hiện cả link broken. Đây là cách duy nhất Nodus hỗ trợ "xem chỗ liên quan" — Nodus **không** tự theo dõi hay đề xuất chỗ cần sửa ([[BRD]] mục 5).
- Backlink tính theo doc: `[[A#Mục 2]]` vẫn là 1 link tới doc A.

### Link tới heading `[[Tên#Heading]]`

- Phần sau `#` so khớp theo slug của heading ([[FRD-editor-preview]]); việc kiểm tra heading có tồn tại làm ở phía hiển thị.
- Doc tồn tại nhưng **heading không tồn tại** → broken link.
- Heading bị đổi tên → link thành broken link; Nodus không tự sửa.

## API

| Method | Path | Việc |
| --- | --- | --- |
| GET | `/docs/:id/links` | `backlinks` (kèm đường dẫn) + `outgoing` (kèm `ref` gốc và doc đích hoặc `null`) |
| GET | `/workspaces/:workspaceId/docs/autocomplete?q=` | Gợi ý doc: `id`, `title`, `path`, `ref` ngắn nhất để chèn |
| GET | `/docs/:id/headings` | Danh sách heading (`level`, `text`) của doc, bỏ heading trong code block |

## Chưa chốt

- Alias `[[Tên|chữ hiển thị]]`.
- Cú pháp chỉ đích danh theo ID (khi mọi cách khớp theo tên đều mơ hồ).
- Dựng lại link của cả workspace mỗi lần thay đổi cây là cách đơn giản, đủ cho workspace nhỏ; tối ưu thành dựng lại có chọn lọc khi thấy chậm.
