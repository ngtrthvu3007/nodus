# FRD — Tab tài liệu

Nguồn: [[SPEC-v4]] (phần tab bar), [[SPEC-v5]]. Liên quan: [[FRD-wiki-link]], [[FRD-sitemap]].

## Mục tiêu

Mở nhiều tài liệu cùng lúc trong workspace và chuyển nhanh giữa chúng — viết tài liệu dạng liên kết thường phải qua lại giữa vài trang.

## Yêu cầu

- Thanh tab nằm phía trên vùng nội dung của workspace. Chỉ có ở workspace, không có ở trang share/publish.
- Mở tài liệu từ bất kỳ đâu (cây sitemap, Backlinks, `[[wiki-link]]` trong preview, kết quả tìm kiếm):
  - Tài liệu đã có tab → chuyển tới tab đó.
  - Chưa có → mở tab mới, đặt ngay sau tab đang active.
- Tab hiện title tài liệu; title đổi → tab cập nhật theo.
- Đóng tab bằng nút ×. Đóng tab đang active → chuyển sang tab bên cạnh; đóng tab cuối cùng → về trang chủ workspace.
- Tab có thay đổi chưa lưu → hiện dấu hiệu trên tab. Đóng tab khi đang lưu → chờ lưu xong, không mất nội dung.
- Tài liệu bị xóa (ở tab khác, qua MCP, hoặc người khác) → tab tự đóng.
- Reload trang → giữ nguyên danh sách tab và tab đang active (lưu ở trình duyệt, theo từng tài khoản).
- URL luôn trỏ tới tài liệu ở tab đang active, nên copy link hay mở lại vẫn đúng trang.

## Ngoài phạm vi

- Đồng bộ danh sách tab giữa các thiết bị.

## Chưa chốt

- Chia đôi màn hình (2 nhóm tab) — [[SPEC-v4]] để sau.
- Tab xem tạm kiểu VSCode (bấm 1 lần mở tab tạm, sửa hoặc bấm đúp mới giữ tab).
- Giới hạn số tab mở cùng lúc.
- Kéo thả sắp xếp tab, phím tắt chuyển/đóng tab.
