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
});
