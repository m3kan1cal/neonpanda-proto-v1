/**
 * Coach Creator Session Agent Tools
 *
 * Full 12-tool set for the StreamingConversationAgent when operating in the
 * coach creator role:
 *   Tools 1-9:  Shared factories from agents/shared/tools.ts
 *   Tools 10-12: Coach-creator-specific (update_intake_fields, get_collection_status,
 *               complete_intake)
 *
 * The 3 creator-specific tools are the primary mechanism through which the agent
 * tracks the intake to-do list.  The update_intake_fields tool mutates
 * context.session.todoList in-place — every subsequent tool call and the
 * post-agent session save see the updated values.
 */

import type { Tool } from "../core/types";
import type { CoachCreatorSessionAgentContext } from "./types";
import type { CoachCreatorTodoList } from "../../coach-creator/types";
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
} from "../shared/tools";
import {
  getTodoProgress,
  getTodoSummary,
  isSessionComplete,
  getTodoItemLabel,
} from "../../coach-creator/todo-list-utils";
import { UPDATE_INTAKE_FIELDS_SCHEMA } from "../../schemas/coach-creator-session-tool-schemas";

// ============================================================================
// Shared tools — instantiated for CoachCreatorSessionAgentContext
// ============================================================================

const searchKnowledgeBaseTool =
  createSearchKnowledgeBaseTool<CoachCreatorSessionAgentContext>();

const searchMethodologyTool =
  createSearchMethodologyTool<CoachCreatorSessionAgentContext>();

// Coach doesn't exist yet — search all memories across coaches
const retrieveMemoriesTool =
  createRetrieveMemoriesTool<CoachCreatorSessionAgentContext>(() => "all");

// Save memories under a placeholder coachId scoped to the creator session
const saveMemoryTool = createSaveMemoryTool<CoachCreatorSessionAgentContext>(
  (ctx) => `coach_creator_session_${ctx.sessionId}`,
);

const getRecentWorkoutsTool =
  createGetRecentWorkoutsTool<CoachCreatorSessionAgentContext>();

const queryProgramsTool =
  createQueryProgramsTool<CoachCreatorSessionAgentContext>();

const queryExerciseHistoryTool =
  createQueryExerciseHistoryTool<CoachCreatorSessionAgentContext>();

const listExerciseNamesTool =
  createListExerciseNamesTool<CoachCreatorSessionAgentContext>();

const queryCoachesTool =
  createQueryCoachesTool<CoachCreatorSessionAgentContext>();

// ============================================================================
// TOOL 9: update_intake_fields  (creator-specific)
// ============================================================================

