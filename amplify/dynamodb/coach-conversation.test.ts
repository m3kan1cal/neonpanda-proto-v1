import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// `vi.mock` is hoisted above any top-level statements, so the mocks must
// be created via `vi.hoisted` to be available inside the factory.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

// `withThroughputScaling` is a real wrapper in production; for these tests
// we just invoke the inner closure once so we can observe the underlying
// docClient call without dragging in the retry/backoff harness.
vi.mock("./core", async () => {
  const actual: any = await vi.importActual("./core");
  return {
    ...actual,
    docClient: { send: sendMock },
    // The real UpdateCommand is a class invoked via `new` — model it the
    // same way so the SUT's `new UpdateCommand(...)` works.
    UpdateCommand: class FakeUpdateCommand {
      input: unknown;
      constructor(input: unknown) {
        this.input = input;
      }
    },
    withThroughputScaling: vi.fn().mockImplementation(async (fn: () => any) => {
      return fn();
    }),
    getTableName: vi.fn().mockReturnValue("test-table"),
    // Pass through deserializeFromDynamoDB unchanged so we can verify the
    // function genuinely deserializes ISO date strings to Date objects.
    deserializeFromDynamoDB: actual.deserializeFromDynamoDB,
  };
});

// ─── System under test ───────────────────────────────────────────────────────

import { updateCoachConversation } from "./coach-conversation";

// Minimal fixture matching the shape the real DDB returns (attributes
// nested under the item, ISO strings for dates).
const baseAttributes = {
  conversationId: "conv_user001_111_aaa",
  coachId: "coach_user001_222_bbb",
  userId: "user001",
  title: "Old title",
  mode: "chat",
  messages: [
    { id: "m1", role: "user", content: "first", timestamp: "2026-05-10T15:00:00.000Z" },
    { id: "m2", role: "assistant", content: "reply", timestamp: "2026-05-10T15:00:01.000Z" },
  ],
  metadata: {
    startedAt: "2026-05-10T14:59:00.000Z",
    lastActivity: "2026-05-10T15:00:01.000Z",
    totalMessages: 2,
    isActive: true,
    tags: ["existing-tag"],
  },
};

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({
    Attributes: { attributes: { ...baseAttributes, title: "Generated title" } },
  });
});

const getDispatchedCommandInput = () => {
  expect(sendMock).toHaveBeenCalledTimes(1);
  return sendMock.mock.calls[0][0].input;
};

