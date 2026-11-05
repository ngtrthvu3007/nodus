import type { ApiResponse, CreateNoteParams, MoveNoteParams, Note, NoteLinks, NoteTitleSuggestion } from "~/types/note";

const NOTES_API_PATH = "/api/notes";

export const fetchNote = (id: string) =>
  httpClient.get<ApiResponse<Note>>(`${NOTES_API_PATH}/${id}`, "Could not load note");

export const fetchNoteLinks = (id: string) =>
  httpClient.get<ApiResponse<NoteLinks>>(`${NOTES_API_PATH}/${id}/links`, "Could not load backlinks");

// Gọi thẳng $fetch (không qua httpClient) — API này bắn liên tục lúc gõ [[,
// nên lỗi mạng chỉ nên im lặng bỏ qua gợi ý, không toast lỗi mỗi lần gõ.
export const fetchTitleSuggestions = async (query: string): Promise<NoteTitleSuggestion[]> => {
  try {
    const response = await $fetch<ApiResponse<NoteTitleSuggestion[]>>(`${NOTES_API_PATH}/autocomplete`, {
      query: { q: query },
    });
    return response.data;
  } catch {
    return [];
  }
};

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

export const moveNote = (id: string, body: MoveNoteParams) =>
  httpClient.patch<ApiResponse<Note>>(`${NOTES_API_PATH}/${id}/move`, body, "Could not move note");

export const deleteNote = (id: string) => httpClient.delete(`${NOTES_API_PATH}/${id}`, "Could not delete note");