const updateIntakeFieldsTool: Tool<CoachCreatorSessionAgentContext> = {
  id: "update_intake_fields",
  description: `Update the coach creator intake fields based on information the user has provided.

CRITICAL: Call this tool EVERY TIME the user provides information relevant to any intake field.
Call this tool BEFORE generating your response text so progress tracking stays accurate.

How to use:
1. Analyze the user's message for ANY intake information
2. Call this tool with all the fields you found (even partial or low-confidence info)
3. Only include fields where you found information — omit unchanged/missing fields
4. After calling this tool, call get_collection_status to see what's still needed
5. Then generate your conversational response

Field extraction rules:
- "none" and "no" ARE valid values for injuries, limitations, competition goals
- Extract the most specific value the user stated
- For equipmentAccess, list all equipment mentioned
- For experienceLevel, use their stated level or your assessment
- Set sophisticationLevel if you can gauge their fitness knowledge from how they speak

Example: If user says "I'm 32, train 4 days a week, mostly powerlifting", extract:
  fields: { age: "32", trainingFrequency: "4", trainingHistory: "mostly powerlifting" }`,
  inputSchema: UPDATE_INTAKE_FIELDS_SCHEMA,
  async execute(input, context) {
    console.info("📝 Executing update_intake_fields:", {
      fieldCount: Object.keys(input.fields || {}).length,
      fields: Object.keys(input.fields || {}),
      sophisticationLevel: input.sophisticationLevel,
      userId: context.userId,
    });

    const newFields: string[] = [];
    const overwrittenFields: string[] = [];
    const todoList = context.session.todoList;

    // Update each field that was provided
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

    // Update sophistication level if provided
    if (input.sophisticationLevel) {
      context.session.sophisticationLevel = input.sophisticationLevel;
    }

    // Compute updated progress
    const progress = getTodoProgress(todoList);

    console.info("✅ Intake fields updated:", {
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
      isComplete: isSessionComplete(todoList),
    };
  },
};

(updateIntakeFieldsTool as any).contextualMessage = [
  "Tracking your info...",
  "Updating your profile...",
  "Recording your details...",
];

// ============================================================================
// TOOL 10: get_collection_status  (creator-specific)
// ============================================================================

const getCollectionStatusTool: Tool<CoachCreatorSessionAgentContext> = {
  id: "get_collection_status",
  description: `Get the current status of the intake collection. Returns which fields have been
collected, which are still pending (required vs optional), and the current progress percentage.

Call this after update_intake_fields to decide what to ask next, or at the start of a turn
to orient yourself on what's been collected so far.

Returns:
- collected: list of fields with their values
- pendingRequired: required fields not yet collected
- pendingOptional: optional fields not yet collected
- progress: percentage and counts
- allRequiredFieldsCollected: true when all required fields have been collected (does NOT mean the session is complete — you must still call complete_intake explicitly)
- sophisticationLevel: current assessment of user's fitness knowledge`,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  async execute(_input, context) {
    console.info("📊 Executing get_collection_status:", {
      userId: context.userId,
      sessionId: context.sessionId,
    });

    const todoList = context.session.todoList;
    const summary = getTodoSummary(todoList);
    const progress = getTodoProgress(todoList);
    const complete = isSessionComplete(todoList);

    // Build collected fields with values for rich context
    const collectedFields: Record<string, any> = {};
    for (const [key, item] of Object.entries(todoList)) {
      if ((item as any).status === "complete") {
        collectedFields[getTodoItemLabel(key as keyof CoachCreatorTodoList)] = (
          item as any
        ).value;
      }
    }

    // Map pending required fields to human-readable labels
    const pendingRequiredLabels = summary.requiredPending;
    const pendingOptionalLabels = summary.optionalPending;

    console.info("✅ Collection status computed:", {
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
      sophisticationLevel: context.session.sophisticationLevel,
    };
  },
};

// ============================================================================
// TOOL 11: complete_intake  (creator-specific)
// ============================================================================

const completeIntakeTool: Tool<CoachCreatorSessionAgentContext> = {
  id: "complete_intake",
  description: `Mark the coach creator session as complete and trigger async coach config generation.

ONLY call this when ALL of these conditions are met:
1. All required fields have been collected (verify via get_collection_status — allRequiredFieldsCollected: true)
2. The user has confirmed they are ready to proceed
3. You have explicitly told the user their coach is being built

After calling this tool:
- Tell the user their personalized coach is being built
- Let them know it will take a moment
- Mention they will see their new coach appear shortly

DO NOT call this tool if required fields are still pending.`,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  async execute(_input, context) {
    console.info("🎉 Executing complete_intake:", {
      userId: context.userId,
      sessionId: context.sessionId,
    });

    const todoList = context.session.todoList;

    // Safety check — only complete if all required fields are filled
    if (!isSessionComplete(todoList)) {
      const progress = getTodoProgress(todoList);
      const summary = getTodoSummary(todoList);
      console.warn(
        "⚠️ complete_intake called but not all required fields collected:",
        {
          requiredCompleted: progress.requiredCompleted,
          requiredTotal: progress.requiredTotal,
          pendingRequired: summary.requiredPending,
        },
      );

      return {
        completed: false,
        reason: "Not all required fields have been collected",
        pendingRequired: summary.requiredPending,
        progress: {
          requiredCompleted: progress.requiredCompleted,
          requiredTotal: progress.requiredTotal,
        },
      };
    }

    try {
      // Mark session as complete
      context.session.isComplete = true;
      context.session.completedAt = new Date();

      console.info("✅ Intake marked complete. Handler will save and trigger coach config generation.");

      return {
        completed: true,
        message:
          "Intake complete. Your personalized coach is being built and will appear shortly.",
      };
    } catch (error) {
      console.error("❌ complete_intake failed:", error);
      // Reset isComplete on failure so the user can retry
      context.session.isComplete = false;
      context.session.completedAt = undefined;

      return {
        completed: false,
        reason: "Failed to mark intake as complete",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(completeIntakeTool as any).contextualMessage = [
  "Building your personalized coach...",
  "Creating your AI coach...",
  "Spinning up your coach configuration...",
];

// ============================================================================
// Full 11-tool set for the coach creator agent
// ============================================================================

export const coachCreatorSessionAgentTools: Tool<CoachCreatorSessionAgentContext>[] =
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
    updateIntakeFieldsTool,
    getCollectionStatusTool,
    completeIntakeTool,
  ];
