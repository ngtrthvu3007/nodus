<script setup lang="ts">
import type { Note } from "~/types/note";
import type { SearchState } from "~/composables/useAppSidebar";

defineProps<{ state: SearchState; notes: Note[] }>();
</script>

<template>
  <div class="min-h-0 space-y-1">
    <BaseListSkeleton v-if="state === 'loading'" />

    <p v-else-if="state === 'empty'" class="px-2 py-4 text-center text-xs text-muted">No notes found.</p>

    <div v-else class="space-y-0.5">
      <NuxtLink
        v-for="note in notes"
        :key="note.id"
        :to="`/notes/${note.id}`"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-elevated text-sm">
        <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-muted" />
        <span class="min-w-0 flex-1 truncate">{{ note.title }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
