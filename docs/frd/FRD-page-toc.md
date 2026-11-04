# FRD — Mục lục trong trang & link tới heading

Nguồn: [[SPEC-v5]]. Liên quan: [[FRD-wiki-link]], [[FRD-editor-preview]], [[FRD-publish]].

## Mục tiêu

Tài liệu dài nhảy được nhanh tới từng mục, và tài liệu khác trỏ được tới đúng 1 mục chứ không chỉ cả trang.

## Yêu cầu

### 1. Mục lục tự sinh

- Sinh từ heading **h2–h3** của nội dung (h1 coi là tiêu đề trang, không đưa vào).
- Hiển thị ở **preview** và **trang publish**. Bấm mục → cuộn tới heading tương ứng.
- Trang không có h2/h3 → ẩn mục lục.
- Heading nằm trong code block (` ``` `) không tính là heading.

### 2. Anchor cho heading

- Mỗi heading có anchor (slug) ổn định, sinh từ chữ của heading.
- Hai heading trùng chữ trong cùng trang → slug thêm hậu tố (`-1`, `-2`…) theo thứ tự xuất hiện.
- URL có `#slug` → mở trang và cuộn thẳng tới heading đó.

### 3. Link tới heading `[[Note#Heading]]`

- Cú pháp mở rộng của [[FRD-wiki-link]]: phần trước `#` là title note, phần sau là chữ của heading.
- Resolve note theo đúng quy tắc của wiki-link; heading so khớp theo slug.
- Note tồn tại nhưng **heading không tồn tại** → hiển thị **broken link**, giống title không tồn tại ở [[FRD-wiki-link]].
- Backlink tính theo note: `[[A#Mục 2]]` vẫn là 1 link tới note A.
- Gõ `[[Note#` trong editor → gợi ý danh sách heading của note đó.

## Ví dụ

```markdown
Xem quy tắc ở [[FRD-move-note#Sơ đồ validate]].
```

→ link mở `FRD-move-note` và cuộn tới mục "Sơ đồ validate". Nếu mục đó bị đổi tên → hiện broken link.

## Cần duyệt

- API: gợi ý heading khi gõ `[[Note#` (mở rộng `GET /notes/autocomplete` hoặc endpoint mới) — thay đổi API contract.

## Chưa chốt

- Quy tắc sinh slug cho tiếng Việt có dấu (giữ dấu hay bỏ dấu).
- Đổi tên heading thì link cũ tự cập nhật hay chỉ thành broken link (hiện chọn: chỉ thành broken link, Nodus không tự sửa).
- Vị trí mục lục trong preview (đầu trang hay cột bên).
