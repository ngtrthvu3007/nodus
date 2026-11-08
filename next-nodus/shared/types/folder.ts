import type { NodeKind } from "./common";

export interface Folder {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  position: number;
}

export interface FolderChild {
  id: string;
  kind: NodeKind;
  name: string;
}

export interface FolderDetail {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  children: FolderChild[];
}

export interface CreateFolderRequest {
  name: string;
  description?: string;
  parentId: string | null;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
}
