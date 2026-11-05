# FRD — Editor & Preview cho tài liệu kỹ thuật

Nguồn: [[SPEC-v3]], [[SPEC-v5]].

## Mục tiêu

Editor và preview đủ cho tài liệu kỹ thuật: code nhiều ngôn ngữ, HTML/SVG thông dụng trong docs — mà vẫn an toàn khi nội dung được share/publish cho người khác xem.

## Nguyên tắc

**Code chỉ hiển thị, không chạy.** Mọi code block (`ts`, `css`, `html`, `json`, `yaml`, `sql`…) chỉ được tô màu và copy, không bao giờ được thực thi hay áp dụng lên trang. Ngoại lệ duy nhất: `mermaid` và `svg` được vẽ thành hình (SVG phải qua bộ lọc).

## Hiện trạng (`web-nodus`)

- Editor: CodeMirror 6 `markdown()` — chưa tô màu theo ngôn ngữ bên trong code block; toàn bộ editor dùng font mono, có số dòng.
- Preview: `markdown-it` với `html: false` — HTML viết trực tiếp hiện thành chữ thô; code block một màu, chưa tô màu theo ngôn ngữ; `mermaid` đã render thành SVG.
- Preview khó đọc: heading cùng cỡ chữ, danh sách đánh số mất số, bảng không viền, màu chữ đậm/link tương phản thấp ở theme sáng.

`next-nodus` làm lại theo [[ADR-001-tech-stack]]: CodeMirror 6 cho editor, pipeline unified (remark/rehype) + Shiki cho preview và trang publish.

## Yêu cầu

### 1. Code block

- Tô màu theo ngôn ngữ ở **cả editor và preview**, tối thiểu: `ts`/`js`, `css`, `html`, `json`, `yaml`, `sql`, `bash`, `go`.
- Preview: nút **Copy**, nhãn tên ngôn ngữ.
- Tùy chọn tên file: ` ```ts title="create-note.spec.ts" ` → hiện nhãn tên file phía trên block.
- Ngôn ngữ không hỗ trợ → hiển thị như text thường, không lỗi.

### 2. HTML trong nội dung (có lọc)

- Cho phép HTML trong nội dung, **lọc qua allowlist** kiểu GitHub ở bước render (rehype-sanitize): `details`, `summary`, `kbd`, `sub`, `sup`, `br`, `img`, `table`/`thead`/`tbody`/`tr`/`th`/`td`, `a`, `span`, `div`, `p`.
- Loại bỏ: `script`, `iframe`, `object`, `embed`, `style`, `form`, mọi thuộc tính `on*`, URL `javascript:`.
- CSS người dùng viết **không** được áp dụng lên trang: không cho `<style>`, thuộc tính `style`, `class`, `id` (tránh dùng lại class của app để phủ trang hoặc ghi đè phần tử có `id` của app). URL trong `href`/`src` chỉ nhận `http`, `https`, `mailto` và đường dẫn tương đối.

### 3. SVG

- SVG viết trực tiếp trong nội dung: qua cùng bộ lọc (chế độ SVG), loại `script`, `foreignObject`, thuộc tính `on*`.
- Code block ` ```svg ` → vẽ thành hình (đã lọc), có nút phóng to giống mermaid.
- Ảnh `.svg` qua `![](...)`/`<img>`: hiển thị bình thường (trình duyệt không chạy script trong SVG nạp qua thẻ ảnh).

### 4. Chế độ hiển thị và kiểu chữ

- Ba chế độ: **Viết**, **Đọc**, **Chia đôi** (mặc định Viết).
- Editor theo vibe viết tài liệu: font sans cho văn bản, mono chỉ trong code block; heading hiện đúng cấp; ký hiệu markdown dịu màu; tắt số dòng mặc định.
- Bản đọc (preview, trang publish): body 16px, heading có thứ bậc, chữ đậm không đổi màu, bảng có viền, danh sách giữ số/dấu đầu dòng, độ tương phản đạt WCAG AA. Chi tiết ở [[ADR-001-tech-stack]] mục 5.

## Ngoài phạm vi

- Editor vẽ/sửa icon SVG.
- Note là file JSON/YAML/HTML thuần, kiểm tra cú pháp file.
- Chạy HTML/CSS/JS trực tiếp trên trang.

## Cần duyệt

- Dependency cho `next-nodus`: `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-raw`, `rehype-sanitize`, `shiki`, `@codemirror/language-data`.

## Chưa chốt

- Hiển thị OpenAPI (YAML/JSON) thành trang API docs.
- Nút "Xem trước" cho block HTML(+CSS), chạy trong `iframe` sandbox tách khỏi trang.
- Callout (Note/Warning/Tip).
