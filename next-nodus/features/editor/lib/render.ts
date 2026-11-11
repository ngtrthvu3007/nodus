import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypeCodeBlocks, rehypeCodeMeta } from "./codeBlocks";
import { rehypeHeadings, type OutlineItem } from "./headings";
import { sanitizeSchema } from "./sanitizeSchema";
import { rehypeWikiLinks, type WikiResolver } from "./wikiLinks";

export type RenderedMarkdown = {
  html: string;
  outline: OutlineItem[];
};

// Order matters: user HTML is parsed (rehype-raw) and filtered (rehype-sanitize) first. Heading ids and code
// blocks and wiki-links come after, so nothing the filter would strip (id, class, style) can come from the user.
export const renderMarkdown = async (source: string, resolveWikiLink: WikiResolver): Promise<RenderedMarkdown> => {
  const outline: OutlineItem[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeCodeMeta)
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeHeadings, outline)
    .use(rehypeWikiLinks, resolveWikiLink)
    .use(rehypeCodeBlocks)
    .use(rehypeStringify)
    .process(source);

  return { html: String(file), outline };
};
