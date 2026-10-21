import { siteConfig } from "~/lib/config";
import { htmlLangFor, localize } from "~/lib/i18n/localize";

interface PageMetaOptions {
  title?: string;
  description?: string;
  locale: string;
  /** Path of the page ("/personen/clara-zetkin"): canonical URL and og:url when `siteUrl` is set. */
  path?: string;
  /** Preview image for links shared in messengers and social media (path from the site root). */
  image?: { path: string; alt: string; width: number; height: number };
}

/** Absolute URL for a site path, if the public address is configured. */
const absolute = (path: string) => (siteConfig.siteUrl ? new URL(path, siteConfig.siteUrl).href : undefined);

/**
 * Standard meta tags: "<page> – <brand>" title, description, Open Graph and Twitter card.
 * URLs in these tags must be absolute, so canonical, og:url and og:image need
 * `siteUrl` in site.config.ts; without it they are left out.
 */
export function pageMeta({ title, description, locale, path, image }: PageMetaOptions) {
  const brand = localize(siteConfig.brand.name, locale);
  const fullTitle = title ? `${title} – ${brand}` : brand;
  const text = description ?? localize(siteConfig.brand.description, locale);
  const url = path ? absolute(path) : undefined;
  const imageUrl = image ? absolute(image.path) : undefined;

  return [
    { title: fullTitle },
    { name: "description", content: text },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: text },
    { property: "og:site_name", content: brand },
    { property: "og:type", content: image ? "article" : "website" },
    { property: "og:locale", content: htmlLangFor(locale).replace("-", "_") },
    ...(url
      ? [
          { property: "og:url", content: url },
          { tagName: "link", rel: "canonical", href: url },
        ]
      : []),
    ...(imageUrl && image
      ? [
          { property: "og:image", content: imageUrl },
          { property: "og:image:alt", content: image.alt },
          { property: "og:image:width", content: String(image.width) },
          { property: "og:image:height", content: String(image.height) },
        ]
      : []),
    { name: "twitter:card", content: imageUrl ? "summary_large_image" : "summary" },
  ];
}
