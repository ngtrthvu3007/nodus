<script setup lang="ts">
import type { SplitterItem } from "@nuxt/ui";

const SIDEBAR_PANEL_INDEX = 0;
const splitterItems: SplitterItem[] = [
  {
    slot: "sidebar",
    sizeUnit: "px",
    minSize: 64,
    defaultSize: 300,
    maxSize: 550,
    collapsible: true,
    collapsedSize: 0,
    class:
      "min-h-0 overflow-hidden border border-default bg-elevated/50 shadow transition-[flex-grow] duration-300 ease-in-out",
  },
  { slot: "main", class: "min-h-0 overflow-hidden border border-default" },
];
const splitterUi = { handle: "w-0" };

const splitter = useTemplateRef<{ panelsRef: { expand: () => void }[] }>("splitter");
const splitterReady = ref(false);
const sidebarCollapsed = ref(false);

onMounted(async () => {
  await nextTick();
  splitterReady.value = true;
});

const expandSidebar = () => {
  splitter.value?.panelsRef[SIDEBAR_PANEL_INDEX]?.expand();
};

const updateSidebarCollapsed = (index: number, collapsed: boolean) => {
  if (index === SIDEBAR_PANEL_INDEX) {
    sidebarCollapsed.value = collapsed;
  }
};
</script>

<template>
  <div class="h-screen w-full">
    <USplitter
      v-if="splitterReady"
      id="splitter-collapsible-example"
      ref="splitter"
      :items="splitterItems"
      class="h-full w-full"
      :ui="splitterUi"
      @collapse="updateSidebarCollapsed($event, true)"
      @expand="updateSidebarCollapsed($event, false)">
      <template #sidebar="{ collapsed, collapse }">
        <div v-if="collapsed" class="flex-1 flex items-start justify-center p-2">
          <Logo class="h-6 w-auto shrink-0" />
        </div>

        <SidebarAppSidebar v-else @collapse="collapse" />
      </template>

      <template #main>
        <UMain class="flex h-full w-full flex-col">
          <ResponsiveHeader :show-expand-sidebar="sidebarCollapsed" @expand-sidebar="expandSidebar" />

          <div class="min-h-0 flex-1">
            <slot />
          </div>
        </UMain>
      </template>
    </USplitter>
  </div>
</template>
