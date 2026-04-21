/**
 * Shared Agent Tool Factories
 *
 * Factory functions for the 8 tools that are reusable across all streaming
 * agent roles (coach conversation, coach creator, program designer, etc.).
 *
 * Factory functions are generic over TContext extends BaseStreamingAgentContext,
 * so each role gets properly typed tools at compile time while the runtime
 * implementations only depend on fields guaranteed by the base type.
 *
 * Tools that need a coachId accept a resolver function so the caller can map
 * their role-specific context to the appropriate coachId.
 *
 * Coach-conversation-specific tools (log_workout, complete_program_workout,
 * get_todays_workout) are NOT in this file — they remain in conversation/tools.ts.
 */

import type {
  Tool,
  BaseStreamingAgentContext,
  AgentContext,
} from "../core/types";
import { queryPineconeContext, storePineconeContext } from "../../api-helpers";
import {
  SEARCH_KNOWLEDGE_BASE_SCHEMA,
  SEARCH_METHODOLOGY_SCHEMA,
  RETRIEVE_MEMORIES_SCHEMA,
  SAVE_MEMORY_SCHEMA,
  GET_RECENT_WORKOUTS_SCHEMA,
  QUERY_PROGRAMS_SCHEMA,
  QUERY_EXERCISE_HISTORY_SCHEMA,
  LIST_EXERCISE_NAMES_SCHEMA,
  QUERY_COACHES_SCHEMA,
  COMPUTE_DATE_SCHEMA,
} from "../../schemas/conversation-agent-tool-schemas";
import { resolveDateReferences } from "../../analytics/date-math";
import { getUserTimezoneOrDefault } from "../../analytics/date-utils";
import { queryCoachConfigs } from "../../../../dynamodb/coach-config";
import {
  formatPineconeContext,
  getEnhancedMethodologyContext,
  formatEnhancedMethodologyContext,
} from "../../pinecone-utils";
import { queryMemories } from "../../coach-conversation/memory-processing";
import { saveMemory } from "../../../../dynamodb/memory";
import { queryWorkouts } from "../../../../dynamodb/workout";
import { queryPrograms } from "../../../../dynamodb/program";
import {
  queryExercises,
  queryExerciseNames,
} from "../../../../dynamodb/exercise";
import {
  normalizeExerciseName,
  normalizeExerciseNameWithContext,
} from "../../exercise/normalization";
import { extractExerciseNames } from "../../workout/data-utils";

// ============================================================================
// FACTORY 1: search_knowledge_base
// ============================================================================

