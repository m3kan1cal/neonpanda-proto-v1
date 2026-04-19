import { describe, it, expect } from "vitest";
import { normalizeSchemaArrayFields } from "./object-utils";

const arraySchema = (required: string[] = []) => ({
  type: "object",
  required,
  properties: {
    tags: { type: "array", items: { type: "string" } },
    injuries: { type: ["array", "null"], items: { type: "string" } },
    name: { type: "string" },
  },
});

describe("normalizeSchemaArrayFields", () => {
  it("leaves a properly-typed array unchanged", () => {
    const response: Record<string, unknown> = { tags: ["a", "b"] };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual(["a", "b"]);
  });

  it("leaves an empty array unchanged", () => {
    const response: Record<string, unknown> = { tags: [] };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual([]);
  });

  it("wraps a plain string value in a single-element array", () => {
    const response: Record<string, unknown> = { tags: "urgent, critical" };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual(["urgent, critical"]);
  });

  it("wraps a numeric value in a single-element array", () => {
    const response: Record<string, unknown> = { tags: 42 };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual([42]);
  });

  it("coerces null to an empty array", () => {
    const response: Record<string, unknown> = { tags: null };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual([]);
  });

  it("coerces undefined to an empty array", () => {
    const response: Record<string, unknown> = { tags: undefined };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual([]);
  });

  it("coerces an empty string to an empty array", () => {
    const response: Record<string, unknown> = { tags: "" };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual([]);
  });

  it("coerces a whitespace-only string to an empty array", () => {
    const response: Record<string, unknown> = { tags: "   " };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.tags).toEqual([]);
  });

  it("backfills a missing required array field with []", () => {
    const response: Record<string, unknown> = {};
    normalizeSchemaArrayFields(response, arraySchema(["tags"]));
    expect(response.tags).toEqual([]);
  });

  it("does not backfill a missing optional array field", () => {
    const response: Record<string, unknown> = {};
    normalizeSchemaArrayFields(response, arraySchema());
    expect("tags" in response).toBe(false);
  });

  it("handles nullable array type declaration (type: ['array', 'null'])", () => {
    const response: Record<string, unknown> = { injuries: null };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.injuries).toEqual([]);
  });

  it("does not modify non-array schema fields", () => {
    const response: Record<string, unknown> = { name: "Alice", tags: ["a"] };
    normalizeSchemaArrayFields(response, arraySchema());
    expect(response.name).toBe("Alice");
  });

  it("does nothing when schema has no properties", () => {
    const response: Record<string, unknown> = { tags: "x" };
    normalizeSchemaArrayFields(response, { type: "object" });
    expect(response.tags).toBe("x");
  });

  it("processes all array fields independently in a single pass", () => {
    const schema = {
      type: "object",
      required: ["goals", "tags"],
      properties: {
        goals: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "string" } },
      },
    };
    const response: Record<string, unknown> = {
      goals: "Squat 315, Deadlift 405",
      tags: null,
      // notes is absent and not required
    };
    normalizeSchemaArrayFields(response, schema);
    expect(response.goals).toEqual(["Squat 315, Deadlift 405"]);
    expect(response.tags).toEqual([]);
    expect("notes" in response).toBe(false);
  });
});
