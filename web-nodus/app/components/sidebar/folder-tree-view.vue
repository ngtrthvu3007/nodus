<script setup lang="ts">
import type { Note } from "~/types/note";
import type { Folder } from "~/types/folder";
import type { NoteTreeItem } from "~/composables/useNoteTree";

defineProps<{
  items: NoteTreeItem[];
  foldersById: Map<string, Folder>;
  notesById: Map<string, Note>;
}>();

const expandedIds = defineModel<string[]>("expandedIds");

const emit = defineEmits<{
  editFolder: [Folder];
  createNoteInFolder: [Folder];
  deleteFolder: [Folder];
  editNote: [Note];
  moveNote: [Note];
  createChildNote: [Note];
  deleteNote: [Note];
}>();

const getTreeItemKey = (item: { id: string }) => item.id;

const onNoteLabelClick = (item: NoteTreeItem) => {
  if (item.to) {
    void navigateTo(item.to);
  }
};
</script>

<template>
  <UScrollArea class="max-h-64">
    <UTree
      v-model:expanded="expandedIds"
      :items="items"
      :get-key="getTreeItemKey"
      size="sm"
      color="neutral"
      class="w-full">
      <!-- Cột phải mỗi dòng: menu "..." (note hoặc folder) -->
      <template #item-trailing="{ item }: { item: NoteTreeItem }">
        <SidebarNoteActionsDropdown
          v-if="notesById.get(item.id)"
          :note="notesById.get(item.id)!"
          @edit="emit('editNote', notesById.get(item.id)!)"
          @move="emit('moveNote', notesById.get(item.id)!)"
          @create-child-note="emit('createChildNote', notesById.get(item.id)!)"
          @delete="emit('deleteNote', notesById.get(item.id)!)" />

        <SidebarFolderActionsDropdown
          v-else-if="foldersById.get(item.id)"
          :folder="foldersById.get(item.id)!"
          @edit="emit('editFolder', foldersById.get(item.id)!)"
          @create-note="emit('createNoteInFolder', foldersById.get(item.id)!)"
          @delete="emit('deleteFolder', foldersById.get(item.id)!)" />
      </template>

      <!-- Mũi tên expand/collapse ngay sát tên note/folder -->
      <template
        #item-label="{
          item,
          expanded,
          handleToggle,
        }: {
          item: NoteTreeItem;
          expanded: boolean;
          handleToggle: (event: Event) => void;
        }">
        <div class="flex min-w-0 items-center gap-1">
          <span
            v-if="notesById.get(item.id)"
            class="truncate"
            @click.stop="onNoteLabelClick(item)"
            >{{ item.label }}</span
          >
          <span v-else class="truncate">{{ item.label }}</span>
          <SidebarTreeItemToggle :item="item" :expanded="expanded" :handle-toggle="handleToggle" />
        </div>
      </template>
    </UTree>
  </UScrollArea>
</template>
