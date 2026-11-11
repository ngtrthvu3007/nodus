import { useEffect, useState, type RefObject } from "react";
import { HEADING_ID_PREFIX, type OutlineItem } from "../lib/headings";
import { getScroller } from "../lib/markdownDom";

// The reading line: a heading that has scrolled above this share of the height of its scrolling area has been passed.
const READING_LINE = 0.25;

// The slug of the heading of the section being read: the last one above the reading line. The observer only wakes
// the check when a heading crosses the line, so scrolling itself costs nothing.
export const useActiveHeading = (containerRef: RefObject<HTMLElement | null>, outline: OutlineItem[]) => {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !outline.length) return;

    const headings = outline.flatMap((item) => {
      const element = container.querySelector(`#${CSS.escape(`${HEADING_ID_PREFIX}${item.slug}`)}`);
      return element ? [{ slug: item.slug, element }] : [];
    });

    const scroller = headings.length ? getScroller(headings[0].element) : null;
    if (!scroller) return;

    const update = () => {
      const area = scroller.getBoundingClientRect();
      const line = area.top + area.height * READING_LINE;
      const passed = headings.filter(({ element }) => element.getBoundingClientRect().top <= line);
      setActiveSlug((passed.at(-1) ?? headings[0])?.slug ?? null);
    };

    const observer = new IntersectionObserver(update, {
      root: scroller === document.documentElement ? null : scroller,
      rootMargin: `0px 0px -${(1 - READING_LINE) * 100}% 0px`,
    });
    headings.forEach(({ element }) => observer.observe(element));

    return () => observer.disconnect();
  }, [containerRef, outline]);

  return activeSlug;
};