describe("updateCoachConversation (targeted UpdateCommand)", () => {
  it("does NOT read the existing item before writing", async () => {
    // The whole point of the F9 fix: no load-modify-write cycle, so a
    // concurrent PutItem from sendCoachConversationMessage that appended
    // to `attributes.messages` cannot be silently overwritten.
    await updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
      title: "New title",
    });

    // Exactly one DDB call (the UpdateCommand) — no GetItem precursor.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const input = getDispatchedCommandInput();
    expect(input.UpdateExpression).toMatch(/^SET /);
  });

  it("never includes `messages` or `totalMessages` in the update payload", async () => {
    // These are the fields a concurrent stream-handler PutItem would
    // touch. If our update mentioned them at all, we'd be at risk of
    // overwriting a freshly-appended turn.
    await updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
      title: "New title",
      tags: ["a", "b"],
      isActive: false,
      mode: "workout_edit",
    });

    const input = getDispatchedCommandInput();
    const expression = input.UpdateExpression as string;
    const names = input.ExpressionAttributeNames as Record<string, string>;
    const values = input.ExpressionAttributeValues as Record<string, unknown>;

    expect(expression).not.toContain("messages");
    expect(expression).not.toContain("totalMessages");
    expect(expression).not.toContain("startedAt");
    expect(Object.values(names)).not.toContain("messages");
    expect(Object.values(names)).not.toContain("totalMessages");
    expect(Object.values(names)).not.toContain("startedAt");
    // No raw value should look like a CoachMessage either.
    for (const v of Object.values(values)) {
      expect(JSON.stringify(v)).not.toMatch(/"role"\s*:\s*"(user|assistant)"/);
    }
  });

  it("targets the correct DDB key and uses the existence guard", async () => {
    await updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
      title: "New title",
    });

    const input = getDispatchedCommandInput();
    expect(input.TableName).toBe("test-table");
    expect(input.Key).toEqual({
      pk: "user#user001",
      sk: "coachConversation#coach_user001_222_bbb#conv_user001_111_aaa",
    });
    expect(input.ConditionExpression).toBe("attribute_exists(pk)");
    expect(input.ReturnValues).toBe("ALL_NEW");
  });

  it("title-only update writes title, lastActivity, updatedAt — and nothing else", async () => {
    await updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
      title: "Just the title",
    });

    const input = getDispatchedCommandInput();
    const clauses = (input.UpdateExpression as string)
      .replace(/^SET\s+/, "")
      .split(/,\s*/);

    expect(clauses).toEqual(
      expect.arrayContaining([
        "#attrs.#metadata.#lastActivity = :nowIso",
        "updatedAt = :nowIso",
        "#attrs.#title = :title",
      ]),
    );
    expect(clauses).toHaveLength(3);
    expect(input.ExpressionAttributeValues[":title"]).toBe("Just the title");
    // mode / tags / isActive should not have leaked into placeholders.
    expect(input.ExpressionAttributeValues).not.toHaveProperty(":mode");
    expect(input.ExpressionAttributeValues).not.toHaveProperty(":tags");
    expect(input.ExpressionAttributeValues).not.toHaveProperty(":isActive");
  });

  it("persists `mode` (previously dropped silently)", async () => {
    // Before this fix the API handler accepted `mode` and forwarded it
    // here, but the function signature dropped it on the floor. The new
    // signature persists it under attributes.mode.
    await updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
      mode: "workout_edit",
    });

    const input = getDispatchedCommandInput();
    expect(input.UpdateExpression).toContain("#attrs.#mode = :mode");
    expect(input.ExpressionAttributeNames["#mode"]).toBe("mode");
    expect(input.ExpressionAttributeValues[":mode"]).toBe("workout_edit");
  });

  it("places `tags` and `isActive` under attributes.metadata, not at top level", async () => {
    await updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
      tags: ["new-tag"],
      isActive: false,
    });

    const input = getDispatchedCommandInput();
    expect(input.UpdateExpression).toContain("#attrs.#metadata.#tags = :tags");
    expect(input.UpdateExpression).toContain("#attrs.#metadata.#isActive = :isActive");
    expect(input.ExpressionAttributeValues[":tags"]).toEqual(["new-tag"]);
    expect(input.ExpressionAttributeValues[":isActive"]).toBe(false);
  });

  it("always touches metadata.lastActivity and updatedAt with a single :nowIso value", async () => {
    await updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
      title: "x",
    });

    const input = getDispatchedCommandInput();
    expect(input.UpdateExpression).toContain("#attrs.#metadata.#lastActivity = :nowIso");
    expect(input.UpdateExpression).toContain("updatedAt = :nowIso");
    expect(typeof input.ExpressionAttributeValues[":nowIso"]).toBe("string");
    expect(input.ExpressionAttributeValues[":nowIso"]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("rethrows ConditionalCheckFailedException as a 'not found' error", async () => {
    sendMock.mockReset();
    const ccf = Object.assign(new Error("conditional check failed"), {
      name: "ConditionalCheckFailedException",
    });
    sendMock.mockRejectedValue(ccf);

    await expect(
      updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
        title: "x",
      }),
    ).rejects.toThrow(/Conversation not found: conv_user001_111_aaa/);
  });

  it("returns a deserialized CoachConversation with Date objects on metadata", async () => {
    // ALL_NEW gives us back the post-update item; we want callers to see
    // the same shape they'd get from loadFromDynamoDB (Date objects, not
    // raw ISO strings).
    const result = await updateCoachConversation(
      "user001",
      "coach_user001_222_bbb",
      "conv_user001_111_aaa",
      { title: "x" },
    );

    expect(result.metadata.lastActivity).toBeInstanceOf(Date);
    expect(result.metadata.startedAt).toBeInstanceOf(Date);
  });

  it("simulates the title-race: two concurrent invocations don't fight over `messages`", async () => {
    // Stream handler appended a 3rd message between two title updates.
    // Each UpdateCommand runs in isolation against DDB and never touches
    // the messages array, so there is no in-memory state to clobber.
    const messagesAfterStreamWrite = [
      ...baseAttributes.messages,
      { id: "m3", role: "user", content: "second turn", timestamp: "2026-05-10T15:00:05.000Z" },
    ];

    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({
      Attributes: {
        attributes: {
          ...baseAttributes,
          messages: messagesAfterStreamWrite,
          title: "Title from concurrent update",
        },
      },
    });
    sendMock.mockResolvedValueOnce({
      Attributes: {
        attributes: {
          ...baseAttributes,
          messages: messagesAfterStreamWrite,
          tags: ["fresh"],
        },
      },
    });

    const [titleResult, tagsResult] = await Promise.all([
      updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
        title: "Title from concurrent update",
      }),
      updateCoachConversation("user001", "coach_user001_222_bbb", "conv_user001_111_aaa", {
        tags: ["fresh"],
      }),
    ]);

    // Both updates went through with exactly one DDB call each (no read).
    expect(sendMock).toHaveBeenCalledTimes(2);

    // Neither call's UpdateExpression mentioned `messages` — no path
    // exists by which the in-flight 3rd message could have been
    // overwritten by either of these updates.
    for (const call of sendMock.mock.calls) {
      const expression = call[0].input.UpdateExpression as string;
      expect(expression).not.toContain("messages");
    }

    // And the freshly-appended message survived in both ALL_NEW responses.
    expect(titleResult.messages).toHaveLength(3);
    expect(tagsResult.messages).toHaveLength(3);
  });
});
