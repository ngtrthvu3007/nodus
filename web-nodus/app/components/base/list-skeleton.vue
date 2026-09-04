<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 5 });
</script>

<template>
  <USkeleton v-for="index in rows" :key="index" class="h-10 w-full" />
</template>
