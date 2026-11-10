import type { Element, Root } from "hast";
import { createHighlighter } from "shiki";
import type { Plugin } from "unified";
import { createElement, createText, getCodeChild, getLanguage, getText, isElement, visitElements } from "./hast";

// Dual themes as CSS variables (--shiki-light, --shiki-dark); app/globals.css picks one per theme mode.
// github-light and catppuccin-mocha keep every token type readable (about 4.8:1 and up) on the app surfaces.
const THEMES = { light: "github-light", dark: "catppuccin-mocha" } as const;
const LANGUAGES = ["typescript", "javascript", "css", "html", "json", "yaml", "sql", "bash", "go"] as const;
const TEXT_LANGUAGE = "text";
const TITLE_PATTERN = /title="([^"]*)"/;

type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

type CodeBlockInput = {
  source: string;
  language: string;
  meta: string;
};

let highlighterPromise: Promise<Highlighter> | undefined;

const getHighlighter = () => {
  highlighterPromise ??= createHighlighter({ themes: [THEMES.light, THEMES.dark], langs: [...LANGUAGES] });
  return highlighterPromise;
};

// Runs before the HTML filter, which drops `data`, so the fence meta moves to a property. A ```svg block
// becomes real markup here, so the filter cleans it like any inline SVG.
export const rehypeCodeMeta: Plugin<[], Root> = () => (tree) => {
  visitElements(tree, (element, index, parent) => {
    const code = getCodeChild(element);
    if (!code) return;

    if (getLanguage(code) === "svg") {
      parent.children[index] = { type: "raw", value: getText(code) };
      return;
    }

    if (code.data?.meta) code.properties.dataMeta = code.data.meta;
  });
};

// Runs after the HTML filter: the classes and styles it adds are ours, not the user's.
export const rehypeCodeBlocks: Plugin<[], Root> = () => async (tree) => {
  const highlighter = await getHighlighter();

  visitElements(tree, (element, index, parent) => {
    if (element.tagName === "svg") {
      parent.children[index] = buildDiagram(element);
      return;
    }

    const code = getCodeChild(element);
    if (!code) return;

    const source = getText(code).replace(/\n$/, "");
    const language = getLanguage(code);

    // The browser draws mermaid later (drawMermaid.ts); here it only keeps the source.
    parent.children[index] =
      language === "mermaid"
        ? buildDiagram(createElement("pre", { className: ["nodus-mermaid"] }, [createText(source)]))
        : buildCodeBlock(highlighter, { source, language, meta: String(code.properties.dataMeta ?? "") });
  });
};

// A drawn diagram (svg or mermaid) with its Zoom button; markdown.tsx opens it larger in a modal.
const buildDiagram = (diagram: Element): Element =>
  createElement("div", { className: ["nodus-diagram"] }, [
    createElement("button", { type: "button", dataZoom: "" }, [createText("Zoom")]),
    diagram,
  ]);

const buildCodeBlock =(highlighter: Highlighter, { source, language, meta }: CodeBlockInput): Element => {
  const isKnown = highlighter.getLoadedLanguages().includes(language);
  const label = isKnown ? language : TEXT_LANGUAGE;
  const title = TITLE_PATTERN.exec(meta)?.[1] ?? "";

  const highlighted = highlighter.codeToHast(source, { lang: label, themes: THEMES, defaultColor: false });

  const caption = createElement("figcaption", {}, [
    createElement("span", { className: ["nodus-code-title"] }, [createText(title)]),
    createElement("span", { className: ["nodus-code-lang"] }, [createText(label)]),
    createElement("button", { type: "button", dataCopy: "" }, [createText("Copy")]),
  ]);

  return createElement("figure", { className: ["nodus-code"] }, [caption, ...highlighted.children.filter(isElement)]);
};
