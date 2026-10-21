import type { Route } from "./+types/page";
import { PageShell } from "~/components/shell/page-shell";
import { loadPage } from "~/lib/content/pages.server";
import { htmlLangFor } from "~/lib/i18n/localize";
import { parsePath } from "~/lib/i18n/locale";
import { pageMeta } from "~/lib/meta";

/**
 * Text pages from content/pages/<page>.<locale>.md: "Über das Projekt" and the
 * accessibility statement. Which one follows from the (translated) URL.
 */
export async function loader({ request }: Route.LoaderArgs) {
  // Pre-rendering also requests "/ueber.data" (the data for client-side navigation).
  const { locale, page } = parsePath(new URL(request.url).pathname.replace(/\.data$/, ""));
  if (page !== "about" && page !== "accessibility") throw new Response("Not found", { status: 404 });
  return { page: await loadPage(page, locale), locale };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return pageMeta({
    title: loaderData.page.title,
    description: loaderData.page.description,
    locale: loaderData.locale,
  });
}

export default function TextPage({ loaderData }: Route.ComponentProps) {
  const { page, locale } = loaderData;
  // If the page isn't translated, mark the fallback text with its real language (WCAG 3.1.2).
  const lang = page.locale !== locale ? htmlLangFor(page.locale) : undefined;

  return (
    <PageShell>
      <article lang={lang} className="mx-auto flex max-w-[68ch] flex-col gap-6">
        <h1 className="text-h1">{page.title}</h1>
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: page.html }} />
      </article>
    </PageShell>
  );
}
