import { describe, it, expect } from "vitest";
import { parseCoachConversationSummary } from "./summary";
import type {
  BuildCoachConversationSummaryEvent,
  CoachConversation,
} from "./types";

const makeEvent = (
  overrides?: Partial<BuildCoachConversationSummaryEvent>,
): BuildCoachConversationSummaryEvent => ({
  userId: "test-user",
  coachId: "test-coach",
  conversationId: "conv_test_123",
  triggerReason: "message_count",
  messageCount: 4,
  ...overrides,
});

const makeConversation = (): CoachConversation =>
  ({
    conversationId: "conv_test_123",
    coachId: "test-coach",
    userId: "test-user",
    messages: [
      { id: "m1", role: "user", content: "Hello", timestamp: new Date() },
      {
        id: "m2",
        role: "assistant",
        content: "Hi there!",
        timestamp: new Date(),
      },
    ],
    metadata: {
      startedAt: new Date(),
      lastActivity: new Date(),
      totalMessages: 2,
      isActive: true,
    },
  }) as unknown as CoachConversation;

describe("parseCoachConversationSummary", () => {
  it("parses properly-typed tool result without data loss", () => {
    const toolResult = {
      narrative: "The athlete discussed their training goals.",
      current_goals: ["Build strength", "Improve mobility"],
      recent_progress: ["Added 10lbs to squat"],
      training_preferences: ["Prefers compound movements", "Likes high volume"],
      schedule_constraints: ["Travels frequently"],
      key_insights: ["Responds well to periodization"],
      important_context: ["Has previous knee injury"],
      conversation_tags: ["strength-training", "mobility"],
    };

    const result = parseCoachConversationSummary(
      toolResult,
      makeEvent(),
      makeConversation(),
    );

    expect(result.narrative).toBe(
      "The athlete discussed their training goals.",
    );
    expect(result.structuredData.current_goals).toEqual([
      "Build strength",
      "Improve mobility",
    ]);
    expect(result.structuredData.recent_progress).toEqual([
      "Added 10lbs to squat",
    ]);
    expect(result.structuredData.training_preferences).toHaveLength(2);
    expect(result.structuredData.key_insights).toHaveLength(1);
    expect(result.structuredData.important_context).toHaveLength(1);
    expect(result.structuredData.conversation_tags).toEqual([
      "strength-training",
      "mobility",
    ]);
  });

  it("fixes double-encoded string fields and preserves array contents", () => {
    const toolResult = {
      narrative: "The athlete discussed their training goals.",
      current_goals: JSON.stringify(["Build strength", "Improve mobility"]),
      recent_progress: JSON.stringify(["Added 10lbs to squat"]),
      training_preferences: JSON.stringify([
        "Prefers compound movements",
        "Likes high volume",
      ]),
      schedule_constraints: JSON.stringify(["Travels frequently"]),
      key_insights: JSON.stringify(["Responds well to periodization"]),
      important_context: JSON.stringify(["Has previous knee injury"]),
      conversation_tags: ["strength-training", "mobility"],
    };

    const result = parseCoachConversationSummary(
      toolResult,
      makeEvent(),
      makeConversation(),
    );

    expect(result.structuredData.current_goals).toEqual([
      "Build strength",
      "Improve mobility",
    ]);
    expect(result.structuredData.recent_progress).toEqual([
      "Added 10lbs to squat",
    ]);
    expect(result.structuredData.training_preferences).toHaveLength(2);
    expect(result.structuredData.key_insights).toHaveLength(1);
    expect(result.structuredData.important_context).toHaveLength(1);
  });

  it("does not collapse double-encoded arrays to count=1", () => {
    const goals = [
      "Reintegrate power cleans",
      "Incorporate Pendlay rows",
      "Build a bodybuilding block",
      "Maintain CrossFit capacity",
    ];
    const toolResult = {
      narrative: "Detailed coaching narrative.",
      current_goals: JSON.stringify(goals),
      recent_progress: JSON.stringify(["PR on deadlift", "Completed phase 1"]),
      training_preferences: JSON.stringify([
        "Heavy singles",
        "Conjugate method",
      ]),
      schedule_constraints: JSON.stringify(["Works 9-5"]),
      key_insights: JSON.stringify(["Adapts well to autoregulation"]),
      important_context: JSON.stringify(["Masters athlete, age 42"]),
      conversation_tags: ["powerlifting", "masters-crossfit"],
    };

    const result = parseCoachConversationSummary(
      toolResult,
      makeEvent(),
      makeConversation(),
    );

    expect(result.structuredData.current_goals).toHaveLength(4);
    expect(result.structuredData.current_goals).toEqual(goals);
    expect(result.structuredData.recent_progress).toHaveLength(2);
    expect(result.structuredData.training_preferences).toHaveLength(2);
  });

  it("repairs newline-delimited JSON arrays wrapped in a single-element array", () => {
    // Simulates the data shape after normalizeSchemaArrayFields wraps an
    // unparsed newline-delimited string: ['["a"]\n["b"]'] instead of ["a","b"]
    const toolResult = {
      narrative: "Coaching narrative.",
      current_goals: [
        '["Reintegrate power cleans"]\n["Incorporate Pendlay rows"]\n["Build a bodybuilding block"]',
      ],
      recent_progress: ['["PR on deadlift"]\n["Completed phase 1"]'],
      training_preferences: ["Heavy singles", "Conjugate method"],
      schedule_constraints: ["Works 9-5"],
      key_insights: ["Adapts well to autoregulation"],
      important_context: ["Masters athlete, age 42"],
      conversation_tags: ["powerlifting", "masters-crossfit"],
    };

    const result = parseCoachConversationSummary(
      toolResult,
      makeEvent(),
      makeConversation(),
    );

    expect(result.structuredData.current_goals).toEqual([
      "Reintegrate power cleans",
      "Incorporate Pendlay rows",
      "Build a bodybuilding block",
    ]);
    expect(result.structuredData.recent_progress).toEqual([
      "PR on deadlift",
      "Completed phase 1",
    ]);
  });

  it("preserves single-element arrays produced by string wrapping (incident pattern)", () => {
    // Simulates what the pipeline delivers when Haiku returns a comma-separated
    // string for an array field and normalizeSchemaArrayFields wraps it.
    // The parser must not collapse or mutate this shape further.
    const toolResult = {
      narrative: "The athlete discussed their training goals.",
      current_goals: [
        "Execute Week 1 training plan \u2705 COMPLETED, Reintegrate power cleans, Incorporate Pendlay rows",
      ],
      recent_progress: [
        "Four PRs in Week 1 (April 7-12): Power clean 175#, Back squat 285#, Front squat 235#, Deadlift 365#",
      ],
      training_preferences: ["Prefers compound movements", "Uses 5/3/1"],
      schedule_constraints: ["Travels on weekends"],
      key_insights: ["Responds well to periodization"],
      important_context: ["Previous shoulder injury"],
      conversation_tags: ["strength-training", "goal-setting"],
    };

    const result = parseCoachConversationSummary(
      toolResult,
      makeEvent(),
      makeConversation(),
    );

    // Single-element arrays from string wrapping are valid — preserve them as-is
    expect(result.structuredData.current_goals).toHaveLength(1);
    expect(result.structuredData.current_goals[0]).toContain(
      "Execute Week 1 training plan",
    );
    expect(result.structuredData.recent_progress).toHaveLength(1);
    expect(result.structuredData.recent_progress[0]).toContain("Four PRs");
    // Fields that were already proper arrays are unaffected
    expect(result.structuredData.training_preferences).toHaveLength(2);
    expect(result.structuredData.conversation_tags).toEqual([
      "strength-training",
      "goal-setting",
    ]);
  });
});
