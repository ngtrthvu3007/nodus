# FRD — Move note

Nguồn: SPEC.md v2.

## Mục tiêu

Thay đổi **vị trí của 1 note trong cây tổ chức** (folder và/hoặc quan hệ cha–con) — không chỉ "đổi folder".

## API — `PATCH /notes/:id/move`

Tách khỏi `PUT /notes/:id` (chỉ sửa nội dung). Body luôn gửi đủ `{ "folder_id": string | null, "parent_note_id": string | null }`, **đúng 1 trong 2 khác `null`**.

## Sơ đồ validate

```mermaid
flowchart TD
    Start([PATCH /notes/:id/move]) --> IsChild{Note đang move<br/>là note con?}

    IsChild -- không, là note gốc --> ParentSent{parent_note_id != null?}
    ParentSent -- có --> HasChildren{Note gốc<br/>đang có con?}
    HasChildren -- có --> ErrRootNoReparent[400: note gốc có con<br/>không được re-parent]
    HasChildren -- không --> CheckParent
    ParentSent -- không --> CheckFolderA[folder_id phải trỏ<br/>folder tồn tại]
    CheckFolderA --> UpdateA[Update: folder_id mới<br/>note con kế thừa theo]

    IsChild -- có --> Target{Target là gì?}
    Target -- folder_id != null --> CheckFolderB[folder_id phải trỏ<br/>folder tồn tại]
    CheckFolderB --> UpdateB[Update: parent_note_id = null<br/>folder_id = target]
    Target -- parent_note_id != null --> CheckParent[Note cha mới phải tồn tại<br/>và là note gốc thật]
    CheckParent -- không đạt --> ErrParent[400: parent không hợp lệ]
    CheckParent -- đạt --> UpdateC[Update: parent_note_id = target<br/>folder_id = folder của cha mới]

    UpdateA & UpdateB & UpdateC --> Done([200 OK])
```

- "Promote to root, giữ nguyên folder" = trường hợp riêng của nhánh **UpdateB**, client tự tính `folder_id` = folder hiện tại của cha. Không cần rule riêng.
- Note gốc re-parent (nhánh **HasChildren = không**) đi chung bước kiểm tra note cha mới với note con: cha mới phải tồn tại và là note gốc thật.
- Cả 2 field cùng khác `null` (trái hợp đồng UI): server **ưu tiên `parent_note_id`, bỏ qua `folder_id`** — nhất quán với `POST /notes` (đã implement trong `note/service.go`).

## UI — modal "Move to..."

- Nút 3 chấm trên mỗi note item (`UTree`) → "Move to...".
- Note gốc chưa có con: modal cho chọn folder **hoặc** note gốc khác làm cha mới. Note gốc đang có con: chỉ chọn folder (đọc field `hasChildren` để disable lựa chọn note cha).
- Note con: modal cho chọn folder **hoặc** note gốc khác làm cha mới, kèm cảnh báo tách khỏi cha hiện tại.
- Xác nhận → 1 request duy nhất, đúng 1 field có giá trị theo lựa chọn.
