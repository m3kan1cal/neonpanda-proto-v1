import { describe, it, expect } from "vitest";
import {
  getAttachmentBurstMessages,
  getBetweenIterationLine,
  getHistoryAwareStaticLine,
  nextTickDelayMs,
} from "./streaming-contextual-static";

describe("streaming-contextual-static", () => {
  it("returns three distinct attachment burst lines for images", () => {
    const lines = getAttachmentBurstMessages("image", 3);
    expect(lines).toHaveLength(3);
    expect(new Set(lines).size).toBe(3);
    lines.forEach((line) => {
      expect(line.length).toBeGreaterThan(5);
    });
  });

  it("getBetweenIterationLine returns a non-empty string", () => {
    expect(getBetweenIterationLine().length).toBeGreaterThan(10);
  });

  it("getHistoryAwareStaticLine returns null when current turn has attachments", () => {
    expect(
      getHistoryAwareStaticLine({
        historyHasUserImages: true,
        historyHasUserDocuments: false,
        currentHasImages: true,
        currentHasDocuments: false,
      }),
    ).toBeNull();
  });

  it("getHistoryAwareStaticLine returns a line when history had images only", () => {
    const line = getHistoryAwareStaticLine({
      historyHasUserImages: true,
      historyHasUserDocuments: false,
      currentHasImages: false,
      currentHasDocuments: false,
    });
    expect(line).toBeTruthy();
    expect(line!.length).toBeGreaterThan(15);
  });

  it("nextTickDelayMs stays in a reasonable band", () => {
    for (let i = 0; i < 20; i++) {
      const ms = nextTickDelayMs();
      expect(ms).toBeGreaterThanOrEqual(1200);
      expect(ms).toBeLessThan(5000);
    }
  });
});
