// Accent dùng chung cho editor (CodeMirror) và preview (markdown-it).
// Các biến được đổi cùng theme, nên Markdown và graph không giữ màu của theme cũ.
export const MARKDOWN_ACCENT = {
  comment: "var(--ui-text-muted)",
  keyword: "var(--nodus-secondary)",
  string: "var(--nodus-success)",
  heading: "var(--nodus-primary)",
  bold: "var(--nodus-warning)",
  link: "var(--nodus-accent)",
} as const;
