<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Note } from "~/types/note";

const props = defineProps<{ note: Note }>();

const emit = defineEmits<{ edit: [Note]; move: [Note]; createChildNote: [Note]; delete: [Note] }>();

const { open: openModal } = useModal();

const openConfirmDelete = () => {
  const extra = props.note.hasChildren ? " This will also delete all of its child notes." : "";

  openModal({
    title: "Delete note",
    message: `Delete "${props.note.title}"?${extra} This action cannot be undone.`,
    confirmLabel: "Delete",
    confirmColor: "error",
    onConfirm: () => emit("delete", props.note),
  });
};

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      class: "flex items-center text-xs",
      label: "Edit",
      icon: "i-lucide-pencil",
      onSelect: () => emit("edit", props.note),
    },
    {
      class: "flex items-center text-xs",
      label: "Move to...",
      icon: "i-lucide-folder-input",
      onSelect: () => emit("move", props.note),
    },
    ...(!props.note.parentNoteId
      ? [
          {
            class: "flex items-center text-xs",
            label: "Add child note",
            icon: "i-lucide-plus",
            onSelect: () => emit("createChildNote", props.note),
          },
        ]
      : []),
  ],
  [
    {
      class: "flex items-center text-xs",
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error" as const,
      onSelect: openConfirmDelete,
    },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :ui="{ itemLeadingIcon: 'size-3.5' }"
    :items="items"
    :content="{ align: 'end', onCloseAutoFocus: (event: Event) => event.preventDefault() }">
    <UButton
      icon="i-lucide-more-horizontal"
      color="neutral"
      variant="ghost"
      size="xs"
      aria-label="Note actions"
      @click.stop
      @mousedown.stop />
  </UDropdownMenu>

  <UButton
    v-if="!note.parentNoteId"
    icon="i-lucide-plus"
    color="neutral"
    variant="ghost"
    size="xs"
    aria-label="Add child note"
    @click.stop="emit('createChildNote', note)"
    @mousedown.stop />
</template>
