import type { MouseEvent } from "react";
import { THEME_MODE, type ThemeMode } from "@/shared/theme";
import { HEADING_ID_PREFIX } from "./headings";
import { WIKI_LINK_CLASS } from "./wikiLinks";

const SCROLL_MS = 650;

let scrollFrame = 0;

export const getScroller = (element: Element) => {
  let node = element.parentElement;
  while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;

  return node ?? document.documentElement;
};

const easeInOut = (progress: number) => (progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2);

// The browser's own smooth scroll is short and cannot be slowed down, so the scroll is eased here. A new scroll takes
// over from the one still running.
const scrollSmoothly = (target: Element) => {
  const scroller = getScroller(target);
  const from = scroller.scrollTop;
  const distance = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  const startedAt = performance.now();

  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / SCROLL_MS, 1);
    scroller.scrollTop = from + distance * easeInOut(progress);
    if (progress < 1) scrollFrame = requestAnimationFrame(step);
  };

  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(step);
};

export const scrollToHeading = (container: ParentNode, slug: string, isSmooth = false) => {
  const target = container.querySelector(`#${CSS.escape(`${HEADING_ID_PREFIX}${slug}`)}`);
  if (!target) return;

  const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isSmooth && !isReducedMotion) scrollSmoothly(target);
  else target.scrollIntoView();
};

// A URL with #slug opens at that heading. A malformed hash is ignored.
export const scrollToHash = (container: ParentNode) => {
  try {
    const slug = decodeURIComponent(window.location.hash.slice(1));
    if (slug) scrollToHeading(container, slug);
  } catch {
    // decodeURIComponent throws on a broken escape such as %E0%A4%A.
  }
};

// The href of a wiki-link that was clicked, or null for any other click. A modifier key or a middle click is left to
// the browser (open in a new tab); a plain click on this HTML would reload the whole page and lose the unsaved text.
export const getWikiLinkHref = (event: MouseEvent<HTMLElement>) => {
  const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  const target = event.target instanceof Element ? event.target : null;
  const anchor = target?.closest<HTMLAnchorElement>(`a.${WIKI_LINK_CLASS}`);

  return isPlainClick && anchor ? anchor.getAttribute("href") : null;
};

// One click handler on the container serves every Copy button, since the HTML is not React.
export const copyCodeFromClick = async (event: MouseEvent<HTMLElement>) => {
  const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-copy]") : null;
  const code = button?.closest("figure")?.querySelector("pre");
  if (!button || !code) return;

  try {
    await navigator.clipboard.writeText(code.textContent ?? "");
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }

  setTimeout(() => {
    button.textContent = "Copy";
  }, 1500);
};

// The svg of the diagram whose Zoom button was clicked, as markup for the zoom modal.
export const getZoomedDiagram = (event: MouseEvent<HTMLElement>) => {
  const button = event.target instanceof Element ? event.target.closest("[data-zoom]") : null;
  const source = button?.closest(".nodus-diagram")?.querySelector("svg");
  if (!source) return null;

  // Mermaid caps the svg at its natural width (an inline max-width), which would keep the zoomed view small.
  const svg = source.cloneNode(true) as SVGElement;
  svg.style.removeProperty("max-width");

  return svg.outerHTML;
};

type DrawMermaidInput = {
  container: HTMLElement;
  mode: ThemeMode;
  isStale: () => boolean;
};

// Redrawing is slow and every edit rebuilds the HTML, so a drawn diagram is kept by theme and source.
const svgCache = new Map<string, string>();
let drawCount = 0;

const getCacheKey = (mode: ThemeMode, source: string) => `${mode}:${source}`;

// The source is kept in data-source so a theme change can redraw. Returns the blocks that still need drawing.
const restoreCached = (blocks: HTMLElement[], mode: ThemeMode) =>
  blocks.filter((block) => {
    const source = block.dataset.source ?? block.textContent ?? "";
    block.dataset.source = source;

    const cached = svgCache.get(getCacheKey(mode, source));
    if (cached) block.innerHTML = cached;

    return !cached;
  });

// Draws every mermaid block in the container. Cached diagrams are put back at once, so typing elsewhere does not
// flash the source text. A block with a syntax error stays as readable source text.
export const drawMermaid = async ({ container, mode, isStale }: DrawMermaidInput) => {
  const blocks = Array.from(container.querySelectorAll<HTMLElement>("pre.nodus-mermaid"));
  const missing = restoreCached(blocks, mode);
  if (!missing.length) return;

  const { default: mermaid } = await import("mermaid");
  // strict: mermaid encodes HTML in labels and disables click handlers.
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: mode === THEME_MODE.dark ? "dark" : "default" });

  for (const block of missing) {
    const source = block.dataset.source ?? "";

    try {
      if (!(await mermaid.parse(source, { suppressErrors: true }))) continue;

      const { svg } = await mermaid.render(`mermaid-${drawCount++}`, source);
      if (isStale()) return;

      svgCache.set(getCacheKey(mode, source), svg);
      block.innerHTML = svg;
    } catch {
      // The block keeps its source text.
    }
  }
};
