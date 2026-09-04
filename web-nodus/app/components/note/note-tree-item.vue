<script setup lang="ts">
import type { NoteTreeItem } from "~/composables/useNoteTree";

const props = defineProps<{
  item: NoteTreeItem;
  isRenaming: boolean;
  // When false, clicking the label only expands/collapses (if the note has
  // children) — navigation is left to whatever trailing actions menu is used.
  navigateOnClick: boolean;
}>();

const renameValue = defineModel<string>("renameValue", { default: "" });

const emit = defineEmits<{ submitRename: []; cancelRename: [] }>();

const onLabelClick = () => {
  if (props.navigateOnClick && props.item.to) {
    void navigateTo(props.item.to);
  }
};
</script>

<template>
  <UInput
    v-if="isRenaming"
    v-model="renameValue"
    autofocus
    size="xs"
    class="w-full"
    @click.stop
    @keyup.enter="emit('submitRename')"
    @keyup.esc="emit('cancelRename')"
    @blur="emit('submitRename')" />
  <span v-else class="truncate" @click.stop="onLabelClick">{{ item.label }}</span>
</template>
