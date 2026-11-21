import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { EditorView } from "codemirror";

// Colors, fonts and sizes are the app's CSS variables (shared/theme/tokens.css), so the editor follows the
// light and dark mode without a second theme.
const color = (name: string) => `var(--nodus-color-${name})`;

// Two code blocks with no blank line between them would touch. A transparent border above the first line and below
// the last one keeps them apart (a margin would confuse the editor's line measuring). The radius is taller than
// wide so that, once the background is clipped to the padding box, the corner is still a circle.
const BLOCK_GAP = "calc(var(--spacing) * 1.5)";
const BLOCK_RADIUS = "var(--nodus-radius-md)";
const BLOCK_RADIUS_TALL = `${BLOCK_RADIUS} calc(${BLOCK_RADIUS} + ${BLOCK_GAP})`;

export const editorTheme = EditorView.theme({
  // height: the editor fills its parent and scrolls inside, so the page itself does not scroll.
  "&": {
    height: "100%",
    backgroundColor: color("surface"),
    color: color("fg"),
    fontSize: "var(--nodus-font-size-lg)",
  },
  // A quiet ring that still shows where the keyboard is, drawn inside the panel so the splitter does not clip it. It is a
  // layer above the text (a plain outline is covered by the background of code blocks), and lets clicks through.
  "&.cm-focused": { outline: "none" },
  "&.cm-focused::after": {
    content: '""',
    position: "absolute",
    inset: "0",
    zIndex: "10",
    border: `1px solid color-mix(in srgb, ${color("primary")} 50%, transparent)`,
    pointerEvents: "none",
  },
  // Sans for prose; the monospace font only comes from code (see .cm-inline-code and codeBlockLines).
  // justifyContent: the line numbers and the text column are centered together (see .cm-content).
  ".cm-scroller": { fontFamily: "var(--nodus-font-sans)", lineHeight: "1.75", justifyContent: "center" },
  // 24px of padding all around, and a text column of about 80 characters (ADR-001 §5) centered in the editor. While
  // the panel is wider than the column, resizing it moves the text but does not re-wrap it. The line numbers and the
  // column are centered together, so the numbers stay next to the text.
  ".cm-content": {
    caretColor: color("fg"),
    padding: "calc(var(--spacing) * 6)",
    minHeight: "100%",
    maxWidth: "calc(80ch + var(--spacing) * 12)",
  },
  // Quiet line numbers, no panel of their own; the current line's number is brighter. Each number is centered on
  // its line, so it sits level with the text, including the taller heading and code block lines.
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: color("fg-subtle") },
  ".cm-lineNumbers .cm-gutterElement": {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 calc(var(--spacing) * 2) 0 calc(var(--spacing) * 4)",
    fontSize: "var(--nodus-font-size)",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: color("fg") },
  ".cm-placeholder": { color: color("fg-subtle") },
  // The only place besides inline code where the monospace font is used (see codeBlockLines).
  ".cm-code-line": {
    fontFamily: "var(--nodus-font-mono)",
    fontSize: "0.9em",
    backgroundColor: "var(--nodus-code-bg)",
    // Room around the code so it does not touch the edge of its background.
    padding: "0 calc(var(--spacing) * 4)",
  },
  // The first and last line of a block are taller: the text is centered in them, so the line number can be too.
  ".cm-code-first": {
    lineHeight: "2.6",
    borderTop: `${BLOCK_GAP} solid transparent`,
    backgroundClip: "padding-box",
    borderTopLeftRadius: BLOCK_RADIUS_TALL,
    borderTopRightRadius: BLOCK_RADIUS_TALL,
  },
  ".cm-code-last": {
    lineHeight: "2.6",
    borderBottom: `${BLOCK_GAP} solid transparent`,
    backgroundClip: "padding-box",
    borderBottomLeftRadius: BLOCK_RADIUS_TALL,
    borderBottomRightRadius: BLOCK_RADIUS_TALL,
  },
  // Inline code; the span comes from inlineCodeMarks.
  ".cm-inline-code": {
    color: "var(--nodus-code-text)",
    fontFamily: "var(--nodus-font-mono)",
    fontSize: "0.9em",
    backgroundColor: "var(--nodus-code-bg)",
    borderRadius: "var(--nodus-radius-sm)",
    padding: "0 0.35em",
  },
  // The [[ suggestions: CodeMirror's own list is light and monospace, which is unreadable in the dark mode.
  ".cm-tooltip.cm-tooltip-autocomplete": {
    backgroundColor: color("elevated"),
    border: `1px solid ${color("border")}`,
    borderRadius: "var(--nodus-radius-md)",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "var(--nodus-font-sans)",
    fontSize: "var(--nodus-font-size)",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": { color: color("fg"), padding: "2px calc(var(--spacing) * 3)" },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: color("primary-soft"),
    color: color("fg"),
  },
  ".cm-completionDetail": { color: color("fg-subtle"), marginLeft: "calc(var(--spacing) * 2)" },
  ".cm-cursor": { borderLeftColor: color("fg") },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: color("primary-soft"),
  },
});

export const editorHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "var(--nodus-font-size-h1)", fontWeight: "600" },
  { tag: tags.heading2, fontSize: "var(--nodus-font-size-h2)", fontWeight: "600" },
  { tag: tags.heading3, fontSize: "var(--nodus-font-size-h3)", fontWeight: "600" },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: "600" },
  { tag: tags.strong, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: [tags.link, tags.url], color: color("link") },
  { tag: tags.quote, color: color("fg-muted") },
  // Markdown symbols (#, *, `, >, -) stay quiet next to the text.
  { tag: [tags.processingInstruction, tags.contentSeparator], color: color("fg-subtle") },
  // Shell commands (cd, cp, docker...) and $variables, which have no other highlight in a bash block.
  { tag: tags.standard(tags.variableName), color: color("link") },
  { tag: tags.special(tags.variableName), color: color("info") },
  { tag: [tags.keyword, tags.operator], color: color("primary") },
  { tag: [tags.string, tags.regexp], color: color("success") },
  { tag: [tags.number, tags.bool, tags.null], color: color("warning") },
  { tag: [tags.typeName, tags.className, tags.propertyName, tags.attributeName], color: color("info") },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.tagName], color: color("link") },
  { tag: tags.comment, color: color("fg-subtle"), fontStyle: "italic" },
  { tag: tags.invalid, color: color("error") },
]);
