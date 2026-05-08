import { describe, expect, it } from "vitest";
import { ContextBuilder } from "./context-builder";

describe("ContextBuilder", () => {
  it("splits cacheable from dynamic and orders within each bucket", () => {
    const cb = new ContextBuilder()
      .addSection("turn_metadata", "DYNAMIC-LATE", {
        cacheable: false,
        order: 100,
      })
      .addSection("temporal", "DYNAMIC-EARLY", { cacheable: false, order: 1 })
      .addSection("methodology", "STATIC-LATE", { cacheable: true, order: 50 })
      .addSection("role", "STATIC-EARLY", { cacheable: true, order: 0 });
    const { staticPrompt, dynamicPrompt } = cb.build();
    expect(staticPrompt.indexOf("STATIC-EARLY")).toBeLessThan(
      staticPrompt.indexOf("STATIC-LATE"),
    );
    expect(dynamicPrompt.indexOf("DYNAMIC-EARLY")).toBeLessThan(
      dynamicPrompt.indexOf("DYNAMIC-LATE"),
    );
    expect(staticPrompt).not.toContain("DYNAMIC");
    expect(dynamicPrompt).not.toContain("STATIC");
  });

  it("ignores empty content", () => {
    const cb = new ContextBuilder()
      .addSection("role", "real", { cacheable: true, order: 0 })
      .addSection("personality", "", { cacheable: true, order: 1 });
    const { staticPrompt } = cb.build();
    expect(staticPrompt).toBe("real");
  });

  it("setSection replaces previous registration of the same name", () => {
    const cb = new ContextBuilder()
      .addSection("role", "first", { cacheable: true, order: 0 })
      .setSection("role", "second", { cacheable: true, order: 0 });
    expect(cb.build().staticPrompt).toBe("second");
  });

  it("uses custom separators when provided", () => {
    const cb = new ContextBuilder()
      .addSection("a", "ALPHA", { cacheable: true, order: 0 })
      .addSection("b", "BETA", { cacheable: true, order: 1, separator: " :: " });
    expect(cb.build().staticPrompt).toBe("ALPHA :: BETA");
  });
});
