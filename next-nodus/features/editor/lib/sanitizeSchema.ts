import type { Options } from "rehype-sanitize";

// An explicit allowlist, not an extension of the default GitHub schema: the default lets users set `id` and `name`.
// No tag or attribute outside this file survives, so users cannot write `class`, `id`, `style` or `on*`.

const HTML_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "details",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "input",
  "kbd",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
];

// No `use`, `image`, `a` or `style` inside SVG: they can load other files or restyle the page.
// ponytail: no `id` means gradients cannot be referenced with url(#id); allow prefixed ids if docs need them.
const SVG_TAGS = [
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "defs",
  "title",
  "desc",
];

// Geometry and paint attributes of SVG (hast uses camelCase names); `width` and `height` also serve <img>.
const SHAPE_ATTRIBUTES = [
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "points",
  "width",
  "height",
  "fill",
  "fillOpacity",
  "fillRule",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeDasharray",
  "strokeOpacity",
  "opacity",
  "transform",
  "textAnchor",
  "fontSize",
  "fontWeight",
];

export const sanitizeSchema: Options = {
  tagNames: [...HTML_TAGS, ...SVG_TAGS],
  attributes: {
    "*": SHAPE_ATTRIBUTES,
    a: ["href", "title"],
    // dataMeta carries the fence meta (```ts title="a.ts") from rehypeCodeMeta; it is only shown as a label.
    code: [["className", /^language-./], "dataMeta"],
    details: ["open"],
    img: ["src", "alt", "title"],
    input: ["checked", "disabled", ["type", "checkbox"]],
    ol: ["start"],
    svg: ["viewBox", "xmlns", "role", "ariaLabel"],
    td: ["align"],
    th: ["align"],
  },
  // Relative URLs have no protocol and always pass.
  protocols: {
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
  // Only the disabled checkbox of a GFM task list.
  required: { input: { disabled: true, type: "checkbox" } },
  // Removed together with their content; any other unknown tag is replaced by its children.
  strip: ["script", "style", "iframe", "object", "embed", "form", "foreignObject"],
};
