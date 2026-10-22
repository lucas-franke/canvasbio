import type { Route } from "./+types/people-timeline";
import { requestPath } from "~/lib/base-path";
import { loadPeopleIndex } from "~/lib/content/people-index.server";
import { messagesFor, useMessages } from "~/lib/i18n";
import { localeFromPathname } from "~/lib/i18n/locale";
import { pageMeta } from "~/lib/meta";

/**
 * Timeline view (by year of birth). The overview itself is rendered by the people layout;
 * this route provides its data.
 */
export async function loader({ request }: Route.LoaderArgs) {
  return loadPeopleIndex(localeFromPathname(requestPath(request)));
}

export function meta({ location }: Route.MetaArgs) {
  const locale = localeFromPathname(location.pathname);
  return pageMeta({ title: messagesFor(locale).people.timelineTitle, locale, path: location.pathname });
}

export default function PeopleTimeline() {
  return <h1 className="sr-only">{useMessages().people.timelineTitle}</h1>;
}
