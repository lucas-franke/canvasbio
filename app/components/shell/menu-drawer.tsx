import { cn } from "cn";
import { Globe, Menu, Monitor, Moon, Sun, SunMoon, X } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { siteConfig } from "~/lib/config";
import { useLocale, useMessages } from "~/lib/i18n";
import { pagePath, parsePath, switchLocaleHash, switchLocalePath, type Page } from "~/lib/i18n/locale";
import { WIDE_QUERY, useMediaQuery } from "~/lib/hooks";
import { focusPageHeading } from "~/lib/route-focus";
import { useTheme, type ThemeChoice } from "~/lib/theme/use-theme";
import { afterViewTransition } from "~/lib/view-transition";
import { closeButtonClass } from "~/components/ui/button";
import { segmentedItem, segmentedTrack } from "~/components/ui/segmented";
import { NavIconButton } from "./nav";

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  const id = `menu-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="flex items-center gap-2 text-eyebrow">
        {icon && (
          <span aria-hidden="true" className="contents [&_svg]:size-4">
            {icon}
          </span>
        )}
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Side panel from `lg` (menu from the left, search from the right). */
export const SIDE_SHEET =
  "h-full w-full max-w-md data-[vaul-drawer-direction=left]:rounded-r-card data-[vaul-drawer-direction=left]:sm:max-w-md data-[vaul-drawer-direction=right]:rounded-l-card data-[vaul-drawer-direction=right]:sm:max-w-md";

/** Menu entries; the current one is marked calmly (accent text and a bar), not filled. */
const itemClass =
  "relative flex min-h-11 items-center rounded-xl px-4 text-label font-medium text-emphasis hover:bg-emphasis/5 aria-[current=page]:font-semibold aria-[current=page]:text-brand aria-[current=page]:before:absolute aria-[current=page]:before:top-1/2 aria-[current=page]:before:left-1 aria-[current=page]:before:h-5 aria-[current=page]:before:w-1 aria-[current=page]:before:-translate-y-1/2 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-brand aria-[current=page]:before:content-['']";

export function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const m = useMessages();
  const locale = useLocale();
  const { pathname, search, hash } = useLocation();
  const current = parsePath(pathname).page;
  const [theme, setTheme] = useTheme();
  // Desktop: the menu button is at the top right, so the menu slides in from the right.
  const desktop = useMediaQuery(WIDE_QUERY, false);
  // A link to another page was followed: focus goes to that page once the menu has closed,
  // not back to the menu button (which belonged to the page that was left, or no longer
  // leads anywhere new).
  const followed = useRef(false);
  const follow = (to: string) => {
    followed.current = to.split(/[?#]/)[0] !== pathname;
    setOpen(false);
  };

  const pages: { page: Page; label: string }[] = [
    { page: "start", label: m.nav.home },
    { page: "people", label: m.nav.people },
    { page: "about", label: m.nav.about },
    { page: "accessibility", label: m.nav.accessibility },
  ];

  return (
    <Drawer open={open} onOpenChange={setOpen} direction={desktop ? "right" : "bottom"}>
      <DrawerTrigger asChild>
        <NavIconButton label={m.nav.menu} icon={<Menu />} />
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          "bg-surface text-text",
          desktop ? SIDE_SHEET : "mx-auto max-h-[90dvh] w-full rounded-t-card md:max-w-lg",
        )}
        // Runs once the menu has gone (also when its page was replaced), after the rest of the
        // page is no longer hidden from assistive tech.
        onCloseAutoFocus={(event) => {
          if (!followed.current) return;
          followed.current = false;
          event.preventDefault();
          afterViewTransition(focusPageHeading);
        }}
      >
        <div className="flex items-center justify-between px-6 pt-2">
          <DrawerTitle className="font-heading text-h3 font-semibold text-emphasis">{m.nav.menu}</DrawerTitle>
          <DrawerClose className={closeButtonClass} aria-label={m.nav.closeMenu}>
            <X aria-hidden="true" className="size-5" />
          </DrawerClose>
        </div>
        <DrawerDescription className="sr-only">{siteConfig.brand.name[locale]}</DrawerDescription>

        <div className="flex flex-col gap-8 overflow-y-auto px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <nav aria-label={m.nav.label}>
            <ul className="flex flex-col gap-1">
              {pages.map(({ page, label }) => (
                <li key={page}>
                  <Link
                    to={pagePath(locale, page)}
                    onClick={() => follow(pagePath(locale, page))}
                    aria-current={current === page ? "page" : undefined}
                    className={itemClass}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {siteConfig.locales.length > 1 && (
            <Section title={m.language.label} icon={<Globe />}>
              {/* Links, not radios: each language has its own address. */}
              <ul className={segmentedTrack}>
                {siteConfig.locales.map((l) => (
                  <li key={l.code} className="flex">
                    <Link
                      to={
                        switchLocalePath(pathname, l.code) + search + switchLocaleHash(hash, locale, l.code)
                      }
                      onClick={() => follow(switchLocalePath(pathname, l.code))}
                      lang={l.htmlLang}
                      hrefLang={l.htmlLang}
                      aria-current={l.code === locale ? "page" : undefined}
                      className={cn(segmentedItem, "flex-1")}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {siteConfig.features.themeToggle && (
            <Section title={m.theme.label} icon={<SunMoon />}>
              <RadioGroupPrimitive.Root
                value={theme}
                onValueChange={(value) => setTheme(value as ThemeChoice)}
                aria-label={m.theme.label}
                className={segmentedTrack}
              >
                {(["system", "light", "dark"] as const).map((choice) => {
                  const Icon = THEME_ICONS[choice];
                  return (
                    <RadioGroupPrimitive.Item
                      key={choice}
                      value={choice}
                      title={m.theme[choice]}
                      className={segmentedItem}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="sr-only min-[24rem]:not-sr-only">{m.theme[choice]}</span>
                    </RadioGroupPrimitive.Item>
                  );
                })}
              </RadioGroupPrimitive.Root>
            </Section>
          )}

          <nav aria-label={m.nav.legal} className="border-t border-line pt-4">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {(["imprint", "privacy"] as const).map((page) => (
                <li key={page}>
                  <Link
                    to={pagePath(locale, page)}
                    onClick={() => follow(pagePath(locale, page))}
                    aria-current={current === page ? "page" : undefined}
                    className="inline-flex min-h-11 items-center rounded-sm text-body-sm text-text underline underline-offset-4 hover:decoration-2 aria-[current=page]:font-semibold"
                  >
                    {m.nav[page]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
