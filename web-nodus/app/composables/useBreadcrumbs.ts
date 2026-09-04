import type { BreadcrumbItem } from "@nuxt/ui";

// Shared across the app: pages set their own trail, the global header renders it.
const breadcrumbItems = () => useState<BreadcrumbItem[]>("breadcrumb-items", () => []);

export const useBreadcrumbs = () => {
  const items = breadcrumbItems();

  return { items };
};

// Convenience for pages: keep the trail in sync with the page's own reactive
// items. Not cleared on unmount — the next page always sets its own trail on
// mount, and unmount order between the old/new page during navigation isn't
// guaranteed, so clearing here can wipe out the trail the new page just set.
export const useBreadcrumbSetter = (items: Ref<BreadcrumbItem[]> | ComputedRef<BreadcrumbItem[]>) => {
  const state = breadcrumbItems();

  watch(items, (value) => {
    state.value = value;
  }, { immediate: true });
};
