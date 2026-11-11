import { useSyncExternalStore } from "react";

// Below Tailwind's `md` breakpoint: a phone, where the sidebar and the page cannot sit side by side.
const NARROW_QUERY = "(max-width: 767px)";

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(NARROW_QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};

const getSnapshot = () => window.matchMedia(NARROW_QUERY).matches;

// The server cannot know the screen, so it renders the wide layout; a narrow browser switches right after hydration.
const getServerSnapshot = () => false;

export const useIsNarrowScreen = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
