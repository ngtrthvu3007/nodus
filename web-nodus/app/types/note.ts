export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  parentNoteId: string | null;
  hasChildren: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateNoteParams = { title: string; folderId: string | null; parentNoteId?: string | null };

// Vị trí đích khi move: parentNoteId ưu tiên; cả 2 null = root, không folder.
// Dùng type (không phải interface) để gán được vào body Record<string, unknown> của httpClient.
export type MoveNoteParams = { folderId: string | null; parentNoteId: string | null };

export interface LinkedNote {
  id: string;
  title: string;
  createdAt: string;
}

export interface NoteLinks {
  backlinks: LinkedNote[];
  outgoing: LinkedNote[];
}

export interface NoteTitleSuggestion {
  id: string;
  title: string;
}
