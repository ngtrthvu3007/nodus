import type { Ref } from "vue";
import type { MoveNoteParams, Note } from "~/types/note";
import type { Folder } from "~/types/folder";
import FormCreateNote from "~/components/form/create-note.vue";
import FormSingleInput from "~/components/form/single-input.vue";
import FormMoveNote from "~/components/form/move-note.vue";

interface UseSidebarModalsOptions {
  allNotes: Ref<Note[]>;
  allFolders: Ref<Folder[]>;
  createNote: (options: { title: string; folderId: string | null; parentNoteId: string | null }) => Promise<unknown>;
  renameNote: (note: Note, title: string) => Promise<unknown>;
  moveNote: (note: Note, target: MoveNoteParams) => Promise<unknown>;
  createFolder: (name: string) => Promise<unknown>;
  renameFolder: (folder: Folder, name: string) => Promise<unknown>;
}

// Static (title/component/confirmLabel) parts of each sidebar modal — the open*
// functions below spread these and add the runtime-specific props/onConfirm.
const CREATE_NOTE_MODAL = { title: "New note", component: FormCreateNote, confirmLabel: "Create" };
const CREATE_FOLDER_MODAL = { title: "New folder", component: FormSingleInput, confirmLabel: "Create" };
const EDIT_NOTE_MODAL = { title: "Edit note", component: FormSingleInput, confirmLabel: "Save" };
const EDIT_FOLDER_MODAL = { title: "Edit folder", component: FormSingleInput, confirmLabel: "Save" };
const MOVE_NOTE_MODAL = { title: "Move to...", component: FormMoveNote, confirmLabel: "Move" };

export const useSidebarModals = ({
  allNotes,
  allFolders,
  createNote,
  renameNote,
  moveNote,
  createFolder,
  renameFolder,
}: UseSidebarModalsOptions) => {
  const { open: openModal } = useModal();

  const openCreateNoteModal = (parentNote: Note | null = null, initialFolderId: string | null = null) => {
    openModal({
      ...CREATE_NOTE_MODAL,
      title: parentNote ? `New note under "${parentNote.title}"` : CREATE_NOTE_MODAL.title,
      props: { folders: allFolders.value, parentNote, initialFolderId },
      onConfirm: (data) =>
        createNote(data as { title: string; folderId: string | null; parentNoteId: string | null }),
    });
  };

  const openCreateNoteModalInFolder = (folder: Folder) => openCreateNoteModal(null, folder.id);

  const openCreateFolderModal = () => {
    openModal({
      ...CREATE_FOLDER_MODAL,
      props: { label: "Name", placeholder: "Folder name" },
      onConfirm: (data) => createFolder((data as { value: string }).value),
    });
  };

  const openEditNoteModal = (note: Note) => {
    openModal({
      ...EDIT_NOTE_MODAL,
      props: { label: "Title", placeholder: "Note title", initialValue: note.title },
      onConfirm: (data) => renameNote(note, (data as { value: string }).value),
    });
  };

  const openEditFolderModal = (folder: Folder) => {
    openModal({
      ...EDIT_FOLDER_MODAL,
      props: { label: "Name", placeholder: "Folder name", initialValue: folder.name },
      onConfirm: (data) => renameFolder(folder, (data as { value: string }).value),
    });
  };

  const openMoveModal = (note: Note) => {
    openModal({
      ...MOVE_NOTE_MODAL,
      props: { note, folders: allFolders.value, notes: allNotes.value },
      onConfirm: (data) => {
        const { note: movingNote, ...target } = data as { note: Note } & MoveNoteParams;
        return moveNote(movingNote, target);
      },
    });
  };

  return {
    openCreateNoteModal,
    openCreateNoteModalInFolder,
    openCreateFolderModal,
    openEditNoteModal,
    openEditFolderModal,
    openMoveModal,
  };
};
