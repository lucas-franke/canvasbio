import type { Route } from "./+types/people-map";
import { requestPath } from "~/lib/base-path";
import { loadPeopleIndex } from "~/lib/content/people-index.server";
import { messagesFor, useMessages } from "~/lib/i18n";
import { localeFromPathname } from "~/lib/i18n/locale";
import { pageMeta } from "~/lib/meta";

/**
 * Map view (birth and death places). The overview itself is rendered by the people layout;
 * this route provides its data.
 */
export async function loader({ request }: Route.LoaderArgs) {
  return loadPeopleIndex(localeFromPathname(requestPath(request)));
}

export function meta({ location }: Route.MetaArgs) {
  const locale = localeFromPathname(location.pathname);
  return pageMeta({ title: messagesFor(locale).people.mapTitle, locale, path: location.pathname });
}

export default function PeopleMap() {
  return <h1 className="sr-only">{useMessages().people.mapTitle}</h1>;
}
