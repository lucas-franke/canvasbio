import { createCn } from "cn/config";

/**
 * Class merger that knows the project's custom Tailwind theme keys.
 * Without this, `text-label` (a font size) is mistaken for a text color and
 * silently removes e.g. `text-brand-foreground` when both appear in one call.
 *
 * vite.config.ts aliases every `import { cn } from "cn"` to this module,
 * so shadcn components added later pick it up automatically.
 * Keep the lists in sync with the @theme block in app/app.css.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["h1", "h2", "h3", "subline", "body", "body-sm", "body-xs", "label"] }],
      rounded: [{ rounded: ["card"] }],
    },
  },
});
