import type { ApiResponse, CreateNoteParams, Note } from "~/types/note";
import { createNote as createNoteApi, moveNote as moveNoteApi, deleteNote as deleteNoteApi, updateNote } from "~/apis/notes";

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

  const moveNote = async (note: Note, folderId: string | null) => {
    if (folderId === note.folderId) {
      return;
    }

    const response = await moveNoteApi(note.id, { folderId, parentNoteId: null });
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
