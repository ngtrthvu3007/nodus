import type { Root } from "hast";
import type { Plugin } from "unified";
import { getText, visitElements } from "./hast";

export type OutlineItem = {
  level: 2 | 3;
  text: string;
  slug: string;
};

// Fixed rule: a heading link written today must still work later (FRD-editor-preview §5).
export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

// Own prefix: users cannot write `id`, and a heading id never collides with an id of the app.
export const HEADING_ID_PREFIX = "nodus-";

// Runs after the HTML filter. Fills `outline` (h2-h3) and gives every heading its id; the same text twice
// gets -1, -2 in order of appearance.
export const rehypeHeadings: Plugin<[OutlineItem[]], Root> = (outline) => (tree) => {
  const counts = new Map<string, number>();

  visitElements(tree, (element) => {
    // NaN for any tag that is not h1-h6.
    const level = Number(/^h([1-6])$/.exec(element.tagName)?.[1]);
    if (!level) return;

    const text = getText(element).trim();
    const base = slugify(text);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);

    const slug = count === 0 ? base : `${base}-${count}`;
    element.properties.id = `${HEADING_ID_PREFIX}${slug}`;

    if (level === 2 || level === 3) outline.push({ level, text, slug });
  });
};
