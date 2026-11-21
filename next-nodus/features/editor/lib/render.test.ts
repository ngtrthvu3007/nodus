import { describe, expect, it } from "vitest";
import { slugify } from "./headings";
import { renderMarkdown } from "./render";
import { parseWikiLinks, WIKI_BROKEN_CLASS, WIKI_LINK_CLASS, type WikiResolver } from "./wikiLinks";

const resolveNothing: WikiResolver = () => null;

const render = async (source: string, resolveWikiLink: WikiResolver = resolveNothing) =>
  (await renderMarkdown(source, resolveWikiLink)).html;

describe("XSS payloads", () => {
  const svgScript = `<svg onload="alert(1)"><script>alert(1)</script><foreignObject><div>x</div></foreignObject><circle r="1" onclick="alert(1)"/></svg>`;

  it.each([
    ["script tag", "<script>alert(1)</script>", ["<script", "alert(1)"]],
    ["onerror", `<img src="x" onerror="alert(1)">`, ["onerror"]],
    ["javascript: href in HTML", `<a href="javascript:alert(1)">x</a>`, ["javascript:"]],
    ["javascript: href in markdown", "[x](javascript:alert(1))", ["javascript:"]],
    ["javascript: src", `<img src="javascript:alert(1)">`, ["javascript:"]],
    ["data: src", `<img src="data:text/html;base64,AAAA">`, ["data:"]],
    ["iframe", `<iframe src="https://evil.example"></iframe>`, ["<iframe", "evil.example"]],
    ["style tag", "<style>body{display:none}</style>", ["<style", "display:none"]],
    ["object, embed, form", `<object data="x"></object><embed src="x"><form action="x"><input name="a"></form>`, ["<object", "<embed", "<form"]],
    ["inline SVG", svgScript, ["<script", "foreignobject", "onload", "onclick", "alert(1)"]],
    ["svg code block", `\`\`\`svg\n${svgScript}\n\`\`\``, ["<script", "foreignobject", "onload", "onclick", "alert(1)"]],
    ["uppercase script tag", "<SCRIPT>alert(1)</SCRIPT>", ["<script", "alert(1)"]],
    ["entity-encoded scheme in HTML", `<a href="&#x6A;avascript:alert(1)">x</a>`, ["javascript:"]],
    ["entity-encoded scheme in markdown", "[x](&#106;avascript:alert(1))", ["javascript:"]],
    ["mixed-case scheme with a leading space", `<a href=" JaVaScRiPt:alert(1)">x</a>`, ["javascript:"]],
    ["srcset", `<img srcset="javascript:alert(1)">`, ["javascript:", "srcset"]],
    ["svg link and use", `<svg><a xlink:href="javascript:alert(1)"><text>x</text></a><use href="#a"/></svg>`, ["javascript:", "xlink", "<use"]],
    ["svg style", "<svg><style>*{display:none}</style></svg>", ["<style", "display:none"]],
    ["math mutation", "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>", ["onerror", "<style", "alert(1)"]],
    ["noscript breakout", `<noscript><p title="</noscript><img src=x onerror=alert(1)>">`, ["onerror"]],
    // The broken tag is escaped to plain text, so "onerror" stays as inert text; what matters is that no <img> exists.
    ["unclosed handler", "<img src=x onerror=alert(1)//", ["<img"]],
    ["data attributes that trigger our handlers", `<div data-copy data-zoom>x</div>`, ["data-copy", "data-zoom"]],
  ])("%s", async (_name, source, forbidden) => {
    const html = (await render(source)).toLowerCase();

    forbidden.forEach((text) => expect(html).not.toContain(text));
  });

  it("keeps the allowlisted HTML and draws SVG", async () => {
    const html = await render("<details><summary>S</summary>x</details> <kbd>K</kbd>\n\n```svg\n<svg viewBox=\"0 0 1 1\"><circle r=\"1\"/></svg>\n```");

    expect(html).toContain("<details>");
    expect(html).toContain("<kbd>K</kbd>");
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
  });
});

describe("user class, id and style", () => {
  it("drops them from any element", async () => {
    const html = await render(`<p class="x" id="y" style="color:red">t</p>`);

    expect(html).toContain("<p>t</p>");
  });

  it("replaces a user heading id with the generated one", async () => {
    const html = await render(`<h2 id="evil">Title</h2>`);

    expect(html).toContain(`id="nodus-title"`);
    expect(html).not.toContain("evil");
  });
});

