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
