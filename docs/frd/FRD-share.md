# FRD — Share

Nguồn: [[BRD]], [[SPEC-v5]]. Phụ thuộc [[FRD-account]], [[FRD-storage]].

## Mục tiêu

Cho **người cụ thể** đọc tài liệu của mình, miễn phí. Share khác publish ở chỗ người xem phải được mời và phải đăng nhập; nội dung không công khai cho người lạ.

## Share khác publish thế nào

| | Share (miễn phí) | Publish (trả phí, [[FRD-publish]]) |
| --- | --- | --- |
| Ai đọc được | Người được mời | Bất kỳ ai có URL |
| Người đọc cần gì | Đăng nhập tài khoản được mời | Không cần tài khoản |
| Quyền | Chỉ đọc | Chỉ đọc |
| Ai tốn chi phí | Không đáng kể (quyền do Drive hoặc Nodus kiểm soát) | Nodus phục vụ trang public |

## Yêu cầu

- Phạm vi share: **1 note** hoặc **1 folder** (gồm mọi note bên trong, kể cả note thêm vào sau).
- Người được share chỉ **đọc**: xem nội dung đã render, sitemap trong phạm vi share, tab Backlinks giới hạn trong phạm vi được share.
- Link `[[...]]` trỏ ra ngoài phạm vi share → hiển thị như link không truy cập được, không lộ nội dung hay title của note ngoài phạm vi.
- **Thu hồi** bất cứ lúc nào: người bị thu hồi mất quyền đọc ngay ở lần truy cập tiếp theo.
- Chủ tài liệu xem được danh sách đang share: ai, phạm vi nào.

### Chế độ Drive

- Quyền đọc dựa vào **quyền chia sẻ của Google Drive**: share trong Nodus = cấp quyền xem file/thư mục tương ứng trên Drive cho email đó.
- Thu hồi trong Nodus = gỡ quyền trên Drive. Quyền bị gỡ trực tiếp trên Drive → người đó cũng mất quyền đọc trong Nodus.

### Chế độ Nodus

- Mời bằng **email**. Người được mời đăng nhập ([[FRD-account]]) bằng đúng email đó để đọc.
- Quyền lưu ở Nodus; thu hồi = xóa quyền.

## Cần duyệt

- Auth/permissions: quyền đọc chéo tài khoản, kiểm tra quyền ở mọi API đọc note, link, backlink.
- Schema: bảng quyền share (chế độ Nodus).

## Chưa chốt

- Người được mời chưa có tài khoản Nodus: gửi email mời hay chỉ hiển thị khi họ tự đăng nhập.
- Có quyền sửa (không chỉ đọc) không — hiện ngoài phạm vi vì [[BRD]] loại làm việc nhóm real-time.
- Share qua link "ai có link trong cùng domain/tổ chức" như Drive có hỗ trợ không.
