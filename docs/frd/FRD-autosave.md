# FRD — Lưu tự động & xung đột

Nguồn: [[ADR-001-tech-stack]] mục 6, [[SPEC-v5]]. Liên quan: [[FRD-doc]], [[FRD-mcp]], [[FRD-tabs]].

## Mục tiêu

Nội dung đang viết không bao giờ bị mất hay bị ghi đè âm thầm — kể cả khi cùng lúc có người sửa qua MCP hoặc tab khác. Bản `web-nodus` từng mất dữ liệu khi đang lưu hoặc chuyển trang.

## Yêu cầu

### Version (server)

- Mỗi doc có `version` (số nguyên, bắt đầu 1), tăng 1 sau mỗi lần ghi `content`.
- `PUT /docs/:id` chỉ nhận `content` và `version`; `version` bắt buộc (thiếu → `400 invalid_params`). Khớp → ghi và trả `version` mới. Không khớp → `409 version_conflict`, **không ghi**; bản hiện tại của server (`title`, `content`, `version`) nằm trong `error.data` của response.
- Đổi tên doc đi qua `PATCH /docs/:id/title`, không cần `version` và không làm `version` tăng: đổi tên không đụng `content`, nên không gây `409` cho lần tự lưu đang chờ.
- Mọi đường ghi nội dung (UI, MCP `update_note`/`append_to_note`, chat AI) đều theo quy tắc `version`.

### Tự lưu (client)

- Tự lưu sau khi ngừng gõ một khoảng ngắn (gõ liên tục thì vẫn lưu, chậm nhất sau 10 giây); **hàng đợi một chỗ**: đang lưu mà có thay đổi mới thì lưu tiếp sau khi lần trước xong, không bỏ thay đổi, không chạy hai lần lưu song song.
- Lưu khi chuyển trang, đóng tab, đóng cửa sổ. Request lúc đóng tab không gửi được doc lớn hơn khoảng 64 KB, nên khi còn nội dung chưa lưu, trình duyệt hỏi xác nhận trước khi rời trang.
- Không bao giờ ghi đè nội dung người dùng đang gõ bằng dữ liệu trả về từ server.
- Trạng thái hiển thị cạnh nút Format của editor: đã lưu / đang lưu / chưa lưu / lỗi / xung đột / doc đã bị xóa. Chưa lưu và lỗi kèm đếm ngược tới lần lưu hoặc lần thử lại kế tiếp.

### Xung đột

- Nhận `409` → giữ nguyên nội dung người dùng đang gõ, báo xung đột và cho chọn: giữ bản của mình (ghi đè có chủ ý), lấy bản server, hoặc sao chép nội dung của mình ra rồi lấy bản server.
- Lấy bản server thay nội dung editor trong một bước hoàn tác, nên hoàn tác đưa chữ của người dùng trở lại; lần thay này không kích hoạt thêm một lần lưu.
- Lỗi mạng hoặc lỗi server (`5xx`) → báo rõ, nội dung vẫn còn ở editor, tự thử lại tối đa 5 lần (cách nhau 5 giây); hết lượt thì dừng, lần sửa kế tiếp bắt đầu lại.
- Doc đã bị xóa ở nơi khác (`404 doc_not_found`) → báo "doc đã bị xóa", dừng lưu, nội dung vẫn còn ở editor.

## Chưa chốt

- Tự gộp khi hai bên sửa vùng khác nhau (hiện: không, chỉ báo xung đột).
- `version` cho thao tác đổi cây (move, đổi tên folder) có cần không (hiện: không).
- Thử lại có cần tăng dần khoảng chờ (backoff) không (hiện: khoảng chờ cố định).
- Quay lại một trang đã ẩn mà doc đã bị sửa ở nơi khác: hiện vẫn thấy bản cũ cho tới lần gõ đầu tiên (hộp thoại xung đột); có nên tự lấy bản mới khi người dùng chưa gõ gì.
