import { Button, Dropdown } from "antd";
import { ListIcon } from "lucide-react";
import type { RefObject } from "react";
import { useActiveHeading } from "../hooks";
import type { OutlineItem } from "../lib/headings";
import { scrollToHeading } from "../lib/markdownDom";

type MarkdownOutlineProps = {
  outline: OutlineItem[];
  // The element that holds the rendered text: the same heading can exist in two places (the panel and the full screen
  // view), so the scroll must be limited to one of them.
  containerRef: RefObject<HTMLElement | null>;
  className?: string;
};

// The menu is still closing when it is clicked; waiting for it keeps the two motions from overlapping.
const MENU_CLOSE_DELAY = 150;

const goToHeading = (containerRef: MarkdownOutlineProps["containerRef"], slug: string, delay = 0) =>
  window.setTimeout(() => {
    if (containerRef.current) scrollToHeading(containerRef.current, slug, true);
  }, delay);

// "On this page" as a button with a menu of the h2-h3 headings, for a tab bar or a toolbar: it takes no room in the
// reading column.
export const MarkdownOutline = ({ outline, containerRef, className }: MarkdownOutlineProps) => {
  const activeSlug = useActiveHeading(containerRef, outline);

  if (!outline.length) return null;

  const items = outline.map((item) => ({
    key: item.slug,
    label: item.text,
    className: item.level === 3 ? "ps-4" : "",
  }));

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items,
        selectedKeys: activeSlug ? [activeSlug] : [],
        onClick: ({ key }) => goToHeading(containerRef, key, MENU_CLOSE_DELAY),
        className: "nodus-outline-menu max-h-80 overflow-auto",
      }}>
      <Button size="small" type="text" icon={<ListIcon className="size-4" />} className={className}>
        On this page
      </Button>
    </Dropdown>
  );
};

// "On this page" as a list that stays in view, for a screen with room to spare: a guide line on the left, the
// current level in the text color, the sub-headings indented and quieter, and the section being read marked.
export const MarkdownOutlineNav = ({ outline, containerRef }: MarkdownOutlineProps) => {
  const activeSlug = useActiveHeading(containerRef, outline);

  if (!outline.length) return null;

  return (
    <nav aria-label="On this page" className="nodus-scroll max-h-[calc(100dvh-6rem)] overflow-auto pe-2">
      <p className="mb-3 text-ui font-semibold">On this page</p>

      <ul className="border-s border-border-muted">
        {outline.map((item) => (
          <li key={item.slug}>
            <button
              type="button"
              onClick={() => goToHeading(containerRef, item.slug)}
              aria-current={item.slug === activeSlug ? "location" : undefined}
              className={`-ms-px w-full cursor-pointer border-s-2 py-1.5 pe-2 text-left text-ui leading-snug transition-colors hover:text-primary motion-reduce:transition-none ${
                item.level === 3 ? "ps-7" : "ps-4"
              } ${
                item.slug === activeSlug
                  ? "border-primary font-medium text-primary"
                  : `border-transparent hover:border-primary ${item.level === 3 ? "text-fg-muted" : "text-fg"}`
              }`}>
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
