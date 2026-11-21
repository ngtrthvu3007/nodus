"use client";

import type { InputRef } from "antd";
import { useRef, type KeyboardEvent } from "react";

const getLinks = (root: HTMLElement | null) => (root ? [...root.querySelectorAll("a")] : []);

// Keyboard path through the search: Esc clears, ArrowDown enters the results, and the box's `onSearch`
// (Enter or the search icon) opens the first one.
export const useSearchKeyboard = (clear: () => void) => {
  const inputRef = useRef<InputRef>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // The button that calls this unmounts with the results, so focus goes back to the box.
  const clearAndFocus = () => {
    clear();
    inputRef.current?.focus();
  };

  const getFirst = () => getLinks(resultsRef.current)[0];
  // While the list is dimmed for the previous text, its first doc may no longer match, so Enter waits.
  const onSearch = () => {
    if (resultsRef.current?.querySelector("[aria-busy=true]")) return;
    getFirst()?.click();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const first = getFirst();

    if (event.key === "Escape") {
      clear();
    } else if (event.key === "ArrowDown" && first) {
      event.preventDefault();
      first.focus();
    }
  };

  // Arrow keys move between results; ArrowUp on the first one goes back to the box.
  const onResultsKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const links = getLinks(resultsRef.current);
    const current = links.findIndex((link) => link === document.activeElement);
    const next = current + (event.key === "ArrowDown" ? 1 : -1);

    if (next < 0) inputRef.current?.focus();
    else links[Math.min(next, links.length - 1)]?.focus();
  };

  return { inputRef, resultsRef, clearAndFocus, onSearch, onInputKeyDown, onResultsKeyDown };
};
