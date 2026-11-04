# FRD — Chèn ảnh

Nguồn: [[SPEC-v5]]. Phụ thuộc: [[FRD-storage]]. Liên quan: [[FRD-publish]], [[FRD-editor-preview]].

## Mục tiêu

Chèn ảnh (ảnh chụp màn hình, sơ đồ) vào tài liệu mà không phải tự upload lên chỗ khác rồi dán link.

## Yêu cầu

- Chèn bằng **dán** (clipboard) hoặc **kéo thả** file vào editor.
- Sau khi tải lên xong, editor chèn cú pháp markdown chuẩn: `![alt](url)`. Nội dung vẫn là markdown thuần.
- **Alt text**: mặc định lấy tên file (bỏ đuôi), người dùng sửa được trực tiếp trong cú pháp.
- Định dạng nhận: PNG, JPEG, GIF, WebP, SVG.
- **Giới hạn dung lượng** mỗi ảnh; vượt giới hạn → báo lỗi, không chèn.
- Trong lúc tải lên → hiển thị trạng thái đang tải; lỗi → báo lỗi, không để lại cú pháp hỏng trong nội dung.
- Ảnh SVG hiển thị qua thẻ ảnh (không chạy script) — theo [[FRD-editor-preview]].

## Nơi lưu ảnh

Ảnh lưu **cùng chế độ lưu trữ với tài liệu** ([[FRD-storage]]):

| Chế độ của tài liệu | Ảnh lưu ở |
| --- | --- |
| Google Drive (miễn phí) | Drive của người dùng, cạnh tài liệu |
| Hạ tầng Nodus (trả phí) | Hạ tầng Nodus, tính vào dung lượng của gói |

## Hiển thị

- Preview: hiển thị ảnh, co theo chiều rộng khung.
- Trang share/publish ([[FRD-share]], [[FRD-publish]]): người xem thấy ảnh mà **không cần quyền truy cập Drive** của tác giả khi tài liệu đã publish.
- Ảnh từ URL ngoài (`![](https://...)`) vẫn hiển thị bình thường, không tải về.

## Cần duyệt

- Schema/lưu trữ: bảng metadata ảnh (chủ sở hữu, nơi lưu, dung lượng) hoặc cách tham chiếu file trên Drive.
- API upload ảnh (thay đổi API contract), giới hạn dung lượng cụ thể.

## Chưa chốt

- Con số giới hạn dung lượng mỗi ảnh và tổng dung lượng gói trả phí.
- Ảnh trên Drive hiển thị ở trang publish bằng cách nào (Nodus sao chép sang hạ tầng của mình khi publish, hay đọc trực tiếp từ Drive).
- Xóa tài liệu thì ảnh đi kèm có tự xóa không.
- Có nén/resize ảnh khi tải lên không.

## Ngoài phạm vi

- Chỉnh sửa ảnh (cắt, vẽ, chú thích lên ảnh).
- Thư viện ảnh dùng chung giữa các tài khoản.
