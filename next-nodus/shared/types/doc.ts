export interface Doc {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  position: number;
}

export interface DocRef {
  id: string;
  title: string;
}

export interface DocDetail {
  id: string;
  title: string;
  content: string;
  version: number;
  parentId: string | null;
  prev: DocRef | null;
  next: DocRef | null;
}

export interface CreateDocRequest {
  title: string;
  content: string;
  parentId: string | null;
}

export interface UpdateDocRequest {
  content: string;
  version: number;
}

// The server's copy of a doc, sent in `error.data` of a `version_conflict`.
export interface DocConflict {
  title: string;
  content: string;
  version: number;
}
