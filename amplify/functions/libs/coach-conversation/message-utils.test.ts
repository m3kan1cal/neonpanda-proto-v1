import { describe, it, expect } from "vitest";
import { extractLatestBuildModeSection } from "./message-utils";
import { CONVERSATION_MODES } from "./types";
import type { CoachMessage } from "./types";

// ─── Factories ───────────────────────────────────────────────────────────────

const makeUserMsg = (content = "user message"): CoachMessage =>
  ({
    id: Math.random().toString(36).slice(2),
    role: "user" as const,
    content,
    timestamp: new Date(),
  }) as CoachMessage;

const makeAssistantMsg = (
  content = "assistant message",
  isBuild = false,
): CoachMessage =>
  ({
    id: Math.random().toString(36).slice(2),
    role: "assistant" as const,
    content,
    timestamp: new Date(),
    metadata: isBuild ? { mode: CONVERSATION_MODES.PROGRAM_DESIGN } : undefined,
  }) as CoachMessage;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("extractLatestBuildModeSection", () => {
  it("returns empty array for empty input", () => {
    expect(extractLatestBuildModeSection([])).toEqual([]);
  });

  it("returns empty array when no build-mode assistant messages exist", () => {
    const messages = [
      makeUserMsg("hello"),
      makeAssistantMsg("hi there"),
      makeUserMsg("how are you"),
    ];
    expect(extractLatestBuildModeSection(messages)).toEqual([]);
  });

  it("returns the build section when it is at the end of history", () => {
    const chat1 = makeAssistantMsg("regular chat response");
    const user1 = makeUserMsg("let's design a program");
    const build1 = makeAssistantMsg("building phase 1", true);

    const messages = [chat1, user1, build1];
    const result = extractLatestBuildModeSection(messages);

    expect(result).toHaveLength(2); // user1 + build1
    expect(result).toContain(user1);
    expect(result).toContain(build1);
    expect(result).not.toContain(chat1);
  });

  it("excludes earlier chat messages before the build section starts", () => {
    const chatUser = makeUserMsg("general chat");
    const chatAi = makeAssistantMsg("general response");
    const buildUser = makeUserMsg("program request");
    const buildAi = makeAssistantMsg("program response", true);

    const messages = [chatUser, chatAi, buildUser, buildAi];
    const result = extractLatestBuildModeSection(messages);

    expect(result).not.toContain(chatUser);
    expect(result).not.toContain(chatAi);
    expect(result).toContain(buildUser);
    expect(result).toContain(buildAi);
  });

  it("returns only the LATEST continuous build section, not earlier ones", () => {
    // Earlier build section
    const oldBuildUser = makeUserMsg("old program request");
    const oldBuildAi = makeAssistantMsg("old program", true);
    // Non-build message between sections
    const chatAi = makeAssistantMsg("chat between sections");
    // Latest build section
    const newBuildUser = makeUserMsg("new program request");
    const newBuildAi = makeAssistantMsg("new program", true);

    const messages = [oldBuildUser, oldBuildAi, chatAi, newBuildUser, newBuildAi];
    const result = extractLatestBuildModeSection(messages);

    expect(result).not.toContain(oldBuildUser);
    expect(result).not.toContain(oldBuildAi);
    expect(result).not.toContain(chatAi);
    expect(result).toContain(newBuildUser);
    expect(result).toContain(newBuildAi);
  });

  it("handles multi-turn build session (consecutive build AI messages)", () => {
    const chatAi = makeAssistantMsg("regular chat");
    const user1 = makeUserMsg("first build message");
    const buildAi1 = makeAssistantMsg("build response 1", true);
    const user2 = makeUserMsg("follow-up in build session");
    const buildAi2 = makeAssistantMsg("build response 2", true);

    const messages = [chatAi, user1, buildAi1, user2, buildAi2];
    const result = extractLatestBuildModeSection(messages);

    expect(result).not.toContain(chatAi);
    expect(result).toContain(user1);
    expect(result).toContain(buildAi1);
    expect(result).toContain(user2);
    expect(result).toContain(buildAi2);
    expect(result).toHaveLength(4);
  });

  it("returns single build message section correctly", () => {
    const buildAi = makeAssistantMsg("only build message", true);
    const result = extractLatestBuildModeSection([buildAi]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(buildAi);
  });
});
