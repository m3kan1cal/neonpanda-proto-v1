/**
 * AI Program Generator (V2 - Parallel Generation)
 *
 * This module handles parallel generation of training programs using the V2 approach:
 * - Todo-list based requirements gathering
 * - Parallel phase generation via Promise.all()
 * - Bedrock toolConfig for structured output
 * - AI normalization for quality assurance
 *
 * Pattern: Follows build-workout and build-coach-config patterns
 * Critical: Required for MVP due to 15-minute Lambda timeout
 */

import { queryPineconeContext, MODEL_IDS } from "../api-helpers";
import { Program } from "./types";
import { getCoachConfig, getUserProfile } from "../../../dynamodb/operations";
import type { CoachConfig } from "../coach-creator/types";
import type { UserProfile } from "../user/types";
import {
  generatePhaseStructure,
  generateAllPhasesParallel,
  assembleProgram,
} from "./phase-generator";
import { storeProgramDetailsInS3 } from "./s3-utils";
import type { ProgramDesignerTodoList } from "../program-designer/types";
import {
  parseProgramDuration,
  DEFAULT_PROGRAM_DURATION_DAYS,
} from "./duration-parser";
import { validateParsedProgramDuration } from "./validation-helpers";
import { logger } from "../logger";

/**
 * Generate a concise program name (50-60 characters max)
 * Extracts key concepts from training goals and creates a punchy, memorable name
 */
function generateConciseProgramName(
  durationDays: number,
  trainingGoals?: string,
  programFocus?: string,
): string {
  const maxLength = 60;

  // Convert days to weeks for cleaner naming
  const weeks = Math.round(durationDays / 7);
  const durationLabel = weeks >= 1 ? `${weeks}-Week` : `${durationDays}-Day`;

  // If no training goals, use generic name
  if (!trainingGoals) {
    return `${durationLabel} Training Program`;
  }

  // Clean training goals: remove punctuation, normalize spacing
  const cleaned = trainingGoals
    .replace(/[()]/g, " ") // Remove parentheses
    .replace(/[,]/g, " ") // Remove commas
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .toLowerCase();

  // Extract key concepts (look for common training terms)
  const trainingConcepts = [
    "strength",
    "powerlifting",
    "power",
    "hypertrophy",
    "bodybuilding",
    "crossfit",
    "conditioning",
    "cardio",
    "endurance",
    "sprint",
    "olympic",
    "weightlifting",
    "strongman",
    "functional",
    "mobility",
    "squat",
    "bench",
    "deadlift",
    "press",
    "row",
    "pull",
    "push",
    "competition",
    "prep",
    "peaking",
    "foundation",
    "base",
    "build",
  ];

  // Find matching concepts in training goals
  const foundConcepts = trainingConcepts.filter((concept) =>
    cleaned.includes(concept),
  );

  // Build name from concepts
  let name: string;
  if (foundConcepts.length > 0) {
    // Use first 1-2 key concepts
    const keyConcepts = foundConcepts.slice(0, 2);
    const conceptLabel = keyConcepts
      .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
      .join(" ");
    name = `${durationLabel} ${conceptLabel}`;
  } else {
    // Fallback: extract first meaningful phrase (up to 25 chars)
    const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
    const phrase = words.slice(0, 3).join(" ");
    name = `${durationLabel} ${phrase}`;
  }

  // Capitalize first letter of each word
  name = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // If still too long, truncate intelligently
  if (name.length > maxLength) {
    // Try with just duration + first concept
    if (foundConcepts.length > 0) {
      const singleConcept =
        foundConcepts[0].charAt(0).toUpperCase() + foundConcepts[0].slice(1);
      name = `${durationLabel} ${singleConcept}`;
    } else {
      // Use program focus if available
      if (programFocus && programFocus.length < 35) {
        name = `${durationLabel} ${programFocus}`;
      } else {
        // Last resort: truncate to fit
        const availableSpace = maxLength - durationLabel.length - 1;
        const truncated = cleaned.substring(0, availableSpace).trim();
        const lastSpace = truncated.lastIndexOf(" ");
        const finalPhrase =
          lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
        name = `${durationLabel} ${finalPhrase.charAt(0).toUpperCase() + finalPhrase.slice(1)}`;
      }
    }
  }

  // Final safety check
  if (name.length > maxLength) {
    name = name.substring(0, maxLength - 3).trim() + "...";
  }

  return name;
}

