<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Folder } from "~/types/folder";

const props = defineProps<{ folder: Folder }>();

const emit = defineEmits<{ edit: [Folder]; createNote: [Folder]; delete: [Folder] }>();

const { open: openModal } = useModal();

const openConfirmDelete = () => {
  const noteCount = props.folder.noteCount;
  const extra =
    noteCount > 0
      ? ` This will also delete ${noteCount} note${noteCount > 1 ? "s" : ""} inside it (including their child notes). Move any notes you want to keep out of this folder first.`
      : "";

  openModal({
    title: "Delete folder",
    message: `Delete "${props.folder.name}"?${extra} This action cannot be undone.`,
    confirmLabel: "Delete",
    confirmColor: "error",
    onConfirm: () => emit("delete", props.folder),
  });
};

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: "View detail",
      class: "flex items-center text-xs",
      icon: "i-lucide-eye",
      onSelect: () => navigateTo(`/folders/${props.folder.id}`),
    },
    {
      class: "flex items-center text-xs",
      label: "Edit",
      icon: "i-lucide-pencil",
      onSelect: () => emit("edit", props.folder),
    },
    {
      class: "flex items-center text-xs",
      label: "Add note",
      icon: "i-lucide-plus",
      onSelect: () => emit("createNote", props.folder),
    },
  ],
  [
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      class: "flex items-center text-xs",
      color: "error" as const,
      onSelect: openConfirmDelete,
    },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :ui="{ itemLeadingIcon: 'size-3.5' }"
    :content="{ align: 'end', onCloseAutoFocus: (event: Event) => event.preventDefault() }">
    <UButton
      icon="i-lucide-more-horizontal"
      color="neutral"
      variant="ghost"
      size="xs"
      aria-label="Folder actions"
      @click.stop
      @mousedown.stop />
  </UDropdownMenu>

  <UButton
    icon="i-lucide-plus"
    color="neutral"
    variant="ghost"
    size="xs"
    aria-label="Add note"
    @click.stop="emit('createNote', props.folder)"
    @mousedown.stop />
</template>
