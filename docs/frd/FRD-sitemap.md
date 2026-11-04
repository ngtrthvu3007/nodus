# FRD — Sitemap

Nguồn: [[SPEC-v5]]. Dựa trên cây sẵn có ở [[FRD-folder]], [[FRD-note-hierarchy]].

## Mục tiêu

Bộ tài liệu đọc được theo **thứ tự tác giả muốn** (Tổng quan → Cài đặt → API…), không theo bảng chữ cái hay ngày tạo. Sitemap là cây đó, dùng ở sidebar khi viết và ở trang publish khi đọc.

## Yêu cầu

- Cây 3 tầng như hiện có: folder → note gốc → note con (tối đa 2 cấp note).
- **Sắp xếp thủ công bằng kéo thả** trong cùng 1 cấp:
  - Thứ tự folder.
  - Thứ tự note gốc trong 1 folder (hoặc ở root).
  - Thứ tự note con trong 1 note cha.
- Kéo sang cấp/cha khác = **move** → đi qua đúng quy tắc của [[FRD-move-note]], không có đường tắt.
- Note/folder mới tạo → nằm cuối danh sách cùng cấp.
- **Trang trước / trang sau** khi đọc 1 note: theo thứ tự duyệt cây từ trên xuống (folder → note gốc → các note con của nó → note gốc kế tiếp…).

## Ví dụ

```text
📁 Nodus
   1. Tổng quan
   2. Cách chạy dự án
   3. Kiến trúc backend
      3.1 Module note
      3.2 Module notelink
   4. FRD
```

Đang đọc "3.1 Module note" → trang trước "3. Kiến trúc backend", trang sau "3.2 Module notelink".

## Cần duyệt

- Schema: thêm cột thứ tự (ví dụ `position`) cho `folders` và `notes`, kèm migration.
- API: endpoint đổi thứ tự (ví dụ `PATCH /notes/:id/position`, `PATCH /folders/:id/position`) — thay đổi API contract.

## Chưa chốt

- Cách lưu thứ tự (số nguyên đánh lại khi chèn, hay số thực/fractional index để tránh cập nhật hàng loạt).
- Sitemap ở trang publish hiển thị toàn bộ cây hay chỉ phạm vi đã publish — xem [[FRD-publish]].
