# FRD — Gói và thanh toán

Nguồn: [[BRD]] mục 6, [[SPEC-v5]]. Phụ thuộc [[FRD-account]], [[FRD-storage]], [[FRD-publish]].

## Mục tiêu

Thu tiền **chỉ cho phần làm Nodus tốn chi phí**: lưu trữ trên hạ tầng Nodus và phục vụ trang public. Mọi thứ không tốn chi phí của Nodus thì miễn phí.

## Yêu cầu

### Gói

| | Miễn phí | Trả phí |
| --- | --- | --- |
| Viết, wiki-link, backlink, sitemap | ✓ | ✓ |
| Lưu trữ | Google Drive của người dùng | Hạ tầng Nodus |
| Share cho người cụ thể ([[FRD-share]]) | ✓ | ✓ |
| Publish trang public ([[FRD-publish]]) | — | ✓ |
| Chat AI bằng key riêng ([[FRD-ai-chat]]) | ✓ | ✓ |

- Gói gắn với 1 tài khoản ([[FRD-account]]).
- Tài khoản mới mặc định là gói Miễn phí.
- Server kiểm tra gói trước mọi thao tác thuộc gói Trả phí (lưu lên Nodus, bật publish) — không dựa vào việc UI ẩn nút.

### Nâng cấp

- Thanh toán thành công → bật ngay quyền lưu trữ trên Nodus và publish.
- Người dùng xem được: gói hiện tại, ngày hết hạn, lịch sử thanh toán.

### Hết hạn hoặc hủy gói

Đề xuất:

1. **Gỡ publish ngay**: mọi trang public trả về trang "không còn khả dụng", URL không bị cấp cho người khác.
2. **Không xóa dữ liệu ngay**: tài liệu lưu trên Nodus chuyển sang **chỉ đọc**, giữ trong một khoảng thời gian (ví dụ 30 ngày).
3. **Cho export** toàn bộ trong thời gian giữ ([[FRD-export]]), hoặc chuyển sang lưu ở Google Drive.
4. Báo trước qua email trước khi hết hạn và trước khi xóa.
5. Gia hạn trong thời gian giữ → khôi phục nguyên trạng, kể cả các trang publish.

### Gói AI do Nodus trả tiền token

**Để sau.** Không bán gói AI giá rẻ: đọc tài liệu kỹ thuật cần model tầm trung trở lên (GPT-6.1 Terra / Sonnet 5.5), chi phí token của một người dùng tích cực vượt xa mức phí vài USD. Nếu làm, phải là gói cao (ví dụ ~200 USD/tháng để dùng Opus 5.5). Trước mắt AI chỉ chạy bằng key riêng của người dùng.

## Cần duyệt

- Tích hợp cổng thanh toán (thuộc nhóm payments/secrets).
- Schema: bảng gói/đăng ký/lịch sử thanh toán gắn với `users`.

## Chưa chốt

- Giá gói Trả phí.
- Cổng thanh toán: VietQR/MoMo (người dùng Việt Nam, không phí giao dịch quốc tế) hay Stripe (thẻ quốc tế, tự gia hạn).
- Hạn mức dung lượng lưu trữ trên Nodus (tài liệu, ảnh — [[FRD-image]]).
- Thanh toán theo tháng, theo năm, hay cả hai.
- Thời gian giữ dữ liệu sau khi hết hạn.
