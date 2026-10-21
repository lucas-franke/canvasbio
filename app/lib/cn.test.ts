import { cn as aliasedCn } from "cn";
import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("keeps a text color next to a custom font size", () => {
    expect(cn("text-brand-foreground", "text-label")).toBe("text-brand-foreground text-label");
  });

  it("still resolves conflicts within the same group", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
    expect(cn("text-text", "text-brand")).toBe("text-brand");
    expect(cn("rounded-full", "rounded-card")).toBe("rounded-card");
  });

  it('is what `import { cn } from "cn"` resolves to', () => {
    expect(aliasedCn).toBe(cn);
  });
});
