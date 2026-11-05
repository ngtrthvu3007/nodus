# FRD — Bỏ graph

Nguồn: [[BRD]], [[SPEC-v5]].

## Mục tiêu

Bỏ phần graph khỏi sản phẩm. Graph nhìn đẹp nhưng không giúp được việc cụ thể khi viết tài liệu kỹ thuật; nhu cầu "xem chỗ liên quan" đã có tab Backlinks ([[FRD-wiki-link]]), nhu cầu "xem cấu trúc" chuyển sang sitemap ([[FRD-sitemap]]).

## Hiện trạng

Graph chỉ còn trong `web-nodus` (đã deprecated, xem [[ADR-001-tech-stack]]):

| Hạng mục | Spec gốc | Code |
| --- | --- | --- |
| Tab "Graph" ở panel phải | [[SPEC-v1]] | `web-nodus`: `components/note/backlinks-panel.vue` → `LazyNoteGraphPanel` |
| Component vẽ graph | [[SPEC-v1]] | `web-nodus`: `components/note/graph-panel.vue` (dùng `v-network-graph`, `d3-force`) |
| Global graph `/graph`, API `/graph`, `/notes/:id/graph` | [[SPEC-v1]] | Chưa từng làm |
| Minimap graph nổi | [[SPEC-v4]] | Chưa làm |

## Yêu cầu

- `next-nodus` **không có graph**: panel tài liệu chỉ có Preview và Links (Backlinks + Outgoing).
- `web-nodus` không cần gỡ graph riêng — graph biến mất khi gỡ `web-nodus` ở giai đoạn 3 của [[ADR-001-tech-stack]].
- Dữ liệu không đổi: `note_links` giữ nguyên, Backlinks vẫn dùng.
