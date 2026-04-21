import { describe, it, expect } from "vitest";
import { buildTemporalContext } from "./temporal-context";

describe("buildTemporalContext", () => {
  it("formats ISO date + weekday in the user's timezone", () => {
    // 2026-04-21T02:30 UTC is still 2026-04-20 in Los Angeles (7:30pm Monday)
    const now = new Date("2026-04-21T02:30:00Z");
    const ctx = buildTemporalContext({
      now,
      userTimezone: "America/Los_Angeles",
    });

    expect(ctx.isoDate).toBe("2026-04-20");
    expect(ctx.weekday).toBe("Monday");
    expect(ctx.timezone).toBe("America/Los_Angeles");
    expect(ctx.yesterdayIso).toBe("2026-04-19");
    expect(ctx.tomorrowIso).toBe("2026-04-21");
  });

  it("formats a different ISO date in a different TZ at the same instant", () => {
    // Same instant: in Tokyo it is 2026-04-21 11:30am
    const now = new Date("2026-04-21T02:30:00Z");
    const ctx = buildTemporalContext({ now, userTimezone: "Asia/Tokyo" });
    expect(ctx.isoDate).toBe("2026-04-21");
    expect(ctx.weekday).toBe("Tuesday");
  });

  it("falls back to America/Los_Angeles when timezone is missing", () => {
    const ctx = buildTemporalContext({ now: new Date("2026-04-20T12:00:00Z") });
    expect(ctx.timezone).toBe("America/Los_Angeles");
  });

  it("computes daysSinceLastInteraction as calendar days in user TZ", () => {
    const now = new Date("2026-04-20T08:00:00Z"); // 1am Monday in LA
    // Last interaction at 2026-04-14T23:55Z = 2026-04-14 4:55pm in LA
    const ctx = buildTemporalContext({
      now,
      userTimezone: "America/Los_Angeles",
      lastInteractionAt: "2026-04-14T23:55:00Z",
    });
    expect(ctx.daysSinceLastInteraction).toBe(6);
    expect(ctx.lastInteractionDate).toBe("2026-04-14");
    expect(ctx.promptBlock).toContain("It has been 6 days");
  });

  it("handles cross-midnight correctly (11:55pm last night -> 1 day ago after midnight)", () => {
    // Now is 2026-04-21 00:10 LA
    const now = new Date("2026-04-21T07:10:00Z");
    // Last interaction 2026-04-20 23:55 LA
    const ctx = buildTemporalContext({
      now,
      userTimezone: "America/Los_Angeles",
      lastInteractionAt: "2026-04-21T06:55:00Z",
    });
    expect(ctx.isoDate).toBe("2026-04-21");
    expect(ctx.daysSinceLastInteraction).toBe(1);
    expect(ctx.promptBlock).toContain("It has been 1 day");
  });

  it("labels 0-day gap as 'earlier today'", () => {
    const now = new Date("2026-04-20T20:00:00Z");
    const ctx = buildTemporalContext({
      now,
      userTimezone: "America/Los_Angeles",
      lastInteractionAt: "2026-04-20T17:00:00Z",
    });
    expect(ctx.daysSinceLastInteraction).toBe(0);
    expect(ctx.promptBlock).toContain("earlier today");
  });

  it("suppresses recency line when lastInteractionAt is null/undefined", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    const ctx = buildTemporalContext({
      now,
      userTimezone: "America/Los_Angeles",
      lastInteractionAt: null,
    });
    expect(ctx.daysSinceLastInteraction).toBeNull();
    expect(ctx.promptBlock).not.toContain("since the user's last message");
    expect(ctx.promptBlock).not.toContain("earlier today");
  });

  it("renders upcoming anchors with day counts", () => {
    const now = new Date("2026-04-20T19:00:00Z");
    const ctx = buildTemporalContext({
      now,
      userTimezone: "America/Los_Angeles",
      upcomingAnchors: [
        { label: "Meet day", date: "2026-05-03" },
        { label: "Deload start", date: "2026-04-27" },
      ],
    });
    expect(ctx.upcomingAnchors).toHaveLength(2);
    expect(ctx.upcomingAnchors[0]).toMatchObject({
      date: "2026-05-03",
      daysUntil: 13,
      dayOfWeek: "Sunday",
    });
    expect(ctx.promptBlock).toContain(
      "Meet day (2026-05-03, Sunday): 13 days from today",
    );
    expect(ctx.promptBlock).toContain(
      "Deload start (2026-04-27, Monday): 7 days from today",
    );
  });

  it("always includes the CRITICAL TEMPORAL RULES block", () => {
    const now = new Date("2026-04-20T19:00:00Z");
    const ctx = buildTemporalContext({ now });
    expect(ctx.promptBlock).toContain("CRITICAL TEMPORAL RULES");
    expect(ctx.promptBlock).toContain("Never infer today's date");
    expect(ctx.promptBlock).toContain("Do not estimate");
  });

  it("handles DST spring-forward in America/Los_Angeles", () => {
    // 2026-03-08 at 2am local springs forward to 3am.
    // 2026-03-08 09:30 UTC = 2:30am LA pre-jump = 3:30am LA post-jump.
    const now = new Date("2026-03-08T10:30:00Z");
    const ctx = buildTemporalContext({
      now,
      userTimezone: "America/Los_Angeles",
    });
    expect(ctx.isoDate).toBe("2026-03-08");
    expect(ctx.weekday).toBe("Sunday");
  });

  it("ignores invalid upcoming anchor dates", () => {
    const now = new Date("2026-04-20T19:00:00Z");
    const ctx = buildTemporalContext({
      now,
      upcomingAnchors: [
        { label: "Bad", date: "not-a-date" },
        { label: "Good", date: "2026-05-03" },
      ],
    });
    expect(ctx.upcomingAnchors).toHaveLength(1);
    expect(ctx.upcomingAnchors[0].label).toBe("Good");
  });
});
