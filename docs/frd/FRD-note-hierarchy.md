# FRD — Note phân cấp (parent/child)

Nguồn: SPEC.md v2.

## Mục tiêu

Cho phép 1 note có note con, tối đa 2 level, để tổ chức note theo outline thay vì chỉ note phẳng như v1.

## Yêu cầu

- **Level 0 (note gốc)**: có thể thuộc 1 [[FRD-folder|folder]] hoặc đứng độc lập (root).
- **Level 1 (note con)**: thuộc đúng 1 note cha (level 0). Không có level 2 — note con không thể có con riêng.
- Nội dung note: chỉ markdown thuần (không có rich-text/plain-text riêng — rich-text không convert lossless về markdown).
- 1 note cha có thể có 0 hoặc nhiều note con.
- Quan hệ cha–con **chỉ thiết lập lúc tạo note** ("+ New note" trong context của 1 note gốc → tạo note con). Không có UI re-parent (nối 1 note gốc thành con của note gốc khác) sau khi đã tạo.
- Nút "+ New note" xuất hiện trên **mọi note gốc** trong sidebar (không giới hạn note đặc biệt nào) — bấm tại note gốc nào thì note đó thành cha, giống Notion/Obsidian. Không có modal chọn note cha từ danh sách; cha luôn được xác định ngầm bởi context (note đang bấm).

## Kế thừa Folder

- Note con **không có `folder_id` riêng** — luôn kế thừa folder của note cha.
- Hệ quả: nếu note cha ở root (không folder), note con của nó cũng ở root.
- Khi note cha đổi folder (xem [[FRD-move-note]]), note con tự động đi theo — không cần cập nhật riêng.

## Xóa Note cha

- Xóa note cha → **cascade xóa toàn bộ note con** của nó, không cần xác nhận riêng từng con.

## Schema

```sql
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    folder_id       UUID REFERENCES folders(id) ON DELETE CASCADE,
    parent_note_id  UUID REFERENCES notes(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_folder_id ON notes (folder_id);
CREATE INDEX idx_notes_parent_note_id ON notes (parent_note_id);
```

`note_links` giữ nguyên như v1, không đổi.

## Ràng buộc tầng service

Không diễn đạt được bằng CHECK constraint (cần so sánh chéo hàng) — bắt buộc validate ở service:

- Nếu `parent_note_id IS NOT NULL` → `folder_id` của chính note đó phải luôn là `NULL` khi lưu (giá trị hiệu lực lấy từ `folder_id` của note cha lúc truy vấn/hiển thị).
- Note có `parent_note_id IS NOT NULL` không được là cha của note khác — chặn khi set `parent_note_id`: từ chối nếu note cha đó đã có `parent_note_id` riêng (chặn quá 2 level).

## Tạo note — `folder_id` và `parent_note_id` cùng trong `POST /notes`

`POST /notes` nhận cả 2 field optional cùng lúc (`folder_id?`, `parent_note_id?`). UI chặn trước ở client (ẩn/disable chọn folder khi đang tạo note con), nhưng đây chỉ là lớp bảo vệ phụ — **server không được tin UI đã chặn đúng**, bắt buộc tự validate/tự override:

- **Nếu `parent_note_id != nil` (tạo note con)**: server **ưu tiên `parent_note_id`**, bỏ qua giá trị `folder_id` client gửi lên (nếu có) — tự set `folder_id` hiệu lực = `folder_id` của note cha (đúng rule kế thừa). Không trả lỗi khi client lỡ gửi cả 2 field; server âm thầm override.
- **Validate bắt buộc khi có `parent_note_id`**: note trỏ tới phải tồn tại, và phải là **note gốc thật** (chính nó có `parent_note_id == nil`) — nếu không, từ chối. Đây là điểm rủi ro chính: thiếu bước này thì tạo note C với `parent_note_id` trỏ vào note B (B đã là con của A) sẽ tạo ra 3 level ngầm, vi phạm giới hạn cứng của hệ thống.
- **Nếu `parent_note_id == nil` (tạo note độc lập/note gốc)**: `folder_id` trong body dùng trực tiếp (nullable — không có nghĩa là root).
- **Bài học đã gặp thực tế**: một middleware validate từng bị bỏ sót do quên gắn vào route (xem incident domain `folder` — request thiếu field vẫn lọt xuống DB vì middleware set locals không hề chạy). Khi implement `POST /notes` với 2 field mới, phải xác nhận middleware validate + đăng ký đúng ở route, không chỉ viết middleware rồi quên wire.

## API

| Method | Path      | Việc                                                    |
| ------ | --------- | -------------------------------------------------------- |
| POST   | `/notes`  | Tạo note — nhận thêm `folder_id?`, `parent_note_id?`       |
| PUT    | `/notes/:id` | Update note — chỉ sửa `title`/`content`, không đụng vị trí trong cây (xem [[FRD-move-note]] cho việc đổi vị trí) |

Các endpoint khác (`GET/DELETE /notes/:id`, `GET /notes`, `/notes/:id/links`, `/graph`, `/notes/autocomplete`) giữ nguyên như v1.
