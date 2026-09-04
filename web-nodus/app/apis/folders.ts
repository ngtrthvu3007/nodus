import type { ApiResponse } from "~/types/note";
import type { Folder } from "~/types/folder";

const FOLDERS_API_PATH = "/api/folders";

export const createFolder = (name: string) =>
  httpClient.post<ApiResponse<Folder>>(FOLDERS_API_PATH, { name }, "Could not create folder");

export const updateFolder = (id: string, name: string) =>
  httpClient.patch<ApiResponse<Folder>>(`${FOLDERS_API_PATH}/${id}`, { name }, "Could not rename folder");

export const deleteFolder = (id: string) =>
  httpClient.delete(`${FOLDERS_API_PATH}/${id}`, "Could not delete folder");
