import { cn } from "cn";

import { Button } from "~/components/ui/button";
import { useMessages } from "~/lib/i18n";

/** Shown when the people data could not be loaded (offline, server error), with a retry. */
export function LoadFailed({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const m = useMessages();
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-4 py-16 text-center", className)}>
      <p className="max-w-md">{m.detail.loadFailed}</p>
      <Button variant="secondary" onClick={onRetry}>
        {m.detail.retry}
      </Button>
    </div>
  );
}
