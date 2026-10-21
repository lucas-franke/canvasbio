import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

interface HastNode {
  type: string;
  tagName?: string;
  children?: HastNode[];
}

/** Moves headings down by `offset` levels (h2 → h3 …), capped at h6, so they fit the page outline. */
function rehypeShiftHeadings(offset: number) {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      const level = node.tagName?.match(/^h([1-6])$/)?.[1];
      if (level) node.tagName = `h${Math.min(Number(level) + offset, 6)}`;
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

export interface MarkdownOptions {
  /** Shift heading levels so the Markdown fits under the page's own headings. */
  headingOffset?: number;
  /** Label of the footnote section (GFM), e.g. "Anmerkungen". */
  footnoteLabel?: string;
  /** Accessible label of the "back to text" links in footnotes. */
  footnoteBackLabel?: string;
}

/**
 * Renders trusted-format Markdown (GFM incl. footnotes) to sanitized HTML at build time,
 * so no Markdown code is shipped to the browser.
 */
export async function renderMarkdown(markdown: string, options: MarkdownOptions = {}): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, {
      footnoteLabel: options.footnoteLabel ?? "Anmerkungen",
      footnoteBackLabel: options.footnoteBackLabel ?? "Zurück zum Text",
    })
    .use(rehypeShiftHeadings, options.headingOffset ?? 0)
    // Sanitizing keeps the output safe even if content later comes from a CMS.
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        "*": [...(defaultSchema.attributes?.["*"] ?? []), "lang"],
      },
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}
