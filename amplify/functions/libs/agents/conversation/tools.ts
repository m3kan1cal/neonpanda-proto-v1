/**
 * Conversation Agent Tools
 *
 * Eleven tools that wrap existing functionality for the streaming conversation agent.
 * Each tool follows the Tool<ConversationAgentContext> interface pattern.
 *
 * Pattern reference: agents/workout-logger/tools.ts, agents/program-designer/tools.ts
 * - Rich, multi-paragraph descriptions guide the model's tool usage decisions
 * - Input schemas use JSON Schema format
 * - Execute functions wrap existing backend APIs
 * - Optional contextualMessage field for UX feedback during tool execution
 */

import type { Tool } from "../core/types";
import type { ConversationAgentContext } from "./types";
import {
  queryPineconeContext,
  invokeAsyncLambda,
  MODEL_IDS,
  storePineconeContext,
} from "../../api-helpers";
import {
  SEARCH_KNOWLEDGE_BASE_SCHEMA,
  SEARCH_METHODOLOGY_SCHEMA,
  RETRIEVE_MEMORIES_SCHEMA,
  SAVE_MEMORY_SCHEMA,
  LOG_WORKOUT_SCHEMA,
  COMPLETE_PROGRAM_WORKOUT_SCHEMA,
  GET_TODAYS_WORKOUT_SCHEMA,
  GET_RECENT_WORKOUTS_SCHEMA,
  QUERY_PROGRAMS_SCHEMA,
  QUERY_EXERCISE_HISTORY_SCHEMA,
  LIST_EXERCISE_NAMES_SCHEMA,
} from "../../schemas/conversation-agent-tool-schemas";
import {
  formatPineconeContext,
  getEnhancedMethodologyContext,
  formatEnhancedMethodologyContext,
} from "../../pinecone-utils";
import { queryMemories } from "../../coach-conversation/memory-processing";
import { saveMemory } from "../../../../dynamodb/memory";
import { queryWorkouts } from "../../../../dynamodb/workout";
import {
  getProgram,
  updateProgram,
  queryPrograms,
} from "../../../../dynamodb/program";
import {
  queryExercises,
  queryExerciseNames,
} from "../../../../dynamodb/exercise";
import {
  normalizeExerciseName,
  normalizeExerciseNameWithContext,
} from "../../exercise/normalization";
import { extractExerciseNames } from "../../workout/data-utils";
import { getObjectAsJson } from "../../s3-utils";
import { saveProgramDetailsToS3 } from "../../program/s3-utils";
import { getPhaseForDay } from "../../program/calendar-utils";
import { convertUtcToUserDate } from "../../analytics/date-utils";
import { parseSlashCommand, isWorkoutSlashCommand } from "../../workout";

// ============================================================================
// TOOL 1: Search Knowledge Base
// ============================================================================

