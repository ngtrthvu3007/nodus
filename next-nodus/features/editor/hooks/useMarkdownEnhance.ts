import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useThemeMode } from "@/shared/theme";
import { drawMermaid, scrollToHash } from "../lib/markdownDom";

// What the HTML string cannot do by itself: open at the #slug heading, and draw mermaid in the browser.
export const useMarkdownEnhance = (containerRef: RefObject<HTMLElement | null>, html: string | undefined) => {
  const { mode } = useThemeMode();

  // Once per doc: scrolling on every render would pull the preview back to the heading while the user types.
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (hasScrolledRef.current || !containerRef.current || !html) return;

    hasScrolledRef.current = true;
    scrollToHash(containerRef.current);
  }, [containerRef, html]);

  // Layout effect: cached diagrams are back in place before the browser paints.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !html) return;

    let isStale = false;
    drawMermaid({ container, mode, isStale: () => isStale });

    return () => {
      isStale = true;
    };
  }, [containerRef, html, mode]);
};
