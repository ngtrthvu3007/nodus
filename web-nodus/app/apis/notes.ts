import type { ApiResponse, CreateNoteParams, Note } from "~/types/note";

const NOTES_API_PATH = "/api/notes";

export const fetchNote = (id: string) =>
  httpClient.get<ApiResponse<Note>>(`${NOTES_API_PATH}/${id}`, "Could not load note");

export const searchNotes = (query: string) =>
  httpClient.get<ApiResponse<Note[]>>(NOTES_API_PATH, "Could not search notes", { query: { q: query } });

export const createNote = (params: CreateNoteParams) =>
  httpClient.post<ApiResponse<Note>>(
    NOTES_API_PATH,
    { title: params.title.trim(), content: "", folderId: params.folderId, parentNoteId: params.parentNoteId ?? null },
    "Could not create note",
  );

export const updateNote = (id: string, body: { title: string; content: string }) =>
  httpClient.put<ApiResponse<Note>>(`${NOTES_API_PATH}/${id}`, body, "Could not save note");

export const moveNote = (id: string, body: { folderId: string | null; parentNoteId: string | null }) =>
  httpClient.patch<ApiResponse<Note>>(`${NOTES_API_PATH}/${id}/move`, body, "Could not move note");

export const deleteNote = (id: string) => httpClient.delete(`${NOTES_API_PATH}/${id}`, "Could not delete note");
