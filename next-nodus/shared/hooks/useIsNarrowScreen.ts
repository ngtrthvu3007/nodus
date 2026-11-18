"use client";

import { useSyncExternalStore } from "react";

// The server cannot know the screen, so it renders the wide layout; a narrow browser switches right after hydration.
const getServerSnapshot = () => false;

const createMaxWidthHook = (maxWidth: number) => {
  const query = `(max-width: ${maxWidth}px)`;

  const subscribe = (onChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  };

  const getSnapshot = () => window.matchMedia(query).matches;

  const useMatchesQuery = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMatchesQuery;
};

// Below Tailwind's `md` breakpoint: a phone, where the sidebar and the page cannot sit side by side.
export const useIsNarrowScreen = createMaxWidthHook(767);

// Below Tailwind's `lg` breakpoint: a phone or a tablet, where the editor and the preview cannot sit side by side.
export const useIsCompactScreen = createMaxWidthHook(1023);
