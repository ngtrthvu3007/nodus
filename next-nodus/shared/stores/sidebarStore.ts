import { create } from "zustand";

const DEFAULT_WIDTH = 288;

type SidebarState = {
  // 0 means collapsed.
  width: number;
  // Width to restore when the sidebar is opened again.
  openWidth: number;
  resize: (width: number) => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

const isCollapsed = ({ width }: SidebarState) => width === 0;

export const useSidebarStore = create<SidebarState>((set) => ({
  width: DEFAULT_WIDTH,
  openWidth: DEFAULT_WIDTH,
  resize: (width) => set(width > 0 ? { width, openWidth: width } : { width }),
  toggle: () => set((state) => ({ width: isCollapsed(state) ? state.openWidth : 0 })),
  open: () => set((state) => (isCollapsed(state) ? { width: state.openWidth } : {})),
  close: () => set({ width: 0 }),
}));
