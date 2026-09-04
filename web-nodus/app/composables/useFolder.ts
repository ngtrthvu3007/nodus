import type { Folder } from "~/types/folder";
import type { ApiResponse, Note } from "~/types/note";
import { createFolder as createFolderApi, updateFolder, deleteFolder as deleteFolderApi } from "~/apis/folders";

// Deleting a folder cascades its notes on the backend, so this needs read/refresh
// access to the note list to keep the FE in sync and redirect away from a note
// that no longer exists — hence the dependency on useNote's state instead of
// fetching notes again here.
export const useFolder = async (notes: { allNotes: Ref<Note[]>; refreshNotes: () => Promise<void> }) => {
  const router = useRouter();

  const {
    data: foldersData,
    pending: foldersPending,
    refresh: refreshFolders,
  } = await useFetch<ApiResponse<Folder[]>>("/api/folders");

  const allFolders = computed(() => foldersData.value?.data ?? []);

  const createFolder = async (name: string) => {
    const response = await createFolderApi(name);
    if (response) {
      await refreshFolders();
    }
  };

  const renameFolder = async (folder: Folder, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === folder.name) {
      return;
    }

    const response = await updateFolder(folder.id, trimmed);
    if (response) {
      await refreshFolders();
    }
  };

  const deleteFolder = async (folder: Folder) => {
    const success = await deleteFolderApi(folder.id);
    if (!success) {
      return;
    }

    const noteInFolder = notes.allNotes.value.some((note) => note.folderId === folder.id);
    await Promise.all([refreshFolders(), notes.refreshNotes()]);

    if (noteInFolder && router.currentRoute.value.path.startsWith("/notes/")) {
      const stillExists = notes.allNotes.value.some(
        (note) => `/notes/${note.id}` === router.currentRoute.value.path,
      );
      if (!stillExists) {
        await router.push("/");
      }
    }
  };

  return {
    allFolders,
    foldersPending,
    createFolder,
    renameFolder,
    deleteFolder,
  };
};
