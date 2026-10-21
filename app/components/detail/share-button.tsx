import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { useMessages } from "~/lib/i18n";

/**
 * "Teilen": the device's share sheet where available (phones), otherwise the link is
 * copied to the clipboard and the button confirms it for a moment.
 */
export function ShareButton({ title }: { title: string }) {
  const m = useMessages();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Cancelled by the user.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: nothing sensible to do.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="group/share inline-flex shrink-0 items-center gap-3 rounded-full text-label font-medium text-emphasis"
      >
        <span className="sr-only sm:not-sr-only">{copied ? m.detail.linkCopied : m.detail.share}</span>
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full border-2 border-control group-hover/share:bg-emphasis/5"
        >
          {copied ? <Check className="size-5" /> : <Share2 className="size-5" />}
        </span>
      </button>
      <span role="status" className="sr-only">
        {copied ? m.detail.linkCopied : ""}
      </span>
    </>
  );
}
