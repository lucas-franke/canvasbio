import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/*
 * Project button. Sizes never go below 44×44 px (WCAG 2.5.8 + touch target
 * project standard); focus styling comes from the global :focus-visible rule.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-foreground hover:bg-brand/90",
        outline: "border-brand bg-transparent text-brand hover:bg-brand/10 aria-expanded:bg-brand/10",
        control:
          "border-control bg-transparent text-emphasis hover:bg-emphasis/5 aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-foreground",
        inverse: "bg-emphasis text-surface hover:bg-emphasis/90",
        nav: "bg-transparent text-nav-foreground hover:bg-nav-foreground/10",
        ghost: "text-emphasis hover:bg-emphasis/5 aria-expanded:bg-emphasis/5",
        link: "rounded-sm text-brand underline underline-offset-4 hover:decoration-2",
      },
      size: {
        default: "min-h-12 px-6 py-2 text-label",
        sm: "min-h-11 px-4 py-1.5 text-body-sm",
        lg: "min-h-14 px-8 py-3 text-label",
        icon: "size-12",
        "icon-sm": "size-11",
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

export { Button, buttonVariants };
