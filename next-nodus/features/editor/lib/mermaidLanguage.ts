import { LanguageDescription, LanguageSupport, StreamLanguage } from "@codemirror/language";

const KEYWORD =
  /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|journey|subgraph|end|participant|actor|note|loop|alt|else|opt|par|class|state|direction|title|section|TD|TB|BT|RL|LR)\b/;
const ARROW = /^(?:<?(?:-\.+-|[-=]{2,})[>xo]?>?|--?>>?)/;
const NODE_TEXT = /^(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})/;

// Only what makes a diagram easy to scan: keywords, arrows, node text, labels and comments.
const mermaid = StreamLanguage.define({
  token: (stream) => {
    if (stream.eatSpace()) return null;
    if (stream.match(/^%%.*/)) return "comment";
    if (stream.match(/^"[^"]*"|^\|[^|]*\|/) || stream.match(NODE_TEXT)) return "string";
    if (stream.match(ARROW)) return "operator";
    if (stream.match(KEYWORD)) return "keyword";
    if (!stream.match(/^\w+/)) stream.next();

    return null;
  },
});

// language-data has no mermaid, so the editor gets this one for ```mermaid.
export const mermaidDescription = LanguageDescription.of({
  name: "Mermaid",
  alias: ["mermaid"],
  load: async () => new LanguageSupport(mermaid),
});
