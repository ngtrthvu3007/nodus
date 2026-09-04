<script setup lang="ts">
definePageMeta({ layout: false });
</script>

<template>
  <UMain class="min-h-dvh">
    <div class="flex h-dvh flex-col">
      <div class="flex h-14 shrink-0 items-center gap-3 border-b border-default px-4">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" label="Back" to="/" />
        <div class="font-medium text-highlighted">Global graph</div>
      </div>

      <div class="flex flex-1 items-center justify-center text-sm text-muted">
        Graph view placeholder
      </div>
    </div>
  </UMain>
</template>
