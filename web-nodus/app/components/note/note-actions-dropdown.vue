<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Note } from "~/types/note";

const props = defineProps<{ note: Note }>();

const emit = defineEmits<{ delete: [Note] }>();

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
    { label: "View detail", icon: "i-lucide-eye", onSelect: () => navigateTo(`/notes/${props.note.id}`) },
    { label: "Edit", icon: "i-lucide-pencil", disabled: true },
  ],
  [
    {
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
</template>
