"use client";

import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { Button, Splitter } from "antd";
import { useRef, useState, type ReactNode } from "react";
import { useThemeMode } from "@/shared/theme/theme-provider";

interface AppShellProps {
  sidebar?: ReactNode;
  children: ReactNode;
}

const ThemeToggle = () => {
  const { mode, setMode } = useThemeMode();
  return (
    <Button
      size="small"
      type="text"
      aria-label="Change theme"
      icon={mode === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      onClick={(event) => setMode(mode === "dark" ? "light" : "dark", event.currentTarget)}
    />
  );
};

const DEFAULT_WIDTH = 288;

// App-wide frame: resizable sidebar (header, body slot, footer) on the left, page content on the right.
// Width is controlled so the header button can collapse (0) and restore it; dragging below `min` also collapses.
// `collapsible.motion` animates the width change (antd skips it while dragging and under reduced motion).
export const AppShell = ({ sidebar, children }: AppShellProps) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const lastWidth = useRef(DEFAULT_WIDTH);
  const collapsed = width === 0;

  const resize = ([next]: number[]) => {
    if (next > 0) lastWidth.current = next;
    setWidth(next);
  };

  const toggle = () => setWidth(collapsed ? lastWidth.current : 0);

  return (
    <Splitter className="h-screen bg-canvas" collapsible={{ motion: true }} onResize={resize}>
      <Splitter.Panel
        size={width}
        min={200}
        max={480}
        collapsible={{ start: true, showCollapsibleIcon: false }}
        className="bg-surface">
        <div className="flex h-full flex-col border-r border-border-muted">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-ui font-bold text-on-primary">
                N
              </div>
              <span className="font-semibold">Nodus</span>
            </div>
            <Button
              size="small"
              type="text"
              aria-label="Thu gọn sidebar"
              icon={<ChevronDoubleLeftIcon className="size-4" />}
              onClick={toggle}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-2">{sidebar}</div>
          <div className="flex items-center justify-end border-t border-border-muted px-3 py-2">
            <ThemeToggle />
          </div>
        </div>
      </Splitter.Panel>
      <Splitter.Panel className="relative min-w-0">
        {/* Always mounted so it fades in as the sidebar closes; inert while the sidebar is open. */}
        <Button
          aria-label="Mở sidebar"
          aria-hidden={!collapsed}
          tabIndex={collapsed ? 0 : -1}
          icon={<ChevronDoubleRightIcon className="size-4" />}
          onClick={toggle}
          className={`absolute top-3 left-3 z-10 border-border-muted bg-surface shadow-sm transition-opacity duration-300 motion-reduce:transition-none ${
            collapsed ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        {children}
      </Splitter.Panel>
    </Splitter>
  );
};
