import { describe, it, expect } from "vitest";
import { generateDisplayName } from "./normalization";

describe("generateDisplayName", () => {
  it("converts snake_case to Title Case", () => {
    expect(generateDisplayName("back_squat")).toBe("Back Squat");
  });

  it("handles multi-word names", () => {
    expect(generateDisplayName("handstand_push_up")).toBe("Handstand Push Up");
  });

  it("handles single-word names", () => {
    expect(generateDisplayName("deadlift")).toBe("Deadlift");
  });

  it("handles long compound names", () => {
    expect(generateDisplayName("chest_to_bar_pull_up")).toBe("Chest To Bar Pull Up");
  });

  it("handles abbreviation-like names", () => {
    expect(generateDisplayName("romanian_deadlift")).toBe("Romanian Deadlift");
  });

  it("returns empty string for empty input", () => {
    expect(generateDisplayName("")).toBe("");
  });

  it("handles single character segments", () => {
    expect(generateDisplayName("a_b_c")).toBe("A B C");
  });

  it("handles names with numbers", () => {
    // Numbers are passed through — first char toUpperCase on a digit is still the digit
    expect(generateDisplayName("5x5_squat")).toBe("5x5 Squat");
  });
});
