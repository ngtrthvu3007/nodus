# BRD — Nodus

> Định hướng sản phẩm chốt ngày 2026-11-04. Tóm tắt kỹ thuật xem [[SPEC-v5]], chi tiết từng tính năng xem `docs/frd/`.

## 1. Bối cảnh

- Nodus bắt đầu là project học tập: personal knowledge base với wiki-link, backlink, graph ([[SPEC-v1]] → [[SPEC-v4]]).
- Khi tự dùng thử, ghi chú cá nhân đơn thuần là bài toán nhỏ: người dùng (kể cả tác giả) vẫn ghi vào 1 file README cho nhanh, không có lý do đổi sang công cụ mới.
- Điều tác giả thực sự làm với Nodus là viết **tài liệu kỹ thuật dạng liên kết** — chính bộ SPEC/FRD trong repo này (markdown, mermaid, `[[FRD-...]]` link chéo).

## 2. Vấn đề

| # | Vấn đề | Hiện trạng |
| --- | --- | --- |
| 1 | Tài liệu markdown không link chéo được | `[[...]]` trên GitHub chỉ là chữ thường, không có backlink |
| 2 | Muốn có trang docs phải tự dựng | Docsify, MkDocs, Docusaurus cần cài, cấu hình, build, deploy |
| 3 | Chia sẻ, publish tài liệu rườm rà | Gửi file rời, hoặc phải dựng site riêng |

## 3. Định vị

> **Nodus là nơi viết tài liệu kỹ thuật dạng liên kết, có sitemap, share và publish được qua URL.**

Nodus cung cấp tính năng; người dùng dùng nó vào việc gì (spec, FRD, test case, tài liệu bàn giao, đồ án…) là quyền của họ, Nodus không thiết kế riêng cho từng cách dùng.

## 4. Người dùng

| | Nhóm |
| --- | --- |
| **Nhắm tới** | Dev, freelancer, team nhỏ **tự chọn được công cụ**; sinh viên IT làm đồ án |
| **Không nhắm tới** | Team trong công ty đã bị áp Confluence/Notion (không tự chọn công cụ); người duy trì open-source cần docs build tĩnh trong repo; ghi chép cá nhân phổ thông |

## 5. Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Viết markdown, mermaid, code block nhiều ngôn ngữ | Graph view, canvas |
| `[[wiki-link]]` + tab backlink | Tự theo dõi/tự đề xuất chỗ cần sửa |
| Sitemap dạng cây | Làm việc nhóm real-time (nhiều người cùng sửa) |
| Share, publish qua URL | Editor vẽ icon/SVG |
| MCP cho AI agent bên ngoài | Note là file JSON/YAML/HTML thuần |
| Chat AI trong app bằng key riêng (BYOK) | Chạy code/CSS/HTML của người dùng trên trang |

## 6. Mô hình kinh doanh

Lưu trữ theo kiểu draw.io: người dùng chọn nơi lưu.

| | Miễn phí | Trả phí |
| --- | --- | --- |
| Lưu trữ | Google Drive của người dùng | Hạ tầng Nodus |
| Chia sẻ | Share cho người cụ thể | Publish trang public qua URL |
| AI | BYOK (người dùng tự trả tiền token) | Để sau |

- Chỉ thu tiền cho phần làm Nodus tốn chi phí (lưu trữ, phục vụ trang public).
- Gói AI do Nodus trả tiền token: không bán gói rẻ — đọc tài liệu kỹ thuật cần model tầm trung trở lên (GPT-6.1 Terra / Sonnet 5.5), gói phải ở mức cao (ví dụ ~200 USD/tháng cho Opus 5.5). Để sau.

## 7. Nguyên tắc sản phẩm

- **Tính năng ≠ cách dùng**: chỉ đặc tả những gì hệ thống làm được.
- **Lõi chạy được khi không có AI**; AI chỉ tăng tốc. AI sửa tài liệu thì người dùng duyệt trước khi áp dụng.
- **Code chỉ hiển thị, không chạy**: mọi code block chỉ được tô màu, copy. Ngoại lệ: mermaid và SVG (đã qua lọc) được vẽ thành hình.
- **Dữ liệu là markdown thuần**: mang sang Drive, GitHub, VSCode, AI đều đọc được, không khóa người dùng vào Nodus.
- **Server không tin client**: mọi quy tắc dữ liệu validate ở server, dù request đến từ UI, API hay AI (MCP).

## 8. Rủi ro và giả định

| Rủi ro | Ghi chú |
| --- | --- |
| Người dùng ngại đổi/cài thêm công cụ | Rào cản lớn nhất, chưa có lời giải; cần người dùng thật để kiểm chứng |
| Phụ thuộc Google Drive API | Giới hạn quota, thay đổi chính sách, quy trình xét duyệt app của Google |
| Bảo mật trang publish | Nội dung do người dùng viết hiển thị cho người khác → bắt buộc lọc HTML/SVG |
| Chi phí LLM | Đã xử lý bằng BYOK; gói AI trả phí để sau |

## 9. Để sau

- Gói AI do Nodus cung cấp (gói cao).
- Thêm nơi lưu trữ: GitHub, OneDrive; có mặt trên marketplace tương ứng.
- Remote MCP (dùng MCP từ máy khác/Claude web mà không chạy Nodus local).
