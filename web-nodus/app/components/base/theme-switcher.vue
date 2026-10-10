<script setup lang="ts">
const storageKey = "nodus-theme";

const themes = [
  { value: "light", label: "Light", icon: "i-lucide-sun" },
  { value: "dark", label: "Dark", icon: "i-lucide-moon" },
  { value: "dracula", label: "Dracula", icon: "i-lucide-wand-sparkles" },
  { value: "paper", label: "Paper", icon: "i-lucide-book-open-text" },
  { value: "nord", label: "Nord", icon: "i-lucide-snowflake" },
] as const;

type Theme = (typeof themes)[number]["value"];

const theme = ref<Theme>("dark");
const isOpen = ref(false);

const isTheme = (value: string | null): value is Theme => themes.some((item) => item.value === value);
const darkThemes: Theme[] = ["dark", "dracula", "nord"];

const applyTheme = (value: Theme) => {
  document.documentElement.dataset.theme = value;
  document.documentElement.classList.toggle("dark", darkThemes.includes(value));
  document.documentElement.classList.toggle("light", !darkThemes.includes(value));
  localStorage.setItem(storageKey, value);
};

onMounted(() => {
  // shortcut: saved theme is applied after hydration; use a cookie if the initial theme flash matters.
  const storedTheme = localStorage.getItem(storageKey);

  if (isTheme(storedTheme)) {
    theme.value = storedTheme;
  }

  applyTheme(theme.value);
});

watch(theme, (value) => {
  if (import.meta.client) {
    applyTheme(value);
  }
});

const selectTheme = (value: Theme) => {
  theme.value = value;
  isOpen.value = false;
};
</script>

<template>
  <UPopover v-model:open="isOpen" :content="{ side: 'right', align: 'end', sideOffset: 8 }">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
      aria-label="Open user menu">
      <img src="https://ui.shadcn.com/avatars/shadcn.jpg" alt="" class="size-8 rounded-full object-cover" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium text-highlighted">shadcn</span>
        <span class="block truncate text-xs text-muted">m@example.com</span>
      </span>
      <UIcon name="i-lucide-chevrons-up-down" class="size-4 text-muted" />
    </button>

    <template #content>
      <div class="w-52 p-1" role="menu" aria-label="Workspace menu">
        <div class="flex items-center gap-2 px-2 py-2">
          <img src="https://ui.shadcn.com/avatars/shadcn.jpg" alt="" class="size-8 rounded-full object-cover" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-highlighted">shadcn</p>
            <p class="truncate text-xs text-muted">m@example.com</p>
          </div>
        </div>

        <div class="my-1 border-t" />
        <p class="px-2 py-1.5 text-xs font-medium text-muted">Appearance</p>

        <button
          v-for="item in themes"
          :key="item.value"
          type="button"
          role="menuitemradio"
          :aria-checked="theme === item.value"
          class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
          @click="selectTheme(item.value)">
          <UIcon :name="item.icon" class="size-4 text-muted" />
          <span class="flex-1">{{ item.label }}</span>
          <UIcon v-if="theme === item.value" name="i-lucide-check" class="size-4 text-primary" />
        </button>
      </div>
    </template>
  </UPopover>
</template>
