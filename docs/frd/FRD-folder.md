# FRD — Folder

Nguồn: SPEC.md v2.

## Mục tiêu

Cho phép nhóm các note gốc (level 0) vào Folder để tổ chức, thay vì chỉ có note phẳng như v1.

## Yêu cầu

- CRUD đầy đủ: tạo, đổi tên, xóa, xem chi tiết (kèm danh sách note gốc bên trong).
- 1 note gốc thuộc **0 hoặc 1** folder (`folder_id` nullable). Note không thuộc folder nào coi là ở **root**.
- Folder chỉ áp dụng cho note gốc — note con không có `folder_id` riêng (xem [[FRD-note-hierarchy]]).

## Xóa Folder

- Nếu folder còn note bên trong (gốc hoặc có con): client hiện **alert cảnh báo trước**, yêu cầu user chuyển note cần giữ ra khỏi folder trước khi xóa.
- Nếu user xác nhận xóa bất chấp cảnh báo: xóa folder **cascade toàn bộ note gốc + note con bên trong** — không giữ lại note nào.

## Schema

```sql
CREATE TABLE folders (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`notes.folder_id UUID REFERENCES folders(id) ON DELETE CASCADE` — xem chi tiết bảng `notes` ở [[FRD-note-hierarchy]].

## API

| Method | Path          | Việc                                                    |
| ------ | ------------- | -------------------------------------------------------- |
| POST   | `/folders`    | Tạo folder                                                |
| GET    | `/folders`    | List folder                                               |
| GET    | `/folders/:id`| Chi tiết folder + danh sách note gốc bên trong             |
| PATCH  | `/folders/:id`| Đổi tên folder                                             |
| DELETE | `/folders/:id`| Xóa folder — cascade note bên trong (client đã confirm)    |