/**
 * Generate program using PARALLEL phase generation (V2 REDESIGN)
 *
 * This is the V2 approach that uses:
 * - Todo list for requirements (from conversational flow)
 * - Parallel phase generation via Promise.all()
 * - Bedrock toolConfig for structured output
 * - AI normalization for quality assurance
 *
 * Pattern: Follows build-workout and build-coach-config patterns
 * Critical: Required for MVP due to 15-minute Lambda timeout
 *
 * @param userId - User ID
 * @param programId - Program ID
 * @param conversationId - Conversation ID
 * @param coachId - Coach ID
 * @param todoList - Complete program requirements from todo-list conversation
 * @param conversationContext - Full conversation history as text
 * @returns Complete program with phases and workouts
 */
export interface ProgramGenerationDebugData {
  phaseStructure: {
    prompt: string; // Full prompt sent to Bedrock
    response: string; // Full response received from Bedrock
    method: "tool" | "text_fallback";
    duration: number;
  };
  phaseWorkouts: Array<{
    phaseId: string;
    phaseName: string;
    prompt: string; // Full prompt sent to Bedrock
    response: string; // Full response received from Bedrock
    method: "tool" | "text_fallback";
    duration: number;
  }>;
  timings: {
    dataLoading: number;
    phaseStructure: number;
    phaseGeneration: number;
    assembly: number;
    total: number;
  };
}

