import type { Completion, CompletionSource } from "@codemirror/autocomplete";
import type { RefObject } from "react";
import type { DocHeading, DocSuggestion } from "@/shared/types";
import { WIKI_CLOSE, WIKI_HEADING_SEPARATOR, WIKI_OPEN } from "./wikiLinks";

// What the editor needs from the API; the screen around it supplies them.
export type WikiFetchers = {
  suggest: (query: string) => Promise<DocSuggestion[]>;
  getHeadings: (docId: string) => Promise<DocHeading[]>;
};

// The link being typed: from "[[" to the caret.
const OPEN_LINK = /\[\[[^\]\n]*/;

// Inserts the text and its closing brackets, replacing the brackets already there when editing an existing link.
const applyWikiRef =
  (text: string): Completion["apply"] =>
  (view, _completion, from, to) => {
    const hasClose = view.state.sliceDoc(to, to + WIKI_CLOSE.length) === WIKI_CLOSE;

    view.dispatch({
      changes: { from, to: hasClose ? to + WIKI_CLOSE.length : to, insert: `${text}${WIKI_CLOSE}` },
      selection: { anchor: from + text.length + WIKI_CLOSE.length },
      userEvent: "input.complete",
    });
  };

const toDocOption = ({ ref, path }: DocSuggestion): Completion => ({
  label: ref,
  detail: path,
  apply: applyWikiRef(ref),
});

const toHeadingOption = ({ text }: DocHeading): Completion => ({ label: text, apply: applyWikiRef(text) });

// "[[te" suggests docs, "[[Doc#" its headings. filter: false because the server already filtered the docs by "contains".
export const wikiCompletion =
  (fetchersRef: RefObject<WikiFetchers>): CompletionSource =>
  async (context) => {
    const match = context.matchBefore(OPEN_LINK);
    if (!match) return null;

    const { suggest, getHeadings } = fetchersRef.current;
    const typed = match.text.slice(WIKI_OPEN.length);
    const separatorAt = typed.indexOf(WIKI_HEADING_SEPARATOR);
    const from = match.from + WIKI_OPEN.length;

    if (separatorAt === -1) {
      const docs = await suggest(typed);
      return context.aborted ? null : { from, filter: false, options: docs.map(toDocOption) };
    }

    const ref = typed.slice(0, separatorAt).trim().toLowerCase();
    const docs = await suggest(ref);
    const doc = docs.find((item) => item.ref.toLowerCase() === ref);
    if (!doc) return null;

    const headings = await getHeadings(doc.id);
    return context.aborted
      ? null
      : { from: from + separatorAt + WIKI_HEADING_SEPARATOR.length, options: headings.map(toHeadingOption) };
  };
