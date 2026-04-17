import { describe, it, expect } from "vitest";
import { filterPlatformSupportItems } from "./prospective";
import type { ProspectiveExtractionResult } from "./types";

type ProspectiveItem = ProspectiveExtractionResult["items"][number];

const makeItem = (overrides?: Partial<ProspectiveItem>): ProspectiveItem => ({
  content: "User will try sumo deadlifts next week",
  targetDateType: "relative",
  followUpType: "try_new_thing",
  followUpPrompt: "Ask how the sumo deadlifts felt",
  importance: "medium",
  triggerWindowDaysBefore: 2,
  triggerWindowDaysAfter: 3,
  originalContext: "User mentioned trying sumo deadlifts next week",
  ...overrides,
});

describe("filterPlatformSupportItems", () => {
  it("keeps genuine training follow-ups", () => {
    const items = [
      makeItem(),
      makeItem({
        content: "User has a powerlifting meet on May 15",
        followUpPrompt: "Check in before the meet about weight selection",
        originalContext: "Powerlifting meet coming up May 15",
      }),
    ];

    const filtered = filterPlatformSupportItems(items);

    expect(filtered).toHaveLength(2);
  });

  it("drops items referencing NeonPanda as a support target", () => {
    const items = [
      makeItem({
        content: "User will reach out to NeonPanda about the workout deletion",
        followUpPrompt: "Ask if they connected with NeonPanda about the bug",
        originalContext: "Accidental deletion issue, user will contact team",
      }),
    ];

    const filtered = filterPlatformSupportItems(items);

    expect(filtered).toHaveLength(0);
  });

  it("drops items referencing the two-word 'Neon Panda' variant", () => {
    const items = [
      makeItem({
        content: "User will reach out to Mark at Neon Panda",
        followUpPrompt: "Follow up on the Neon Panda conversation",
        originalContext: "User mentioned needing to ping Mark at Neon Panda",
      }),
    ];

    const filtered = filterPlatformSupportItems(items);

    expect(filtered).toHaveLength(0);
  });

  it("drops items framed as app/platform bugs", () => {
    const items = [
      makeItem({
        content: "User will report the logging bug",
        followUpPrompt: "Check if the app bug has been resolved",
        originalContext: "Workout logging bug causing missed data",
      }),
    ];

    const filtered = filterPlatformSupportItems(items);

    expect(filtered).toHaveLength(0);
  });

  it("drops items asking to contact support or the team", () => {
    const items = [
      makeItem({
        content: "User will contact support about billing",
        followUpPrompt: "Follow up on the support ticket",
        originalContext: "Billing issue",
      }),
      makeItem({
        content: "User plans to reach out to the team about a feature request",
        followUpPrompt: "Ask about the feature request status",
        originalContext: "Feature request",
      }),
    ];

    const filtered = filterPlatformSupportItems(items);

    expect(filtered).toHaveLength(0);
  });

  it("mixes — keeps training items, drops platform-support items", () => {
    const items = [
      makeItem(),
      makeItem({
        content: "User has their first powerlifting meet in June",
        followUpPrompt: "Check in about meet prep",
        originalContext: "First meet coming up",
      }),
      makeItem({
        content: "User will reach out to NeonPanda about the logging issue",
        followUpPrompt: "Ask if the NeonPanda team got back to them",
        originalContext: "App bug",
      }),
    ];

    const filtered = filterPlatformSupportItems(items);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].content).toContain("sumo deadlifts");
    expect(filtered[1].content).toContain("powerlifting meet in June");
  });

  it("is case insensitive", () => {
    const items = [
      makeItem({
        content: "User will contact NEONPANDA team",
        followUpPrompt: "Check with NEON PANDA",
        originalContext: "App Bug",
      }),
    ];

    const filtered = filterPlatformSupportItems(items);

    expect(filtered).toHaveLength(0);
  });
});
