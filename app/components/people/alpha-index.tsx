import { cn } from "cn";
import { useRef, useState, type MouseEvent } from "react";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "~/components/ui/drawer";
import { ALPHABET } from "~/lib/content/group";
import { useMessages } from "~/lib/i18n";

export const letterAnchor = (letter: string) =>
  `buchstabe-${letter === "#" ? "andere" : letter.toLowerCase()}`;

/** Letters as 44 px cells; letters without entries are shown as disabled links. */
function LetterGrid({
  available,
  className,
  cellClassName,
  onJump,
}: {
  available: Set<string>;
  className: string;
  cellClassName?: string;
  onJump?: (event: MouseEvent<HTMLAnchorElement>, letter: string) => void;
}) {
  const m = useMessages();
  const letters = available.has("#") ? [...ALPHABET, "#"] : ALPHABET;
  const cell = "grid h-11 place-items-center rounded-md font-sans text-label font-medium";

  return (
    <ul className={className}>
      {letters.map((letter) => (
        <li key={letter} className={cellClassName}>
          {available.has(letter) ? (
            <a
              href={`#${letterAnchor(letter)}`}
              onClick={onJump ? (event) => onJump(event, letter) : undefined}
              aria-label={m.alphabet.jumpTo(letter)}
              className={cn(cell, "text-emphasis hover:bg-emphasis/5")}
            >
              {letter}
            </a>
          ) : (
            <span className={cn(cell, "font-normal text-muted-text/50")}>
              <span aria-hidden="true">{letter}</span>
              <span className="sr-only">{m.alphabet.empty(letter)}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Jump-to-letter index (Figma 2×13 keyboard). From `sm` up it sits sticky below the header;
 * on phones a compact "A–Z" button opens the same grid in a bottom sheet
 * (26 targets of 44 px don't fit a phone's height as a side rail).
 */
export function AlphaIndex({ available }: { available: Set<string> }) {
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const pendingLetter = useRef<string | null>(null);

  // The sheet locks page scrolling while open, so jump only after it has fully closed:
  // onCloseAutoFocus fires once the sheet is gone and the scroll lock is released.
  const jumpFromSheet = (event: MouseEvent<HTMLAnchorElement>, letter: string) => {
    event.preventDefault();
    pendingLetter.current = letter;
    setOpen(false);
  };
  const afterSheetClosed = (event: Event) => {
    const letter = pendingLetter.current;
    if (!letter) return;
    pendingLetter.current = null;
    // Send focus to the target heading instead of back to the "A–Z" button.
    event.preventDefault();
    window.location.hash = letterAnchor(letter);
    document.getElementById(letterAnchor(letter))?.focus({ preventScroll: true });
  };

  return (
    <nav aria-label={m.alphabet.label} className="sticky top-2 z-30 mx-auto w-full max-w-[57rem] lg:top-26">
      <div className="hidden overflow-hidden rounded-xl border-2 border-control bg-surface shadow-sm @xl:block">
        <LetterGrid
          available={available}
          className="grid grid-cols-13"
          cellClassName="border-line [&:nth-child(-n+13)]:border-b [&:not(:nth-child(13n))]:border-r"
        />
      </div>

      <div className="flex justify-end @xl:hidden">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger className="min-h-12 rounded-full border-2 border-control bg-surface px-5 text-label font-medium text-emphasis shadow-sm">
            {m.alphabet.open}
          </DrawerTrigger>
          <DrawerContent className="rounded-t-card bg-surface text-text" onCloseAutoFocus={afterSheetClosed}>
            <DrawerTitle className="px-6 pt-4 font-heading text-h2 font-normal text-emphasis">
              {m.alphabet.title}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{m.alphabet.label}</DrawerDescription>
            <div className="px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <LetterGrid available={available} className="grid grid-cols-7 gap-1" onJump={jumpFromSheet} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
