<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
    initialValue?: string;
  }>(),
  { placeholder: "", initialValue: "" },
);

const value = ref(props.initialValue);

const isValid = computed(() => Boolean(value.value.trim()));

const submit = () => {
  if (!isValid.value) {
    return null;
  }

  return { value: value.value.trim() };
};

defineExpose({ submit });
</script>

<template>
  <UFormField :label="label" required>
    <UInput v-model="value" autofocus :placeholder="placeholder" class="w-full" />
  </UFormField>
</template>
