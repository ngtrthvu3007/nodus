// Bảng màu accent dùng chung cho editor (CodeMirror) và preview (markdown-it),
// để 2 chế độ xem cùng 1 note luôn đồng bộ màu sắc. Lấy từ theme "One Dark Pro"
// (Binaryify/OneDark-Pro, VS Code) — chỉ mượn accent, nền/text vẫn theo --ui-*.
// https://github.com/Binaryify/OneDark-Pro
export const MARKDOWN_ACCENT = {
  comment: "#7f848e",
  keyword: "#c678dd",
  string: "#98c379",
  heading: "#e06c75",
  bold: "#d19a66",
  link: "#c678dd",
} as const;
