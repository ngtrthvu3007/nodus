import { httpClient } from "@/shared/libs/httpClient";
import type {
  CreateDocRequest,
  Doc,
  DocDetail,
  ExportDocsRequest,
  ImportDocsRequest,
  ImportDocsResponse,
  MoveRequest,
  MoveResponse,
  SearchDocsRequest,
  SearchDocsResponse,
  UpdateDocRequest,
} from "@/shared/types";
import { API_ROUTES } from "@/shared/constants";

// signal: lets the client cancel the request; not an API parameter.
export const getDoc = (id: string, signal?: AbortSignal) => httpClient.get<DocDetail>(API_ROUTES.doc(id), { signal });

export const createDoc = (workspaceId: string, request: CreateDocRequest) =>
  httpClient.post<Doc>(API_ROUTES.docs(workspaceId), request);

// keepalive: lets the save finish after the page is closed.
export const updateDoc = (id: string, request: UpdateDocRequest, keepalive?: boolean) =>
  httpClient.put<DocDetail>(API_ROUTES.doc(id), request, { keepalive });

export const renameDoc = (id: string, title: string) =>
  httpClient.patch<DocDetail>(API_ROUTES.docTitle(id), { title });

export const moveDoc = (id: string, request: MoveRequest) =>
  httpClient.patch<MoveResponse>(API_ROUTES.docMove(id), request);

export const deleteDoc = (id: string) => httpClient.delete(API_ROUTES.doc(id));

export const exportDoc = (id: string) => httpClient.getFile(API_ROUTES.docExport(id));

export const exportDocs = (workspaceId: string, request: ExportDocsRequest) =>
  httpClient.postFile(API_ROUTES.docsExport(workspaceId), request);

export const importDocs = (workspaceId: string, { files, parentId }: ImportDocsRequest) => {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  if (parentId) form.append("parentId", parentId);

  return httpClient.post<ImportDocsResponse>(API_ROUTES.docsImport(workspaceId), form);
};

export const searchDocs = (workspaceId: string, request: SearchDocsRequest, signal?: AbortSignal) =>
  httpClient.get<SearchDocsResponse>(API_ROUTES.docSearch(workspaceId, request), { signal });
