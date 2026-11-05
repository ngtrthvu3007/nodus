# Nodus — SPEC v4: UI kiểu VSCode

> Áp dụng sau khi v3 xong. Chỉ nói về UI vùng làm việc chính (tabs, minimap graph).

## Layout `/` và `/notes/[id]`

```text
┌──────────────┬──────────────────────────────────────────┐
│  Sidebar     │  Tab bar (note đang mở)                    │
│  (resizable, ├──────────────────────────────────────────┤
│  collapse)   │  Main content            ┌───────────────┐│
│              │  (note đang active)      │ Minimap graph ││
│              │                          │ (float, ẩn/  ││
│              │                          │  hiện được)  ││
│              │                          └───────────────┘│
└──────────────┴──────────────────────────────────────────┘
```

## Hành vi

- **Sidebar**: giữ nguyên `splitter.vue` (resize + collapse).
- **Tab bar**: kiểu VSCode — click note ở sidebar → mở tab mới hoặc focus tab đã mở. Đóng tab bằng ×.
  - Persist qua `localStorage`: reload (F5) giữ nguyên danh sách tab + tab active.
  - Split pane (2 khối): chưa làm, để sau.
- **Minimap graph**: floating, góc trên-phải, hiện local graph của note ở tab active. Icon ẩn/hiện, không chiếm layout khi ẩn.

## `/graph`

Giữ nguyên v1 — full-screen, không sidebar/tab.

## Chưa chốt

- Split pane: UI kéo-thả tạo group thứ 2 — chưa thiết kế.
- Minimap graph: zoom/pan hay chỉ preview tĩnh, kích thước mặc định.
