# FRD — Chat AI trong app

Nguồn: [[BRD]] mục 5–7, [[SPEC-v5]]. Phụ thuộc [[FRD-account]], [[FRD-mcp]].

## Mục tiêu

Cho người dùng chat với AI ngay trong Nodus, AI đọc và sửa được tài liệu, mà **không cần cài hay cấu hình MCP**. Nodus không trả tiền token: AI chỉ chạy bằng key riêng của người dùng (BYOK).

## Yêu cầu

### Key

- Người dùng nhập API key của nhà cung cấp LLM và chọn model.
- Không có key → ẩn khung chat. **Mọi tính năng lõi vẫn chạy bình thường khi không có AI.**
- Key không bao giờ hiển thị lại đầy đủ sau khi lưu (chỉ hiện vài ký tự cuối), xóa được bất cứ lúc nào.

### Quyền và quy tắc

- AI dùng **cùng bộ tool với MCP** ([[FRD-mcp]]): tìm, đọc, tạo, sửa, di chuyển note; quản lý folder.
- AI có **đúng quyền của tài khoản đang đăng nhập** ([[FRD-account]]), không hơn.
- Mọi thao tác của AI đi qua **cùng API và cùng quy tắc ở server** như thao tác từ UI (kế thừa folder, giới hạn 2 cấp, validate tồn tại…).

### Duyệt trước khi áp dụng

- AI muốn tạo/sửa/di chuyển/xóa → **hiện thay đổi đề xuất** (diff nội dung, hoặc mô tả thao tác) để người dùng chấp nhận hoặc từ chối.
- Chỉ áp dụng khi người dùng chấp nhận. Thao tác chỉ đọc (tìm, đọc) không cần duyệt.
- Xóa note/folder luôn cần xác nhận riêng, kể cả khi người dùng đã chấp nhận các thay đổi khác.

### Minh bạch dữ liệu

- Trước lần dùng đầu tiên, báo rõ: nội dung tài liệu AI đọc sẽ được **gửi tới nhà cung cấp LLM** người dùng đã chọn, theo điều khoản của nhà cung cấp đó.
- Chi phí token do người dùng trả trực tiếp cho nhà cung cấp; Nodus không tính thêm.

## Ngoài phạm vi

- Gói AI do Nodus trả tiền token — xem [[FRD-billing]] (để sau).

## Cần duyệt

- Bảo mật key: nơi lưu, cách mã hóa, ai đọc được (thuộc nhóm secrets).

## Chưa chốt

- Danh sách nhà cung cấp hỗ trợ: Anthropic, OpenAI, xAI, Google.
- Key lưu ở **trình duyệt** (server không bao giờ thấy, nhưng mất khi đổi máy) hay **mã hóa ở server** (dùng được mọi nơi, nhưng Nodus phải giữ secret).
- Giới hạn ngữ cảnh: tối đa bao nhiêu note/bao nhiêu token AI được đọc trong 1 lượt.
- Lịch sử chat có lưu lại không, lưu ở đâu.
