import { useEffect } from "react";

type TabShortcutsInput = {
  tabIds: string[];
  activeId: string | undefined;
  select: (id: string) => void;
  close: (id: string) => void;
  move: (id: string, overId: string) => void;
};

// Alt+W closes the active tab; Ctrl+Alt+Right and Ctrl+Alt+Left go to the next and previous one (wrapping around);
// Ctrl+Alt+Shift+Right and Left move it. Ctrl+W and Ctrl+Tab are left alone: the browser keeps them.
export const useTabShortcuts = ({ tabIds, activeId, select, close, move }: TabShortcutsInput) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeId === undefined || event.defaultPrevented || !event.altKey || event.metaKey) return;

      const index = tabIds.indexOf(activeId);
      const step = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;

      if (event.code === "KeyW" && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        close(activeId);
      } else if (step && event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        select(tabIds[(index + step + tabIds.length) % tabIds.length]);
      } else if (step && event.ctrlKey && event.shiftKey && tabIds[index + step]) {
        event.preventDefault();
        move(activeId, tabIds[index + step]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tabIds, activeId, select, close, move]);
};
