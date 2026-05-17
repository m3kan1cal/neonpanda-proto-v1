import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../../dynamodb/operations", () => ({
  getCoachConversation: vi.fn(),
}));

vi.mock("../api-helpers", () => ({
  invokeAsyncLambda: vi.fn(),
}));

import {
  hasInlineDrawerTag,
  isInlineDrawerTag,
  deriveSurfaceContext,
  maybeTriggerTitleGeneration,
} from "./title-trigger";
import { getCoachConversation } from "../../../dynamodb/operations";
import { invokeAsyncLambda } from "../api-helpers";

const mockedGetCoachConversation = vi.mocked(getCoachConversation);
const mockedInvokeAsyncLambda = vi.mocked(invokeAsyncLambda);

const FUNCTION_NAME = "build-conversation-title-fn";

const baseArgs = {
  userId: "user_abc",
  coachId: "coach_xyz",
  conversationId: "conv_123",
  userMessage: "Help me adjust my squat depth.",
  aiResponse: "Sure — let's look at your stance and ankle mobility first.",
  currentMessageCount: 2,
};

const makeConversation = (
  title: string | undefined,
  tags: string[] = [],
): any => ({
  conversationId: baseArgs.conversationId,
  coachId: baseArgs.coachId,
  userId: baseArgs.userId,
  title,
  metadata: { tags },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BUILD_CONVERSATION_TITLE_FUNCTION_NAME = FUNCTION_NAME;
});

describe("isInlineDrawerTag / hasInlineDrawerTag", () => {
  it("matches flat *_inline tags", () => {
    expect(isInlineDrawerTag("training_grounds_inline")).toBe(true);
    expect(isInlineDrawerTag("manage_workouts_inline")).toBe(true);
    expect(isInlineDrawerTag("manage_shared_programs_inline")).toBe(true);
  });

  it("matches scoped *_inline:<id> tags", () => {
    expect(isInlineDrawerTag("program_dashboard_inline:p_123")).toBe(true);
    expect(isInlineDrawerTag("weekly_report_inline:2026-01-01")).toBe(true);
    expect(isInlineDrawerTag("view_workouts_inline:abc")).toBe(true);
  });

  it("rejects unrelated tags", () => {
    expect(isInlineDrawerTag("favorited")).toBe(false);
    expect(isInlineDrawerTag("inline_not_a_drawer")).toBe(false);
    expect(isInlineDrawerTag("")).toBe(false);
  });

  it("hasInlineDrawerTag returns false for empty array", () => {
    expect(hasInlineDrawerTag([])).toBe(false);
  });

  it("hasInlineDrawerTag returns true when any tag matches", () => {
    expect(hasInlineDrawerTag(["favorited", "training_grounds_inline"])).toBe(
      true,
    );
    expect(hasInlineDrawerTag(["favorited", "starred"])).toBe(false);
  });
});

describe("deriveSurfaceContext", () => {
  it("maps each manage page tag to its surface label", () => {
    expect(deriveSurfaceContext(["manage_workouts_inline"])).toBe(
      "Manage Workouts inline chat",
    );
    expect(deriveSurfaceContext(["manage_exercises_inline"])).toBe(
      "Manage Exercises inline chat",
    );
    expect(deriveSurfaceContext(["manage_memories_inline"])).toBe(
      "Manage Memories inline chat",
    );
    expect(deriveSurfaceContext(["manage_conversations_inline"])).toBe(
      "Manage Conversations inline chat",
    );
    expect(deriveSurfaceContext(["manage_shared_programs_inline"])).toBe(
      "Manage Shared Programs inline chat",
    );
  });

  it("still maps Training Grounds and scoped Program Dashboard (regression)", () => {
    expect(deriveSurfaceContext(["training_grounds_inline"])).toBe(
      "Training Grounds inline chat",
    );
    expect(deriveSurfaceContext(["program_dashboard_inline:p_42"])).toBe(
      "Program Dashboard inline chat",
    );
  });

  it("returns undefined for unrelated tags", () => {
    expect(deriveSurfaceContext(["favorited"])).toBeUndefined();
    expect(deriveSurfaceContext([])).toBeUndefined();
  });
});

