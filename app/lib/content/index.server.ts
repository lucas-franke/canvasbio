import path from "node:path";

import { siteConfig } from "~/lib/config";
import { createFsContentAdapter } from "./fs-adapter.server";

/** The project's content source. Swap this for a CMS adapter implementing ContentAdapter. */
export const content = createFsContentAdapter(
  path.resolve("content"),
  siteConfig,
  path.resolve(".generated/portraits.json"),
);
