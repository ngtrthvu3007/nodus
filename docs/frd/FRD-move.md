# FRD — Move

Nguồn: [[SPEC-v2]]. Quy tắc cây: [[FRD-sitemap]].

## Mục tiêu

Đổi **vị trí của một folder hoặc một doc trong cây**: sang cha khác, lên root, hoặc đổi thứ tự trong cùng cha.

## API

`PATCH /folders/:id/move` và `PATCH /docs/:id/move`. Body:

```json
{ "parentId": "f2", "afterId": "d3" }
```

| Field | Ý nghĩa |
| --- | --- |
| `parentId` | Cha mới. `null` = root. Folder chỉ nhận cha là folder hoặc root |
| `afterId` | Đặt ngay sau node này trong danh sách con của cha mới. `null` = đứng đầu danh sách |

- Server tra `parentId` và `afterId` ở folder rồi ở doc. `afterId` phải là con trực tiếp của `parentId` (không thì `400 invalid_params`).
- Chỉ đổi thứ tự trong cùng cha = gửi `parentId` hiện tại kèm `afterId` mới.
- Response: `{ "id", "parentId", "position" }`.
- Contract này thay cho cặp `folderId`/`parentNoteId` cũ (bắt buộc có key nhưng cho phép null): chỉ còn một `parentId`.

## Quy tắc kiểm tra

1. Node, cha mới và `afterId` phải tồn tại và cùng workspace (không → `404`).
2. Không chuyển node vào **chính nó** hoặc vào **bất kỳ node nào trong cây con của nó** (`400 cycle`).
3. Folder chỉ vào root hoặc folder; doc vào root, folder hoặc doc (`400 invalid_params`).
4. Sau khi chuyển, node và mọi con của nó không vượt độ sâu tối đa ([[FRD-sitemap]]) (`400 max_depth_exceeded`).
5. Đích không được đã có node cùng tên (không phân biệt hoa thường) trong cùng cha mới → `409 name_conflict`.
6. Doc/folder con đi theo node cha khi cha được chuyển; không cập nhật riêng.

- Kiểm tra và cập nhật chạy trong một transaction có khóa dòng workspace: hai move/tạo đồng thời không thể cùng vượt qua các bước trên rồi làm sai cây (ví dụ cả hai cùng đẩy node vào cây con của nhau).
- Chọn đúng vị trí hiện tại → không đổi gì.

## Kéo thả trên sidebar

- Kéo node trong cây là cách gọi API move trên: thả **vào khe giữa hai node** = đổi thứ tự (`afterId`), thả **vào giữa một folder** = đặt làm con đầu tiên của folder đó (folder đang đóng thì tự mở).
- Client chặn sớm các nước đi chắc chắn sai để người dùng thấy ngay: kéo folder lên một doc thì doc đó chuyển xám và thả không có tác dụng; không thả node vào chính nó hay vào cây con của nó; không thả vào hàng đang nhập tên. Đây chỉ là gợi ý giao diện, server vẫn kiểm tra đủ mọi quy tắc ở mục trên.
- Server trả lỗi (`400 max_depth_exceeded`, `409 name_conflict`...) thì hiện thông báo và cây giữ nguyên như cũ; sau mỗi thay đổi thành công cây được tải lại.