export function createSearchKnowledgeBaseTool<
  TContext extends BaseStreamingAgentContext,
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
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
          includeMethodology:
            includeAll || searchTypes?.includes("methodology"),
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

  (tool as any).contextualMessage = [
    "Searching knowledge base...",
    "Hunting through training resources...",
    "Scouting the methodology database...",
    "Digging into training science...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 2: search_methodology
// ============================================================================

export function createSearchMethodologyTool<
  TContext extends BaseStreamingAgentContext,
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
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

When the knowledge base returns no results: respond from your trained knowledge and be transparent.
State clearly that the topic isn't in the stored documentation, then explain it from general training
knowledge. Never treat an empty search result as proof that you don't know the topic.

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
            context:
              "No specific methodology documentation found in the knowledge base for this query. Draw on your trained knowledge to answer, and be transparent that you're doing so rather than citing stored documentation.",
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

  (tool as any).contextualMessage = [
    "Consulting training methodology...",
    "Checking programming principles...",
    "Reviewing technique guidance...",
    "Exploring training science...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 3: retrieve_memories
// ============================================================================

/**
 * @param getCoachId - Resolver to extract coachId from context.
 *   Coach conversation: `(ctx) => ctx.coachId`
 *   Coach creator: `() => undefined` (cross-coach search, coach not created yet)
 */
export function createRetrieveMemoriesTool<
  TContext extends BaseStreamingAgentContext,
>(getCoachId: (context: TContext) => string | undefined): Tool<TContext> {
  const tool: Tool<TContext> = {
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
      const coachId = getCoachId(context) ?? "all";
      console.info("🧠 Executing retrieve_memories:", {
        query: input.query,
        userId: context.userId,
        coachId,
      });

      try {
        const result = await queryMemories(
          context.userId,
          coachId,
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

  (tool as any).contextualMessage = [
    "Checking your preferences...",
    "Looking up what matters to you...",
    "Reviewing your saved goals...",
    "Pulling up your training notes...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 4: save_memory
// ============================================================================

/**
 * @param getCoachId - Resolver to extract coachId from context.
 *   Coach conversation: `(ctx) => ctx.coachId`
 *   Coach creator: `() => "coach_creator_session"` (placeholder until coach is created)
 */
export function createSaveMemoryTool<
  TContext extends BaseStreamingAgentContext,
>(getCoachId: (context: TContext) => string): Tool<TContext> {
  const tool: Tool<TContext> = {
    id: "save_memory",
    description: `Save something the user shared for future reference. Use this when the user
explicitly shares a preference, goal, constraint, or instruction that should persist
across conversations.

Memories serve a distinct purpose from other data structures like workout logs, programs,
or conversation history. Those record what the user *did*. Memories capture who the user
*is* — their constraints, preferences, goals, and instructions that should color every
future interaction. Saving to memory is not made redundant by other data being collected
in the same turn; the information belongs in both places for different reasons.

Explicit trigger phrases are strong signals that the user wants something remembered —
when they say "remember that", "don't forget", "keep in mind", "note that for the record",
"keep that on file", or similar, that's a clear indication this information matters to
them beyond the current conversation. Save it, even if the same information is also
being captured elsewhere.

Also applies to implicit cases where the user shares lasting information worth persisting,
even without a trigger phrase:
- User shares a training constraint: "I can only train 3 days a week"
- User mentions an injury: "I hurt my shoulder last month"
- User states a goal: "I want to deadlift 400 pounds by summer"
- User expresses a preference: "I hate running, love lifting"

Physical limitations and injury history are particularly high-value memories — they
affect every future session and should always be saved when mentioned.

When in doubt about whether something is lasting, lean toward saving — but limit to ONE
save_memory call per turn. If the user shares multiple memorable details in one message,
combine them into a single memory with the most important category. Do NOT save overlapping
memories — if the information is substantially similar to something already saved in this
conversation, skip the save.

NOT for:
- Transient information: "I'm tired today"
- Single-session context: "I'm at the gym right now"
- Mid-workout progress: "I just finished set 3"
- Information you'll use immediately but won't need later`,
    inputSchema: SAVE_MEMORY_SCHEMA,
    async execute(input, context) {
      const coachId = getCoachId(context);
      console.info("💾 Executing save_memory:", {
        memoryType: input.memoryType,
        importance: input.importance,
        contentLength: input.content.length,
        userId: context.userId,
        coachId,
      });

      try {
        const timestamp = Date.now();
        const shortId = Math.random().toString(36).substring(2, 8);
        const memoryId = `memory_${context.userId}_${timestamp}_${shortId}`;

        const memoryData = {
          memoryId,
          userId: context.userId,
          coachId,
          content: input.content,
          memoryType: input.memoryType,
          metadata: {
            createdAt: new Date(),
            usageCount: 0,
            source: "conversation" as const,
            importance: input.importance,
            tags: [],
          },
        };

        await saveMemory(memoryData);

        storePineconeContext(context.userId, memoryData.content, {
          memoryId,
          entityType: "user_memory",
          memoryType: input.memoryType,
          importance: input.importance,
          createdAt: memoryData.metadata.createdAt.toISOString(),
        }).catch((err: any) => {
          console.error(
            "⚠️ Pinecone memory storage failed (non-blocking):",
            err,
          );
        });

        console.info("✅ Memory saved successfully:", { memoryId });
        return { saved: true, memoryId };
      } catch (error) {
        console.error("❌ Memory save failed:", error);
        return {
          saved: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };

  (tool as any).contextualMessage = [
    "Saving to memory...",
    "Storing that detail...",
    "Recording this for later...",
    "Adding to your profile...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 5: get_recent_workouts
// ============================================================================

export function createGetRecentWorkoutsTool<
  TContext extends BaseStreamingAgentContext,
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
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
        const limit = Math.min(input.limit || 10, 20);
        const workouts = await queryWorkouts(context.userId, {
          limit,
          ...(input.discipline && { discipline: input.discipline }),
          sortBy: "completedAt",
          sortOrder: "desc",
        });

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

  (tool as any).contextualMessage = [
    "Pulling up your recent workouts...",
    "Checking your training history...",
    "Scanning through recent sessions...",
    "Reviewing what you've been doing...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 6: query_programs
// ============================================================================

export function createQueryProgramsTool<
  TContext extends BaseStreamingAgentContext,
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
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
          sortOrder: "desc",
        });

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

  (tool as any).contextualMessage = [
    "Checking your training programs...",
    "Looking up your program history...",
    "Pulling program details...",
    "Scanning your training plans...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 7: query_exercise_history
// ============================================================================

export function createQueryExerciseHistoryTool<
  TContext extends BaseStreamingAgentContext,
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
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
        let storedExerciseNames: string[] = [];
        try {
          const exerciseNamesResult = await queryExerciseNames(context.userId, {
            limit: 200,
          });
          storedExerciseNames = exerciseNamesResult.exercises.map(
            (e) => e.exerciseName,
          );
        } catch (fetchError) {
          console.warn(
            "⚠️ Failed to fetch stored exercise names, using standard normalization:",
            fetchError,
          );
        }

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
          console.warn(
            "⚠️ AI normalization failed, using fallback:",
            normError,
          );
          normalizedExerciseName = input.exerciseName
            .toLowerCase()
            .replace(/\s+/g, "_");
        }

        const result = await queryExercises(
          context.userId,
          normalizedExerciseName,
          {
            fromDate: input.fromDate,
            toDate: input.toDate,
            limit: input.limit || 20,
            sortOrder: "desc",
          },
        );

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

  (tool as any).contextualMessage = [
    "Looking up your exercise history...",
    "Checking your performance data...",
    "Pulling your PR records...",
    "Scanning through your sessions...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 8: list_exercise_names
// ============================================================================

export function createListExerciseNamesTool<
  TContext extends BaseStreamingAgentContext,
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
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
          totalOccurrences: result.exercises.reduce(
            (sum, e) => sum + e.count,
            0,
          ),
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

  (tool as any).contextualMessage = [
    "Checking your exercise list...",
    "Looking up what exercises you've done...",
    "Pulling your movement database...",
    "Scanning your exercise catalog...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 9: query_coaches
// ============================================================================

export function createQueryCoachesTool<
  TContext extends BaseStreamingAgentContext,
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
    id: "query_coaches",
    description: `List all active AI coaches configured for this user, including each coach's
specializations, methodology, programming philosophy, and full technical config.

Call any time the user mentions a coach or coaching context — "my coach", "my trainer",
"a coach I worked with", "when I was coached", how a past coach structured training,
deload preferences from previous coaching, or any coaching-adjacent phrasing. These are
direct signals that coaching configuration exists in the database. Retrieve it before
responding — don't assume you already know the answer from conversation context.

Also use this when:
- The user asks "what coaches do I have?", "how many coaches do I have?", "show me my coaches"
- You need to compare coaching approaches or reference another coach by name
- You need context about the user's coaching ecosystem

Returns each coach's name, ID, short description, specializations, methodology, and experience level focus.
When includeDetails is true, also returns personality template and full technical config.

NOT for:
- General training advice (no tool needed)
- Workout or program queries (use get_recent_workouts or query_programs)
- Memory or knowledge base searches (use retrieve_memories or search_knowledge_base)`,
    inputSchema: QUERY_COACHES_SCHEMA,
    async execute(input, context) {
      console.info("🤖 Executing query_coaches:", {
        userId: context.userId,
        includeDetails: input.includeDetails,
      });

      try {
        const coaches = await queryCoachConfigs(context.userId);

        if (coaches.length === 0) {
          return {
            coaches: [],
            count: 0,
            message: "No active coaches found for this user.",
          };
        }

        const summaries = coaches.map((coach) => {
          const base = {
            coachId: coach.coach_id,
            name: coach.coach_name,
            description: coach.coach_description,
          };

          if (!input.includeDetails) return base;

          return {
            ...base,
            specializations: coach.technical_config?.specializations || [],
            methodology: coach.technical_config?.methodology || [],
            programFocus: coach.technical_config?.programming_focus,
            experienceLevel: coach.technical_config?.experience_level,
            trainingFrequency: coach.technical_config?.training_frequency,
            personalityTemplate:
              coach.selected_personality?.primary_template || null,
            methodologyProfile: coach.metadata?.methodology_profile || null,
            totalConversations: coach.metadata?.total_conversations || 0,
          };
        });

        console.info("✅ query_coaches successful:", {
          count: summaries.length,
        });

        return {
          coaches: summaries,
          count: summaries.length,
        };
      } catch (error) {
        console.error("❌ query_coaches failed:", error);
        return {
          coaches: [],
          count: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };

  (tool as any).contextualMessage = [
    "Looking up your coaches...",
    "Checking your coaching roster...",
    "Pulling your coach lineup...",
  ];

  return tool;
}

// ============================================================================
// FACTORY 10: compute_date
//
// Deterministic date math so the model never has to count days. Returns the
// concrete YYYY-MM-DD, day-of-week, and daysFromToday for each reference.
// ============================================================================

/**
 * Factory for `compute_date` — accepts any agent context. Tool only needs
 * `userTimezone` on the context but accepts optional so workout-logger (which
 * has userTimezone?: string) can use the same factory.
 */
export function createComputeDateTool<
  TContext extends AgentContext & { userTimezone?: string },
>(): Tool<TContext> {
  const tool: Tool<TContext> = {
    id: "compute_date",
    description: `Resolve one or more date references into concrete YYYY-MM-DD values with day-of-week and days-from-today.

Call this whenever the user mentions an absolute date, a relative date phrase, or asks "how many days until …". Never estimate date math by hand — this tool is the authoritative source.

Accepts ISO dates (2026-05-03), "today", "tomorrow", "yesterday", "tonight", "this saturday", "next monday", "last friday", "in 3 days", "in 2 weeks", "in 1 month", "3 days ago", "2 weeks ago", and month-day phrases like "may 3", "may 3rd", "may 3 2026", "3 may".

Returns, for each reference:
- input: the original string
- resolved: true|false
- isoDate: YYYY-MM-DD in the user's timezone (null if unresolved)
- dayOfWeek: "Monday" etc. (null if unresolved)
- daysFromToday: integer (negative = past, 0 = today, positive = future) (null if unresolved)

When resolved=false, the tool could not confidently parse the phrase — ask the user for clarification rather than guessing.

Guidance for answers:
- Always include both the ISO date and the day-count in your reply, e.g. "your meet on 2026-05-03 (13 days from today)".
- Do not silently correct the user if their stated date disagrees with the resolved one — point out the mismatch and ask which they meant.`,
    inputSchema: COMPUTE_DATE_SCHEMA,
    async execute(input, context) {
      const references: string[] = Array.isArray(input?.references)
        ? input.references.filter(
            (r: unknown): r is string => typeof r === "string",
          )
        : [];

      const tz = getUserTimezoneOrDefault(context.userTimezone ?? null);
      console.info("📅 Executing compute_date:", {
        count: references.length,
        userTimezone: tz,
      });

      const now = new Date();
      const resolved = resolveDateReferences(references, now, tz);

      return {
        now: {
          isoDate: resolveDateReferences(["today"], now, tz)[0].isoDate,
          timezone: tz,
        },
        results: resolved,
      };
    },
  };

  (tool as any).contextualMessage = [
    "Checking the calendar...",
    "Working out the dates...",
    "Counting the days...",
  ];

  return tool;
}
