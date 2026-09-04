import type { Note } from "~/types/note";
import { searchNotes } from "~/apis/notes";

export type SearchState = "loading" | "empty" | "results";

export const useAppSidebar = async (debouncedSearch: Ref<string>) => {
  const isSearching = computed(() => Boolean(debouncedSearch.value));

  // Search mode: flat list of matching notes. Client-only fetch (no SSR needed),
  // driven by a plain watcher instead of useFetch's `watch` option to avoid it
  // silently not re-triggering when combined with a computed `query`.
  const searchResults = ref<Note[]>([]);
  const searchPending = ref(false);

  watch(debouncedSearch, async (value) => {
    if (!value) {
      searchResults.value = [];
      return;
    }

    searchPending.value = true;
    const response = await searchNotes(value);
    if (response) {
      searchResults.value = response.data;
    }
    searchPending.value = false;
  });

  // Tree mode: all notes + folders, only meaningfully used while not searching.
  const note = await useNote();
  const folder = await useFolder({ allNotes: note.allNotes, refreshNotes: note.refreshNotes });

  const treePending = computed(() => note.notesPending.value || folder.foldersPending.value);

  return {
    isSearching,
    searchResults,
    searchPending,
    treePending,
    ...note,
    ...folder,
  };
};
