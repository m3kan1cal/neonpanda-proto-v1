import { describe, it, expect } from "vitest";
import { MESSAGE_TYPES } from "../coach-conversation/types";
import { getHistoryAttachmentFlags } from "./streaming-contextual-flags";

describe("getHistoryAttachmentFlags", () => {
  it("detects user images and documents", () => {
    const flags = getHistoryAttachmentFlags([
      { role: "user", imageS3Keys: ["k1.jpg"] },
      { role: "assistant" },
      {
        role: "user",
        messageType: MESSAGE_TYPES.TEXT_WITH_ATTACHMENTS,
      },
    ]);
    expect(flags.historyHasUserImages).toBe(true);
    expect(flags.historyHasUserDocuments).toBe(true);
  });

  it("returns false when no user attachments", () => {
    const flags = getHistoryAttachmentFlags([
      { role: "user" },
      { role: "assistant" },
    ]);
    expect(flags.historyHasUserImages).toBe(false);
    expect(flags.historyHasUserDocuments).toBe(false);
  });
});
