import { cn } from "cn";
import { Link } from "react-router";

import { tornEdgeClass } from "~/lib/canvas/torn-edge";
import { siteConfig } from "~/lib/config";

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
      className={cn(
        "group relative flex items-center gap-3 rounded-xl p-2 transition-colors focus-within:bg-emphasis/5 hover:bg-emphasis/5 @lg:items-start @lg:gap-5",
        active && "bg-brand/10 hover:bg-brand/10",
      )}
    >
      <div
        data-tint
        className={cn(
          "size-14 shrink-0 overflow-hidden @lg:size-28 @2xl:size-36",
          siteConfig.theme.tileEdge === "torn" && tornEdgeClass(person.slug),
        )}
      >
        <Portrait
          slug={person.slug}
          image={person.image}
          alt=""
          sizes="(min-width: 768px) 144px, (min-width: 640px) 112px, 56px"
          className="size-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 @lg:gap-1.5 @lg:pt-0.5">
        {/* Narrow: body size, so a phone screen holds six people instead of three. */}
        <h3 className="text-body font-semibold @lg:text-h3">
          <Link
            to={href}
            preventScrollReset
            viewTransition
            data-person={person.slug}
            aria-current={active ? "page" : undefined}
            className={
              // min-h keeps the link itself ≥ 24 px (WCAG 2.5.8); the ::after makes the whole row clickable.
              "inline-block min-h-6 after:absolute after:inset-0 after:rounded-xl after:content-[''] @lg:min-h-7 " +
              // Draw the focus indicator around the whole row instead of just the name.
              "focus-visible:shadow-none focus-visible:outline-none focus-visible:after:shadow-[0_0_0_6px_var(--c-focus-halo)] focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
            }
          >
            {person.name.display}
          </Link>
        </h3>
        {badge && (
          <p className="w-fit rounded-md bg-brand px-2 py-0.5 text-body-xs font-medium text-brand-foreground">
            {badge}
          </p>
        )}
        <div className="flex flex-col text-body-xs text-text @lg:text-body-sm">
          {/* Narrow: each line cut to one (the full text is in the biography). */}
          {person.summary.map((line) => (
            <p key={line} className="@max-lg:truncate">
              {line}
            </p>
          ))}
        </div>
        {tags.length > 0 && (
          // Narrow columns: no tags on screen (a "+2" looked like a control but wasn't one);
          // screen readers still get all of them.
          <ul className="flex flex-wrap gap-2 pt-1 @max-lg:sr-only">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md border border-control px-2 py-0.5 text-body-xs text-emphasis"
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
