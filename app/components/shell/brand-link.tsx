import { cn } from "cn";
import { Link, useLocation } from "react-router";

import { siteConfig } from "~/lib/config";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";

/**
 * The brand as the fixed anchor of the navigation, linking to the start page: the wordmark
 * on every screen size, or the project's own logo (`brand.logo`) instead.
 * It stands free, without a pill, on the pages; a soft glow in the page colour keeps the
 * wordmark readable. Over the mosaic and the map it sits in a nav pill (`contained`) instead.
 * The link's name starts with the visible label (WCAG 2.5.3): "Ihre Stimme – Startseite".
 */
export function BrandLink({ className, contained = false }: { className?: string; contained?: boolean }) {
  const locale = useLocale();
  const m = useMessages();
  const { pathname } = useLocation();
  const home = pagePath(locale, "start");
  const wordmark = localize(siteConfig.brand.wordmark, locale);
  const { logo } = siteConfig.brand;
  const homeSuffix = <span className="sr-only"> – {m.nav.home}</span>;

  return (
    <Link
      to={home}
      aria-current={pathname === home ? "page" : undefined}
      className={cn(
        "hit-44 inline-flex h-10 shrink-0 items-center rounded-full transition-opacity hover:opacity-75",
        className,
      )}
    >
      {logo ? (
        <>
          <img
            src={logo.src}
            alt={localize(logo.alt, locale)}
            width={logo.width}
            height={logo.height}
            className="h-8 w-auto px-2"
          />
          {homeSuffix}
        </>
      ) : (
        <>
          <span
            className={cn(
              "px-2 wordmark text-[1.125rem] whitespace-nowrap min-[24rem]:text-[1.25rem] text-brand sm:text-[1.375rem]",
              contained ? "px-3" : "[text-shadow:0_0_6px_var(--c-page),0_0_14px_var(--c-page),0_0_24px_var(--c-page)]",
            )}
          >
            {wordmark}
          </span>
          {homeSuffix}
        </>
      )}
    </Link>
  );
}
