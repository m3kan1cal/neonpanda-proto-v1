import { describe, it, expect } from "vitest";
import {
  daysUntil,
  diffInCalendarDays,
  resolveRelativeDate,
  resolveDateReferences,
  weekdayLabelForIsoDate,
} from "./date-math";

describe("diffInCalendarDays", () => {
  it("returns 0 for the same day", () => {
    expect(diffInCalendarDays("2026-04-20", "2026-04-20")).toBe(0);
  });

  it("returns positive for a future date", () => {
    expect(diffInCalendarDays("2026-04-20", "2026-04-27")).toBe(7);
  });

  it("returns negative for a past date", () => {
    expect(diffInCalendarDays("2026-04-20", "2026-04-18")).toBe(-2);
  });

  it("spans months", () => {
    expect(diffInCalendarDays("2026-04-20", "2026-05-03")).toBe(13);
  });
});

describe("daysUntil", () => {
  it("counts calendar days in the user's timezone, not elapsed ms", () => {
    // In America/New_York, this instant is 2026-04-20T23:30 (late evening).
    const now = new Date("2026-04-21T03:30:00Z");
    expect(daysUntil("2026-04-21", now, "America/New_York")).toBe(1);
  });

  it("0 for today in user TZ", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    expect(daysUntil("2026-04-20", now, "America/Los_Angeles")).toBe(0);
  });

  it("negative for a past date", () => {
    const now = new Date("2026-04-20T12:00:00Z");
    expect(daysUntil("2026-04-15", now, "UTC")).toBe(-5);
  });
});

describe("weekdayLabelForIsoDate", () => {
  it("returns Monday for 2026-04-20", () => {
    expect(weekdayLabelForIsoDate("2026-04-20", "America/Los_Angeles")).toBe(
      "Monday",
    );
  });

  it("returns Sunday for 2026-04-19", () => {
    expect(weekdayLabelForIsoDate("2026-04-19", "America/Los_Angeles")).toBe(
      "Sunday",
    );
  });
});

describe("resolveRelativeDate", () => {
  const now = new Date("2026-04-20T19:00:00Z"); // Monday 12:00pm in LA
  const tz = "America/Los_Angeles";

  it("passes through valid ISO dates", () => {
    expect(resolveRelativeDate("2026-05-03", now, tz)).toBe("2026-05-03");
  });

  it("rejects invalid ISO dates", () => {
    expect(resolveRelativeDate("2026-13-40", now, tz)).toBeNull();
  });

  it("resolves today/tomorrow/yesterday", () => {
    expect(resolveRelativeDate("today", now, tz)).toBe("2026-04-20");
    expect(resolveRelativeDate("tonight", now, tz)).toBe("2026-04-20");
    expect(resolveRelativeDate("this morning", now, tz)).toBe("2026-04-20");
    expect(resolveRelativeDate("tomorrow", now, tz)).toBe("2026-04-21");
    expect(resolveRelativeDate("yesterday", now, tz)).toBe("2026-04-19");
  });

  it("resolves 'this <weekday>' to the current week, returning today if same day", () => {
    // Today is Monday 2026-04-20
    expect(resolveRelativeDate("this monday", now, tz)).toBe("2026-04-20");
    expect(resolveRelativeDate("this saturday", now, tz)).toBe("2026-04-25");
    expect(resolveRelativeDate("this sat", now, tz)).toBe("2026-04-25");
  });

  it("resolves 'next <weekday>' always to 7-13 days ahead", () => {
    // Today is Monday 2026-04-20
    expect(resolveRelativeDate("next monday", now, tz)).toBe("2026-04-27");
    expect(resolveRelativeDate("next saturday", now, tz)).toBe("2026-05-02");
  });

  it("resolves 'last <weekday>' to previous occurrence", () => {
    expect(resolveRelativeDate("last monday", now, tz)).toBe("2026-04-13");
    expect(resolveRelativeDate("last sunday", now, tz)).toBe("2026-04-19");
  });

  it("resolves 'in N days/weeks/months'", () => {
    expect(resolveRelativeDate("in 3 days", now, tz)).toBe("2026-04-23");
    expect(resolveRelativeDate("in 2 weeks", now, tz)).toBe("2026-05-04");
    expect(resolveRelativeDate("in 1 month", now, tz)).toBe("2026-05-20");
  });

  it("resolves 'N days/weeks ago'", () => {
    expect(resolveRelativeDate("3 days ago", now, tz)).toBe("2026-04-17");
    expect(resolveRelativeDate("2 weeks ago", now, tz)).toBe("2026-04-06");
  });

  it("resolves month-day phrases, rolling forward if past", () => {
    // Today is April 20. "May 3" resolves to 2026-05-03.
    expect(resolveRelativeDate("may 3", now, tz)).toBe("2026-05-03");
    // "March 15" has passed — should roll to next year.
    expect(resolveRelativeDate("march 15", now, tz)).toBe("2027-03-15");
    expect(resolveRelativeDate("3 may", now, tz)).toBe("2026-05-03");
    expect(resolveRelativeDate("may 3rd", now, tz)).toBe("2026-05-03");
    expect(resolveRelativeDate("may 3 2026", now, tz)).toBe("2026-05-03");
    expect(resolveRelativeDate("may 3, 2027", now, tz)).toBe("2027-05-03");
  });

  it("returns null for phrases it cannot confidently parse", () => {
    expect(resolveRelativeDate("sometime soon", now, tz)).toBeNull();
    expect(resolveRelativeDate("maybe friday or saturday", now, tz)).toBeNull();
    expect(resolveRelativeDate("", now, tz)).toBeNull();
  });
});

describe("resolveDateReferences", () => {
  it("returns a tight payload for each reference", () => {
    const now = new Date("2026-04-20T19:00:00Z");
    const result = resolveDateReferences(
      ["tomorrow", "2026-05-03", "not a real date"],
      now,
      "America/Los_Angeles",
    );

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      input: "tomorrow",
      isoDate: "2026-04-21",
      dayOfWeek: "Tuesday",
      daysFromToday: 1,
      resolved: true,
    });
    expect(result[1]).toMatchObject({
      input: "2026-05-03",
      isoDate: "2026-05-03",
      dayOfWeek: "Sunday",
      daysFromToday: 13,
      resolved: true,
    });
    expect(result[2]).toMatchObject({
      input: "not a real date",
      isoDate: null,
      resolved: false,
    });
  });
});
