import type { ApiResponse } from "~/types/note";
import type { Folder, FolderDetail } from "~/types/folder";

const FOLDERS_API_PATH = "/api/folders";

export const fetchFolders = () =>
  httpClient.get<ApiResponse<Folder[]>>(FOLDERS_API_PATH, "Could not load folders");

export const fetchFolder = (id: string) =>
  httpClient.get<ApiResponse<FolderDetail>>(`${FOLDERS_API_PATH}/${id}`, "Could not load folder");

export const createFolder = (name: string) =>
  httpClient.post<ApiResponse<Folder>>(FOLDERS_API_PATH, { name }, "Could not create folder");

export const updateFolder = (id: string, name: string) =>
  httpClient.patch<ApiResponse<Folder>>(`${FOLDERS_API_PATH}/${id}`, { name }, "Could not rename folder");

export const deleteFolder = (id: string) =>
  httpClient.delete(`${FOLDERS_API_PATH}/${id}`, "Could not delete folder");
