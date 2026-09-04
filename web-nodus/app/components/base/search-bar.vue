<script setup lang="ts">
const search = defineModel<string>({ default: "" });
</script>

<template>
  <UInput
    v-model="search"
    icon="i-lucide-search"
    size="lg"
    variant="outline"
    placeholder="Find note..."
    class="w-full" />
</template>
