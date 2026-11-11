// A small, careful formatter for the markdown being written: it only touches whitespace and list markers, never the
// words, and leaves fenced code alone. Running it twice gives the same text.
//   - no trailing spaces (two spaces before a continuing line stay: it is a line break),
//   - one blank line at most, none at the start, one newline at the end,
//   - a blank line around headings and fenced code that start at the left edge,
//   - `-` for bullet lists (`*` and `+` become `-`),
//   - tables with one space around each cell and a `---` delimiter row. The columns are not padded to line up: the
//     editor text is not monospace, so padding would only make the rows long and ragged.

const FENCE = /^(\s*)(`{3,}|~{3,})/;
const HEADING = /^#{1,6}(\s|$)/;
const RULE = /^\s*([*_-])(\s*\1){2,}\s*$/;
const BULLET = /^(\s*)[*+](\s+)/;
const TABLE_ROW = /^ {0,3}\|.*\|\s*$/;
const DELIMITER_CELL = /^:?-+:?$/;
// A line that begins a new block: the two spaces before it are not a line break.
const BLOCK_START = /^\s*(#{1,6}\s|`{3,}|~{3,}|\||[-*+]\s|\d+[.)]\s|>)/;

// Splits on `|` unless it is escaped or inside inline code, and drops the empty cells outside the outer pipes.
const splitCells = (row: string) => {
  const cells: string[] = [];
  let current = "";
  let isInCode = false;

  for (const [index, char] of [...row].entries()) {
    if (char === "`") isInCode = !isInCode;

    if (char === "|" && !isInCode && row[index - 1] !== "\\") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());

  return cells.slice(1, -1);
};

const buildDelimiter = (cell: string) => `${cell.startsWith(":") ? ":" : ""}---${cell.endsWith(":") ? ":" : ""}`;

const formatTable = (rows: string[]) => {
  const parsed = rows.map(splitCells);
  if (!parsed[1]?.every((cell) => DELIMITER_CELL.test(cell))) return rows;

  return parsed.map((cells, row) => `| ${cells.map((cell) => (row === 1 ? buildDelimiter(cell) : cell)).join(" | ")} |`);
};

const isBlank = (line: string | undefined) => line === undefined || line.trim() === "";

export const formatMarkdown = (text: string): string => {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let openFence: string | null = null;

  const pushBlank = () => {
    if (output.length && !isBlank(output.at(-1))) output.push("");
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const fence = FENCE.exec(line);
    const isClosing = Boolean(openFence && fence && line.trim() === fence[2] && fence[2].startsWith(openFence));

    if (openFence) {
      output.push(line);

      if (isClosing) {
        openFence = null;
        if (fence?.[1] === "" && !isBlank(lines[index + 1])) pushBlank();
      }
      continue;
    }

    if (fence) {
      if (fence[1] === "") pushBlank();
      output.push(line);
      openFence = fence[2];
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const rows = [line];
      while (TABLE_ROW.test(lines[index + 1] ?? "")) rows.push(lines[++index]);

      if (rows.length > 1) pushBlank();
      output.push(...formatTable(rows.map((row) => row.trim())));
      continue;
    }

    const nextLine = lines[index + 1];
    const isHardBreak = / {2,}$/.test(line) && line.trim() !== "" && !isBlank(nextLine) && !BLOCK_START.test(nextLine);
    let formatted = isHardBreak ? `${line.trimEnd()}  ` : line.trimEnd();
    if (!RULE.test(formatted)) formatted = formatted.replace(BULLET, "$1-$2");

    if (formatted === "") {
      pushBlank();
      continue;
    }

    const isHeading = HEADING.test(formatted);
    if (isHeading) pushBlank();
    output.push(formatted);
    if (isHeading && !isBlank(lines[index + 1])) pushBlank();
  }

  while (output.length && isBlank(output[0])) output.shift();
  while (output.length && isBlank(output.at(-1))) output.pop();

  return output.length ? `${output.join("\n")}\n` : "";
};

// Where the caret goes after formatting: the same place in the text, counting only what is not whitespace. Next to
// blank space it keeps its side: at the end of a run of whitespace it stays at the end, even if the run got longer.
export const getFormattedCaret = (before: string, caret: number, after: string) => {
  const prefix = before.slice(0, caret);
  const target = prefix.replace(/\s/g, "").length;
  let seen = 0;
  let position = 0;

  while (position < after.length && seen < target) {
    if (!/\s/.test(after[position])) seen++;
    position++;
  }

  const spaceBefore = prefix.length - prefix.trimEnd().length;
  const spaceAfter = /^\s*/.exec(after.slice(position))?.[0].length ?? 0;
  const isAtEndOfSpace = caret >= before.length || !/\s/.test(before[caret]);

  return position + (isAtEndOfSpace && spaceBefore > 0 ? spaceAfter : Math.min(spaceBefore, spaceAfter));
};
