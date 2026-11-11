import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WORKSPACE_ID } from "@/shared/constants";

type TabsState = {
  // Only ids: the title and kind come from the tree, so a rename updates the tab and a deleted node is easy to spot.
  tabIds: string[];
  // undefined: no tab is active (home).
  activeId: string | undefined;
  // Makes the tab active, adding it right after the active one when it is new.
  activateTab: (id: string | undefined) => void;
  // Removes the tabs and returns the active id.
  closeTabs: (ids: string[]) => string | undefined;
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
    }),
    // skipHydration: the server renders no tabs, so the browser reads them after mount (see useTabs).
    { name: `nodus:tabs:${WORKSPACE_ID}`, skipHydration: true },
  ),
);
