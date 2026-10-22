import { cn } from "cn";
import { Link } from "react-router";

import { tornEdgeClass } from "~/lib/canvas/torn-edge";
import { siteConfig } from "~/lib/config";
import { markPortraitSource } from "~/lib/view-transition";

import { Portrait } from "~/components/portrait";
import type { PersonListItem } from "~/lib/content/adapter";

interface PersonRowProps {
  person: PersonListItem;
  href: string;
  tags: string[];
  /** The biography of this person is currently open. */
  active?: boolean;
  /** Highlighted note, e.g. that the biography exists in an optional language. */
  badge?: string;
}

/**
 * One entry of the list view (Figma "Overview - List"): portrait, name, two short lines, tags.
 * Only the name is a link (short accessible name); a pseudo-element stretches it over the
 * whole row so the entire row is clickable/tappable.
 */
export function PersonRow({ person, href, tags, active = false, badge }: PersonRowProps) {
  return (
    <article
      data-vt-item
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl p-2 transition-colors focus-within:bg-emphasis/5 hover:bg-emphasis/5 @lg:gap-5",
        active && "bg-brand/10 hover:bg-brand/10",
      )}
    >
      <div
        data-vt-portrait
        data-tint
        className={cn(
          "size-20 shrink-0 overflow-hidden @lg:size-28 @2xl:size-36",
          siteConfig.theme.tileEdge === "torn" && tornEdgeClass(person.slug),
        )}
      >
        <Portrait
          slug={person.slug}
          image={person.image}
          alt=""
          sizes="(min-width: 768px) 144px, (min-width: 640px) 112px, 80px"
          className="size-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 pt-0.5">
        <h3 className="text-h3">
          <Link
            to={href}
            preventScrollReset
            viewTransition
            onClick={markPortraitSource}
            data-person={person.slug}
            aria-current={active ? "page" : undefined}
            className={
              // min-h keeps the link itself ≥ 24 px (WCAG 2.5.8); the ::after makes the whole row clickable.
              "inline-block min-h-7 after:absolute after:inset-0 after:rounded-2xl after:content-[''] " +
              // Draw the focus indicator around the whole row instead of just the name.
              "focus-visible:shadow-none focus-visible:outline-none focus-visible:after:shadow-[0_0_0_6px_var(--c-focus-halo)] focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
            }
          >
            {person.name.display}
          </Link>
        </h3>
        {badge && (
          <p className="w-fit rounded-lg bg-brand px-2 py-0.5 text-body-xs font-medium text-brand-foreground">
            {badge}
          </p>
        )}
        <div className="flex flex-col text-body-sm text-text">
          {person.summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-lg border border-control px-2 py-0.5 text-body-xs text-emphasis"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
