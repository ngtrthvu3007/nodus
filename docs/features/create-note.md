# Tạo note — `POST /notes`

Nguồn: [[FRD-note-hierarchy]], [[FRD-folder]]. Code: `go-nodus/internal/note/` (`routes.go`, `middleware.go`, `handler.go`, `repository.go`).

## Use case (tương ứng nhánh trong sơ đồ)

| # | Input | Kết quả | Nhánh |
|---|---|---|---|
| 1 | Không `folderId`, không `parentNoteId` | Note gốc, root | `HasParent=không` → `HasFolder=không` → **Create** |
| 2 | Có `folderId` hợp lệ, không `parentNoteId` | Note gốc, thuộc folder | `HasParent=không` → `HasFolder=có` → **FolderExists=có** → **Create** |
| 3 | `folderId` không tồn tại, không `parentNoteId` | `400` | ...→ **FolderExists=không** → **Err3** |
| 4 | `parentNoteId` hợp lệ (note cha là root) | Note con, `folderId` kế thừa từ cha | `HasParent=có` → **ParentExists=có** → **ParentIsRoot=không** → **Inherit** → **Create** |
| 5 | `parentNoteId` không tồn tại | `400` | `HasParent=có` → **ParentExists=không** → **Err1** |
| 6 | `parentNoteId` trỏ vào 1 note đã là con (3-level) | `400` | `HasParent=có` → **ParentExists=có** → **ParentIsRoot=có** → **Err2** |

Rule cốt lõi: `parentNoteId` **luôn thắng** `folderId` — khi có cha, `folderId` client gửi bị bỏ qua và server tự set theo folder của cha (rule kế thừa, [[FRD-note-hierarchy]]).

## Sơ đồ nhánh xử lý

```mermaid
flowchart TD
    Start([POST /notes]) --> HasParent{parentNoteId?}

    HasParent -- có --> FindParent[Tìm note cha]
    FindParent --> ParentExists{Tồn tại?}
    ParentExists -- không --> Err1[400: Parent note does not exist]
    ParentExists -- có --> ParentIsRoot{Cha có parentNoteId<br/>riêng không?}
    ParentIsRoot -- có, đã là note con --> Err2[400: Parent note must be a root note]
    ParentIsRoot -- không, là root --> Inherit[folderId = folder của cha]
    Inherit --> Create

    HasParent -- không --> HasFolder{folderId?}
    HasFolder -- không --> Create[Repository.Create]
    HasFolder -- có --> FindFolder[Kiểm tra folder tồn tại]
    FindFolder --> FolderExists{Tồn tại?}
    FolderExists -- không --> Err3[400: Folder does not exist]
    FolderExists -- có --> Create

    Create --> Done([201 Created])
```

## Flow code

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Validate (format)
    participant H as Handler (business rule)
    participant Repo as Repository (DB)

    C->>M: POST /notes
    M-->>C: 400 (sai format)
    M->>H: request hợp lệ
    H->>H: nhánh xử lý (sơ đồ trên)
    H-->>C: 400 (case 3, 5, 6)
    H->>Repo: Create
    Repo-->>H: Note
    H-->>C: 201
```

## Rủi ro kỹ thuật

`note` domain không import package `folder` (tránh import cycle, vì `folder` đã import `note` cho `GET /folders/:id`). Nên việc check `folderId` tồn tại gọi thẳng `h.repo.queries.FindFolderByID` (tầng `db.Queries` sqlc dùng chung), không qua `folder.Repository`. Trade-off: `note` biết tên bảng `folders` ở mức SQL, chấp nhận được cho quy mô hiện tại; cần đổi sang gọi network nếu sau này tách `note`/`folder` thành service riêng.
