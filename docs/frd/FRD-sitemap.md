# FRD — Sitemap (cấu trúc cây & thứ tự)

Nguồn: [[SPEC-v5]]. Node trong cây: [[FRD-folder]], [[FRD-doc]]. Di chuyển: [[FRD-move]].

## Mục tiêu

Bộ tài liệu đọc được theo **thứ tự tác giả muốn** (Tổng quan → Cài đặt → API…), không theo bảng chữ cái hay ngày tạo. Sitemap là cây đó, dùng ở sidebar khi viết, ở view share và ở trang publish khi đọc. File này là nguồn duy nhất của quy tắc đặt chỗ và độ sâu.

## Cấu trúc cây

Hai loại node: **folder** (chỗ chứa) và **doc** (nội dung). Mỗi workspace có một cây riêng ([[FRD-account]]).

| Node | Được nằm ở |
| --- | --- |
| Folder | Root, hoặc trong folder |
| Doc | Root, trong folder, hoặc trong doc khác |

- **Độ sâu tối đa 4 cấp** từ root, tính cả folder lẫn doc (ví dụ `Dự án` → `Backend` → `API` → `Auth`). Giá trị này là một hằng số ở server; nâng lên sau không cần đổi dữ liệu.
- **Tên duy nhất trong cùng cha**: hai node cùng cha (folder hoặc doc, tính chung) không được trùng tên, không phân biệt hoa thường; vi phạm khi tạo, đổi tên, move → `409 name_conflict`. Nhờ đó tên file khi export và đường dẫn `[[Folder/Tên]]` luôn rõ ràng. Các node khác cha, hoặc khác workspace, được trùng tên.
- Mọi quy tắc trên kiểm tra ở server cho mọi đường tạo/move (UI, API, MCP).

## Thứ tự

- Folder và doc cùng cha nằm trong **một danh sách có thứ tự chung**, hiển thị xen kẽ đúng thứ tự (root cũng là một danh sách).
- **Kéo thả** đổi thứ tự trong cùng cha, hoặc kéo sang cha khác = **move** → đi qua đúng quy tắc [[FRD-move]], không có đường tắt.
- Node mới tạo nằm cuối danh sách cùng cha.
- **Trang trước / trang sau** khi đọc một doc: duyệt cây từ trên xuống, chỉ tính **doc** (bỏ qua folder, vì folder không có nội dung): doc → các doc con của nó → doc kế tiếp cùng cấp → … Ở view share và trang publish, trang trước/sau chỉ tính trong phạm vi được xem ([[FRD-share]], [[FRD-publish]]).

## Ví dụ

```text
📁 Nodus
   📄 Tổng quan
   📄 Cách chạy dự án
   📄 Kiến trúc backend
      📄 Module doc
      📄 Module link
   📁 FRD
      📄 FRD-doc
```

Đang đọc "Module doc" → trang trước "Kiến trúc backend", trang sau "Module link".

## Chưa chốt

- Cách lưu thứ tự: hiện dùng số nguyên cách nhau 1024, đánh số lại các node cùng cha khi hết chỗ chèn; chuyển sang fractional index nếu cây lớn khiến việc đánh số lại chậm.
