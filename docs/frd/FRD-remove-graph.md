# FRD — Bỏ graph

Nguồn: [[BRD]], [[SPEC-v5]].

## Mục tiêu

Bỏ phần graph khỏi sản phẩm. Graph nhìn đẹp nhưng không giúp được việc cụ thể khi viết tài liệu kỹ thuật; nhu cầu "xem chỗ liên quan" đã có tab Backlinks ([[FRD-wiki-link]]), nhu cầu "xem cấu trúc" chuyển sang sitemap ([[FRD-sitemap]]).

## Hiện trạng

| Hạng mục | Spec gốc | Code hiện tại |
| --- | --- | --- |
| Tab "Graph" ở panel phải (cạnh Preview, Backlinks) | [[SPEC-v1]] | Có: `components/note/backlinks-panel.vue` → `LazyNoteGraphPanel` |
| Component vẽ graph | [[SPEC-v1]] | Có: `components/note/graph-panel.vue` |
| Plugin + CSS `v-network-graph` | [[SPEC-v1]] | Có: `plugins/v-network-graph.ts`, `nuxt.config.ts` (`css`), `package.json` |
| Global graph `/graph`, API `/graph`, `/notes/:id/graph` | [[SPEC-v1]] | Chưa từng làm |
| Minimap graph nổi | [[SPEC-v4]] | Chưa làm |

## Yêu cầu

- Panel phải chỉ còn 2 tab: **Preview**, **Backlinks**.
- Xóa `graph-panel.vue`, `plugins/v-network-graph.ts`, CSS trong `nuxt.config.ts`, gỡ dependency `v-network-graph`.
- Bỏ minimap graph khỏi [[SPEC-v4]] (không làm).
- Dữ liệu không đổi: `note_links` vẫn giữ nguyên, Backlinks vẫn dùng.

## Cần duyệt

- Xóa file và gỡ dependency thuộc nhóm phải duyệt trước (`AGENTS.md`). Người dùng chạy `bun remove v-network-graph`.
