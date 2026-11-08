import { httpClient } from "@/shared/libs/httpClient";
import type {
  CreateFolderRequest,
  Folder,
  FolderDetail,
  MoveRequest,
  MoveResponse,
  UpdateFolderRequest,
} from "@/shared/types";
import { API_ROUTES, WORKSPACE_ID } from "@/shared/constants";

// signal: lets the client cancel the request; not an API parameter.
export const getFolder = (id: string, signal?: AbortSignal) =>
  httpClient.get<FolderDetail>(API_ROUTES.folder(id), { signal });

export const createFolder = (request: CreateFolderRequest) =>
  httpClient.post<Folder>(API_ROUTES.folders(WORKSPACE_ID), request);

export const updateFolder = (id: string, request: UpdateFolderRequest) =>
  httpClient.patch<Folder>(API_ROUTES.folder(id), request);

export const moveFolder = (id: string, request: MoveRequest) =>
  httpClient.patch<MoveResponse>(API_ROUTES.folderMove(id), request);

export const deleteFolder = (id: string) => httpClient.delete(API_ROUTES.folder(id));
