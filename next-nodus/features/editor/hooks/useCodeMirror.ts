import { autocompletion } from "@codemirror/autocomplete";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { LanguageDescription, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightActiveLineGutter, keymap, lineNumbers, placeholder } from "@codemirror/view";
import { EditorView, minimalSetup } from "codemirror";
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { codeBlockLines, inlineCodeMarks } from "../lib/editorMarks";
import { editorHighlight, editorTheme } from "../lib/editorTheme";
import { formatMarkdown, getFormattedCaret } from "../lib/formatMarkdown";
import { mermaidDescription } from "../lib/mermaidLanguage";
import { wikiCompletion, type WikiFetchers } from "../lib/wikiCompletion";

// language-data has no "svg" (it is xml) and no "mermaid".
const CODE_LANGUAGES = [...languages, mermaidDescription];
const getCodeLanguage = (info: string) =>
  LanguageDescription.matchLanguageName(CODE_LANGUAGES, info === "svg" ? "xml" : info, true);

// The text column is centered and narrower than the editor, so a click beside it lands on the scroller, not on the text.
// Put the caret at the nearest spot of the text, as a click on the text itself would.
const focusFromMargin = (view: EditorView, event: MouseEvent) => {
  const { scrollDOM } = view;
  const isOnScrollbar = event.clientX > scrollDOM.getBoundingClientRect().left + scrollDOM.clientWidth;
  if (event.target !== scrollDOM || isOnScrollbar) return;

  event.preventDefault();
  view.dispatch({ selection: { anchor: view.posAtCoords({ x: event.clientX, y: event.clientY }, false) } });
  view.focus();
};

// Replaces the text with its formatted version in one step (one undo) and keeps the caret in the same place of the text.
// The focus goes back to the editor, so a click on the Format button does not leave the keyboard on the button.
const formatView = (view: EditorView) => {
  view.focus();

  const before = view.state.doc.toString();
  const after = formatMarkdown(before);
  if (after === before) return;

  const caret = getFormattedCaret(before, view.state.selection.main.head, after);
  view.dispatch({
    changes: { from: 0, to: before.length, insert: after },
    selection: { anchor: caret },
    scrollIntoView: true,
  });
};

type UseCodeMirrorInput = {
  hostRef: RefObject<HTMLElement | null>;
  value: string;
  onChange: (value: string) => void;
  wikiFetchers: WikiFetchers;
};

// `value` is the starting text and `onChange` receives every edit. The text is not replaced from outside yet:
// the Autosave story adds that when it needs "take the server version". minimalSetup has no folding or
// autocomplete, which this editor does not want by default; the line numbers are added here, and the only
// suggestions are the wiki-links ([[ and [[Doc#).
export const useCodeMirror = ({ hostRef, value, onChange, wikiFetchers }: UseCodeMirrorInput) => {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const wikiFetchersRef = useRef(wikiFetchers);
  const viewRef = useRef<EditorView | null>(null);

  // The editor is built once; this keeps its listeners calling the latest handlers. The latest value is kept too:
  // Next hides a page you left (effects clean up, the view is destroyed) and shows it again with its state, so the
  // rebuilt editor must start from the current text, not the first one.
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    wikiFetchersRef.current = wikiFetchers;
  }, [value, onChange, wikiFetchers]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      parent: host,
      doc: valueRef.current,
      extensions: [
        minimalSetup,
        lineNumbers(),
        highlightActiveLineGutter(),
        markdown({ base: markdownLanguage, codeLanguages: getCodeLanguage }),
        syntaxHighlighting(editorHighlight),
        codeBlockLines,
        inlineCodeMarks,
        editorTheme,
        autocompletion({ override: [wikiCompletion(wikiFetchersRef)] }),
        keymap.of([
          {
            key: "Shift-Alt-f",
            run: (view) => {
              formatView(view);
              return true;
            },
          },
        ]),
        placeholder("Start writing in Markdown…"),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": "Markdown editor" }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    viewRef.current = view;
    const handleMarginClick = (event: MouseEvent) => focusFromMargin(view, event);
    view.scrollDOM.addEventListener("mousedown", handleMarginClick);

    return () => {
      view.scrollDOM.removeEventListener("mousedown", handleMarginClick);
      view.destroy();
      viewRef.current = null;
    };
  }, [hostRef]);

  const format = useCallback(() => {
    if (viewRef.current) formatView(viewRef.current);
  }, []);

  return { format };
};
