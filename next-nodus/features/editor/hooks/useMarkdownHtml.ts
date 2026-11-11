import { useEffect, useState } from "react";
import type { RenderedMarkdown } from "../lib/render";

// The renderer (unified, Shiki) loads on first use, so screens without a doc do not carry it.
// The previous result stays on screen while a new one is being built.
export const useMarkdownHtml = (source: string) => {
  const [rendered, setRendered] = useState<RenderedMarkdown | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isStale = false;

    import("../lib/render")
      .then(({ renderMarkdown }) => renderMarkdown(source))
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
  }, [source, attempt]);

  return { rendered, failed, retry: () => setAttempt((count) => count + 1) };
};
