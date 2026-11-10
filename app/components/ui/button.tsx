import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/*
 * Project button. The tap area never goes below 44×44 px (WCAG 2.5.8 + touch target
 * project standard): smaller sizes look 40 px and extend their tap area (`hit-44`).
 * Focus styling comes from the global :focus-visible rule.
 */
// Each variant sets its own border colour: a transparent one in the base would come later in
// the generated CSS (utilities are sorted) and hide the outline of secondary and control buttons.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand text-brand-foreground hover:bg-brand/90",
        outline: "border-brand bg-transparent text-brand hover:bg-brand/10 aria-expanded:bg-brand/10",
        /** Secondary actions: a quiet outline, so only the primary action (default) stands out. */
        secondary: "border-control bg-transparent text-emphasis hover:bg-emphasis/5",
        control:
          "border-control bg-transparent text-emphasis hover:bg-emphasis/5 aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-foreground",
        inverse: "border-transparent bg-emphasis text-surface hover:bg-emphasis/90",
        nav: "border-transparent bg-transparent text-nav-foreground hover:bg-nav-foreground/10",
        ghost: "border-transparent text-emphasis hover:bg-emphasis/5 aria-expanded:bg-emphasis/5",
        link: "rounded-sm border-transparent text-brand underline underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "min-h-11 px-5 py-2 text-body-sm sm:text-label",
        sm: "hit-44 min-h-10 px-4 py-1.5 text-body-sm",
        lg: "min-h-12 px-6 py-2.5 text-body-sm sm:text-label",
        icon: "hit-44 size-10 lg:size-11",
        "icon-sm": "hit-44 size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/** The one close button (drawers, panels): 40 px round, outlined, 44 px tap area. */
const closeButtonClass =
  "hit-44 grid size-10 shrink-0 place-items-center rounded-full border border-control text-emphasis hover:bg-emphasis/5";

export { Button, buttonVariants, closeButtonClass };
