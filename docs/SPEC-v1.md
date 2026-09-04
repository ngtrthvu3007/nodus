# Nodus — Personal Knowledge Base (v1) - Decrecapte

> Bản demo nhẹ, không tiếp tục mở rộng. Xem [SPEC-v2.md](SPEC-v2.md) cho hướng phát triển chính thức.

Ghi chú markdown có wiki-link (`[[Tên note]]`), backlink tự động, graph view.

## Stack

- Backend: Go (`fiber`, `sqlc` + `pgx` cho DB access)
- Frontend: Nuxt 3 + Tailwind + Nuxt UI
- DB: Postgres
- Graph rendering: `v-network-graph` hoặc `vis-network`

## Schema

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE note_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_note_id, target_note_id)
);
```

`note_links` rebuild mỗi lần save note: parse `content` tìm `[[Tên note]]` → resolve title → target_note_id → xóa link cũ, insert lại.

## API

| Method | Path                     | Việc                           |
| ------ | ------------------------ | ------------------------------ |
| POST   | `/notes`                 | Tạo note                       |
| GET    | `/notes?q=`              | List + search                  |
| GET    | `/notes/:id`             | Chi tiết                       |
| PUT    | `/notes/:id`             | Update → rebuild `note_links`  |
| DELETE | `/notes/:id`             | Xóa                            |
| GET    | `/notes/:id/links`       | Outgoing + backlinks           |
| GET    | `/notes/:id/graph`       | Node+edge quanh note (1-2 hop) |
| GET    | `/graph`                 | Global graph                   |
| GET    | `/notes/autocomplete?q=` | Gợi ý title khi gõ `[[`        |

## Pages

- `/` — list note (card, title + preview + updated_at), search bar.
- `/notes/[id]` — 3 cột: sidebar (search + list) | editor markdown (raw + preview, split view) | local graph.
- `/graph` — global graph full-screen, force-directed, zoom/pan, click node → điều hướng.

```text
┌──────────────┬─────────────────────────────┬───────────────┐
│  Sidebar     │  Top bar (title, actions)    │               │
│  (240px)     ├─────────────────────────────┤  Local graph  │
│              │  Editor / content area       │  (280px)      │
└──────────────┴─────────────────────────────┴───────────────┘
```

## Hành vi chính

- Auto-save debounce 800ms, không có nút Save tường minh.
- Gõ `[[` → autocomplete dropdown → Enter/click chèn `[[Title]]`.
- Note không tồn tại → broken link (dashed underline / node viền đứt trong graph).
- Link resolve theo **title**, không theo ID. Note chưa tồn tại → không tạo link (bỏ qua) tới khi note đó xuất hiện.

## Roadmap (đã dừng, xem v2)

1. CRUD note cơ bản
2. Parse `[[link]]` → `note_links` → backlink
3. Local graph
4. Autocomplete `[[`
5. Search full-text (`tsvector`)
6. Global graph
7. Canvas kéo thả (mở rộng, chưa làm)
