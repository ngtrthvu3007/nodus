# FRD — Editor & Preview cho tài liệu kỹ thuật

Nguồn: [[SPEC-v3]], [[SPEC-v5]].

## Mục tiêu

Editor và preview đủ cho tài liệu kỹ thuật: code nhiều ngôn ngữ, HTML/SVG thông dụng trong docs — mà vẫn an toàn khi nội dung được share/publish cho người khác xem.

## Nguyên tắc

**Code chỉ hiển thị, không chạy.** Mọi code block (`ts`, `css`, `html`, `json`, `yaml`, `sql`…) chỉ được tô màu và copy, không bao giờ được thực thi hay áp dụng lên trang. Ngoại lệ duy nhất: `mermaid` và `svg` được vẽ thành hình (SVG phải qua bộ lọc).

Theo [[ADR-001-tech-stack]]: CodeMirror 6 cho editor, một pipeline unified (remark/rehype) + Shiki dùng chung cho preview và trang publish. Lưu tự động xem [[FRD-autosave]].

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
- Code block ` ```svg ` → vẽ thành hình (đã lọc), có nút **Zoom** giống mermaid (mở hình lớn trong hộp thoại). SVG viết trực tiếp trong nội dung cũng có nút này.
- Ảnh `.svg` qua `![](...)`/`<img>`: hiển thị bình thường (trình duyệt không chạy script trong SVG nạp qua thẻ ảnh).

### 4. Bố cục và kiểu chữ

- Trang doc chia hai phần: **editor** bên trái, **panel phải** có thanh tab (tab **Preview** ở đây; panel trái cũng có thanh tab **Markdown** cùng hàng; tab **Links** — [[FRD-wiki-link]]). Mặc định hiện cả hai panel, kéo thanh giữa để đổi độ rộng (mỗi panel có độ rộng tối thiểu). Editor luôn hiện. Panel Preview thu gọn được bằng nút mũi tên ở góc phải thanh tab của nó, có hiệu ứng mượt, để viết toàn bề rộng; nút để mở lại nằm ở góc phải thanh tab của editor và panel mở lại đúng độ rộng cũ. Nút **toàn màn hình** ở thanh tab Preview mở bản đọc trong một hộp thoại phủ kín màn hình (một cột giữa, có mục lục, đóng bằng Esc). Thu gọn preview không mất nội dung đang viết. Mỗi phần cuộn riêng.
- Previous/Next ([[FRD-doc]]) nằm cuối tab Preview.
- Nút **Format** ở thanh tab Markdown (phím tắt Shift+Alt+F) sắp xếp lại markdown đang viết mà không đổi chữ: bỏ khoảng trắng thừa cuối dòng, gộp dòng trống liên tiếp, thêm dòng trống quanh heading và code block, dùng `-` cho danh sách, gọn lại bảng (một dấu cách quanh mỗi ô, không đệm cho thẳng cột vì chữ trong editor không phải mono). Nội dung trong code block giữ nguyên. Một lần Format là một bước Undo.
- Nút Format và nút **toàn màn hình** bị khóa khi nội dung trống (hoặc chỉ có khoảng trắng) và bật lại ngay khi có chữ.
- **Toàn màn hình**: tiêu đề hộp thoại là tên doc; chỉ có nội dung doc (không có Previous/Next). Màn rộng: cột chữ và **mục lục** nằm cạnh nhau ở giữa màn hình, mục lục bên phải cột chữ và luôn hiện; màn hẹp (dưới 1024px): mục lục thành nút menu ở thanh tiêu đề. Hình mermaid/SVG vẫn có nút Zoom (phóng to thật sự, kể cả hình nhỏ). Esc đóng lớp trên cùng (Zoom trước, rồi toàn màn hình).
- Editor theo vibe viết tài liệu: font sans cho văn bản, mono chỉ trong code block; heading hiện đúng cấp; ký hiệu markdown dịu màu; hiện số dòng.
- Editor, chi tiết: số dòng canh giữa theo chiều cao dòng, số của dòng đang có con trỏ sáng hơn; cột chữ rộng tối đa khoảng 80 ký tự và căn giữa cùng với số dòng (panel rộng hơn cột thì kéo đổi độ rộng chỉ làm chữ trượt, không ngắt dòng lại); bấm vào vùng trống cạnh cột vẫn focus và đặt con trỏ vào dòng gần nhất; viền focus nằm trên cả khối code, không bị che.
- Màu trong editor: code block tô màu theo ngôn ngữ như ở preview, gồm `svg` (tô như XML) và `mermaid`; hai khối code liền nhau có khe hở; code trong cặp backtick có màu riêng (hồng) ở **cả editor và preview**, tương phản tối thiểu 4.5:1 ở cả sáng và tối.
- Thanh cuộn của editor, preview và toàn màn hình mảnh và chỉ hiện khi rê chuột hoặc focus vào vùng đó.
- Bản đọc (preview, trang publish): body 16px, heading có thứ bậc, chữ đậm không đổi màu, bảng có viền, danh sách giữ số/dấu đầu dòng, độ tương phản đạt WCAG AA. Chi tiết ở [[ADR-001-tech-stack]] mục 5.

### 5. Mục lục & anchor heading

- Mục lục sinh từ heading **h2–h3** (h1 là tiêu đề trang). Hiển thị ở preview (nút menu **On this page** ở thanh tab), ở toàn màn hình (danh sách cạnh cột chữ) và trang publish; bấm mục → cuộn **mượt** (khoảng 0,65 giây; người dùng bật "giảm chuyển động" của hệ điều hành thì nhảy thẳng) tới heading, và cuộn đúng trong vùng đang xem (không cuộn nhầm panel nằm sau toàn màn hình). Mục của phần đang đọc được **đánh dấu** (vạch màu và chữ màu chính) ở cả menu lẫn danh sách. Không có h2/h3 → ẩn mục lục. Heading nằm trong code block không tính.
- Mỗi heading có anchor (slug) ổn định sinh từ chữ heading: **bỏ dấu tiếng Việt, chữ thường, khoảng trắng thành `-`** (`Kiến trúc` → `kien-truc`). Quy tắc này cố định vì link `#heading` đã viết sẽ gãy nếu đổi; trùng chữ trong cùng trang → thêm hậu tố `-1`, `-2` theo thứ tự xuất hiện. URL có `#slug` → cuộn thẳng tới heading.
- `id` của heading do **bộ render tự sinh sau bước lọc HTML** (có tiền tố riêng của Nodus). Người dùng vẫn không tự đặt được `id`/`class` trong nội dung, nên không dùng được anchor để ghi đè phần tử của app.
- Link tới heading từ doc khác: xem [[FRD-wiki-link]].

