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

  it("repairs a full conversation summary shape with multiple newline-delimited fields", () => {
    const data = {
      narrative: "This coaching relationship is collaborative.",
      current_goals:
        '["Reintegrate power cleans"]\n["Incorporate Pendlay rows"]\n["Build posterior chain"]',
      recent_progress:
        '["Zercher squat PR: 215# x3"]\n["DB bench volume PR: 95# x8"]',
      training_preferences:
        '["Functional Chaos Training philosophy"]\n["Prefers compound movements"]\n["Safety bar squats"]',
      schedule_constraints:
        '["Trains 5 days per week"]\n["Sunday is rest day"]',
      key_insights:
        '["Exceptional movement literacy"]\n["Mature recovery instincts"]',
      important_context:
        '["Masters CrossFit competitor"]\n["Has home and commercial gym"]',
      conversation_tags: ["functional-chaos", "masters-crossfit"],
    };
    const result = fixDoubleEncodedProperties(data);

    expect(result.narrative).toBe(
      "This coaching relationship is collaborative.",
    );
    expect(result.current_goals).toEqual([
      "Reintegrate power cleans",
      "Incorporate Pendlay rows",
      "Build posterior chain",
    ]);
    expect(result.recent_progress).toEqual([
      "Zercher squat PR: 215# x3",
      "DB bench volume PR: 95# x8",
    ]);
    expect(result.training_preferences).toEqual([
      "Functional Chaos Training philosophy",
      "Prefers compound movements",
      "Safety bar squats",
    ]);
    expect(result.schedule_constraints).toEqual([
      "Trains 5 days per week",
      "Sunday is rest day",
    ]);
    expect(result.key_insights).toEqual([
      "Exceptional movement literacy",
      "Mature recovery instincts",
    ]);
    expect(result.important_context).toEqual([
      "Masters CrossFit competitor",
      "Has home and commercial gym",
    ]);
    expect(result.conversation_tags).toEqual([
      "functional-chaos",
      "masters-crossfit",
    ]);
  });
});
