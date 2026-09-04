<script setup lang="ts">
defineProps<{ label: string }>();

const open = defineModel<boolean>("open", { default: true });
</script>

<template>
  <UCollapsible v-model:open="open">
    <div class="flex w-full items-center justify-between">
      <button type="button" class="flex items-center gap-1 text-sm font-medium text-muted">
        {{ label }}
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4.5 shrink-0 transition-transform"
          :class="{ 'rotate-90': open }" />
      </button>

      <div v-if="$slots.actions" @click.stop>
        <slot name="actions" />
      </div>
    </div>

    <template #content>
      <div class="pt-1">
        <slot />
      </div>
    </template>
  </UCollapsible>
</template>
