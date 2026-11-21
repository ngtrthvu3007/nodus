import { describe, expect, it } from "vitest";
import { formatMarkdown, getFormattedCaret } from "./formatMarkdown";

describe("formatMarkdown", () => {
  it("trims spaces and blank lines, keeps a hard break, ends with one newline", () => {
    expect(formatMarkdown("\n\nHello  \nworld   \n\n\n\nEnd\n\n")).toBe("Hello  \nworld\n\nEnd\n");
  });

  it("drops the two spaces before a new block: they are not a line break there", () => {
    expect(formatMarkdown("intro  \n## Title\ntext  \n- item\nmore  \nnext")).toBe(
      "intro\n\n## Title\n\ntext\n- item\nmore  \nnext\n",
    );
  });

  it("puts a blank line around headings and fenced code", () => {
    expect(formatMarkdown("text\n## Title\nmore\n```ts\nconst a = 1;\n```\nafter")).toBe(
      "text\n\n## Title\n\nmore\n\n```ts\nconst a = 1;\n```\n\nafter\n",
    );
  });

  it("does not touch what is inside fenced code, even when it is indented in a list", () => {
    const source = "- item\n  ```md\n  * keep   \n\n\n  ## this\n  ```\n";

    expect(formatMarkdown(source)).toBe(source);
  });

  it("uses - for bullets and leaves rules and emphasis alone", () => {
    expect(formatMarkdown("* one\n  + two\n* * *\n*emphasis* here")).toBe("- one\n  - two\n* * *\n*emphasis* here\n");
  });

  it("tidies tables without padding the columns, keeping alignment colons and escaped pipes", () => {
    const source = "|a   |b|\n|:-|-:|\n|a long cell|x \\| y|\n";

    expect(formatMarkdown(source)).toBe("| a | b |\n| :--- | ---: |\n| a long cell | x \\| y |\n");
  });

  it("is idempotent", () => {
    const source = "# T\ntext  \nnext\n* a\n|a|b|\n|-|-|\n|1|2|\n```\ncode\n```\nend";
    const once = formatMarkdown(source);

    expect(formatMarkdown(once)).toBe(once);
  });
});

describe("getFormattedCaret", () => {
  it("follows the text when blank lines are added before it", () => {
    const before = "a\n## b\nc";
    const after = formatMarkdown(before);
    const caret = getFormattedCaret(before, before.indexOf("c"), after);

    expect(after.slice(caret)).toBe("c\n");
  });
});
