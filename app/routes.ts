import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

import { peopleDataPath } from "./lib/content/people-data-path";
import siteConfig from "../site.config";

/**
 * Routes are generated per locale from site.config.ts: the default locale has no
 * prefix, others use their prefix, and page segments are translated
 * ("/personen", "/en/people", "/leichte-sprache/personen").
 * Overview and biography share a layout, so the overview stays mounted next to an open biography.
 */
const localeRoutes = siteConfig.locales.flatMap(({ code, prefix }) => {
  const at = (...segments: string[]) => [prefix, ...segments].filter(Boolean).join("/");
  const { people, list, about, accessibility } = siteConfig.paths;
  return [
    prefix
      ? route(prefix, "routes/start.tsx", { id: `start:${code}` })
      : index("routes/start.tsx", { id: `start:${code}` }),
    layout("routes/people-layout.tsx", { id: `people-layout:${code}` }, [
      route(at(people[code]), "routes/people.tsx", { id: `people:${code}` }),
      route(at(people[code], list[code]), "routes/people-list.tsx", { id: `people-list:${code}` }),
      route(at(people[code], ":slug"), "routes/person.tsx", { id: `person:${code}` }),
    ]),
    route(at(about[code]), "routes/page.tsx", { id: `about:${code}` }),
    route(at(accessibility[code]), "routes/page.tsx", { id: `accessibility:${code}` }),
    // Static JSON with the overview data, loaded by biography pages in the browser.
    route(peopleDataPath(code).slice(1), "routes/people-data.ts", { id: `people-data:${code}` }),
  ];
});

export default [
  ...localeRoutes,
  route("styleguide", "routes/styleguide.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
