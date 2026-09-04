<script setup lang="ts">
import type { NoteTreeItem } from "~/composables/useNoteTree";

defineProps<{
  item: NoteTreeItem;
  expanded: boolean;
  handleToggle: (event: Event) => void;
}>();
</script>

<template>
  <UIcon
    v-if="item.children?.length"
    name="i-lucide-chevron-right"
    class="size-4 shrink-0 transition-transform"
    :class="{ 'rotate-90': expanded }"
    @click.stop="handleToggle" />
</template>
