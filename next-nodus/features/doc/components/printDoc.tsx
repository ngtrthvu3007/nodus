import { createPortal } from "react-dom";
import { Markdown, type WikiResolver } from "@/features/editor";
import { THEME_MODE } from "@/shared/theme";
import { usePrintLight } from "../hooks";

type PrintDocProps = {
  title: string;
  source: string;
  resolveWikiLink: WikiResolver;
};

// Print-only copy of the doc, hidden on screen. It sits in <body> so the print style can hide the whole app around it.
export const PrintDoc = ({ title, source, resolveWikiLink }: PrintDocProps) => {
  usePrintLight();

  return createPortal(
    <div className="nodus-print-root hidden print:block">
      <h1 className="mb-6 text-h1 font-semibold">{title}</h1>
      <Markdown source={source} resolveWikiLink={resolveWikiLink} mode={THEME_MODE.light} />
    </div>,
    document.body,
  );
};
