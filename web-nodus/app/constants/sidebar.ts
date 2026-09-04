// Sidebar luôn hiển thị đúng 2 group này — khai báo id/label tại đây thay vì
// hard-code chuỗi "notes"/"folders" rải rác ở nhiều nơi.
export const SIDEBAR_GROUP = {
  notes: { id: "notes", label: "Notes" },
  folders: { id: "folders", label: "Folders" },
} as const;

export type SidebarGroupId = (typeof SIDEBAR_GROUP)[keyof typeof SIDEBAR_GROUP]["id"];
