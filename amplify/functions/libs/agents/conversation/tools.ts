/**
 * Conversation Agent Tools
 *
 * Assembles the full 11-tool set for the coach conversation agent.
 *
 * Tools 1-8 are shared factories from agents/shared/tools.ts.
 * Tools 9-11 (log_workout, complete_program_workout, get_todays_workout) are
 * conversation-specific and defined here — they depend on coachId, conversationId,
 * coachConfig, and activeProgram which are conversation-only context fields.
 *
 * Pattern reference: agents/workout-logger/tools.ts, agents/program-designer/tools.ts
 */

import type { Tool } from "../core/types";
import type { ConversationAgentContext } from "./types";
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
import { invokeAsyncLambda } from "../../api-helpers";
import {
  LOG_WORKOUT_SCHEMA,
  COMPLETE_PROGRAM_WORKOUT_SCHEMA,
  GET_TODAYS_WORKOUT_SCHEMA,
} from "../../schemas/conversation-agent-tool-schemas";
import { getProgram, updateProgram } from "../../../../dynamodb/program";
import { getObjectAsJson } from "../../s3-utils";
import { saveProgramDetailsToS3 } from "../../program/s3-utils";
import { convertUtcToUserDate } from "../../analytics/date-utils";
import { parseSlashCommand, isWorkoutSlashCommand } from "../../workout";

// ============================================================================
// Shared tools — instantiated for ConversationAgentContext
// ============================================================================

export const searchKnowledgeBaseTool =
  createSearchKnowledgeBaseTool<ConversationAgentContext>();

export const searchMethodologyTool =
  createSearchMethodologyTool<ConversationAgentContext>();

export const retrieveMemoriesTool =
  createRetrieveMemoriesTool<ConversationAgentContext>((ctx) => ctx.coachId);

export const saveMemoryTool = createSaveMemoryTool<ConversationAgentContext>(
  (ctx) => ctx.coachId,
);

export const getRecentWorkoutsTool =
  createGetRecentWorkoutsTool<ConversationAgentContext>();

export const queryProgramsTool =
  createQueryProgramsTool<ConversationAgentContext>();

export const queryExerciseHistoryTool =
  createQueryExerciseHistoryTool<ConversationAgentContext>();

export const listExerciseNamesTool =
  createListExerciseNamesTool<ConversationAgentContext>();

export const queryCoachesTool =
  createQueryCoachesTool<ConversationAgentContext>();

// ============================================================================
// TOOL 5: Log Workout  (conversation-specific)
// ============================================================================

