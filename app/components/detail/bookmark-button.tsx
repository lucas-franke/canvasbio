import { cn } from "cn";
import { Bookmark } from "lucide-react";
import { useState } from "react";

import { useMessages } from "~/lib/i18n";
import { useBookmarks } from "~/lib/preferences";

/**
 * "Merken": puts the person on the reader's bookmark list (this browser only). A toggle
 * button: the name stays the same, the pressed state and the filled icon show the choice.
 */
export function BookmarkButton({ slug }: { slug: string }) {
  const m = useMessages();
  const [bookmarks, setBookmark] = useBookmarks();
  const saved = bookmarks.has(slug);
  // Announced only after a click, not when another biography opens.
  const [status, setStatus] = useState("");

  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          setBookmark(slug, !saved);
          setStatus(saved ? m.bookmarks.removed : m.bookmarks.added);
        }}
        className="group/bookmark inline-flex shrink-0 items-center gap-3 rounded-full text-label font-medium text-emphasis"
      >
        <span className="sr-only sm:not-sr-only">{m.bookmarks.save}</span>
        <span
          aria-hidden="true"
          className={cn(
            "grid size-12 place-items-center rounded-full border-2",
            saved
              ? "border-brand bg-brand text-brand-foreground"
              : "border-control group-hover/bookmark:bg-emphasis/5",
          )}
        >
          <Bookmark className={cn("size-5", saved && "fill-current")} />
        </span>
      </button>
      <span role="status" className="sr-only">
        {status}
      </span>
    </>
  );
}
