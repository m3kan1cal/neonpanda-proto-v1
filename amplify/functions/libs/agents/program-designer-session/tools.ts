/**
 * Program Designer Session Agent Tools
 *
 * Full 12-tool set for the StreamingConversationAgent when operating in the
 * program designer role:
 *   Tools 1-9:  Shared factories from agents/shared/tools.ts
 *   Tools 10-12: Program-designer-specific (update_design_fields,
 *               get_design_status, complete_design)
 *
 * The 3 designer-specific tools are the primary mechanism through which the
 * agent tracks the program design to-do list. The update_design_fields tool
 * mutates context.session.todoList in-place — every subsequent tool call and
 * the post-agent session save see the updated values.
 *
 * The complete_design tool accepts an optional additionalConsiderations
 * parameter, folding the V1 "anything else?" step into a single call.
 */

import type { Tool } from "../core/types";
import type { ProgramDesignerSessionAgentContext } from "./types";
import type { ProgramDesignerTodoList } from "../../program-designer/types";
import {
  createSearchKnowledgeBaseTool,
  createSearchMethodologyTool,
  createRetrieveMemoriesTool,
  createSaveMemoryTool,
  createGetRecentWorkoutsTool,
  createQueryProgramsTool,
  createQueryExerciseHistoryTool,
  createListExerciseNamesTool,
  createQueryCoachesTool,
  createComputeDateTool,
} from "../shared/tools";
import {
  getTodoProgress,
  getTodoSummary,
  isSessionComplete,
  getTodoItemLabel,
} from "../../program-designer/todo-list-utils";
import { UPDATE_DESIGN_FIELDS_SCHEMA } from "../../schemas/program-designer-session-tool-schemas";

// ============================================================================
// Shared tools — instantiated for ProgramDesignerSessionAgentContext
// ============================================================================

const searchKnowledgeBaseTool =
  createSearchKnowledgeBaseTool<ProgramDesignerSessionAgentContext>();

const searchMethodologyTool =
  createSearchMethodologyTool<ProgramDesignerSessionAgentContext>();

// Coach exists in program designer — scope memories to this coach
const retrieveMemoriesTool =
  createRetrieveMemoriesTool<ProgramDesignerSessionAgentContext>(
    (ctx) => ctx.coachId,
  );

const saveMemoryTool = createSaveMemoryTool<ProgramDesignerSessionAgentContext>(
  (ctx) => ctx.coachId,
);

const getRecentWorkoutsTool =
  createGetRecentWorkoutsTool<ProgramDesignerSessionAgentContext>();

const queryProgramsTool =
  createQueryProgramsTool<ProgramDesignerSessionAgentContext>();

const queryExerciseHistoryTool =
  createQueryExerciseHistoryTool<ProgramDesignerSessionAgentContext>();

const listExerciseNamesTool =
  createListExerciseNamesTool<ProgramDesignerSessionAgentContext>();

const queryCoachesTool =
  createQueryCoachesTool<ProgramDesignerSessionAgentContext>();

const computeDateTool =
  createComputeDateTool<ProgramDesignerSessionAgentContext>();

// ============================================================================
// TOOL 10: update_design_fields  (designer-specific)
// ============================================================================

