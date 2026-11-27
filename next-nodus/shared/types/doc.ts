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
  workspaceId: string;
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

export interface ExportDocsRequest {
  ids: string[];
}

export type ImportFailureCode = "invalid_file_type" | "file_too_large" | "invalid_encoding" | "invalid_title";

// Not sent as JSON: the files go in a multipart form (api/doc.ts builds it).
export interface ImportDocsRequest {
  files: File[];
  parentId: string | null;
}

export interface ImportedDoc {
  id: string;
  title: string;
  fileName: string;
}

export interface ImportFailure {
  fileName: string;
  code: ImportFailureCode;
}

export interface ImportDocsResponse {
  created: ImportedDoc[];
  failed: ImportFailure[];
}

export interface DocSearchResult {
  id: string;
  title: string;
  path: string;
  snippet: string;
  updatedAt: string;
}

export interface SearchDocsRequest {
  query: string;
  offset: number;
}

export interface SearchDocsResponse {
  items: DocSearchResult[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

// The server's copy of a doc, sent in `error.data` of a `version_conflict`.
export interface DocConflict {
  title: string;
  content: string;
  version: number;
}
