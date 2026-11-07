# FRD — Share

Nguồn: [[BRD]], [[SPEC-v5]]. Phụ thuộc [[FRD-account]]. Cây và phạm vi: [[FRD-sitemap]].

## Mục tiêu

Cho **người ngoài workspace** đọc một phần tài liệu mà không biến họ thành member. Share khác member ở chỗ chỉ đọc một phần; khác publish ở chỗ người xem phải được mời và phải đăng nhập.

## Share khác member và publish thế nào

| | Member ([[FRD-account]]) | Share | Publish ([[FRD-publish]]) |
| --- | --- | --- | --- |
| Ai | Người được thêm vào workspace | Người được mời bằng email | Bất kỳ ai có URL |
| Cần đăng nhập | Có | Có (email đã xác minh) | Không |
| Quyền | Đọc và sửa mọi thứ | Chỉ đọc một phần | Chỉ đọc một phần |

## Yêu cầu

### Phạm vi

- Share **1 doc** (kèm mọi doc con) hoặc **1 folder** (kèm cả nhánh bên dưới), kể cả node thêm vào sau.
- Người được share chỉ **đọc**: xem nội dung đã render, sitemap trong phạm vi, trang trước/sau trong phạm vi, tab Backlinks giới hạn trong phạm vi. Không có editor, không có tab nhiều tài liệu ([[FRD-tabs]]), không có tìm kiếm ([[FRD-search]]).
- Link `[[...]]` trỏ ra ngoài phạm vi → hiển thị như link không truy cập được, không lộ nội dung hay title của doc ngoài phạm vi ([[FRD-wiki-link]]).

### Mời và quản lý

- Member của workspace mời bằng **email**. Người được mời phải đăng nhập bằng tài khoản có **email đã xác minh** trùng với email được mời (tài khoản chưa xác minh email không đọc được, để người đăng ký trước một email không đọc được tài liệu share cho email đó).
- Nodus **không gửi email mời** ở giai đoạn này: chủ sao chép đường dẫn và tự gửi. Người được mời đăng nhập rồi mở đường dẫn, hoặc thấy trong mục "Được chia sẻ với tôi". Mời người chưa có tài khoản vẫn được; quyền có hiệu lực khi họ đăng ký đúng email đó và xác minh.
- **Thu hồi** bất cứ lúc nào: người bị thu hồi mất quyền đọc ngay ở lần truy cập tiếp theo.
- Chủ xem được danh sách đang share của một doc/folder: ai, từ khi nào.
- Mọi API đọc doc, link, backlink kiểm tra quyền ở server qua hàm kiểm tra quyền duy nhất ([[FRD-account]]); người được share không đọc được gì ngoài phạm vi (`404`), và không ghi được gì (`403`).

## Chưa chốt

- Gửi email mời tự động (cần dịch vụ email như xác minh tài khoản).
- Role chỉ đọc cho member của workspace (thay cho share) — [[FRD-account]].
- Share qua link "ai có link trong cùng tổ chức".
