/**
 * Font files for the project theme (self-hosted via Fontsource).
 * When a project changes theme.fonts in site.config.ts, swap these imports.
 *
 * The sans is one variable file for all weights (one request); the serif is only used for
 * quotes, which are italic, so only that style is loaded.
 */
import "@fontsource-variable/libre-franklin/wght.css";
import "@fontsource/ibm-plex-serif/400-italic.css";
import "./font-fallbacks.css";

/**
 * The Latin subset of the sans, preloaded (root links): nearly every page is set in it,
 * and it is otherwise only discovered once the stylesheet has been parsed.
 */
export { default as sansLatinUrl } from "@fontsource-variable/libre-franklin/files/libre-franklin-latin-wght-normal.woff2?url";
