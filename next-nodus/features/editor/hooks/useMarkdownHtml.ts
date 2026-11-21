import { useEffect, useState } from "react";
import type { RenderedMarkdown } from "../lib/render";
import type { WikiResolver } from "../lib/wikiLinks";

// The renderer (unified, Shiki) loads on first use, so screens without a doc do not carry it.
// The previous result stays on screen while a new one is being built. A new resolver renders again: the links changed.
export const useMarkdownHtml = (source: string, resolveWikiLink: WikiResolver) => {
  const [rendered, setRendered] = useState<RenderedMarkdown | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isStale = false;

    import("../lib/render")
      .then(({ renderMarkdown }) => renderMarkdown(source, resolveWikiLink))
      .then((next) => {
        if (isStale) return;

        setRendered(next);
        setFailed(false);
      })
      .catch(() => {
        if (!isStale) setFailed(true);
      });

    return () => {
      isStale = true;
    };
  }, [source, resolveWikiLink, attempt]);

  return { rendered, failed, retry: () => setAttempt((count) => count + 1) };
};
