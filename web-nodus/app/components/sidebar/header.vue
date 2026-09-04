<script setup lang="ts">
const emit = defineEmits<{ collapse: [] }>();
</script>

<template>
  <div class="flex items-center justify-between gap-2 border-b pb-2">
    <NuxtLink to="/" aria-label="Home" class="flex min-w-0 items-center gap-2">
      <Logo class="h-8 w-auto shrink-0" />
      <span class="truncate text-md font-bold text-highlighted">Nodus</span>
    </NuxtLink>

    <div class="flex items-center gap-1">
      <UButton
        color="neutral"
        variant="ghost"
        size="md"
        icon="i-lucide-arrow-left-to-line"
        aria-label="Collapse sidebar"
        @click="emit('collapse')" />
    </div>
  </div>
</template>
