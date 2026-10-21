import { siteConfig } from "~/lib/config";
import { localize } from "~/lib/i18n/localize";

/** Standard meta tags: "<page> – <brand>" title, description and Open Graph basics. */
export function pageMeta({
  title,
  description,
  locale,
}: {
  title?: string;
  description?: string;
  locale: string;
}) {
  const brand = localize(siteConfig.brand.name, locale);
  const fullTitle = title ? `${title} – ${brand}` : brand;
  const text = description ?? localize(siteConfig.brand.description, locale);
  return [
    { title: fullTitle },
    { name: "description", content: text },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: text },
    { property: "og:site_name", content: brand },
  ];
}
