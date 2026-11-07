# FRD — Lưu tự động & xung đột

Nguồn: [[ADR-001-tech-stack]] mục 6, [[SPEC-v5]]. Liên quan: [[FRD-doc]], [[FRD-mcp]], [[FRD-tabs]].

## Mục tiêu

Nội dung đang viết không bao giờ bị mất hay bị ghi đè âm thầm — kể cả khi cùng lúc có người sửa qua MCP hoặc tab khác. Bản `web-nodus` từng mất dữ liệu khi đang lưu hoặc chuyển trang.

## Yêu cầu

### Version (server)

- Mỗi doc có `version` (số nguyên, bắt đầu 1), tăng 1 sau mỗi lần ghi `title` hoặc `content`.
- `PUT /docs/:id` bắt buộc gửi `version` đang giữ (thiếu → `400 invalid_params`). Khớp → ghi và trả `version` mới. Không khớp → `409 version_conflict`, **không ghi**; bản hiện tại của server (`title`, `content`, `version`) nằm trong `error.data` của response.
- Mọi đường ghi nội dung (UI, MCP `update_doc`/`append_to_doc`, chat AI) đều theo quy tắc này.

### Tự lưu (client)

- Tự lưu sau khi ngừng gõ một khoảng ngắn; **hàng đợi một chỗ**: đang lưu mà có thay đổi mới thì lưu tiếp sau khi lần trước xong, không bỏ thay đổi, không chạy hai lần lưu song song.
- Lưu khi chuyển trang, đóng tab, đóng cửa sổ.
- Không bao giờ ghi đè nội dung người dùng đang gõ bằng dữ liệu trả về từ server.
- Trạng thái hiển thị: đã lưu / đang lưu / chưa lưu / lỗi.

### Xung đột

- Nhận `409` → giữ nguyên nội dung người dùng đang gõ, báo xung đột và cho chọn: giữ bản của mình (ghi đè có chủ ý), lấy bản server, hoặc sao chép nội dung của mình ra rồi lấy bản server.
- Lỗi mạng hoặc lỗi server → báo rõ, nội dung vẫn còn ở editor, tự thử lại.

## Chưa chốt

- Tự gộp khi hai bên sửa vùng khác nhau (hiện: không, chỉ báo xung đột).
- `version` cho thao tác đổi cây (move, đổi tên folder) có cần không (hiện: không).
