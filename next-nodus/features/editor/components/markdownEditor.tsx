"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { useCodeMirror } from "../hooks";
import type { WikiFetchers } from "../lib/wikiCompletion";

// What the screen around the editor can ask of it.
export type MarkdownEditorHandle = {
  // Tidies the markdown being written (the same as Shift+Alt+F).
  format: () => void;
  // Swaps the whole text for another (for example the server's version), as one undo step.
  replaceText: (text: string) => void;
};

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  wikiFetchers: WikiFetchers;
  className?: string;
  ref?: Ref<MarkdownEditorHandle>;
};

export const MarkdownEditor = ({ value, onChange, wikiFetchers, className, ref }: MarkdownEditorProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const { format, replaceText } = useCodeMirror({ hostRef, value, onChange, wikiFetchers });
  useImperativeHandle(ref, () => ({ format, replaceText }), [format, replaceText]);

  return <div ref={hostRef} className={className} />;
};