const updateDesignFieldsTool: Tool<ProgramDesignerSessionAgentContext> = {
  id: "update_design_fields",
  description: `Record program design information that the user has provided. This is an internal tracking tool — never reference it by name or describe its operation to the user.

CRITICAL: Call this tool EVERY TIME the user provides information relevant to the program design.
Call this tool BEFORE generating your response text so progress tracking stays accurate.

SOURCE CONSTRAINT: Only extract information from what the user explicitly stated in their
current message. Retrieved memories, workout history, and Pinecone context results are
background orientation — they inform your questions, but do not use them as field values.
Only the user's own words count.

How to use:
1. Read the user's current message and extract ONLY what they stated directly
2. Call this tool with all the fields you found (even partial or low-confidence info)
3. Only include fields where you found information — omit unchanged/missing fields
4. After calling this tool, call get_design_status to see what's still needed
5. Then generate your conversational response

Field extraction rules:
- "none" and "no" ARE valid values for injuries, targetEvent, restDaysPreference
- Extract the most specific value the user stated
- For equipmentAccess, list all equipment mentioned as an array
- For trainingFrequency, extract the number only (e.g. 4 for "4 days a week")
- For experienceLevel, use "beginner", "intermediate", or "advanced"
- For intensityPreference, use "conservative", "moderate", or "aggressive"
- For volumeTolerance, use "low", "moderate", or "high"

Example: If user says "I train 4 days a week, mostly powerlifting, home gym with a full barbell setup", extract:
  fields: { trainingFrequency: 4, trainingMethodology: "powerlifting", trainingEnvironment: "home gym",
            equipmentAccess: ["barbell", "squat rack", "plates"] }`,
  inputSchema: UPDATE_DESIGN_FIELDS_SCHEMA,
  async execute(input, context) {
    console.info("📝 Executing update_design_fields:", {
      fieldCount: Object.keys(input.fields || {}).length,
      fields: Object.keys(input.fields || {}),
      userId: context.userId,
    });

    const newFields: string[] = [];
    const overwrittenFields: string[] = [];
    const todoList = context.session.todoList;

    for (const [key, value] of Object.entries(input.fields || {})) {
      if (
        key in todoList &&
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {
        const wasAlreadyComplete =
          (todoList as any)[key]?.status === "complete";
        (todoList as any)[key] = {
          status: "complete" as const,
          value: value,
          confidence: input.confidence || "medium",
          extractedFrom: `agent_turn_${context.session.conversationHistory.length}`,
        };
        if (wasAlreadyComplete) {
          overwrittenFields.push(key);
        } else {
          newFields.push(key);
        }
      }
    }

    const fieldsUpdated = [...newFields, ...overwrittenFields];

    const progress = getTodoProgress(todoList);

    console.info("✅ Design fields updated:", {
      newFields,
      overwrittenFields,
      progress: `${progress.requiredCompleted}/${progress.requiredTotal} required fields`,
      percentage: progress.percentage,
    });

    return {
      updated: fieldsUpdated,
      newFields,
      overwrittenFields,
      progress: {
        questionsCompleted: progress.completed,
        totalQuestions: progress.total,
        percentage: progress.percentage,
        requiredCompleted: progress.requiredCompleted,
        requiredTotal: progress.requiredTotal,
        requiredPercentage: progress.requiredPercentage,
      },
      allRequiredFieldsCollected: isSessionComplete(todoList),
    };
  },
};

(updateDesignFieldsTool as any).contextualMessage = [
  "Tracking your requirements...",
  "Updating program details...",
  "Recording your preferences...",
];

// ============================================================================
// TOOL 11: get_design_status  (designer-specific)
// ============================================================================

const getDesignStatusTool: Tool<ProgramDesignerSessionAgentContext> = {
  id: "get_design_status",
  description: `Get the current status of the program design collection. Returns which items have been
collected, which are still pending (required vs optional), and the current progress.

Call this after update_design_fields to decide what to ask next, or at the start of a turn
to orient yourself on what's been collected so far.

Returns:
- collected: list of items with their current values
- pendingRequired: required items not yet collected
- pendingOptional: optional items not yet collected
- progress: percentage and counts (INTERNAL — do not relay these numbers to the user)
- allRequiredFieldsCollected: true when all required information has been collected
  (does NOT mean the design is complete — you must still ask the final considerations
  question and call complete_design explicitly)`,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  async execute(_input, context) {
    console.info("📊 Executing get_design_status:", {
      userId: context.userId,
      sessionId: context.sessionId,
    });

    const todoList = context.session.todoList;
    const summary = getTodoSummary(todoList);
    const progress = getTodoProgress(todoList);
    const complete = isSessionComplete(todoList);

    const collectedFields: Record<string, any> = {};
    for (const [key, item] of Object.entries(todoList)) {
      if ((item as any).status === "complete") {
        collectedFields[
          getTodoItemLabel(key as keyof ProgramDesignerTodoList)
        ] = (item as any).value;
      }
    }

    const pendingRequiredLabels = summary.requiredPending;
    const pendingOptionalLabels = summary.optionalPending;

    console.info("✅ Design status computed:", {
      collectedCount: summary.completed.length,
      pendingRequired: pendingRequiredLabels.length,
      pendingOptional: pendingOptionalLabels.length,
      progress: progress.percentage,
      allRequiredFieldsCollected: complete,
    });

    return {
      collected: collectedFields,
      pendingRequired: pendingRequiredLabels,
      pendingOptional: pendingOptionalLabels,
      progress: {
        questionsCompleted: progress.completed,
        totalQuestions: progress.total,
        percentage: progress.percentage,
        requiredCompleted: progress.requiredCompleted,
        requiredTotal: progress.requiredTotal,
      },
      allRequiredFieldsCollected: complete,
    };
  },
};

// ============================================================================
// TOOL 12: complete_design  (designer-specific)
// ============================================================================

const completeDesignTool: Tool<ProgramDesignerSessionAgentContext> = {
  id: "complete_design",
  description: `Mark the program design session as complete and trigger async program generation.

ONLY call this when ALL of these conditions are met:
1. All required information has been collected (verify via get_design_status — allRequiredFieldsCollected: true)
2. You have asked the user "is there anything else you'd like to share?" and received their answer

The additionalConsiderations parameter captures the user's final thoughts before generation.
Pass the user's exact answer to the "anything else?" question — even if they said "nothing" or "no",
pass that so the program builder has the full picture.

After calling this tool:
- Tell the user their training program is being built
- Let them know it will take a moment
- Mention they will see their new program appear shortly

DO NOT call this tool if required information is still pending.`,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      additionalConsiderations: {
        type: "string",
        description:
          "The user's final thoughts, preferences, or requirements before generation. Pass the user's answer to the 'anything else?' question, even if they said 'nothing' or 'no'.",
      },
    },
  },
  async execute(input, context) {
    console.info("🎉 Executing complete_design:", {
      userId: context.userId,
      sessionId: context.sessionId,
      hasAdditionalConsiderations: !!input.additionalConsiderations,
    });

    const todoList = context.session.todoList;

    if (!isSessionComplete(todoList)) {
      const progress = getTodoProgress(todoList);
      const summary = getTodoSummary(todoList);
      console.warn(
        "⚠️ complete_design called but not all required fields collected:",
        {
          requiredCompleted: progress.requiredCompleted,
          requiredTotal: progress.requiredTotal,
          pendingRequired: summary.requiredPending,
        },
      );

      return {
        completed: false,
        reason: "Not all required information has been collected",
        pendingRequired: summary.requiredPending,
        progress: {
          requiredCompleted: progress.requiredCompleted,
          requiredTotal: progress.requiredTotal,
        },
      };
    }

    // Store additional considerations (default "none" if not provided)
    context.session.additionalConsiderations =
      input.additionalConsiderations || "none";

    // Mark session as complete — handler will save and trigger generation
    context.session.isComplete = true;
    context.session.completedAt = new Date();

    console.info(
      "✅ Design marked complete. Handler will save and trigger program generation.",
    );

    return {
      completed: true,
      message:
        "Program design complete. Your personalized training program is being built and will appear shortly.",
    };
  },
};

(completeDesignTool as any).contextualMessage = [
  "Building your training program...",
  "Creating your personalized program...",
  "Spinning up program generation...",
];

// ============================================================================
// Full 12-tool set for the program designer agent
// ============================================================================

export const programDesignerSessionAgentTools: Tool<ProgramDesignerSessionAgentContext>[] =
  [
    searchKnowledgeBaseTool,
    searchMethodologyTool,
    retrieveMemoriesTool,
    saveMemoryTool,
    getRecentWorkoutsTool,
    queryProgramsTool,
    queryExerciseHistoryTool,
    listExerciseNamesTool,
    queryCoachesTool,
    computeDateTool,
    updateDesignFieldsTool,
    getDesignStatusTool,
    completeDesignTool,
  ];
