"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { useCodeMirror } from "../hooks";

// What the screen around the editor can ask of it.
export type MarkdownEditorHandle = {
  // Tidies the markdown being written (the same as Shift+Alt+F).
  format: () => void;
};

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ref?: Ref<MarkdownEditorHandle>;
};

export const MarkdownEditor = ({ value, onChange, className, ref }: MarkdownEditorProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const { format } = useCodeMirror({ hostRef, value, onChange });
  useImperativeHandle(ref, () => ({ format }), [format]);

  return <div ref={hostRef} className={className} />;
};