export const logWorkoutTool: Tool<ConversationAgentContext> = {
  id: "log_workout",
  description: `Log a completed workout by triggering the async workout creation pipeline.
Use this ONLY when ALL of these conditions are met:
1. The user has FINISHED a workout (not during live coaching or mid-workout updates)
2. The user explicitly wants the workout recorded
3. You have sufficient detail about what was done (exercises with sets/reps/weight OR duration/distance)

CRITICAL DISTINCTION — Progress Updates vs. Logging Requests:

During live workout coaching (walking the user through exercises in real time), messages like:
- "I did 3 sets of squats"
- "Done with the bench press, what's next?"
- "Finished that set, moving on"
- "I did it to 70%"
These are PROGRESS UPDATES, not logging requests. Do NOT use this tool for them.

Only use this tool when the ENTIRE workout session is complete and the user wants it logged.
Clear logging indicators:
- "Log that workout"
- "Record this session"
- "Can you log tonight's workout?"
- "Save that" (after describing a completed workout)

The workoutDescription should be a comprehensive summary of the FULL workout, including
all exercises performed with sets, reps, weights, and any relevant notes. Aggregate
information from the conversation — don't just pass the last message.

If the workout matches a program template, include the templateContext for proper linking.`,
  inputSchema: LOG_WORKOUT_SCHEMA,
  async execute(input, context) {
    console.info("🏋️ Executing log_workout:", {
      descriptionLength: input.workoutDescription.length,
      hasDate: !!input.workoutDate,
      hasTemplateContext: !!input.templateContext,
      userId: context.userId,
    });

    try {
      const buildWorkoutFunction = process.env.BUILD_WORKOUT_FUNCTION_NAME;

      if (!buildWorkoutFunction) {
        throw new Error("BUILD_WORKOUT_FUNCTION_NAME not configured");
      }

      const slashResult = parseSlashCommand(input.workoutDescription);
      const isSlashCmd = isWorkoutSlashCommand(slashResult);
      const workoutMessage =
        isSlashCmd && slashResult.content
          ? slashResult.content
          : input.workoutDescription;

      // Resolve the workout date to a full ISO timestamp in the user's timezone.
      // Three cases:
      //   1. No date provided → default to today at noon local time
      //   2. Date-only (YYYY-MM-DD) → treat as noon in user's timezone to prevent midnight-UTC day rollover
      //   3. Full ISO timestamp provided → use as-is after validation
      const nowIso = new Date().toISOString();
      let resolvedDate: string;

      if (!input.workoutDate) {
        // Case 1: no date — use today at noon in user's timezone
        const todayLocal = convertUtcToUserDate(
          new Date(),
          context.userTimezone,
        );
        resolvedDate = `${todayLocal}T12:00:00`;
        console.info(
          `ℹ️ log_workout: no workoutDate provided, defaulting to ${resolvedDate}`,
        );
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(input.workoutDate)) {
        // Case 2: date-only — append noon so midnight-UTC rollover can't shift the day
        resolvedDate = `${input.workoutDate}T12:00:00`;
        console.info(
          `ℹ️ log_workout: date-only workoutDate "${input.workoutDate}" normalized to ${resolvedDate}`,
        );
      } else {
        const parsed = new Date(input.workoutDate);
        if (isNaN(parsed.getTime())) {
          // Case 3a: unparseable — fall back to today at noon
          resolvedDate = `${convertUtcToUserDate(new Date(), context.userTimezone)}T12:00:00`;
          console.warn(
            `⚠️ log_workout: unparseable workoutDate "${input.workoutDate}" resolved to ${resolvedDate}`,
          );
        } else {
          // Case 3b: valid full timestamp — use as-is
          resolvedDate = input.workoutDate;
        }
      }

      const payload = {
        userId: context.userId,
        coachId: context.coachId,
        conversationId: context.conversationId,
        userMessage: workoutMessage,
        coachConfig: context.coachConfig,
        imageS3Keys: [],
        userTimezone: context.userTimezone,
        criticalTrainingDirective: context.criticalTrainingDirective,
        isSlashCommand: isSlashCmd,
        completedAt: resolvedDate,
        messageTimestamp: nowIso,
        ...(isSlashCmd &&
          slashResult.command && {
            slashCommand: slashResult.command,
          }),
        ...(input.templateContext && {
          templateContext: input.templateContext,
        }),
      };

      await invokeAsyncLambda(
        buildWorkoutFunction,
        payload,
        "conversation agent workout logging",
      );

      console.info("✅ Workout creation triggered successfully");

      return {
        triggered: true,
        message:
          "Workout logging started. The workout will appear in your history shortly.",
      };
    } catch (error) {
      console.error("❌ Workout logging failed:", error);
      return {
        triggered: false,
        message: "Failed to trigger workout logging.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(logWorkoutTool as any).contextualMessage = [
  "Logging your workout...",
  "Recording your session...",
  "Saving this to your history...",
  "Locking in the details...",
];

// ============================================================================
// TOOL 6: Complete Program Workout  (conversation-specific)
// ============================================================================

export const completeProgramWorkoutTool: Tool<ConversationAgentContext> = {
  id: "complete_program_workout",
  description: `Mark a program-prescribed workout template as completed. Use this when:
1. The user has an active training program (check context.activeProgram)
2. They just completed a workout that matches a program template
3. They explicitly ask to "mark today's workout as done" or "complete today's workout"

Typical flow:
- User finishes a prescribed workout
- You log it with log_workout
- Then use this tool to mark the template as completed in the program
OR
- User directly asks "mark today's workout as complete" without logging

Use get_todays_workout first if you need to find the correct templateId.

This tool updates the program's completion stats (completedWorkouts count, currentDay
advancement, adherenceRate) and marks the specific workout template as "completed".`,
  inputSchema: COMPLETE_PROGRAM_WORKOUT_SCHEMA,
  async execute(input, context) {
    console.info("📋 Executing complete_program_workout:", {
      programId: input.programId,
      templateId: input.templateId,
      dayNumber: input.dayNumber,
      userId: context.userId,
    });

    try {
      const dayNumber = Number(input.dayNumber);

      const program = await getProgram(
        context.userId,
        context.coachId,
        input.programId,
      );

      if (!program) {
        return { completed: false, error: "Program not found" };
      }

      const s3Key = program.s3DetailKey;
      if (!s3Key) {
        return { completed: false, error: "Program S3 key not found" };
      }
      const programDetails = await getObjectAsJson<any>(s3Key);

      if (!programDetails || !programDetails.workoutTemplates) {
        return { completed: false, error: "Program details not found in S3" };
      }

      const template = programDetails.workoutTemplates.find(
        (t: any) =>
          t.templateId === input.templateId && t.dayNumber === dayNumber,
      );

      if (!template) {
        return {
          completed: false,
          error: `Template ${input.templateId} not found for day ${dayNumber}`,
        };
      }

      if (template.status === "completed") {
        return {
          completed: true,
          alreadyCompleted: true,
          workoutName: template.name || "Workout",
          message: "This workout was already marked as completed.",
        };
      }

      template.status = "completed";
      template.completedAt = new Date().toISOString();
      if (input.performanceNotes) {
        template.performanceNotes = input.performanceNotes;
      }

      const workoutName = template.name || "Workout";

      await saveProgramDetailsToS3(s3Key, programDetails);

      console.info("✅ Program details saved to S3:", {
        templateId: input.templateId,
        dayNumber,
      });

      const updates: any = {
        lastActivityAt: new Date(),
        completedWorkouts: program.completedWorkouts + 1,
      };

      const dayTemplates = programDetails.workoutTemplates.filter(
        (t: any) => t.dayNumber === dayNumber,
      );
      const allDayTemplatesComplete = dayTemplates.every(
        (t: any) => t.status === "completed" || t.status === "skipped",
      );

      if (allDayTemplatesComplete && program.currentDay === dayNumber) {
        updates.currentDay = program.currentDay + 1;
        console.info("🎯 All workouts for day complete, advancing:", {
          completedDay: input.dayNumber,
          newCurrentDay: updates.currentDay,
        });
      }

      updates.adherenceRate =
        program.totalWorkouts > 0
          ? (updates.completedWorkouts / program.totalWorkouts) * 100
          : 0;

      const programComplete =
        updates.currentDay && updates.currentDay > program.totalDays;
      if (programComplete) {
        updates.status = "completed";
      }

      await updateProgram(
        context.userId,
        context.coachId,
        input.programId,
        updates,
      );

      console.info("✅ Program workout marked as complete:", {
        workoutName,
        dayNumber: input.dayNumber,
        newCurrentDay: updates.currentDay,
        adherenceRate: updates.adherenceRate.toFixed(1) + "%",
        programComplete,
      });

      return {
        completed: true,
        programName: program.name,
        workoutName,
        dayNumber: input.dayNumber,
        newCurrentDay: updates.currentDay,
        adherenceRate: Math.round(updates.adherenceRate),
        programComplete: programComplete || false,
      };
    } catch (error) {
      console.error("❌ Program workout completion failed:", error);
      return {
        completed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(completeProgramWorkoutTool as any).contextualMessage = [
  "Updating your program progress...",
  "Marking this workout complete...",
  "Tracking your program adherence...",
  "Logging this session to your program...",
];

// ============================================================================
// TOOL 7: Get Today's Workout  (conversation-specific)
// ============================================================================

export const getTodaysWorkoutTool: Tool<ConversationAgentContext> = {
  id: "get_todays_workout",
  description: `Get today's prescribed workout from the user's active training program.
Use this when the user asks about today's workout, wants to be coached through it,
or references their prescribed plan. Also useful before complete_program_workout to
get the correct templateId.

Returns detailed workout information if found, or indicates no active program / rest day.

Example use cases:
- User asks "What's my workout today?"
- User says "Coach me through today's workout"
- You need the templateId to call complete_program_workout
- User references "the prescribed workout" and you need the details

Returns null/empty if:
- No active program (context.activeProgram is null)
- Today is a rest day
- Program data not found`,
  inputSchema: GET_TODAYS_WORKOUT_SCHEMA,
  async execute(input, context) {
    console.info("📅 Executing get_todays_workout:", {
      dayNumber: input.dayNumber || "current",
      userId: context.userId,
      activeProgram: context.activeProgram?.programName || "none",
    });

    try {
      if (!context.activeProgram) {
        return { hasWorkout: false, reason: "No active training program" };
      }

      const s3Key = context.activeProgram.s3DetailKey;
      const programDetails = await getObjectAsJson<any>(s3Key);

      if (!programDetails || !programDetails.workoutTemplates) {
        return { hasWorkout: false, reason: "Program details not found" };
      }

      const targetDay = input.dayNumber || context.activeProgram.currentDay;
      const dayWorkouts = programDetails.workoutTemplates.filter(
        (t: any) => t.dayNumber === targetDay,
      );

      if (dayWorkouts.length === 0) {
        if (targetDay > context.activeProgram.totalDays) {
          return {
            hasWorkout: false,
            reason: "Program completed",
            programComplete: true,
          };
        }
        return { hasWorkout: false, reason: "Rest day", restDay: true };
      }

      const phase = context.activeProgram.phases.find(
        (p) => targetDay >= p.startDay && targetDay <= p.endDay,
      );

      const formattedWorkouts = dayWorkouts.map((w: any) => ({
        templateId: w.templateId,
        workoutName: w.name,
        workoutType: w.type,
        status: w.status || "pending",
        description: w.description,
        prescribedExercises: w.prescribedExercises || [],
        estimatedDuration: w.estimatedDuration,
        notes: w.notes,
      }));

      console.info("✅ Today's workout retrieved:", {
        dayNumber: targetDay,
        workoutCount: formattedWorkouts.length,
        phaseName: phase?.name || "Unknown",
      });

      return {
        hasWorkout: true,
        programId: context.activeProgram.programId,
        programName: context.activeProgram.programName,
        phaseName: phase?.name || "Unknown Phase",
        phaseDescription: phase?.description,
        dayNumber: targetDay,
        workouts: formattedWorkouts,
        restDay: false,
      };
    } catch (error) {
      console.error("❌ Get today's workout failed:", error);
      return {
        hasWorkout: false,
        reason: "Error loading workout",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(getTodaysWorkoutTool as any).contextualMessage = [
  "Looking up your program...",
  "Checking today's plan...",
  "Pulling up the workout details...",
  "Grabbing your prescribed session...",
];

// ============================================================================
// Export all tools as the full 11-tool conversation set
// ============================================================================

export const conversationAgentTools: Tool<ConversationAgentContext>[] = [
  searchKnowledgeBaseTool,
  searchMethodologyTool,
  retrieveMemoriesTool,
  saveMemoryTool,
  logWorkoutTool,
  completeProgramWorkoutTool,
  getTodaysWorkoutTool,
  getRecentWorkoutsTool,
  queryProgramsTool,
  queryExerciseHistoryTool,
  listExerciseNamesTool,
  queryCoachesTool,
];
