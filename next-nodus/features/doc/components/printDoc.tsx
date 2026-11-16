import { createPortal } from "react-dom";
import { Markdown, type WikiResolver } from "@/features/editor";
import { THEME_MODE } from "@/shared/theme";

// A doc that opens with its own "# Title".
const OWN_HEADING = /^\s*# /;

type PrintDocProps = {
  title: string;
  source: string;
  resolveWikiLink: WikiResolver;
};

// Print-only copy of the doc, hidden on screen. It sits in <body> so the print style can hide the whole app around it.
export const PrintDoc = ({ title, source, resolveWikiLink }: PrintDocProps) => {
  // The title is added only to a doc without its own heading, so it never prints twice.
  const hasOwnHeading = OWN_HEADING.test(source);

  return createPortal(
    <div className="nodus-print-root nodus-light hidden print:block">
      {!hasOwnHeading && <h1 className="mb-6 text-h1 font-semibold">{title}</h1>}
      <Markdown source={source} resolveWikiLink={resolveWikiLink} mode={THEME_MODE.light} />
    </div>,
    document.body,
  );
};
