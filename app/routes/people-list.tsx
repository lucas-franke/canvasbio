import type { Route } from "./+types/people-list";
import { loadPeopleIndex } from "~/lib/content/people-index.server";
import { messagesFor, useMessages } from "~/lib/i18n";
import { localeFromPathname } from "~/lib/i18n/locale";
import { pageMeta } from "~/lib/meta";

/** List view (A–Z). The overview itself is rendered by the people layout; this route provides its data. */
export async function loader({ request }: Route.LoaderArgs) {
  return loadPeopleIndex(localeFromPathname(new URL(request.url).pathname));
}

export function meta({ location }: Route.MetaArgs) {
  const locale = localeFromPathname(location.pathname);
  return pageMeta({ title: messagesFor(locale).people.listTitle, locale, path: location.pathname });
}

export default function PeopleList() {
  return <h1 className="sr-only">{useMessages().people.listTitle}</h1>;
}
