import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./theme/fonts";
import "./app.css";
import { siteConfig } from "~/lib/config";
import { messagesFor } from "~/lib/i18n";
import { localeFromPathname } from "~/lib/i18n/locale";
import { htmlLangFor } from "~/lib/i18n/localize";
import { pageMeta } from "~/lib/meta";
import { tornEdgeCss } from "~/lib/canvas/torn-edge";
import { themeToCss } from "~/lib/theme/css";

// Theme tokens, plus the torn-edge masks for portraits (canvas, list, biography).
const themeCss = themeToCss(siteConfig.theme) + (siteConfig.theme.tileEdge === "torn" ? tornEdgeCss() : "");

/** Applies a stored light/dark choice before first paint to avoid a flash. */
const themeInitScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function Layout({ children }: { children: React.ReactNode }) {
  // The locale comes from the URL, so prerendered HTML and the hydrated app agree.
  const locale = localeFromPathname(useLocation().pathname);

  return (
    <html
      lang={htmlLangFor(locale)}
      data-paper={siteConfig.theme.paperTexture || undefined}
      data-portrait-tint={siteConfig.theme.portraitTint ? "" : undefined}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Browser bar colour on phones, following the system theme. */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={siteConfig.theme.colors.light.page}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={siteConfig.theme.colors.dark.page}
        />
        {/* Generated from the brand by scripts/build-icons.ts. */}
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        <a href="#main" className="skip-link">
          {messagesFor(locale).skipToContent}
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Fallback title/description. Routes override it with their own meta; it matters for the
 * SPA fallback page (unknown URLs) before the client app has loaded.
 */
export function meta() {
  return pageMeta({ locale: siteConfig.defaultLocale });
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const m = messagesFor(localeFromPathname(useLocation().pathname));
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const message = notFound ? m.notFound.title : m.error.title;
  let details = notFound ? m.notFound.text : m.error.text;
  let stack: string | undefined;

  if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main id="main" className="container mx-auto p-4 pt-16">
      <h1 className="text-h1">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
