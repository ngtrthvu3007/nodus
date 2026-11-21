import type { ElementContent, Element, Root } from "hast";
import type { Plugin } from "unified";
import { createElement, createText, isElement } from "./hast";

export const WIKI_OPEN = "[[";
export const WIKI_CLOSE = "]]";
export const WIKI_HEADING_SEPARATOR = "#";
// Class names also live in app/globals.css.
export const WIKI_LINK_CLASS = "nodus-wiki-link";
export const WIKI_BROKEN_CLASS = "nodus-wiki-broken";
export const WIKI_BROKEN_TITLE = "No doc or heading matches this link";

// WIKI_OPEN and WIKI_CLOSE around a single line with no brackets.
const WIKI_PATTERN = /\[\[([^[\]\n]+)\]\]/g;

// heading is null when the link has no `#`.
export type WikiLink = { ref: string; heading: string | null };

// Returns the href of the target, or null when the link is broken.
export type WikiResolver = (link: WikiLink) => string | null;

// "A/B#Heading" -> { ref: "A/B", heading: "Heading" }. A link with no doc part, like "[[ ]]", is not a link.
const parseWikiLink = (inner: string): WikiLink | null => {
  const [ref, ...headingParts] = inner.split(WIKI_HEADING_SEPARATOR);
  const heading = headingParts.join(WIKI_HEADING_SEPARATOR).trim();

  return ref.trim() ? { ref: ref.trim(), heading: heading || null } : null;
};

// Also finds links inside code blocks; only used to know which headings to load.
export const parseWikiLinks = (source: string): WikiLink[] =>
  Array.from(source.matchAll(WIKI_PATTERN), ([, inner]) => parseWikiLink(inner)).filter((link) => link !== null);

const toWikiElement = (inner: string, link: WikiLink, resolve: WikiResolver): Element => {
  const label = [createText(inner.trim())];
  const href = resolve(link);

  return href
    ? createElement("a", { href, className: [WIKI_LINK_CLASS] }, label)
    : createElement("span", { className: [WIKI_BROKEN_CLASS], title: WIKI_BROKEN_TITLE }, label);
};

const splitText = (value: string, resolve: WikiResolver): ElementContent[] => {
  const nodes: ElementContent[] = [];
  let start = 0;

  for (const match of value.matchAll(WIKI_PATTERN)) {
    const link = parseWikiLink(match[1]);
    if (!link) continue;

    if (match.index > start) nodes.push(createText(value.slice(start, match.index)));
    nodes.push(toWikiElement(match[1], link, resolve));
    start = match.index + match[0].length;
  }

  if (start < value.length) nodes.push(createText(value.slice(start)));
  return nodes;
};

// No link inside a link, and code keeps the text as written.
const SKIPPED_TAGS = new Set(["a", "code", "pre"]);

const rewrite = (element: Element, resolve: WikiResolver) => {
  element.children = element.children.flatMap((child) => {
    if (child.type === "text") return splitText(child.value, resolve);
    if (isElement(child) && !SKIPPED_TAGS.has(child.tagName)) rewrite(child, resolve);

    return [child];
  });
};

// After the HTML filter (users cannot write its classes) and the heading ids (a heading keeps the id of its raw text).
export const rehypeWikiLinks: Plugin<[WikiResolver], Root> = (resolve) => (tree) => {
  tree.children.filter(isElement).forEach((element) => {
    if (!SKIPPED_TAGS.has(element.tagName)) rewrite(element, resolve);
  });
};
