import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type TabsState = {
  // Only ids: the title and kind come from the tree, so a rename updates the tab and a deleted node is easy to spot.
  tabIds: string[];
  // undefined: no tab is active (home).
  activeId: string | undefined;
  // Makes the tab active, adding it right after the active one when it is new.
  activateTab: (id: string | undefined) => void;
  // Removes the tabs and returns the active id.
  closeTabs: (ids: string[]) => string | undefined;
  // Puts the tab where the other one is.
  moveTab: (id: string, overId: string) => void;
};

export const getTabsStorageKey = (workspaceId: string) => `nodus:tabs:${workspaceId}`;

// Whether the workspace saved tabs before; storage can be missing or blocked, which counts as none.
export const hasStoredTabs = (storageKey: string) => {
  try {
    return window.localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
};

// The tab to show after the active one closes: the first one on its right, else the last one.
const getNextTab = (tabIds: string[], remaining: string[], closedActiveId: string) => {
  const before = tabIds.slice(0, tabIds.indexOf(closedActiveId)).filter((id) => remaining.includes(id)).length;
  return remaining.at(Math.min(before, remaining.length - 1));
};

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabIds: [],
      activeId: undefined,
      activateTab: (id) =>
        set(({ tabIds, activeId }) => {
          if (id === undefined || tabIds.includes(id)) return { activeId: id };

          const activeIndex = tabIds.findIndex((tabId) => tabId === activeId);
          const at = activeIndex === -1 ? tabIds.length : activeIndex + 1;
          return { tabIds: [...tabIds.slice(0, at), id, ...tabIds.slice(at)], activeId: id };
        }),
      closeTabs: (ids) => {
        const { tabIds, activeId } = get();
        const remaining = tabIds.filter((id) => !ids.includes(id));
        const next =
          activeId !== undefined && ids.includes(activeId) ? getNextTab(tabIds, remaining, activeId) : activeId;

        set({ tabIds: remaining, activeId: next });
        return next;
      },
      moveTab: (id, overId) =>
        set(({ tabIds }) => ({ tabIds: arrayMove(tabIds, tabIds.indexOf(id), tabIds.indexOf(overId)) })),
    }),
    // skipHydration: the server renders no tabs, so the browser reads them after mount (see useTabs).
    // Only the ids are stored: the active tab is the URL of each browser tab, so browser tabs can share the list.
    // Each workspace keeps its own list: useTabs points the store at the workspace of the URL (getTabsStorageKey).
    { name: getTabsStorageKey(""), skipHydration: true, partialize: ({ tabIds }) => ({ tabIds }) },
  ),
);