describe("headings and table of contents", () => {
  const source = [
    "# Title",
    "## Kiến trúc",
    "### Module doc",
    "#### Too deep",
    "## Kiến trúc",
    "```md",
    "## Inside a code block",
    "```",
  ].join("\n\n");

  it("lists h2-h3 only, numbers duplicates, skips code blocks", async () => {
    const { outline, html } = await renderMarkdown(source, resolveNothing);

    expect(outline).toEqual([
      { level: 2, text: "Kiến trúc", slug: "kien-truc" },
      { level: 3, text: "Module doc", slug: "module-doc" },
      { level: 2, text: "Kiến trúc", slug: "kien-truc-1" },
    ]);
    expect(html).toContain(`id="nodus-kien-truc-1"`);
  });
});

describe("code blocks", () => {
  it.each(["ts", "js", "css", "html", "json", "yaml", "sql", "bash", "go"])("highlights %s", async (language) => {
    const html = await render(`\`\`\`${language}\nx\n\`\`\``);

    expect(html).toContain("--shiki-light");
    expect(html).toContain(`nodus-code-lang">${language}<`);
  });

  it("shows the file name, language label and Copy button", async () => {
    const html = await render('```ts title="a.ts"\nconst a: number = 1;\n```');

    expect(html).toContain("a.ts");
    expect(html).toContain("data-copy");
  });

  it("shows an unknown language as text", async () => {
    const html = await render("```foo\nbar\n```");

    expect(html).toContain(`nodus-code-lang">text<`);
    expect(html).toContain("bar");
  });

  it("keeps mermaid for the browser to draw", async () => {
    const html = await render("```mermaid\ngraph TD\n```");

    expect(html).toContain("nodus-mermaid");
    expect(html).toContain("graph TD");
    expect(html).toContain("data-zoom");
  });

  it("gives an svg a Zoom button", async () => {
    const html = await render('```svg\n<svg viewBox="0 0 1 1"><circle r="1"/></svg>\n```');

    expect(html).toContain("nodus-diagram");
    expect(html).toContain("data-zoom");
  });
});

describe("wiki-links", () => {
  const resolveAws: WikiResolver = ({ ref, heading }) =>
    ref === "AWS" ? `/docs/aws${heading ? `#${heading}` : ""}` : null;

  it("turns a resolved link into a link and an unresolved one into a broken mark", async () => {
    const html = await render("See [[AWS]] and [[Missing]].", resolveAws);

    expect(html).toContain(`<a href="/docs/aws" class="${WIKI_LINK_CLASS}">AWS</a>`);
    expect(html).toContain(`class="${WIKI_BROKEN_CLASS}"`);
    expect(html).not.toContain("[[");
  });

  it("passes the path and the heading to the resolver", async () => {
    const links: unknown[] = [];
    await render("[[A/B/AWS#Setup]]", (link) => {
      links.push(link);
      return null;
    });

    expect(links).toEqual([{ ref: "A/B/AWS", heading: "Setup" }]);
  });

  it("leaves code and empty links as written", async () => {
    const html = await render("`[[AWS]]` and [[ ]] and [[#only heading]]\n\n```\n[[AWS]]\n```", resolveAws);

    expect(html).not.toContain(WIKI_LINK_CLASS);
    expect(html).not.toContain(WIKI_BROKEN_CLASS);
    expect(html).toContain("[[ ]]");
  });

  it("does not let users write the wiki-link classes", async () => {
    const html = await render(`<span class="${WIKI_BROKEN_CLASS}">x</span>`);

    expect(html).not.toContain(WIKI_BROKEN_CLASS);
  });

  it("lists the links of a text", () => {
    expect(parseWikiLinks("[[A]] [[ b / C # H ]] [[ ]]")).toEqual([
      { ref: "A", heading: null },
      { ref: "b / C", heading: "H" },
    ]);
  });
});

describe("slugify", () => {
  it.each([
    ["Kiến trúc", "kien-truc"],
    ["Đường dẫn", "duong-dan"],
    ["  Hello   World ", "hello-world"],
  ])("%s -> %s", (text, slug) => {
    expect(slugify(text)).toBe(slug);
  });
});
