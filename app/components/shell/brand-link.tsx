import { cn } from "cn";
import { Link, useLocation } from "react-router";

import { siteConfig } from "~/lib/config";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath } from "~/lib/i18n/locale";
import { localize } from "~/lib/i18n/localize";

/**
 * The brand as the fixed anchor of the navigation, linking to the start page: the wordmark
 * on every screen size, or the project's own logo (`brand.logo`) instead.
 * It stands free, without a pill; a soft glow in the page colour keeps the wordmark readable
 * where it floats over portraits.
 * The link's name starts with the visible label (WCAG 2.5.3): "Ihre Stimme – Startseite".
 */
export function BrandLink({ className }: { className?: string }) {
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
        "inline-flex h-11 shrink-0 items-center rounded-full transition-opacity hover:opacity-75 lg:h-10",
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
          <span className="px-2 wordmark text-[1.125rem] whitespace-nowrap min-[24rem]:text-[1.25rem] text-brand [text-shadow:0_0_6px_var(--c-page),0_0_14px_var(--c-page),0_0_24px_var(--c-page)] sm:text-[1.375rem]">
            {wordmark}
          </span>
          {homeSuffix}
        </>
      )}
    </Link>
  );
}