describe("maybeTriggerTitleGeneration", () => {
  it("skips when currentMessageCount !== 2", async () => {
    const result = await maybeTriggerTitleGeneration({
      ...baseArgs,
      currentMessageCount: 4,
    });
    expect(result).toEqual({ triggered: false, reason: "not_first_turn" });
    expect(mockedGetCoachConversation).not.toHaveBeenCalled();
    expect(mockedInvokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("skips when BUILD_CONVERSATION_TITLE_FUNCTION_NAME is unset", async () => {
    delete process.env.BUILD_CONVERSATION_TITLE_FUNCTION_NAME;
    const result = await maybeTriggerTitleGeneration(baseArgs);
    expect(result).toEqual({
      triggered: false,
      reason: "function_name_missing",
    });
  });

  it("skips when the conversation can't be loaded", async () => {
    mockedGetCoachConversation.mockResolvedValueOnce(null as any);
    const result = await maybeTriggerTitleGeneration(baseArgs);
    expect(result).toEqual({
      triggered: false,
      reason: "conversation_not_found",
    });
    expect(mockedInvokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("triggers for default-title plain conversations with allowPlaceholderOverwrite=false", async () => {
    mockedGetCoachConversation.mockResolvedValueOnce(
      makeConversation("New Conversation", []),
    );
    mockedInvokeAsyncLambda.mockResolvedValueOnce(undefined as any);

    const result = await maybeTriggerTitleGeneration(baseArgs);

    expect(result).toEqual({ triggered: true });
    expect(mockedInvokeAsyncLambda).toHaveBeenCalledTimes(1);
    const [fnName, payload] = mockedInvokeAsyncLambda.mock.calls[0];
    expect(fnName).toBe(FUNCTION_NAME);
    expect(payload).toMatchObject({
      entityType: "coachConversation",
      userId: baseArgs.userId,
      coachId: baseArgs.coachId,
      conversationId: baseArgs.conversationId,
      tags: [],
      allowPlaceholderOverwrite: false,
    });
    expect((payload as any).surfaceContext).toBeUndefined();
  });

  it("skips non-default title when no inline tag present (preserves manual renames)", async () => {
    mockedGetCoachConversation.mockResolvedValueOnce(
      makeConversation("My Custom Title", []),
    );

    const result = await maybeTriggerTitleGeneration(baseArgs);

    expect(result).toEqual({ triggered: false, reason: "title_already_set" });
    expect(mockedInvokeAsyncLambda).not.toHaveBeenCalled();
  });

  it("triggers with allowPlaceholderOverwrite=true for inline-drawer conversation with placeholder title", async () => {
    mockedGetCoachConversation.mockResolvedValueOnce(
      makeConversation("Manage Workouts", ["manage_workouts_inline"]),
    );
    mockedInvokeAsyncLambda.mockResolvedValueOnce(undefined as any);

    const result = await maybeTriggerTitleGeneration(baseArgs);

    expect(result).toEqual({ triggered: true });
    expect(mockedInvokeAsyncLambda).toHaveBeenCalledTimes(1);
    const [, payload] = mockedInvokeAsyncLambda.mock.calls[0];
    expect(payload).toMatchObject({
      entityType: "coachConversation",
      tags: ["manage_workouts_inline"],
      surfaceContext: "Manage Workouts inline chat",
      allowPlaceholderOverwrite: true,
    });
  });

  it("triggers for scoped program-dashboard inline tag with the right surface context", async () => {
    mockedGetCoachConversation.mockResolvedValueOnce(
      makeConversation("Program Dashboard", [
        "program_dashboard_inline:p_42",
      ]),
    );
    mockedInvokeAsyncLambda.mockResolvedValueOnce(undefined as any);

    const result = await maybeTriggerTitleGeneration(baseArgs);

    expect(result).toEqual({ triggered: true });
    const [, payload] = mockedInvokeAsyncLambda.mock.calls[0];
    expect(payload).toMatchObject({
      surfaceContext: "Program Dashboard inline chat",
      allowPlaceholderOverwrite: true,
    });
  });

  it("returns invoke_failed when invokeAsyncLambda throws", async () => {
    mockedGetCoachConversation.mockResolvedValueOnce(
      makeConversation("New Conversation", []),
    );
    mockedInvokeAsyncLambda.mockRejectedValueOnce(new Error("boom"));

    const result = await maybeTriggerTitleGeneration(baseArgs);

    expect(result).toEqual({ triggered: false, reason: "invoke_failed" });
  });
});
