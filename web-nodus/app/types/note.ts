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
