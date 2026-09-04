<script setup lang="ts">
import type { ModalFormComponent } from "~/composables/useModal";

const { state, close } = useModal();

const contentRef = ref<ModalFormComponent | null>(null);

const confirm = async () => {
  if (state.value.component) {
    const data = contentRef.value?.submit();
    if (data === null || data === undefined) {
      return;
    }

    await state.value.onConfirm(data);
  } else {
    await state.value.onConfirm(undefined);
  }

  close();
};

// Enter gõ trong bất kỳ input nào của form con cũng submit — trừ khi đang bấm 1 button
// (tránh double-submit khi Enter được gõ lúc nút Cancel/Confirm đang focus).
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
    void confirm();
  }
};
</script>

<template>
  <UModal v-model:open="state.isOpen" :title="state.title">
    <template #body>
      <div @keydown="onKeydown">
        <component :is="state.component" v-if="state.component" ref="contentRef" v-bind="state.props" />
        <p v-else-if="state.message" class="text-sm text-accent">{{ state.message }}</p>

        <div class="flex w-full justify-end gap-2 mt-8">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="close" />
          <UButton :color="state.confirmColor" :label="state.confirmLabel" @click="confirm" />
        </div>
      </div>
    </template>
  </UModal>
</template>
