/*
 * The one segmented control of the project (visual proposal, Phase 3): an outlined track,
 * the chosen segment filled in the accent colour. The meaning differs per use, so the
 * markup does too; the look comes from these classes:
 * - language: links, the current one `aria-current="page"` (menu),
 * - appearance: a Radix radio group, `data-state="checked"` (menu),
 * - birth or death places: toggle buttons, `aria-pressed` (map).
 * Looks 40 px high; the tap area is 44 px (`hit-44`).
 */

/** The track: as many equal columns as segments. */
export const segmentedTrack = "grid auto-cols-fr grid-flow-col gap-1 rounded-full border border-control p-1";

/** A segment, with the chosen state for each of the three ways of marking it. */
export const segmentedItem =
  "hit-44 flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-body-sm font-medium whitespace-nowrap text-emphasis transition-colors hover:bg-emphasis/5 " +
  "aria-[current=page]:bg-brand aria-[current=page]:text-brand-foreground " +
  "aria-pressed:bg-brand aria-pressed:text-brand-foreground " +
  "data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground";
