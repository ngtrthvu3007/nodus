# FRD — Editor & Preview cho tài liệu kỹ thuật

Nguồn: [[SPEC-v3]], [[SPEC-v5]].

## Mục tiêu

Editor và preview đủ cho tài liệu kỹ thuật: code nhiều ngôn ngữ, HTML/SVG thông dụng trong docs — mà vẫn an toàn khi nội dung được share/publish cho người khác xem.

## Nguyên tắc

**Code chỉ hiển thị, không chạy.** Mọi code block (`ts`, `css`, `html`, `json`, `yaml`, `sql`…) chỉ được tô màu và copy, không bao giờ được thực thi hay áp dụng lên trang. Ngoại lệ duy nhất: `mermaid` và `svg` được vẽ thành hình (SVG phải qua bộ lọc).

## Hiện trạng

- Editor: CodeMirror 6 `markdown()` — chưa tô màu theo ngôn ngữ bên trong code block.
- Preview: `markdown-it` với `html: false` — HTML viết trực tiếp hiện thành chữ thô; code block chỉ style chung bằng CSS, chưa tô màu theo ngôn ngữ; `mermaid` đã render thành SVG.

## Yêu cầu

### 1. Code block

- Tô màu theo ngôn ngữ ở **cả editor và preview**, tối thiểu: `ts`/`js`, `css`, `html`, `json`, `yaml`, `sql`, `bash`, `go`.
- Preview: nút **Copy**, nhãn tên ngôn ngữ.
- Tùy chọn tên file: ` ```ts title="create-note.spec.ts" ` → hiện nhãn tên file phía trên block.
- Ngôn ngữ không hỗ trợ → hiển thị như text thường, không lỗi.

### 2. HTML trong nội dung (có lọc)

- Bật HTML trong markdown-it, **lọc qua allowlist** kiểu GitHub: `details`, `summary`, `kbd`, `sub`, `sup`, `br`, `img`, `table`/`thead`/`tbody`/`tr`/`th`/`td`, `a`, `span`, `div`, `p`.
- Loại bỏ: `script`, `iframe`, `object`, `embed`, `style`, `form`, mọi thuộc tính `on*`, URL `javascript:`.
- CSS người dùng viết **không** được áp dụng lên trang (không cho `<style>`, không cho thuộc tính `style` tùy ý).

### 3. SVG

- SVG viết trực tiếp trong nội dung: qua cùng bộ lọc (chế độ SVG), loại `script`, `foreignObject`, thuộc tính `on*`.
- Code block ` ```svg ` → vẽ thành hình (đã lọc), có nút phóng to giống mermaid.
- Ảnh `.svg` qua `![](...)`/`<img>`: hiển thị bình thường (trình duyệt không chạy script trong SVG nạp qua thẻ ảnh).

## Ngoài phạm vi

- Editor vẽ/sửa icon SVG.
- Note là file JSON/YAML/HTML thuần, kiểm tra cú pháp file.
- Chạy HTML/CSS/JS trực tiếp trên trang.

## Cần duyệt

- Dependency: `dompurify` (lọc HTML/SVG); các gói ngôn ngữ CodeMirror (`@codemirror/lang-*` hoặc `@codemirror/language-data`); thư viện tô màu cho preview (hoặc tái dùng bảng màu `MARKDOWN_ACCENT` hiện có).

## Chưa chốt

- Hiển thị OpenAPI (YAML/JSON) thành trang API docs.
- Nút "Xem trước" cho block HTML(+CSS), chạy trong `iframe` sandbox tách khỏi trang.
- Callout (Note/Warning/Tip).
