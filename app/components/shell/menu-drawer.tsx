import { cn } from "cn";
import { Menu, X } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useState, type ReactNode } from "react";
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
import { useTheme, type ThemeChoice } from "~/lib/theme/use-theme";
import { NavIconButton } from "./nav";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `menu-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="font-sans text-body-sm font-medium tracking-normal text-muted-text">
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
  "relative flex min-h-12 items-center rounded-xl px-4 text-label font-medium text-emphasis hover:bg-emphasis/5 aria-[current=page]:font-semibold aria-[current=page]:text-brand aria-[current=page]:before:absolute aria-[current=page]:before:top-1/2 aria-[current=page]:before:left-1 aria-[current=page]:before:h-5 aria-[current=page]:before:w-1 aria-[current=page]:before:-translate-y-1/2 aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-brand aria-[current=page]:before:content-['']";

export function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const m = useMessages();
  const locale = useLocale();
  const { pathname, search, hash } = useLocation();
  const current = parsePath(pathname).page;
  const [theme, setTheme] = useTheme();
  // Desktop: the menu button is at the top right, so the menu slides in from the right.
  const desktop = useMediaQuery(WIDE_QUERY, false);
  const close = () => setOpen(false);

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
      >
        <div className="flex items-center justify-between px-6 pt-2">
          <DrawerTitle className="font-heading text-h2 font-normal text-emphasis">{m.nav.menu}</DrawerTitle>
          <DrawerClose
            className="grid size-12 place-items-center rounded-full border-2 border-control text-emphasis hover:bg-emphasis/5"
            aria-label={m.nav.closeMenu}
          >
            <X aria-hidden="true" className="size-6" />
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
                    onClick={close}
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
            <Section title={m.language.label}>
              <ul className="flex flex-col gap-1">
                {siteConfig.locales.map((l) => (
                  <li key={l.code}>
                    <Link
                      to={
                        switchLocalePath(pathname, l.code) + search + switchLocaleHash(hash, locale, l.code)
                      }
                      onClick={close}
                      lang={l.htmlLang}
                      hrefLang={l.htmlLang}
                      aria-current={l.code === locale ? "page" : undefined}
                      className={itemClass}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {siteConfig.features.themeToggle && (
            <Section title={m.theme.label}>
              <RadioGroupPrimitive.Root
                value={theme}
                onValueChange={(value) => setTheme(value as ThemeChoice)}
                aria-label={m.theme.label}
                className="grid grid-cols-3 gap-1 rounded-2xl border-2 border-control p-1"
              >
                {(["system", "light", "dark"] as const).map((choice) => (
                  <RadioGroupPrimitive.Item
                    key={choice}
                    value={choice}
                    className={cn(
                      "min-h-12 rounded-xl px-2 text-body-sm font-medium text-emphasis hover:bg-emphasis/5",
                      "data-[state=checked]:bg-emphasis data-[state=checked]:text-surface",
                    )}
                  >
                    {m.theme[choice]}
                  </RadioGroupPrimitive.Item>
                ))}
              </RadioGroupPrimitive.Root>
            </Section>
          )}

          <nav aria-label={m.nav.legal} className="border-t border-line pt-4">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {(["imprint", "privacy"] as const).map((page) => (
                <li key={page}>
                  <Link
                    to={pagePath(locale, page)}
                    onClick={close}
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
