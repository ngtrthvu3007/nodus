# FRD — Lưu trữ

Nguồn: [[BRD]], [[SPEC-v5]]. Phụ thuộc [[FRD-account]] (đăng nhập bằng bất kỳ phương thức nào, rồi kết nối Google Drive riêng).

## Mục tiêu

Người dùng chọn nơi lưu tài liệu theo kiểu draw.io: lưu ở Google Drive của chính mình (miễn phí) hoặc trên hạ tầng Nodus (trả phí). Dù lưu ở đâu, nội dung vẫn là markdown thuần và các tính năng lõi chạy như nhau.

## Hai chế độ

| | Chế độ Drive (miễn phí) | Chế độ Nodus (trả phí) |
| --- | --- | --- |
| Nơi lưu nội dung | Google Drive của người dùng | Database/hạ tầng Nodus |
| Ai giữ dữ liệu | Người dùng | Nodus |
| Điều kiện | Đã kết nối Google Drive (cấp quyền Drive) | Gói trả phí ([[FRD-billing]]) |
| Nodus ngừng hoạt động | File vẫn còn trên Drive | Người dùng cần export trước ([[FRD-export]]) |

## Yêu cầu

### Chế độ Drive

- Nodus tạo **1 thư mục gốc** trong Drive của người dùng (ví dụ `Nodus/`), chỉ đọc/ghi trong thư mục này.
- Cây tài liệu ánh xạ sang Drive:
  - Folder → thư mục.
  - Note gốc → file `.md`.
  - Note gốc có note con → thư mục cùng tên chứa file `.md` của note gốc và các file `.md` của note con.
- Nội dung file là đúng markdown người dùng viết, không chèn dữ liệu riêng của Nodus vào nội dung.
- Tạo, sửa, đổi tên, di chuyển, xóa trong Nodus → thực hiện tương ứng trên Drive.
- Xin quyền Drive ở mức hẹp nhất đủ dùng: scope `drive.file` (chỉ file do Nodus tạo/mở). Scope truy cập toàn bộ Drive bị Google xếp nhóm hạn chế, phải qua đánh giá bảo mật.

### Chế độ Nodus

- Lưu như hiện tại (Postgres), dữ liệu thuộc đúng tài khoản ([[FRD-account]]).
- Backup định kỳ, có kiểm tra khôi phục.

### Chung cho cả hai chế độ

- Các tính năng sau chạy như nhau ở cả hai chế độ: [[FRD-wiki-link]] (link, backlink, autocomplete), [[FRD-sitemap]] (thứ tự, trang trước/sau), tìm kiếm.
- Mỗi tài khoản chọn 1 chế độ; người dùng luôn thấy rõ tài liệu đang lưu ở đâu.
- Lỗi khi đọc/ghi nơi lưu (mất quyền Drive, hết dung lượng, mất mạng) → báo rõ cho người dùng, **không âm thầm mất nội dung đang sửa**.

## Cần duyệt

- Auth: xin scope Google Drive, quy trình xét duyệt app OAuth của Google.
- Schema: tách nội dung khỏi metadata (cây, thứ tự, link) để dùng chung cho hai chế độ.
- Kiến trúc: tầng truy cập lưu trữ có hai nguồn (Drive / Postgres).

## Chưa chốt

- Cách đánh chỉ mục nội dung từ Drive (để có backlink, autocomplete, tìm kiếm mà không đọc lại toàn bộ file mỗi lần).
- Người dùng sửa, đổi tên, xóa file trực tiếp trên Drive (ngoài Nodus) → Nodus phát hiện và đồng bộ thế nào; xung đột khi hai bên cùng sửa.
- Chuyển đổi giữa hai chế độ (Drive ↔ Nodus): có hỗ trợ không, chuyển toàn bộ hay từng phần.
- Giới hạn dung lượng của chế độ Nodus theo gói.
- Thêm GitHub, OneDrive làm nơi lưu — để sau ([[BRD]] mục 9).
