import type { Note } from "~/types/note";

export interface Folder {
  id: string;
  name: string;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderDetail extends Folder {
  notes: Note[];
}