## Ngoài phạm vi

- Editor vẽ/sửa icon SVG.
- Doc là file JSON/YAML/HTML thuần, kiểm tra cú pháp file.
- Chạy HTML/CSS/JS trực tiếp trên trang.

## Để sau

- Callout (Note/Warning/Tip): cần cú pháp riêng; markdown thuần vẫn đọc được khi chưa có.
- Hiển thị OpenAPI (YAML/JSON) thành trang API docs.
- Nút "Xem trước" cho block HTML(+CSS) chạy trong `iframe` sandbox tách khỏi trang — trái nguyên tắc "code chỉ hiển thị, không chạy" nên chưa làm.
- Format code **bên trong** code block: Format hiện chỉ sắp xếp markdown. Hướng: khi con trỏ nằm trong một khối code thuộc ngôn ngữ hỗ trợ thì chỉ format khối đó (JSON trước, không cần thư viện), còn lại format markdown. Ticket riêng.
- Upload ảnh, dán/kéo thả ảnh, đặt kích thước ảnh hiển thị: xem [[FRD-image]] (đang chốt hướng).

## Cần duyệt

- Dependency cho `next-nodus` (đã duyệt): `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-raw`, `rehype-sanitize`, `rehype-stringify`, `shiki`, `mermaid`, `codemirror`, `@codemirror/lang-markdown`, `@codemirror/language`, `@codemirror/view`, `@codemirror/language-data`, `@lezer/highlight`, `lucide-react` (bộ icon dùng chung, thay `@heroicons/react`), và `vitest` (dev) để chạy test.

## Chưa chốt

- Mục lục đánh dấu phần đang đọc: khi cuộn tới cuối bài, các heading cuối có thể không bao giờ lên tới "đường đọc" nên mục cuối chưa được đánh dấu.
