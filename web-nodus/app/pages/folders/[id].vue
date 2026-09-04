<script setup lang="ts">
import type { ApiResponse, Note } from "~/types/note";
import type { FolderDetail } from "~/types/folder";
import { groupBy, toNoteTreeItem, type NoteTreeItem } from "~/composables/useNoteTree";
import { updateFolder, deleteFolder as deleteFolderApi } from "~/apis/folders";
import { deleteNote as deleteNoteApi } from "~/apis/notes";

const route = useRoute();
const router = useRouter();

const folderId = computed(() => String(route.params.id));
const { data, error, pending, refresh } = await useFetch<ApiResponse<FolderDetail>>(
  () => `/api/folders/${folderId.value}`,
);

const folder = computed(() => data.value?.data);

// Folder detail only returns root notes; child notes are fetched separately
// and nested under their parent to render the same tree UX as the sidebar.
const { data: allNotesData, refresh: refreshAllNotes } = await useFetch<ApiResponse<Note[]>>("/api/notes");
const allNotes = computed(() => allNotesData.value?.data ?? []);
const childrenByParentId = computed(() => groupBy(allNotes.value, (note) => note.parentNoteId));
const notesById = computed(() => new Map(allNotes.value.map((note) => [note.id, note])));

const countWithDescendants = (note: Note): number =>
  1 + (childrenByParentId.value.get(note.id) ?? []).reduce((sum, child) => sum + countWithDescendants(child), 0);

const totalNoteCount = computed(
  () => folder.value?.notes.reduce((sum, note) => sum + countWithDescendants(note), 0) ?? 0,
);

const search = ref("");

// A note matches on its own title or any descendant's, so a matching child
// keeps its ancestors visible in the filtered tree.
const filterTree = (items: NoteTreeItem[], query: string): NoteTreeItem[] =>
  items.reduce<NoteTreeItem[]>((result, item) => {
    const children = item.children ? filterTree(item.children, query) : undefined;
    if (item.label?.toLowerCase().includes(query) || children?.length) {
      result.push({ ...item, children: children?.length ? children : item.children });
    }
    return result;
  }, []);

const noteTreeItems = computed<NoteTreeItem[]>(() => {
  const items = folder.value?.notes.map((note) => toNoteTreeItem(note, childrenByParentId.value)) ?? [];

  const query = search.value.trim().toLowerCase();
  return query ? filterTree(items, query) : items;
});

const getTreeItemKey = (item: { id: string }) => item.id;

useBreadcrumbSetter(
  computed(() => [
    { label: "Nodus", icon: "i-lucide-house", to: "/" },
    { label: folder.value?.name ?? "Folder", icon: "i-lucide-folder" },
  ]),
);

// Inline rename UI state.
const isRenaming = ref(false);
const renameValue = ref("");

const startRename = () => {
  if (!folder.value) {
    return;
  }

  renameValue.value = folder.value.name;
  isRenaming.value = true;
};

const submitRename = async () => {
  isRenaming.value = false;

  const trimmed = renameValue.value.trim();
  if (!folder.value || !trimmed || trimmed === folder.value.name) {
    return;
  }

  const response = await updateFolder(folder.value.id, trimmed);
  if (response) {
    await refresh();
  }
};

const cancelRename = () => {
  isRenaming.value = false;
};

const deleteNote = async (note: Note) => {
  const success = await deleteNoteApi(note.id);
  if (success) {
    await Promise.all([refresh(), refreshAllNotes()]);
  }
};

const { open: openModal } = useModal();

const confirmDelete = async () => {
  if (!folder.value) {
    return;
  }

  const success = await deleteFolderApi(folder.value.id);
  if (success) {
    await router.push("/");
  }
};

const openConfirmDelete = () => {
  if (!folder.value) {
    return;
  }

  const extra =
    folder.value.notes.length > 0
      ? ` This will also delete ${folder.value.notes.length} note${folder.value.notes.length > 1 ? "s" : ""} inside it (including their child notes). Move any notes you want to keep out of this folder first.`
      : "";

  openModal({
    title: "Delete folder",
    message: `Delete "${folder.value.name}"?${extra} This action cannot be undone.`,
    confirmLabel: "Delete",
    confirmColor: "error",
    onConfirm: confirmDelete,
  });
};
</script>

<template>
  <div v-if="pending" class="p-6">
    <USkeleton class="h-10 w-64" />
    <USkeleton class="mt-6 h-96 w-full" />
  </div>

  <UAlert
    v-else-if="error || !folder"
    class="m-6"
    color="error"
    variant="subtle"
    title="Could not load folder"
    description="The folder may not exist or the API is unavailable." />

  <div v-else class="flex h-full min-h-0 flex-col">
    <div class="flex h-10 shrink-0 items-center gap-3 border-b border-default px-6">
      <UIcon name="i-lucide-folder" class="size-5 shrink-0 text-muted" />

      <UInput
        v-if="isRenaming"
        v-model="renameValue"
        autofocus
        size="lg"
        class="min-w-0 flex-1 p-0"
        :ui="{ base: 'text-lg font-semibold' }"
        @keyup.enter="submitRename"
        @keyup.esc="cancelRename"
        @blur="submitRename" />
      <h1
        v-else
        class="min-w-0 flex-1 cursor-text truncate text-md font-semibold text-highlighted"
        @click="startRename">
        {{ folder.name }}
      </h1>

      <span class="shrink-0 text-xs text-muted">
        Created {{ new Date(folder.createdAt).toLocaleDateString() }} · Updated
        {{ new Date(folder.updatedAt).toLocaleDateString() }}
      </span>

      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="sm"
        aria-label="Delete folder"
        @click="openConfirmDelete" />
    </div>

    <div class="min-h-0 flex-1 overflow-hidden p-6">
      <div v-if="!totalNoteCount" class="flex h-full flex-col items-center justify-center gap-3 text-center">
        <UIcon name="i-lucide-file-text" class="size-10 text-muted" />
        <p class="text-sm text-muted">No notes in this folder yet.</p>
        <UButton icon="i-lucide-plus" label="Create note" color="neutral" variant="subtle" />
      </div>

      <div v-else class="flex h-full min-h-0 flex-col rounded-lg border border-default">
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-default px-3 py-2">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search notes..."
            size="sm"
            class="max-w-64" />
          <span class="shrink-0 text-xs text-muted">
            {{ totalNoteCount }} note{{ totalNoteCount === 1 ? "" : "s" }}
          </span>
        </div>

        <UScrollArea class="min-h-0 flex-1 p-2">
          <p v-if="!noteTreeItems.length" class="px-2 py-4 text-center text-xs text-muted">
            No notes found.
          </p>

          <UTree v-else :items="noteTreeItems" :get-key="getTreeItemKey" size="md" color="neutral" class="w-full">
            <template
              #note-label="{ item, expanded, handleToggle }: {
                item: NoteTreeItem;
                expanded: boolean;
                handleToggle: (event: Event) => void;
              }">
              <div class="flex min-w-0 items-center gap-1">
                <NoteTreeItem :item="item" :is-renaming="false" :navigate-on-click="false" />
                <NoteTreeItemToggle :item="item" :expanded="expanded" :handle-toggle="handleToggle" />
              </div>
            </template>

            <template #note-trailing="{ item }: { item: NoteTreeItem }">
              <NoteActionsDropdown
                v-if="notesById.get(item.id)"
                :note="notesById.get(item.id)!"
                @delete="deleteNote" />
            </template>
          </UTree>
        </UScrollArea>
      </div>
    </div>
  </div>
</template>
