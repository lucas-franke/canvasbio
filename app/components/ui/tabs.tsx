import * as React from "react";
import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";

/*
 * Tabs styled as the segmented control from the design (biography | life story | timeline).
 * Radix provides the ARIA tabs pattern incl. arrow-key navigation.
 */

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-6", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "no-scrollbar inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full border border-control p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "min-h-11 shrink-0 rounded-full px-4 text-body-sm font-medium whitespace-nowrap text-emphasis transition-colors hover:bg-emphasis/5 sm:min-h-12 sm:px-6 sm:text-label",
        "data-[state=active]:bg-brand data-[state=active]:text-brand-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "rounded-md data-[state=active]:animate-in data-[state=active]:duration-300 data-[state=active]:fade-in data-[state=inactive]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
