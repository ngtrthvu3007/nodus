import type { ApiResponse, CreateNoteParams, MoveNoteParams, Note } from "~/types/note";
import { createNote as createNoteApi, moveNote as moveNoteApi, deleteNote as deleteNoteApi, updateNote } from "~/apis/notes";

// Note con xác định vị trí bằng note cha (folderId của nó không có nghĩa), note gốc bằng folder.
const isSameLocation = (note: Note, { folderId, parentNoteId }: MoveNoteParams) =>
  parentNoteId ? parentNoteId === note.parentNoteId : !note.parentNoteId && folderId === note.folderId;

export const useNote = async () => {
  const router = useRouter();

  const { data: notesData, pending: notesPending, refresh: refreshNotes } = await useFetch<ApiResponse<Note[]>>("/api/notes");

  const allNotes = computed(() => notesData.value?.data ?? []);

  const createNote = async (params: CreateNoteParams) => {
    const response = await createNoteApi(params);
    if (!response) {
      return;
    }

    await refreshNotes();
    await router.push(`/notes/${response.data.id}`);
  };

  const renameNote = async (note: Note, title: string) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === note.title) {
      return;
    }

    const response = await updateNote(note.id, { title: trimmed, content: note.content });
    if (response) {
      await refreshNotes();
    }
  };

  const moveNote = async (note: Note, target: MoveNoteParams) => {
    if (isSameLocation(note, target)) {
      return;
    }

    const response = await moveNoteApi(note.id, target);
    if (response) {
      await refreshNotes();
    }
  };

  const deleteNote = async (note: Note) => {
    const success = await deleteNoteApi(note.id);
    if (!success) {
      return;
    }

    await refreshNotes();
    if (router.currentRoute.value.path === `/notes/${note.id}`) {
      await router.push("/");
    }
  };

  return {
    allNotes,
    notesPending,
    refreshNotes,
    createNote,
    renameNote,
    moveNote,
    deleteNote,
  };
};
