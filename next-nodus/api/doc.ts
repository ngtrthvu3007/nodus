import { httpClient } from "@/shared/libs/httpClient";
import type { CreateDocRequest, Doc, DocDetail, MoveRequest, MoveResponse, UpdateDocRequest } from "@/shared/types";
import { API_ROUTES, WORKSPACE_ID } from "@/shared/constants";

// signal: lets the client cancel the request; not an API parameter.
export const getDoc = (id: string, signal?: AbortSignal) => httpClient.get<DocDetail>(API_ROUTES.doc(id), { signal });

export const createDoc = (request: CreateDocRequest) => httpClient.post<Doc>(API_ROUTES.docs(WORKSPACE_ID), request);

// keepalive: lets the save finish after the page is closed.
export const updateDoc = (id: string, request: UpdateDocRequest, keepalive?: boolean) =>
  httpClient.put<DocDetail>(API_ROUTES.doc(id), request, { keepalive });

export const renameDoc = (id: string, title: string) =>
  httpClient.patch<DocDetail>(API_ROUTES.docTitle(id), { title });

export const moveDoc = (id: string, request: MoveRequest) =>
  httpClient.patch<MoveResponse>(API_ROUTES.docMove(id), request);

export const deleteDoc = (id: string) => httpClient.delete(API_ROUTES.doc(id));
