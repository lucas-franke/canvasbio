import type { Route } from "./+types/not-found";
import { NotFoundContent } from "~/components/not-found-content";
import { PageShell } from "~/components/shell/page-shell";
import { messagesFor } from "~/lib/i18n";
import { localeFromPathname } from "~/lib/i18n/locale";
import { pageMeta } from "~/lib/meta";

export function meta({ location }: Route.MetaArgs) {
  const locale = localeFromPathname(location.pathname);
  return [
    ...pageMeta({ title: messagesFor(locale).notFound.title, locale }),
    { name: "robots", content: "noindex" },
  ];
}

export default function NotFound() {
  return (
    <PageShell>
      <NotFoundContent />
    </PageShell>
  );
}
