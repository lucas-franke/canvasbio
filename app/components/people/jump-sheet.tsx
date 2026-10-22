import { useState, type MouseEvent, type ReactNode } from "react";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "~/components/ui/drawer";

/** Click handler for a jump link inside the sheet: pass the id of the target heading. */
export type JumpHandler = (event: MouseEvent<HTMLAnchorElement>, anchor: string) => void;

interface JumpSheetProps {
  /** Content of the trigger button (text and/or icon). */
  trigger: ReactNode;
  /** Accessible name of the trigger when it shows only an icon. */
  triggerLabel?: string;
  triggerClassName: string;
  title: string;
  description: string;
  /** The grid of jump links; call `onJump` from each link's onClick. */
  children: (onJump: JumpHandler) => ReactNode;
}

/**
 * A button that opens a bottom sheet of jump links (A–Z, decades). The sheet locks page
 * scrolling while open, so the jump happens only after it has fully closed: onCloseAutoFocus
 * fires once the sheet is gone. Focus then goes to the target heading instead of back to
 * the button.
 */
export function JumpSheet({
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  children,
}: JumpSheetProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const onJump: JumpHandler = (event, anchor) => {
    event.preventDefault();
    setPending(anchor);
    setOpen(false);
  };
  const afterClosed = (event: Event) => {
    if (!pending) return;
    const target = document.getElementById(pending);
    setPending(null);
    if (!target) return;
    event.preventDefault();
    // Keep the router's history state; only the hash changes (shareable position).
    window.history.replaceState(window.history.state, "", `#${pending}`);
    target.scrollIntoView();
    target.focus({ preventScroll: true });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger aria-label={triggerLabel} className={triggerClassName}>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="rounded-t-card bg-surface text-text" onCloseAutoFocus={afterClosed}>
        <DrawerTitle className="px-6 pt-4 font-heading text-h2 font-normal text-emphasis">
          {title}
        </DrawerTitle>
        <DrawerDescription className="sr-only">{description}</DrawerDescription>
        <div className="px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children(onJump)}</div>
      </DrawerContent>
    </Drawer>
  );
}
