<script setup lang="ts">
useBreadcrumbSetter(computed(() => [{ label: "Nodus", slot: "home" }]));
</script>

<template>
  <div class="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center">
    <UIcon name="i-lucide-file-text" class="size-10 text-muted" />
    <p class="text-sm text-muted">Select a note from the sidebar to get started.</p>
  </div>
</template>
