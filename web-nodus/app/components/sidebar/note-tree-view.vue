<script setup lang="ts">
import type { Note } from "~/types/note";
import type { NoteTreeItem } from "~/composables/useNoteTree";

defineProps<{
  items: NoteTreeItem[];
  notesById: Map<string, Note>;
}>();

const expandedIds = defineModel<string[]>("expandedIds");

const emit = defineEmits<{
  editNote: [Note];
  moveNote: [Note];
  createChildNote: [Note];
  deleteNote: [Note];
}>();

const getTreeItemKey = (item: { id: string }) => item.id;

const onLabelClick = (item: NoteTreeItem) => {
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
      <!-- Cột phải mỗi dòng: menu "..." -->
      <template #item-trailing="{ item }: { item: NoteTreeItem }">
        <SidebarNoteActionsDropdown
          v-if="notesById.get(item.id)"
          :note="notesById.get(item.id)!"
          @edit="emit('editNote', notesById.get(item.id)!)"
          @move="emit('moveNote', notesById.get(item.id)!)"
          @create-child-note="emit('createChildNote', notesById.get(item.id)!)"
          @delete="emit('deleteNote', notesById.get(item.id)!)" />
      </template>

      <!-- Mũi tên expand/collapse ngay sát tên note -->
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
          <span class="truncate" @click.stop="onLabelClick(item)">{{ item.label }}</span>
          <SidebarTreeItemToggle :item="item" :expanded="expanded" :handle-toggle="handleToggle" />
        </div>
      </template>
    </UTree>
  </UScrollArea>
</template>
