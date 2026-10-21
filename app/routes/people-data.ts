import type { Route } from "./+types/people-data";
import { loadPeopleIndex } from "~/lib/content/people-index.server";
import { peopleDataLocale } from "~/lib/content/people-data-path";

/**
 * Resource route: the people overview data as a static JSON file per locale
 * (pre-rendered to /data/people-<locale>.json). Detail pages load it in the browser,
 * so their HTML doesn't have to embed all people.
 */
export async function loader({ request }: Route.LoaderArgs) {
  // Pre-rendering also requests the ".data" variant of resource routes.
  const locale = peopleDataLocale(new URL(request.url).pathname.replace(/\.data$/, ""));
  if (!locale) throw new Response("Not found", { status: 404 });
  return Response.json(await loadPeopleIndex(locale));
}
