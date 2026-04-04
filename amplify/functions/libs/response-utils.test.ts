import { describe, it, expect } from "vitest";
import { fixDoubleEncodedProperties } from "./response-utils";

describe("fixDoubleEncodedProperties", () => {
  it("returns properly-typed data unchanged", () => {
    const data = {
      narrative: "A narrative string",
      goals: ["goal1", "goal2"],
      tags: ["tag1"],
    };
    const result = fixDoubleEncodedProperties(data);
    expect(result).toEqual(data);
  });

  it("parses a single JSON-stringified array back to an array", () => {
    const data = {
      narrative: "A narrative",
      current_goals: JSON.stringify(["Build strength", "Improve mobility"]),
    };
    const result = fixDoubleEncodedProperties(data);
    expect(result.current_goals).toEqual([
      "Build strength",
      "Improve mobility",
    ]);
  });

  it("parses newline-delimited JSON arrays into a single merged array", () => {
    const data = {
      narrative: "A narrative",
      current_goals:
        '["Reintegrate power cleans"]\n["Incorporate Pendlay rows"]\n["Build a bodybuilding block"]',
    };
    const result = fixDoubleEncodedProperties(data);
    expect(result.current_goals).toEqual([
      "Reintegrate power cleans",
      "Incorporate Pendlay rows",
      "Build a bodybuilding block",
    ]);
  });

  it("handles newline-delimited single-element arrays", () => {
    const data = {
      key_insights:
        '["Responds well to periodization"]\n["Prefers autoregulation"]',
    };
    const result = fixDoubleEncodedProperties(data);
    expect(result.key_insights).toEqual([
      "Responds well to periodization",
      "Prefers autoregulation",
    ]);
  });

  it("handles mixed newline-delimited arrays with multiple elements per line", () => {
    const data = {
      goals: '["goal1", "goal2"]\n["goal3"]',
    };
    const result = fixDoubleEncodedProperties(data);
    expect(result.goals).toEqual(["goal1", "goal2", "goal3"]);
  });

  it("returns plain strings unchanged when they are not JSON-shaped", () => {
    const data = {
      narrative: "Just a plain narrative with no JSON structure",
    };
    const result = fixDoubleEncodedProperties(data);
    expect(result.narrative).toBe(
      "Just a plain narrative with no JSON structure",
    );
  });

  it("handles nested double-encoded objects", () => {
    const data = {
      config: JSON.stringify({ key: "value", nested: true }),
    };
    const result = fixDoubleEncodedProperties(data);
    expect(result.config).toEqual({ key: "value", nested: true });
  });
});
