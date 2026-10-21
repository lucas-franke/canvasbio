import { Link } from "react-router";

import { buttonVariants } from "~/components/ui/button";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath } from "~/lib/i18n/locale";

/** "Page not found" message with a way back; used by the 404 route and error boundaries. */
export function NotFoundContent({ headingId }: { headingId?: string }) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-6">
      <h1 id={headingId} tabIndex={headingId ? -1 : undefined} className="text-h1 focus-target">
        {m.notFound.title}
      </h1>
      <p>{m.notFound.text}</p>
      {/* Ways on: the collection itself, the start page; the search is in the navigation. */}
      <div className="flex flex-wrap gap-3">
        <Link to={pagePath(locale, "people")} className={buttonVariants()}>
          {m.nav.people}
        </Link>
        <Link to={pagePath(locale, "start")} className={buttonVariants({ variant: "outline" })}>
          {m.notFound.toStart}
        </Link>
      </div>
    </div>
  );
}
