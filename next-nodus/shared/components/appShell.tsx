"use client";

import { MoonIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SunIcon } from "lucide-react";
import { Button, Splitter } from "antd";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useIsNarrowScreen } from "@/shared/hooks";
import { useSidebarStore } from "@/shared/stores";
import { THEME_MODE, getOppositeThemeMode, useThemeMode } from "@/shared/theme";
import { NodusLogo } from "./logo";

type AppShellProps = {
  sidebar?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
};

const ThemeToggle = () => {
  const { mode, setMode } = useThemeMode();
  return (
    <Button
      size="small"
      type="text"
      aria-label="Change theme"
      icon={mode === THEME_MODE.dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      onClick={(event) => setMode(getOppositeThemeMode(mode), event.currentTarget)}
    />
  );
};

// App frame: resizable sidebar on the left, page content on the right. Width 0 means collapsed.
// On a phone the sidebar is a full-width menu: it opens over the whole screen, and choosing a page closes it.
export const AppShell = ({ sidebar, tabs, children }: AppShellProps) => {
  const pathname = usePathname();
  const isNarrow = useIsNarrowScreen();
  const width = useSidebarStore((state) => state.width);
  const resize = useSidebarStore((state) => state.resize);
  const toggle = useSidebarStore((state) => state.toggle);
  const close = useSidebarStore((state) => state.close);
  const collapsed = width === 0;

  // Starts closed on a phone, and closes again each time a page is opened from it.
  useEffect(() => {
    if (isNarrow) close();
  }, [isNarrow, pathname, close]);

  return (
    <Splitter
      className="h-screen overflow-hidden bg-canvas"
      collapsible={{ motion: true }}
      onResize={([next]) => resize(next)}>
      <Splitter.Panel
        size={isNarrow && !collapsed ? "100%" : width}
        resizable={!isNarrow}
        min={200}
        max={isNarrow ? undefined : 480}
        collapsible={{ start: true, showCollapsibleIcon: false }}
        className="bg-surface">
        <div className="flex h-full flex-col border-r border-border-muted">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <NodusLogo />
              <span className="font-semibold">Nodus</span>
            </div>
            <Button
              size="small"
              type="text"
              aria-label="Collapse sidebar"
              icon={<PanelLeftCloseIcon className="size-4" />}
              onClick={toggle}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5">{sidebar}</div>
          <div className="flex items-center justify-end border-t border-border-muted px-3 py-2">
            <ThemeToggle />
          </div>
        </div>
      </Splitter.Panel>
      <Splitter.Panel className="relative min-w-0">
        {/* Always mounted so it fades in as the sidebar closes; inert while the sidebar is open. */}
        <Button
          aria-label="Open sidebar"
          aria-hidden={!collapsed}
          tabIndex={collapsed ? 0 : -1}
          icon={<PanelLeftOpenIcon className="size-4" />}
          onClick={toggle}
          className={`absolute top-3 left-3 z-10 border-border-muted bg-surface shadow-sm transition-opacity duration-300 motion-reduce:transition-none ${
            collapsed ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <div className="flex h-full min-h-0 flex-col">
          {tabs}
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </Splitter.Panel>
    </Splitter>
  );
};
