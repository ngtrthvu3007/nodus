<script setup lang="ts">
defineProps<{ showExpandSidebar: boolean }>();
defineEmits<{ expandSidebar: [] }>();

const { items } = useBreadcrumbs();
</script>

<template>
  <div class="flex h-14 shrink-0 items-center gap-3 border-b border-default px-3">
    <UButton
      v-if="showExpandSidebar"
      icon="i-lucide-arrow-right-to-line"
      aria-label="Expand sidebar"
      color="neutral"
      variant="ghost"
      size="md"
      @click="$emit('expandSidebar')" />

    <UBreadcrumb
      v-if="items.length"
      :items="items"
      :ui="{ linkLeadingIcon: 'size-3.5', linkLabel: 'text-xs' }" />
  </div>
</template>
