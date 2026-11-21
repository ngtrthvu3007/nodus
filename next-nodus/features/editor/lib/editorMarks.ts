import { syntaxTree } from "@codemirror/language";
import { Decoration } from "@codemirror/view";
import { EditorView } from "codemirror";

type Ranges = ReturnType<Decoration["range"]>[];

// Decorates every syntax node with one of these names. A highlight style cannot do it for code: when a code
// language is loaded, its parser replaces the markdown code text, and it styles each token on its own.
// ponytail: recomputed on every document change; fine until documents get very long.
const decorateNodes = (names: string[], build: (state: EditorView["state"], from: number, to: number) => Ranges) =>
  EditorView.decorations.compute(["doc"], (state) => {
    const ranges: Ranges = [];

    syntaxTree(state).iterate({
      enter: (node) => {
        if (!names.includes(node.name)) return;

        ranges.push(...build(state, node.from, node.to));
        return false;
      },
    });

    return Decoration.set(ranges);
  });

// The first and last line carry extra classes for the block's top and bottom padding (see editorTheme).
const getLineClass = (isFirst: boolean, isLast: boolean) =>
  `cm-code-line${isFirst ? " cm-code-first" : ""}${isLast ? " cm-code-last" : ""}`;

// Lines of a fenced or indented code block (monospace, own background; see editorTheme).
export const codeBlockLines = decorateNodes(["FencedCode", "CodeBlock"], (state, from, to) => {
  const first = state.doc.lineAt(from).number;
  const last = state.doc.lineAt(to).number;

  return Array.from({ length: last - first + 1 }, (_, index) => {
    const number = first + index;
    const decoration = Decoration.line({ class: getLineClass(number === first, number === last) });

    return decoration.range(state.doc.line(number).from);
  });
});

const INLINE_CODE = Decoration.mark({ class: "cm-inline-code" });

// One span around the whole `code`, backticks included, so the padding sits at its two ends.
export const inlineCodeMarks = decorateNodes(["InlineCode"], (_state, from, to) => [INLINE_CODE.range(from, to)]);
