import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { slugify } from "./format";

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

const textOf = (node: HastNode): string => node.value ?? (node.children ?? []).map(textOf).join("");

/**
 * Gives headings stable ids (for a table of contents) and reports them. Runs after
 * sanitizing; headings that already have one (the footnote section) are left alone.
 */
function rehypeHeadingIds({ prefix, headings }: { prefix: string; headings: Heading[] }) {
  return (tree: HastNode) => {
    const used = new Set<string>();
    const visit = (node: HastNode) => {
      const level = Number(node.tagName?.match(/^h([1-6])$/)?.[1]);
      if (level && !node.properties?.id) {
        const text = textOf(node).trim();
        let id = `${prefix}${slugify(text) || "section"}`;
        for (let n = 2; used.has(id); n++) id = `${prefix}${slugify(text)}-${n}`;
        used.add(id);
        node.properties = { ...node.properties, id };
        headings.push({ id, text, level });
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
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
  /** Label of the footnote section (GFM), e.g. "Notes". */
  footnoteLabel?: string;
  /** Accessible label of the "back to text" links in footnotes. */
  footnoteBackLabel?: string;
  /** Collects all headings with an id (`headingIdPrefix` + slug) into this array. */
  headings?: Heading[];
  headingIdPrefix?: string;
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
      footnoteLabel: options.footnoteLabel ?? "Notes",
      footnoteBackLabel: options.footnoteBackLabel ?? "Back to text",
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
    .use(
      options.headings
        ? [[rehypeHeadingIds, { prefix: options.headingIdPrefix ?? "", headings: options.headings }]]
        : [],
    )
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}