export async function generateProgramV2(
  userId: string,
  programId: string,
  conversationId: string,
  coachId: string,
  todoList: ProgramDesignerTodoList,
  conversationContext: string,
  additionalConsiderations?: string,
): Promise<{ program: Program; debugData: ProgramGenerationDebugData }> {
  logger.info("🚀 Starting V2 parallel program generation:", {
    userId,
    programId,
    conversationId,
    coachId,
  });

  const startTime = Date.now();

  // Initialize debug data collection
  const debugData: ProgramGenerationDebugData = {
    phaseStructure: {
      prompt: "",
      response: "",
      method: "tool",
      duration: 0,
    },
    phaseWorkouts: [],
    timings: {
      dataLoading: 0,
      phaseStructure: 0,
      phaseGeneration: 0,
      assembly: 0,
      total: 0,
    },
  };

  try {
    // 1. Load coach config and user profile
    logger.info("📥 Loading coach and user data...");
    const [coachConfigResult, userProfile] = await Promise.all([
      getCoachConfig(userId, coachId),
      getUserProfile(userId),
    ]);

    const coachConfig = coachConfigResult as CoachConfig;

    if (!coachConfig) {
      throw new Error(`Coach config not found for coachId: ${coachId}`);
    }

    // 2. Query Pinecone for relevant user context (including methodologies)
    logger.info("🔍 Querying Pinecone for user context...");
    const pineconeResult = await queryPineconeContext(
      userId,
      `Program for: ${todoList.trainingGoals?.value || "fitness goals"}`,
      {
        workoutTopK: 5,
        conversationTopK: 5,
        programTopK: 3,
        coachCreatorTopK: 2,
        includeMethodology: true,
        minScore: 0.7,
      },
    );

    // Extract text context from Pinecone results
    let pineconeContext = "";
    if (pineconeResult.success && pineconeResult.matches) {
      pineconeContext = pineconeResult.matches
        .map((match) => match.content || "")
        .filter((content) => content.length > 0)
        .join("\n");
    }

    // 3. Build phase generation context
    // Parse program duration (supports "X weeks", "X months", vague terms, or days as number)
    const programDuration = parseProgramDuration(
      todoList.programDuration?.value,
      DEFAULT_PROGRAM_DURATION_DAYS,
    );

    // Validate parsed program duration (prevents zero/invalid durations)
    validateParsedProgramDuration(
      programDuration,
      todoList.programDuration?.value,
    );

    const trainingFrequency =
      typeof todoList.trainingFrequency?.value === "number"
        ? todoList.trainingFrequency.value
        : parseInt(todoList.trainingFrequency?.value || "4", 10);

    const phaseContext = {
      userId,
      programId,
      todoList,
      coachConfig,
      userProfile,
      conversationContext,
      pineconeContext,
      totalDays: programDuration,
      trainingFrequency,
      additionalConsiderations, // User's final thoughts/requirements
    };

    // Track data loading time
    const dataLoadingTime = Date.now() - startTime;
    debugData.timings.dataLoading = dataLoadingTime;

    // 4. Generate phase structure (determines how to break down the program)
    logger.info("🎯 Step 1: Generating phase structure...");
    const phaseStructureStart = Date.now();
    const { phases: phaseStructure, debugData: phaseStructureDebug } =
      await generatePhaseStructure(phaseContext);
    debugData.timings.phaseStructure = Date.now() - phaseStructureStart;

    // Store ACTUAL phase structure prompt and response
    debugData.phaseStructure = phaseStructureDebug;

    logger.info("✅ Phase structure generated:", {
      phaseCount: phaseStructure.length,
      phases: phaseStructure.map((p) => ({
        name: p.name,
        days: `${p.startDay}-${p.endDay}`,
        focusAreas: p.focusAreas,
      })),
    });

    // 5. Generate all phases in PARALLEL (critical for staying under timeout)
    logger.info("🚀 Step 2: Generating all phases in parallel...");
    const phaseGenerationStart = Date.now();
    const { phasesWithWorkouts, debugData: phaseWorkoutDebugData } =
      await generateAllPhasesParallel(phaseStructure, phaseContext);
    debugData.timings.phaseGeneration = Date.now() - phaseGenerationStart;

    // Store ACTUAL phase workout generation prompts and responses
    debugData.phaseWorkouts = phaseWorkoutDebugData;

    // 6. Assemble complete program
    logger.info("🔧 Step 3: Assembling complete program...");
    const assemblyStart = Date.now();
    const { phases, workoutTemplates, totalWorkouts } = assembleProgram(
      phasesWithWorkouts,
      phaseContext,
    );
    debugData.timings.assembly = Date.now() - assemblyStart;

    // 7. Calculate actual program duration from phases (phases may override todo list duration)
    const actualProgramDuration =
      phases.length > 0 ? phases[phases.length - 1].endDay : programDuration;

    // 8. Calculate dates
    const startDate =
      todoList.startDate?.value || new Date().toISOString().split("T")[0];
    const endDate = new Date(
      new Date(startDate).getTime() +
        (actualProgramDuration - 1) * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];

    // 9. Build complete program object
    // Generate a concise program name (50-60 chars max)
    const programName = generateConciseProgramName(
      actualProgramDuration,
      todoList.trainingGoals?.value,
      todoList.programFocus?.value,
    );

    const program: Program = {
      programId,
      userId,
      coachIds: [coachId],
      coachNames: [coachConfig.coach_name],
      creationConversationId: conversationId,
      name: programName,
      description:
        todoList.trainingGoals?.value || "Customized training program",
      status: "active",
      startDate,
      endDate,
      totalDays: actualProgramDuration,
      currentDay: 1,
      pausedAt: null,
      pausedDuration: 0,
      phases,
      equipmentConstraints: todoList.equipmentAccess?.value || [],
      trainingGoals: todoList.trainingGoals?.value
        ? [todoList.trainingGoals.value]
        : [],
      trainingFrequency,
      totalWorkouts,
      completedWorkouts: 0,
      skippedWorkouts: 0,
      completedRestDays: 0,
      adherenceRate: 0,
      lastActivityAt: null,
      s3DetailKey: `programs/${userId}/${programId}/details.json`,
      adaptationLog: [],
      dayCompletionStatus: {},
    };

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // 10. Store workout templates in S3
    const s3Key = await storeProgramDetailsInS3(
      programId,
      userId,
      coachId,
      workoutTemplates,
      {
        goals: todoList.trainingGoals?.value
          ? [todoList.trainingGoals.value]
          : [],
        purpose: todoList.trainingGoals?.value || "Customized training program",
        successMetrics: [],
        equipmentConstraints: todoList.equipmentAccess?.value || [],
        // userContext can be extended later if needed
      },
      {
        generatedBy: coachId,
        aiModel: MODEL_IDS.PLANNER_MODEL_FULL,
        confidence: 0.9,
      },
    );

    // Update program with actual S3 key
    program.s3DetailKey = s3Key;

    // Finalize debug data timings
    debugData.timings.total = Date.now() - startTime;

    logger.info("✅ V2 parallel program generation complete:", {
      programId,
      phaseCount: phases.length,
      totalWorkouts,
      elapsedSeconds: elapsed,
      timestamp: new Date().toISOString(),
      s3Key,
      debugTimings: debugData.timings,
    });

    return { program, debugData };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error("❌ V2 parallel program generation failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      elapsedSeconds: elapsed,
      userId,
      programId,
    });
    throw error;
  }
}
