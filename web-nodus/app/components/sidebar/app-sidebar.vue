<script setup lang="ts">
import { SIDEBAR_GROUP, type SidebarGroupId } from "~/constants/sidebar";
import type { SearchState } from "~/composables/useAppSidebar";

const emit = defineEmits<{ collapse: [] }>();

const search = ref("");
const debouncedSearch = ref("");
let searchTimer: ReturnType<typeof setTimeout> | undefined;

watch(search, (value) => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    debouncedSearch.value = value;
  }, 300);
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});

const {
  isSearching,
  searchResults,
  searchPending,
  allNotes,
  allFolders,
  treePending,
  createNote,
  renameNote,
  deleteNote,
  moveNote,
  createFolder,
  renameFolder,
  deleteFolder,
} = await useAppSidebar(debouncedSearch);

const { groups } = useNoteTree(allNotes, allFolders);

const notesById = computed(() => new Map(allNotes.value.map((note) => [note.id, note])));
const foldersById = computed(() => new Map(allFolders.value.map((folder) => [folder.id, folder])));

const searchState = computed<SearchState>(() => {
  if (searchPending.value) {
    return "loading";
  }
  return searchResults.value.length ? "results" : "empty";
});

// Trạng thái thu gọn/mở rộng của từng group — mặc định mở hết.
const openGroupIds = ref<Record<SidebarGroupId, boolean>>({
  [SIDEBAR_GROUP.folders.id]: true,
  [SIDEBAR_GROUP.notes.id]: true,
});

const isFolderGroup = (groupId: SidebarGroupId) => groupId === SIDEBAR_GROUP.folders.id;

// Mặc định mở hết đã do defaultExpanded trên từng item lo (useNoteTree.ts).
// State này chỉ dùng để tự mở đúng id sau khi tạo note mới thành công.
const folderTreeExpandedIds = ref<string[]>([]);
const noteTreeExpandedIds = ref<string[]>([]);

const handleExpand = (id: string) => {
  if (!folderTreeExpandedIds.value.includes(id)) {
    folderTreeExpandedIds.value = [...folderTreeExpandedIds.value, id];
  }
  if (!noteTreeExpandedIds.value.includes(id)) {
    noteTreeExpandedIds.value = [...noteTreeExpandedIds.value, id];
  }
};

const {
  openCreateNoteModal,
  openCreateNoteModalInFolder,
  openCreateFolderModal,
  openEditNoteModal,
  openEditFolderModal,
  openMoveModal,
} = useSidebarModals({
  allFolders,
  createNote: async (options) => {
    await createNote(options);

    // Note cha có thể nằm trong 1 folder — mở cả hai để lộ hết đường đi tới note vừa tạo.
    if (options.parentNoteId) {
      handleExpand(options.parentNoteId);
    }
    if (options.folderId) {
      handleExpand(options.folderId);
    }
  },
  renameNote,
  moveNote,
  createFolder,
  renameFolder,
});
</script>

<template>
  <UContainer class="flex h-full flex-col p-3 space-y-4">
    <SidebarHeader @collapse="emit('collapse')" />

    <BaseSearchBar v-model="search" />

    <div class="flex min-h-0 flex-1 flex-col">
      <!-- Chế độ search: danh sách phẳng -->
      <SidebarSearchResults v-if="isSearching" :state="searchState" :notes="searchResults" />

      <!-- Chế độ cây: Folder → note gốc → note con -->
      <div v-else class="flex min-h-0 flex-1 flex-col space-y-5">
        <BaseListSkeleton v-if="treePending" />

        <BaseCollapse
          v-else
          v-for="group in groups"
          :key="group.id"
          :label="group.label"
          v-model:open="openGroupIds[group.id]">
          <template #actions>
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="isFolderGroup(group.id) ? 'New folder' : 'New note'"
              @click="isFolderGroup(group.id) ? openCreateFolderModal() : openCreateNoteModal()" />
          </template>

          <div class="space-y-1">
            <p v-if="!group.items.length" class="px-2 py-2 text-xs text-muted">Empty</p>

            <SidebarNoteTreeView
              v-if="group.items.length > 0 && !isFolderGroup(group.id)"
              :items="group.items"
              :notes-by-id="notesById"
              v-model:expanded-ids="noteTreeExpandedIds"
              @edit-note="openEditNoteModal"
              @move-note="openMoveModal"
              @create-child-note="openCreateNoteModal"
              @delete-note="deleteNote" />

            <SidebarFolderTreeView
              v-if="group.items.length > 0 && isFolderGroup(group.id)"
              :items="group.items"
              :folders-by-id="foldersById"
              :notes-by-id="notesById"
              v-model:expanded-ids="folderTreeExpandedIds"
              @edit-folder="openEditFolderModal"
              @create-note-in-folder="openCreateNoteModalInFolder"
              @delete-folder="deleteFolder"
              @edit-note="openEditNoteModal"
              @move-note="openMoveModal"
              @create-child-note="openCreateNoteModal"
              @delete-note="deleteNote" />
          </div>
        </BaseCollapse>
      </div>
    </div>

    <div class="border-t pt-2">
      <BaseThemeSwitcher />
    </div>
  </UContainer>
</template>