export const searchKnowledgeBaseTool: Tool<ConversationAgentContext> = {
  id: "search_knowledge_base",
  description: `Search the user's knowledge base for relevant information. This searches across the user's workout history, past conversations, programs, and stored memories.

Use this for broad searches when you want to cast a wide net across the user's data — for example, searching for past training context, previous conversations about a topic, or general background.

IMPORTANT — searchTypes and user_memory:
Omitting searchTypes searches all content types, including user_memory. If you specify searchTypes, you must explicitly include "user_memory" to search memories. When the user asks about past injuries, pain, grip issues, or any personal logged issue or preference, always include "user_memory" in searchTypes — these are stored separately and will be missed without it.

For training methodology, technique, and programming philosophy questions (why X works, how to program Y, exercise form, periodization approaches), use search_methodology instead — it provides structured, categorized results from the methodology knowledge base.

Not needed for simple greetings, acknowledgments, or questions you can answer from the current conversation.`,
  inputSchema: SEARCH_KNOWLEDGE_BASE_SCHEMA,
  async execute(input, context) {
    console.info("🔍 Executing search_knowledge_base:", {
      query: input.query,
      searchTypes: input.searchTypes || "all",
      userId: context.userId,
    });

    try {
      const searchTypes = input.searchTypes as string[] | undefined;
      const includeAll = !searchTypes || searchTypes.length === 0;

      const result = await queryPineconeContext(context.userId, input.query, {
        workoutTopK: includeAll || searchTypes?.includes("workouts") ? 8 : 0,
        conversationTopK:
          includeAll || searchTypes?.includes("conversations") ? 5 : 0,
        programTopK: includeAll || searchTypes?.includes("programs") ? 3 : 0,
        coachCreatorTopK:
          includeAll || searchTypes?.includes("coach_creator") ? 2 : 0,
        programDesignerTopK:
          includeAll || searchTypes?.includes("program_designer") ? 2 : 0,
        userMemoryTopK:
          includeAll || searchTypes?.includes("user_memory") ? 3 : 0,
        includeMethodology: includeAll || searchTypes?.includes("methodology"),
        minScore: 0.7,
      });

      if (result.success && result.matches.length > 0) {
        const formattedContext = formatPineconeContext(result.matches);

        console.info("✅ Knowledge base search successful:", {
          totalMatches: result.totalMatches,
          relevantMatches: result.relevantMatches,
          contextLength: formattedContext.length,
        });

        return {
          success: true,
          context: formattedContext,
          matchCount: result.relevantMatches,
        };
      } else {
        console.info("📭 No relevant knowledge base matches found");
        return {
          success: false,
          context: "No relevant information found in the knowledge base.",
          matchCount: 0,
        };
      }
    } catch (error) {
      console.error("❌ Knowledge base search failed:", error);
      return {
        success: false,
        context: "Knowledge base search encountered an error.",
        matchCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

// Add contextualMessage for UX feedback
(searchKnowledgeBaseTool as any).contextualMessage = [
  "Searching knowledge base...",
  "Hunting through training resources...",
  "Scouting the methodology database...",
  "Digging into training science...",
];

// ============================================================================
// TOOL 2: Search Methodology
// ============================================================================

export const searchMethodologyTool: Tool<ConversationAgentContext> = {
  id: "search_methodology",
  description: `Search the methodology knowledge base for training philosophy, programming principles,
exercise technique, and training system information. This tool uses advanced AI-driven intent
analysis to provide categorized results for principles, implementation details, and comparisons.

Use this when the user asks questions about:
- Training methodology philosophy: "Why does X methodology work?", "What's the science behind Y?"
- Programming implementation: "How do I program conjugate method?", "What's a typical 5/3/1 week?"
- Methodology comparisons: "What's better, Starting Strength or 5/3/1?", "CrossFit vs powerlifting?"
- Exercise technique and form: "How do I improve squat depth?", "Proper deadlift setup?"
- Periodization and training systems: "What is block periodization?", "How does linear progression work?"
- Training principles: "What is progressive overload?", "How does specificity apply to strength?"
- General knowledge questions about a methodology or system: "Do you know about functional bodybuilding?", "Tell me about conjugate", "What is the Westside method?" — always search rather than answering from model knowledge alone

This tool returns structured context organized by:
- METHODOLOGY PRINCIPLES & PHILOSOPHY
- PROGRAMMING & IMPLEMENTATION
- METHODOLOGY COMPARISONS
- RELEVANT METHODOLOGY KNOWLEDGE

Do NOT use this for:
- User-specific workout or program data (use search_knowledge_base, get_recent_workouts, etc.)
- Simple greetings or acknowledgments`,
  inputSchema: SEARCH_METHODOLOGY_SCHEMA,
  async execute(input, context) {
    console.info("🔬 Executing search_methodology:", {
      query: input.query,
      userId: context.userId,
    });

    try {
      const methodologyMatches = await getEnhancedMethodologyContext(
        input.query,
        context.userId,
        { topK: 8 },
      );

      if (methodologyMatches.length > 0) {
        const formattedContext =
          formatEnhancedMethodologyContext(methodologyMatches);

        console.info("✅ Methodology search successful:", {
          matchCount: methodologyMatches.length,
          contextLength: formattedContext.length,
        });

        return {
          success: true,
          context: formattedContext,
          matchCount: methodologyMatches.length,
        };
      } else {
        console.info("📭 No relevant methodology matches found");
        return {
          success: false,
          context: "No relevant methodology information found.",
          matchCount: 0,
        };
      }
    } catch (error) {
      console.error("❌ Methodology search failed:", error);
      return {
        success: false,
        context: "Methodology search encountered an error.",
        matchCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

// Add contextualMessage for UX feedback
(searchMethodologyTool as any).contextualMessage = [
  "Consulting training methodology...",
  "Checking programming principles...",
  "Reviewing technique guidance...",
  "Exploring training science...",
];

// ============================================================================
// TOOL 3: Retrieve Memories
// ============================================================================

export const retrieveMemoriesTool: Tool<ConversationAgentContext> = {
  id: "retrieve_memories",
  description: `Retrieve the user's stored memories — their preferences, goals, constraints,
and instructions they've shared in past conversations. Use this when you need to
personalize advice, reference something the user told you before, or check for
user-specific context (e.g., injuries, equipment limitations, scheduling preferences).

Do NOT use this for every message. Only retrieve memories when the conversation
topic would benefit from personalized context.

Example use cases:
- User asks about programming and you need to check their available equipment
- User asks for advice and you want to check for injury history
- You're recommending next steps and need to know their training goals

NOT for:
- Every message (expensive and adds latency)
- When the user just stated the relevant context in the current conversation
- Simple acknowledgments or greetings`,
  inputSchema: RETRIEVE_MEMORIES_SCHEMA,
  async execute(input, context) {
    console.info("🧠 Executing retrieve_memories:", {
      query: input.query,
      userId: context.userId,
      coachId: context.coachId,
    });

    try {
      const result = await queryMemories(
        context.userId,
        context.coachId,
        input.query,
      );

      const formattedMemories = result.memories.map((m) => ({
        content: m.content,
        type: m.memoryType,
        importance: m.metadata?.importance || "medium",
        createdAt: m.metadata?.createdAt || new Date(),
        tags: m.metadata?.tags || [],
      }));

      console.info("✅ Memory retrieval successful:", {
        count: formattedMemories.length,
      });

      return {
        memories: formattedMemories,
        count: formattedMemories.length,
      };
    } catch (error) {
      console.error("❌ Memory retrieval failed:", error);
      return {
        memories: [],
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(retrieveMemoriesTool as any).contextualMessage = [
  "Checking your preferences...",
  "Looking up what matters to you...",
  "Reviewing your saved goals...",
  "Pulling up your training notes...",
];

// ============================================================================
// TOOL 4: Save Memory
// ============================================================================

export const saveMemoryTool: Tool<ConversationAgentContext> = {
  id: "save_memory",
  description: `Save something the user shared for future reference. Use this when the user
explicitly shares a preference, goal, constraint, or instruction that should persist
across conversations.

Explicit trigger phrases are strong signals that the user wants something remembered —
when they say "remember that", "don't forget", "keep in mind", "for future reference",
or similar, that's a clear indication this information matters to them beyond the current
conversation. Save it.

Also applies to implicit cases where the user shares lasting information worth persisting,
even without a trigger phrase:
- User shares a training constraint: "I can only train 3 days a week"
- User mentions an injury: "I hurt my shoulder last month"
- User states a goal: "I want to deadlift 400 pounds by summer"
- User expresses a preference: "I hate running, love lifting"

When in doubt, save — it's low cost and improves future personalization.

NOT for:
- Transient information: "I'm tired today"
- Single-session context: "I'm at the gym right now"
- Mid-workout progress: "I just finished set 3"
- Information you'll use immediately but won't need later`,
  inputSchema: SAVE_MEMORY_SCHEMA,
  async execute(input, context) {
    console.info("💾 Executing save_memory:", {
      memoryType: input.memoryType,
      importance: input.importance,
      contentLength: input.content.length,
      userId: context.userId,
      coachId: context.coachId,
    });

    try {
      // Generate memory ID
      const timestamp = Date.now();
      const shortId = Math.random().toString(36).substring(2, 8);
      const memoryId = `memory_${context.userId}_${timestamp}_${shortId}`;

      // Save to DynamoDB
      const memoryData = {
        memoryId,
        userId: context.userId,
        coachId: context.coachId,
        content: input.content,
        memoryType: input.memoryType,
        metadata: {
          createdAt: new Date(),
          usageCount: 0,
          source: "conversation" as const,
          importance: input.importance,
          tags: [], // Could be enhanced with AI-generated tags
        },
      };

      await saveMemory(memoryData);

      // Fire-and-forget: Store in Pinecone for semantic retrieval
      storePineconeContext(context.userId, memoryData.content, {
        memoryId,
        entityType: "user_memory",
        memoryType: input.memoryType,
        importance: input.importance,
      }).catch((err: any) => {
        console.error("⚠️ Pinecone memory storage failed (non-blocking):", err);
      });

      console.info("✅ Memory saved successfully:", { memoryId });

      return {
        saved: true,
        memoryId,
      };
    } catch (error) {
      console.error("❌ Memory save failed:", error);
      return {
        saved: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(saveMemoryTool as any).contextualMessage = [
  "Saving to memory...",
  "Storing that detail...",
  "Recording this for later...",
  "Adding to your profile...",
];

// ============================================================================
// TOOL 5: Log Workout
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

      // Detect slash command — if the user typed /log-workout <content>, extract the
      // content and pass isSlashCommand: true to the build-workout Lambda, which relaxes
      // validation strictness (only blocks if no workout info at all).
      const slashResult = parseSlashCommand(input.workoutDescription);
      const isSlashCmd = isWorkoutSlashCommand(slashResult);
      const workoutMessage =
        isSlashCmd && slashResult.content
          ? slashResult.content
          : input.workoutDescription;

      // Resolve and validate workoutDate — model should send ISO (YYYY-MM-DD) per schema,
      // but if it sends natural language or an unparseable value, fall back to today.
      let resolvedDate: string | undefined;
      if (input.workoutDate) {
        const parsed = new Date(input.workoutDate);
        resolvedDate = isNaN(parsed.getTime())
          ? convertUtcToUserDate(new Date(), context.userTimezone)
          : input.workoutDate;

        if (isNaN(new Date(input.workoutDate).getTime())) {
          console.warn(
            `⚠️ log_workout: non-ISO workoutDate "${input.workoutDate}" resolved to "${resolvedDate}" via timezone fallback`,
          );
        }
      }

      // Build the payload following BuildWorkoutEvent interface
      const payload = {
        userId: context.userId,
        coachId: context.coachId,
        conversationId: context.conversationId,
        userMessage: workoutMessage,
        coachConfig: context.coachConfig,
        imageS3Keys: [], // Images already processed by the model
        userTimezone: context.userTimezone,
        criticalTrainingDirective: context.criticalTrainingDirective,
        isSlashCommand: isSlashCmd,
        ...(isSlashCmd &&
          slashResult.command && {
            slashCommand: slashResult.command,
          }),
        ...(input.templateContext && {
          templateContext: input.templateContext,
        }),
        ...(resolvedDate && {
          completedAt: resolvedDate,
        }),
      };

      // Trigger async workout creation
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
// TOOL 6: Complete Program Workout (NEW — solves Problem 7)
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
      // Load program from DynamoDB
      const program = await getProgram(
        context.userId,
        context.coachId,
        input.programId,
      );

      if (!program) {
        return {
          completed: false,
          error: "Program not found",
        };
      }

      // Load program details from S3 using the stored key
      const s3Key = program.s3DetailKey;
      if (!s3Key) {
        return {
          completed: false,
          error: "Program S3 key not found",
        };
      }
      const programDetails = await getObjectAsJson<any>(s3Key);

      if (!programDetails || !programDetails.workoutTemplates) {
        return {
          completed: false,
          error: "Program details not found in S3",
        };
      }

      // Find and update the matching template
      const template = programDetails.workoutTemplates.find(
        (t: any) =>
          t.templateId === input.templateId && t.dayNumber === input.dayNumber,
      );

      if (!template) {
        return {
          completed: false,
          error: `Template ${input.templateId} not found for day ${input.dayNumber}`,
        };
      }

      // Update the template status
      template.status = "completed";
      template.completedAt = new Date().toISOString();
      if (input.performanceNotes) {
        template.performanceNotes = input.performanceNotes;
      }

      const workoutName = template.name || "Workout";

      // Save updated program details back to S3
      await saveProgramDetailsToS3(s3Key, programDetails);

      console.info("✅ Program details saved to S3:", {
        templateId: input.templateId,
        dayNumber: input.dayNumber,
      });

      // Update program stats
      const updates: any = {
        lastActivityAt: new Date(),
        completedWorkouts: program.completedWorkouts + 1,
      };

      // Check if all workouts for this day are now complete
      const dayTemplates = programDetails.workoutTemplates.filter(
        (t: any) => t.dayNumber === input.dayNumber,
      );
      const allDayTemplatesComplete = dayTemplates.every(
        (t: any) => t.status === "completed" || t.status === "skipped",
      );

      // Advance currentDay if all day templates are complete
      if (allDayTemplatesComplete && program.currentDay === input.dayNumber) {
        updates.currentDay = program.currentDay + 1;
        console.info("🎯 All workouts for day complete, advancing:", {
          completedDay: input.dayNumber,
          newCurrentDay: updates.currentDay,
        });
      }

      // Recalculate adherence rate
      updates.adherenceRate =
        program.totalWorkouts > 0
          ? (updates.completedWorkouts / program.totalWorkouts) * 100
          : 0;

      // Check if program is now complete
      const programComplete =
        updates.currentDay && updates.currentDay > program.totalDays;
      if (programComplete) {
        updates.status = "completed";
      }

      // Save updated program to DynamoDB
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
// TOOL 7: Get Today's Workout (NEW)
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
      // Check if user has an active program
      if (!context.activeProgram) {
        return {
          hasWorkout: false,
          reason: "No active training program",
        };
      }

      // Load program details from S3 using the stored key
      const s3Key = context.activeProgram.s3DetailKey;
      const programDetails = await getObjectAsJson<any>(s3Key);

      if (!programDetails || !programDetails.workoutTemplates) {
        return {
          hasWorkout: false,
          reason: "Program details not found",
        };
      }

      // Determine target day
      const targetDay = input.dayNumber || context.activeProgram.currentDay;

      // Find workouts for the target day using workoutTemplates
      const dayWorkouts = programDetails.workoutTemplates.filter(
        (t: any) => t.dayNumber === targetDay,
      );

      if (dayWorkouts.length === 0) {
        // Check if it's past the program end
        if (targetDay > context.activeProgram.totalDays) {
          return {
            hasWorkout: false,
            reason: "Program completed",
            programComplete: true,
          };
        }

        return {
          hasWorkout: false,
          reason: "Rest day",
          restDay: true,
        };
      }

      // Get phase information for this day
      const phase = context.activeProgram.phases.find(
        (p) => targetDay >= p.startDay && targetDay <= p.endDay,
      );

      // Format the workout(s) for the day
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
        workoutNames: formattedWorkouts.map((w: any) => w.workoutName),
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
// TOOL 8: Get Recent Workouts
// ============================================================================

export const getRecentWorkoutsTool: Tool<ConversationAgentContext> = {
  id: "get_recent_workouts",
  description: `Get the user's recent workout history from the database. Use this for:
- Progress discussions and performance tracking
- Comparing performance over time
- Recommending next steps based on recent training
- When the user asks "what have I been doing lately?" or similar

Do NOT use this for every message. Only when the conversation specifically benefits
from workout history context.

The tool returns workout summaries with completion dates, disciplines, and names.
Limit defaults to 10, max 20 to avoid overwhelming the context.

Example use cases:
- User asks "How has my training been going?"
- User asks "What was my last leg workout?"
- You're recommending next steps and need to see recent volume
- User asks for a progress update

NOT for:
- Every message (expensive query)
- When discussing future workout plans (not relevant)
- When the user just finished a workout (they know what they did)`,
  inputSchema: GET_RECENT_WORKOUTS_SCHEMA,
  async execute(input, context) {
    console.info("📊 Executing get_recent_workouts:", {
      limit: input.limit || 10,
      discipline: input.discipline || "all",
      userId: context.userId,
    });

    try {
      const limit = Math.min(input.limit || 10, 20); // Cap at 20

      const workouts = await queryWorkouts(context.userId, {
        limit,
        ...(input.discipline && { discipline: input.discipline }),
        sortBy: "completedAt",
        sortOrder: "desc",
      });

      // Transform to match the format used in gatherConversationContext
      const formattedWorkouts = workouts.map((w) => ({
        completedAt: w.completedAt,
        summary: w.summary,
        discipline: w.workoutData?.discipline,
        workoutName: w.workoutData?.workout_name,
        exerciseNames: extractExerciseNames(w.workoutData),
      }));

      console.info("✅ Recent workouts retrieved:", {
        count: formattedWorkouts.length,
        disciplines: [
          ...new Set(formattedWorkouts.map((w) => w.discipline)),
        ].filter(Boolean),
      });

      return {
        workouts: formattedWorkouts,
        count: formattedWorkouts.length,
      };
    } catch (error) {
      console.error("❌ Get recent workouts failed:", error);
      return {
        workouts: [],
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(getRecentWorkoutsTool as any).contextualMessage = [
  "Pulling up your recent workouts...",
  "Checking your training history...",
  "Scanning through recent sessions...",
  "Reviewing what you've been doing...",
];

// ============================================================================
// TOOL 9: Query Training Programs
// ============================================================================

export const queryProgramsTool: Tool<ConversationAgentContext> = {
  id: "query_programs",
  description: `Query the user's training program history. Use this when the user asks about:
- Past or current training programs
- Program history ("What programs have I done?")
- Specific program details by name or time period
- Program performance and adherence
- Program structure and phases ("What phases are in my program?", "What's the program structure?")

Returns a list of programs with metadata including status, dates, adherence rate, completion stats, and phase structure (names, descriptions, focus areas, day ranges).

Example use cases:
- "What programs have I done?"
- "Show me my completed programs"
- "What was that program from last summer?"
- "List all my active programs"
- "What are the phases in my current program?"
- "Tell me about the structure of my program"

NOT for:
- Getting today's specific workout (use get_todays_workout instead)`,
  inputSchema: QUERY_PROGRAMS_SCHEMA,
  async execute(input, context) {
    console.info("📚 Executing query_programs:", {
      status: input.status || "all",
      limit: input.limit || 10,
      includeArchived: input.includeArchived || false,
      userId: context.userId,
    });

    try {
      const programs = await queryPrograms(context.userId, {
        ...(input.status && { includeStatus: [input.status] }),
        limit: input.limit || 10,
        includeArchived: input.includeArchived || false,
        sortOrder: "desc", // Most recent first
      });

      // Format programs for agent consumption
      const formattedPrograms = programs.map((p) => ({
        programId: p.programId,
        programName: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        currentDay: p.currentDay,
        totalDays: p.totalDays,
        completedWorkouts: p.completedWorkouts,
        totalWorkouts: p.totalWorkouts,
        adherenceRate: Math.round(p.adherenceRate || 0),
        trainingGoals: p.trainingGoals,
        trainingFrequency: p.trainingFrequency,
        phases: p.phases?.map((phase) => ({
          name: phase.name,
          description: phase.description,
          startDay: phase.startDay,
          endDay: phase.endDay,
          durationDays: phase.durationDays,
          focusAreas: phase.focusAreas,
        })),
      }));

      console.info("✅ Programs retrieved:", {
        count: formattedPrograms.length,
        programNames: formattedPrograms.map((p) => p.programName),
      });

      return {
        programs: formattedPrograms,
        count: formattedPrograms.length,
      };
    } catch (error) {
      console.error("❌ Query programs failed:", error);
      return {
        programs: [],
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(queryProgramsTool as any).contextualMessage = [
  "Checking your training programs...",
  "Looking up your program history...",
  "Pulling program details...",
  "Scanning your training plans...",
];

// ============================================================================
// TOOL 10: Query Exercise History
// ============================================================================

export const queryExerciseHistoryTool: Tool<ConversationAgentContext> = {
  id: "query_exercise_history",
  description: `Query the user's performance history for a specific exercise. This is the only tool that returns actual performance data (sets, reps, weights, PRs, volume). Other tools like list_exercise_names show which exercises exist but not how they were performed.

Use when the user asks about:
- Progress or history on a specific exercise
- Personal records (PRs), best lifts, or max weights
- Performance trends over time
- Comparison across sessions

Returns exercise sessions with sets, reps, weights, and aggregated statistics like PRs, average performance, and total volume.

The tool automatically normalizes exercise names (e.g., "Back Squat" → "back_squat") to match stored format. If you're unsure of the exact exercise name, use list_exercise_names first.`,
  inputSchema: QUERY_EXERCISE_HISTORY_SCHEMA,
  async execute(input, context) {
    console.info("💪 Executing query_exercise_history:", {
      exerciseName: input.exerciseName,
      fromDate: input.fromDate || "all time",
      toDate: input.toDate || "present",
      limit: input.limit || 20,
      userId: context.userId,
    });

    try {
      // Fetch stored exercise names for context-aware normalization
      let storedExerciseNames: string[] = [];
      try {
        const exerciseNamesResult = await queryExerciseNames(context.userId, {
          limit: 200, // Get up to 200 most common exercises for context
        });
        storedExerciseNames = exerciseNamesResult.exercises.map(
          (e) => e.exerciseName,
        );
        console.info("✅ Fetched stored exercise names for normalization:", {
          count: storedExerciseNames.length,
        });
      } catch (fetchError) {
        console.warn(
          "⚠️ Failed to fetch stored exercise names, using standard normalization:",
          fetchError,
        );
      }

      // Normalize exercise name to match stored format (snake_case) with context
      let normalizedExerciseName = input.exerciseName;
      try {
        const normalizationResult =
          storedExerciseNames.length > 0
            ? await normalizeExerciseNameWithContext(
                input.exerciseName,
                storedExerciseNames,
              )
            : await normalizeExerciseName(input.exerciseName);

        normalizedExerciseName = normalizationResult.normalizedName;
        console.info("✅ Exercise name normalized:", {
          original: input.exerciseName,
          normalized: normalizedExerciseName,
          confidence: normalizationResult.confidence,
          contextAware: storedExerciseNames.length > 0,
        });
      } catch (normError) {
        // Fallback: simple lowercase + underscore conversion
        console.warn("⚠️ AI normalization failed, using fallback:", normError);
        normalizedExerciseName = input.exerciseName
          .toLowerCase()
          .replace(/\s+/g, "_");
        console.info("📝 Fallback normalization:", {
          original: input.exerciseName,
          fallback: normalizedExerciseName,
        });
      }

      const result = await queryExercises(
        context.userId,
        normalizedExerciseName,
        {
          fromDate: input.fromDate,
          toDate: input.toDate,
          limit: input.limit || 20,
          sortOrder: "desc", // Most recent first
        },
      );

      // Format exercises for agent consumption
      const formattedExercises = result.exercises.map((ex) => ({
        workoutId: ex.workoutId,
        completedAt: ex.completedAt,
        sets: ex.metrics.sets,
        reps: ex.metrics.reps,
        weight: ex.metrics.weight,
        weightUnit: ex.metrics.weightUnit,
        volume: ex.metrics.totalVolume,
        discipline: ex.discipline,
        notes: ex.metadata.notes,
      }));

      console.info("✅ Exercise history retrieved:", {
        exerciseName: input.exerciseName,
        sessionCount: formattedExercises.length,
        hasPRs: !!result.aggregations,
      });

      return {
        exerciseName: input.exerciseName,
        sessions: formattedExercises,
        sessionCount: formattedExercises.length,
        aggregations: result.aggregations
          ? {
              prWeight: result.aggregations.prWeight,
              prReps: result.aggregations.prReps,
              prVolume: result.aggregations.prVolume,
              averageWeight: result.aggregations.averageWeight,
              averageReps: result.aggregations.averageReps,
              totalOccurrences: result.aggregations.totalOccurrences,
              firstPerformed: result.aggregations.firstPerformed,
              lastPerformed: result.aggregations.lastPerformed,
              disciplines: result.aggregations.disciplines,
            }
          : null,
        hasMore: result.pagination?.hasMore || false,
      };
    } catch (error) {
      console.error("❌ Query exercise history failed:", error);
      return {
        exerciseName: input.exerciseName,
        sessions: [],
        sessionCount: 0,
        aggregations: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(queryExerciseHistoryTool as any).contextualMessage = [
  "Looking up your exercise history...",
  "Checking your performance data...",
  "Pulling your PR records...",
  "Scanning through your sessions...",
];

// ============================================================================
// TOOL 11: List Exercise Names
// ============================================================================

export const listExerciseNamesTool: Tool<ConversationAgentContext> = {
  id: "list_exercise_names",
  description: `List all distinct exercise names from the user's workout history. Returns exercise names, occurrence counts, and disciplines only — does not include performance details like sets, reps, weights, or PRs.

Use this as a discovery tool when:
- The user asks "what exercises have I done?" or wants to browse their exercise list
- You need to confirm the exact exercise name before calling query_exercise_history (e.g., "squats" could be "Back Squat", "Front Squat", "Zercher Squat", etc.)

For actual performance data (sets, reps, weights, PRs), always follow up with query_exercise_history.`,
  inputSchema: LIST_EXERCISE_NAMES_SCHEMA,
  async execute(input, context) {
    console.info("📋 Executing list_exercise_names:", {
      discipline: input.discipline || "all",
      limit: input.limit || 50,
      userId: context.userId,
    });

    try {
      const result = await queryExerciseNames(context.userId, {
        discipline: input.discipline as any,
        limit: input.limit || 50,
      });

      console.info("✅ Exercise names retrieved:", {
        count: result.exercises.length,
        totalOccurrences: result.exercises.reduce((sum, e) => sum + e.count, 0),
      });

      return {
        exercises: result.exercises.map((e) => ({
          exerciseName: e.exerciseName,
          count: e.count,
          lastPerformed: e.lastPerformed,
          disciplines: e.disciplines,
          originalNames: e.originalNames,
        })),
        count: result.exercises.length,
      };
    } catch (error) {
      console.error("❌ List exercise names failed:", error);
      return {
        exercises: [],
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

(listExerciseNamesTool as any).contextualMessage = [
  "Checking your exercise list...",
  "Looking up what exercises you've done...",
  "Pulling your movement database...",
  "Scanning your exercise catalog...",
];

// ============================================================================
// Export all tools as an array for easy registration
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
];
