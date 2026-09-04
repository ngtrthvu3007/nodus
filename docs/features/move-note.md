# Move note — `PATCH /notes/:id/move`

Nguồn: [[FRD-move-note]], [[FRD-note-hierarchy]]. Code: `go-nodus/internal/note/` (`routes.go`, `middleware.go`, `handler.go`, `repository.go`).

## Use case (tương ứng nhánh trong sơ đồ)

| # | Note đang move | Input | Kết quả | Nhánh |
|---|---|---|---|---|
| 1 | Note gốc | `folderId` hợp lệ, `parentNoteId: null` | Đổi folder, note con (nếu có) tự kế thừa | `isChild=không` → `folderId≠null` → **FolderExists=có** → **Move** |
| 2 | Note gốc | `folderId` không tồn tại | `400` | `isChild=không` → `folderId≠null` → **FolderExists=không** → **Err** |
| 3 | Note gốc | `parentNoteId≠null` (bất kể có con hay không) | `400` | `isChild=không` → `parentNoteId≠null` → **Err: root không re-parent** |
| 4 | Note con | `folderId` hợp lệ, `parentNoteId: null` | Tách khỏi cha, thành note gốc ở folder đó | `isChild=có` → `folderId≠null` → **FolderExists=có** → **Move** |
| 5 | Note con | `parentNoteId` hợp lệ (note gốc thật), `folderId: null` | Tách khỏi cha cũ, nối vào cha mới | `isChild=có` → `parentNoteId≠null` → **ParentValid=có** → **Move** |
| 6 | Note con | `parentNoteId` trỏ vào 1 note đã có cha (3-level) | `400` | ...→ **ParentValid=không (không phải root)** → **Err** |
| 7 | Note con | `parentNoteId` trỏ chính nó | `400` | ...→ **ParentValid=không (chính nó)** → **Err** |
| 8 | Bất kỳ | Thiếu hẳn 1 key trong body | `400` (chặn ở middleware) | Không tới handler |

Rule cốt lõi:
- **Note gốc** chỉ move được sang **folder** — không bao giờ re-parent, dù đang có con hay không.
- **Note con** move được theo **1 trong 2**: sang folder (tách khỏi cha) hoặc sang note cha khác (tách + nối lại). Không có case nào cả 2 field cùng có giá trị thật — nếu trái hợp đồng, server ưu tiên `parentNoteId`.

## Sơ đồ nhánh xử lý

```mermaid
flowchart TD
    Start([PATCH /notes/:id/move]) --> Both{Cả 2 field<br/>cùng khác null?}
    Both -- có --> Prefer[Bỏ qua folderId,<br/>ưu tiên parentNoteId]
    Both -- không --> IsChild
    Prefer --> IsChild{Note đang move<br/>là note con?}

    IsChild -- không --> ParentSent{parentNoteId?}
    ParentSent -- khác null --> Err1[400: Root note cannot be re-parented]
    ParentSent -- null --> HasFolderA{folderId?}
    HasFolderA -- null --> Move[Repository.Move]
    HasFolderA -- khác null --> CheckFolderA[Kiểm tra folder tồn tại]
    CheckFolderA -- không --> Err2[400: Folder does not exist]
    CheckFolderA -- có --> Move

    IsChild -- có --> Target{Target?}
    Target -- folderId≠null --> CheckFolderB[Kiểm tra folder tồn tại]
    CheckFolderB -- không --> Err2
    CheckFolderB -- có --> Move
    Target -- parentNoteId≠null --> CheckSelf{Trỏ chính nó?}
    CheckSelf -- có --> Err3[400: Note cannot be its own parent]
    CheckSelf -- không --> CheckParent[Cha mới tồn tại và<br/>là note gốc thật?]
    CheckParent -- không --> Err4[400: Parent invalid]
    CheckParent -- có --> Move

    Move --> Done([200 OK])
```

## Flow code

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Validate (format + key tồn tại)
    participant H as Handler (business rule)
    participant Repo as Repository (DB)

    C->>M: PATCH /notes/:id/move
    M-->>C: 400 (thiếu key, sai format)
    M->>H: request hợp lệ
    H->>H: nhánh xử lý (sơ đồ trên)
    H-->>C: 400 (case 2, 3, 6, 7)
    H->>Repo: Move
    Repo-->>H: Note
    H-->>C: 200
```

## Rủi ro kỹ thuật

- **Thiếu key vs gửi `null`**: Go bind JSON không phân biệt được "field vắng mặt" với "field = null" (cả 2 ra `nil` con trỏ). Contract yêu cầu client **luôn gửi đủ 2 key**, nên middleware phải tự parse `map[string]json.RawMessage` trước để kiểm tra key có mặt hay không, trước khi bind vào struct thật.
- **Cả 2 field cùng khác null** (trái hợp đồng UI): server không từ chối — ưu tiên `parentNoteId`, bỏ qua `folderId`, nhất quán với rule đã dùng ở [[create-note|tạo note]].
