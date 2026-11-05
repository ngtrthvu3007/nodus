# FRD — Note phân cấp (parent/child)

Nguồn: [[SPEC-v2]].

## Mục tiêu

Cho phép 1 note có note con, tối đa 2 level, để tổ chức note theo outline thay vì chỉ note phẳng như v1.

## Yêu cầu

- **Level 0 (note gốc)**: có thể thuộc 1 [[FRD-folder|folder]] hoặc đứng độc lập (root).
- **Level 1 (note con)**: thuộc đúng 1 note cha (level 0). Không có level 2 — note con không thể có con riêng.
- Nội dung note: chỉ markdown thuần (không có rich-text/plain-text riêng — rich-text không convert lossless về markdown).
- 1 note cha có thể có 0 hoặc nhiều note con.
- Quan hệ cha–con thiết lập lúc **tạo note** ("+ New note" trong context của 1 note gốc → tạo note con), hoặc sau đó qua [[FRD-move-note]].
- Note gốc được re-parent (thành con của note gốc khác) **nếu chưa có con nào**; đang có con thì chặn, vì sẽ tạo 3 level (chốt ở [[SPEC-v2]], đã implement).
- Nút "+ New note" xuất hiện trên **mọi note gốc** trong sidebar (không giới hạn note đặc biệt nào) — bấm tại note gốc nào thì note đó thành cha, giống Notion/Obsidian. Không có modal chọn note cha từ danh sách; cha luôn được xác định ngầm bởi context (note đang bấm).

## Kế thừa Folder

- Note con **không có `folder_id` riêng** — luôn kế thừa folder của note cha.
- Hệ quả: nếu note cha ở root (không folder), note con của nó cũng ở root.
- Khi note cha đổi folder (xem [[FRD-move-note]]), note con tự động đi theo — không cần cập nhật riêng.

## Xóa Note cha

- Xóa note cha → **cascade xóa toàn bộ note con** của nó, không cần xác nhận riêng từng con.
- Note dùng soft delete (`deleted_at`) nên FK `ON DELETE CASCADE` không chạy — câu lệnh xóa note cha tự soft delete luôn note con.

## Schema

```sql
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    folder_id       UUID REFERENCES folders(id) ON DELETE CASCADE,
    parent_note_id  UUID REFERENCES notes(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_notes_folder_id ON notes (folder_id);
CREATE INDEX idx_notes_parent_note_id ON notes (parent_note_id);
```

`note_links` giữ nguyên như v1, không đổi.

## Ràng buộc kiểm tra ở backend

Không diễn đạt được bằng CHECK constraint (cần so sánh chéo hàng) — backend bắt buộc tự kiểm tra trước khi ghi:

- Nếu `parent_note_id IS NOT NULL` → `folder_id` của chính note đó phải luôn là `NULL` khi lưu (giá trị hiệu lực lấy từ `folder_id` của note cha lúc truy vấn/hiển thị).
- Note có `parent_note_id IS NOT NULL` không được là cha của note khác — chặn khi set `parent_note_id`: từ chối nếu note cha đó đã có `parent_note_id` riêng (chặn quá 2 level).
- Hai ràng buộc trên giữ đúng cả khi nhiều request chạy đồng thời (tạo note con, move note): việc kiểm tra và ghi là một thao tác nguyên tử, không có thứ tự request nào tạo ra cây 3 level.

## Tạo note — `folderId` và `parentNoteId` cùng trong `POST /notes`

`POST /notes` nhận cả 2 field optional cùng lúc (`folderId?`, `parentNoteId?` — JSON dùng camelCase, cột DB là `folder_id`, `parent_note_id`). UI chặn trước ở client (ẩn/disable chọn folder khi đang tạo note con), nhưng đây chỉ là lớp bảo vệ phụ — **server không được tin UI đã chặn đúng**, bắt buộc tự validate/tự override:

- **Nếu có `parentNoteId` (tạo note con)**: server **ưu tiên `parentNoteId`**, bỏ qua `folderId` client gửi lên (nếu có) và lưu `folder_id = NULL` — folder hiệu lực lấy từ note cha khi đọc (đúng rule kế thừa). Không trả lỗi khi client lỡ gửi cả 2 field.
- **Validate bắt buộc khi có `parentNoteId`**: note trỏ tới phải tồn tại, và phải là **note gốc thật** (chính nó có `parent_note_id == nil`) — nếu không, từ chối. Đây là điểm rủi ro chính: thiếu bước này thì tạo note C với `parent_note_id` trỏ vào note B (B đã là con của A) sẽ tạo ra 3 level ngầm, vi phạm giới hạn cứng của hệ thống.
- **Nếu không có `parentNoteId` (tạo note gốc)**: `folderId` trong body dùng trực tiếp (nullable — `null` nghĩa là root); `folderId` phải trỏ folder tồn tại.
- **Bài học đã gặp thực tế**: một bước validate từng bị bỏ sót vì không được gắn vào route, nên request thiếu field vẫn lọt xuống DB. Mỗi route phải bind đúng DTO có validate, không chỉ viết validate rồi quên dùng.

## API

| Method | Path      | Việc                                                    |
| ------ | --------- | -------------------------------------------------------- |
| POST   | `/notes`  | Tạo note — nhận thêm `folderId?`, `parentNoteId?`          |
| PUT    | `/notes/:id` | Update note — chỉ sửa `title`/`content`, không đụng vị trí trong cây (xem [[FRD-move-note]] cho việc đổi vị trí) |

Title (`POST` và `PUT`): bỏ khoảng trắng hai đầu rồi lưu; sau khi bỏ phải dài 1–200 ký tự, sai → `400` `invalid_params`.

Các endpoint khác (`GET/DELETE /notes/:id`, `GET /notes`, `/notes/:id/links`, `/notes/autocomplete`) giữ nguyên như v1. Note không tồn tại (hoặc đã xóa) → `404`. Graph đã bỏ ở [[SPEC-v5]].
