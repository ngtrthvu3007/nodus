# Nodus — SPEC v3: Editor + Wiki-link + Backlink

> Thay thế phần "linh hồn" còn thiếu của [SPEC-v2.md](SPEC-v2.md) (v2 chỉ có Folder/Note CRUD phân cấp). Áp dụng sau khi v2 xong. Không bao gồm graph (spec riêng sau) và search full-text (để sau).

## Vấn đề với v2

Editor là `<textarea>` thuần — không hiểu markdown, không thể có link `[[Title]]` thật sự (chỉ là text chữ, không click được, không track backlink).

## Tính năng mới

- **Editor CodeMirror 6**: thay `UTextarea`, markdown syntax highlight, giữ lưu trữ dạng markdown string thuần (không đổi schema `content TEXT`).
- **Preview pane**: render markdown → HTML qua `markdown-it`. Không đặt toggle Edit/Preview ở main content — main content luôn là editor; Preview là 1 tab trong panel bên phải (cùng chỗ với Backlinks), theo quyết định UI thực tế khi code (xem mục UI).
- **Syntax highlight code block**: không dùng theme Shiki riêng (bỏ `@shikijs/markdown-it`/`vitesse-*`) — preview pane tự style code block bằng CSS, đồng bộ với bảng màu accent đang dùng ở CodeMirror editor (One Dark Pro: heading/bold/link/string/keyword/comment — xem `code-mirror.vue`), nền/text nói chung theo `--ui-*` như phần còn lại của app.
- **Wiki-link `[[Title]]`**: cú pháp giữ nguyên như SPEC-v1 gốc. Custom inline rule cho `markdown-it` để render `[[Title]]` → `<a href="/notes/:id">Title</a>` (resolve qua map title→id runtime); note chưa tồn tại → render dạng "broken link" (span có class riêng), không tự tạo note mới.
- **Autocomplete `[[`**: CodeMirror 6 extension (`@codemirror/autocomplete`), gõ `[[` → gọi API gợi ý title đã tồn tại (debounce), Enter/click chèn `Title]]` (tự đóng ngoặc).
- **`note_links` + backlink**: bảng mới, rebuild mỗi lần save note (parse content → resolve title → target_note_id → xóa link cũ, insert lại). API trả backlink cho note đang xem.

## Schema (bổ sung)

```sql
CREATE TABLE note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_note_id, target_note_id)
);

CREATE INDEX idx_note_links_source_note_id ON note_links (source_note_id);
CREATE INDEX idx_note_links_target_note_id ON note_links (target_note_id);
```

Link resolve theo **title**, không theo ID. Note chưa tồn tại → không insert row (bỏ qua) tới khi note đó được tạo và note nguồn được save lại.

## API (bổ sung)

| Method | Path | Việc |
| --- | --- | --- |
| GET | `/notes/:id/links` | Backlinks (note nào đang trỏ tới note này) + outgoing links |
| GET | `/notes/autocomplete?q=` | Gợi ý title khi gõ `[[`, dùng cho CodeMirror autocomplete |

`PUT /notes/:id` (đã có) hành vi thay đổi: sau khi update `content` thành công, service parse wiki-link và rebuild `note_links` trong cùng flow (transaction).

## UI

- `app/pages/notes/[id].vue`: thay `UTextarea` bằng `EditorCodeMirror` (main content, luôn ở chế độ edit — không có toggle Edit/Preview ở đây). Panel phải là `USplitter` resizable/collapsible (giống sidebar), nội dung là `NoteBacklinksPanel`.
- `app/components/note/backlinks-panel.vue`: panel bên phải, có `UTabs` riêng "Preview" (render `EditorMarkdownPreview` với `content` hiện tại) / "Backlinks" (list note trỏ tới note hiện tại qua `GET /notes/:id/links`, click để navigate). Nút phóng to preview mở `UModal` xem lớn hơn.
- Component: `app/components/editor/code-mirror.vue` (wrapper CodeMirror 6, v-model, markdown highlight + autocomplete `[[`), `app/components/editor/markdown-preview.vue` (render qua markdown-it thuần + custom wiki-link rule + mermaid fence, style CSS đồng bộ bảng màu accent `MARKDOWN_ACCENT` dùng chung với `code-mirror.vue`).
- Mermaid: code block ` ```mermaid ` được render thành SVG thật (không thuộc spec gốc, thêm khi code UI) — nền cố định sáng, không theo dark mode, có nút phóng to riêng.

## Chưa chốt

- Global backlink view (danh sách toàn bộ note_links) — chưa cần, chỉ per-note.
- Broken link styling cụ thể (màu, gạch chân đứt) — để lúc code UI quyết định theo design hệ hiện có.
