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
  title: string;
  content: string;
}
