import { describe, it, expect, vi, beforeEach } from "vitest";

// `vi.mock` is hoisted, so the capture mock must come from `vi.hoisted`
// to be available inside the factory.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("./core", async () => {
  const actual: any = await vi.importActual("./core");
  return {
    ...actual,
    docClient: { send: sendMock },
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
    deserializeFromDynamoDB: actual.deserializeFromDynamoDB,
  };
});

import { updateProgramDesignerSession } from "./program-designer";

const baseAttributes = {
  sessionId: "program_designer_user001_111_aaa",
  userId: "user001",
  title: "Old title",
  startedAt: "2026-05-10T14:00:00.000Z",
  lastActivity: "2026-05-10T15:00:00.000Z",
  isComplete: false,
  isDeleted: false,
};

beforeEach(() => {
  sendMock.mockReset();
});

describe("updateProgramDesignerSession", () => {
  it("returns Date objects (not raw ISO strings) on lastActivity / startedAt", async () => {
    // Regression guard for the missing-deserializer foot-gun: the raw
    // `as` cast would have handed callers strings typed as Date, so a
    // future `.getTime()` call would crash at runtime.
    sendMock.mockResolvedValue({
      Attributes: { attributes: { ...baseAttributes, title: "New title" } },
    });

    const result = await updateProgramDesignerSession(
      "user001",
      "program_designer_user001_111_aaa",
      { title: "New title" },
    );

    expect(result.lastActivity).toBeInstanceOf(Date);
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.title).toBe("New title");
  });

  it("does NOT read the existing item before writing (no read-modify-write race)", async () => {
    sendMock.mockResolvedValue({ Attributes: { attributes: baseAttributes } });

    await updateProgramDesignerSession(
      "user001",
      "program_designer_user001_111_aaa",
      { title: "x" },
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].input.UpdateExpression).toMatch(/^SET /);
  });

  it("throws 'not found' when DDB returns no Attributes", async () => {
    // ReturnValues=ALL_NEW combined with the conditional should not
    // realistically yield this shape, but defending against it keeps
    // the declared non-null return type honest.
    sendMock.mockResolvedValue({});

    await expect(
      updateProgramDesignerSession(
        "user001",
        "program_designer_user001_111_aaa",
        { title: "x" },
      ),
    ).rejects.toThrow(
      /Program designer session not found: program_designer_user001_111_aaa/,
    );
  });

  it("rethrows ConditionalCheckFailedException as a 'not found' error", async () => {
    const ccf = Object.assign(new Error("conditional check failed"), {
      name: "ConditionalCheckFailedException",
    });
    sendMock.mockRejectedValue(ccf);

    await expect(
      updateProgramDesignerSession(
        "user001",
        "program_designer_user001_111_aaa",
        { title: "x" },
      ),
    ).rejects.toThrow(
      /Program designer session not found: program_designer_user001_111_aaa/,
    );
  });
});
