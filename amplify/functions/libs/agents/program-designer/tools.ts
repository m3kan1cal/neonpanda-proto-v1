/**
 * Program Designer Agent Tools
 *
 * Tools that wrap existing program generation utilities.
 * Each tool is a discrete capability that Claude can use to design programs.
 */

import type { Tool } from "../core/types";
import type { ProgramDesignerContext } from "./types";
import type {
  Program,
  WorkoutTemplate,
  ProgramPhase,
} from "../../program/types";
import type { CoachConfig } from "../../coach-creator/types";
import type { UserProfile } from "../../user/types";
import {
  getCoachConfig,
  getUserProfile,
  saveProgram,
} from "../../../../dynamodb/operations";
import { queryPineconeContext } from "../../api-helpers";
import {
  generatePhaseStructure,
  generateSinglePhaseWorkouts,
  assembleProgram,
} from "../../program/phase-generator";
import {
  normalizeProgram,
  shouldNormalizeProgram,
  generateNormalizationSummary,
} from "../../program/normalization";
import { generateProgramSummary } from "../../program/summary";
import { storeProgramSummaryInPinecone } from "../../program/pinecone";
import { storeProgramDetailsInS3 } from "../../program/s3-utils";
import {
  storeGenerationDebugData,
  validateProgramCompleteness,
  calculateProgramConfidence,
  buildPineconeContextString,
} from "./helpers";

/**
 * Tool-specific result types
 * (Internal to tools.ts, not exported from types.ts)
 */

/**
 * Result from load_program_requirements tool
 */
interface ProgramRequirementsResult {
  coachConfig: CoachConfig;
  userProfile: UserProfile | null;
  pineconeContext: string;
  programDuration: number; // In days
  trainingFrequency: number; // Days per week
}

/**
 * Result from generate_phase_structure tool
 */
interface PhaseStructureResult {
  phases: Array<{
    phaseId: string;
    name: string;
    description: string;
    startDay: number;
    endDay: number;
    durationDays: number;
    focusAreas: string[];
  }>;
  debugData: {
    prompt: string;
    response: string;
    method: "tool" | "text_fallback";
    duration: number;
  };
}

/**
 * Result from generate_phase_workouts tool
 */
interface PhaseWorkoutsResult {
  phaseId: string;
  phaseName: string;
  workoutTemplates: WorkoutTemplate[];
  debugData: {
    prompt: string;
    response: string;
    method: "tool" | "text_fallback";
    duration: number;
  };
}

/**
 * Result from validate_program_structure tool
 */
interface ProgramValidationResult {
  isValid: boolean;
  shouldNormalize: boolean;
  confidence: number;
  validationIssues: string[];
}

/**
 * Result from normalize_program_data tool
 */
interface ProgramNormalizationResult {
  normalizedProgram: Program;
  normalizationSummary: string;
  issuesFixed: number;
  confidence: number;
}

/**
 * Result from generate_program_summary tool
 */
interface ProgramSummaryResult {
  summary: string;
}

/**
 * Result from save_program_to_database tool
 */
interface ProgramSaveResult {
  success: boolean;
  programId: string;
  s3Key: string;
  pineconeRecordId: string | null;
}

/**
 * Tool 1: Load Program Requirements
 *
 * Gathers all necessary context for program generation:
 * - Coach configuration and personality
 * - User profile and training history
 * - Relevant context from Pinecone (workouts, methodologies)
 * - Parsed program duration and training frequency
 */
export const loadProgramRequirementsTool: Tool<ProgramDesignerContext> = {
  id: "load_program_requirements",
  description: `Load all requirements and context needed for program generation.

ALWAYS CALL THIS FIRST to gather necessary information.

This tool:
- Loads coach configuration (personality, methodologies, coaching style)
- Loads user profile (experience, injuries, preferences)
- Queries Pinecone for relevant training history and context
- Parses program duration (handles "weeks", "months", or days)
- Calculates training frequency from todoList

Returns: coachConfig, userProfile, pineconeContext, programDuration (days), trainingFrequency (days/week)`,

  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User ID",
      },
      coachId: {
        type: "string",
        description: "Coach ID",
      },
      todoList: {
        type: "object",
        description: "Program requirements from todo-list conversation",
      },
    },
    required: ["userId", "coachId", "todoList"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<ProgramRequirementsResult> {
    console.info("📥 Executing load_program_requirements tool");

    const { userId, coachId, todoList } = input;

    // 1. Load coach config and user profile
    console.info("Loading coach and user data...");
    const [coachConfigResult, userProfile] = await Promise.all([
      getCoachConfig(userId, coachId),
      getUserProfile(userId),
    ]);

    const coachConfig = coachConfigResult as any;

    if (!coachConfig) {
      throw new Error(`Coach config not found for coachId: ${coachId}`);
    }

    // 2. Query Pinecone for relevant user context
    console.info("Querying Pinecone for user context...");
    const pineconeResult = await queryPineconeContext(
      userId,
      `Program for: ${todoList.trainingGoals?.value || "fitness goals"}`,
      {
        topK: 8,
        includeWorkouts: true,
        includeCoachCreator: true,
        includeConversationSummaries: true,
        includeMethodology: true,
        minScore: 0.7,
      },
    );

    const pineconeContext = buildPineconeContextString(
      pineconeResult.success ? pineconeResult.matches : [],
    );

    // 3. Parse program duration (supports "X weeks", "X months", or days as number)
    const programDurationRaw = todoList.programDuration?.value || "56";
    let programDuration: number;

    if (typeof programDurationRaw === "string") {
      const lowerValue = programDurationRaw.toLowerCase();
      const numMatch = programDurationRaw.match(/\d+/);
      const extractedNum = numMatch ? parseInt(numMatch[0], 10) : 8;

      if (lowerValue.includes("week")) {
        programDuration = extractedNum * 7;
        console.info("Converted weeks to days:", {
          input: programDurationRaw,
          weeks: extractedNum,
          days: programDuration,
        });
      } else if (lowerValue.includes("month")) {
        programDuration = extractedNum * 30;
        console.info("Converted months to days:", {
          input: programDurationRaw,
          months: extractedNum,
          days: programDuration,
        });
      } else {
        programDuration = parseInt(programDurationRaw, 10) || 56;
        console.info("Using days directly:", {
          input: programDurationRaw,
          days: programDuration,
        });
      }
    } else {
      programDuration =
        typeof programDurationRaw === "number" ? programDurationRaw : 56;
    }

    // 4. Parse training frequency
    const trainingFrequency =
      typeof todoList.trainingFrequency?.value === "number"
        ? todoList.trainingFrequency.value
        : parseInt(todoList.trainingFrequency?.value || "4", 10);

    console.info("✅ Requirements loaded:", {
      coachName: coachConfig.coach_name,
      hasUserProfile: !!userProfile,
      pineconeContextLength: pineconeContext.length,
      programDuration,
      trainingFrequency,
    });

    return {
      coachConfig,
      userProfile,
      pineconeContext,
      programDuration,
      trainingFrequency,
    };
  },
};

/**
 * Tool 2: Generate Phase Structure
 *
 * Determines optimal phase breakdown for the program.
 * Creates phase definitions with names, durations, focus areas.
 * Uses Bedrock toolConfig for structured output.
 */
export const generatePhaseStructureTool: Tool<ProgramDesignerContext> = {
  id: "generate_phase_structure",
  description: `Generate the optimal phase structure for the program.

CALL THIS SECOND after load_program_requirements.

This tool:
- Determines how many phases the program should have (typically 3-5)
- Creates phase definitions with names, durations, focus areas
- Uses periodization principles (foundation → build → peak → deload)
- Considers program duration, goals, and user experience level
- Uses AI with toolConfig for structured output

Returns: Array of phase definitions with phaseId, name, description, startDay, endDay, focusAreas`,

  inputSchema: {
    type: "object",
    properties: {
      todoList: {
        type: "object",
        description: "Program requirements from todo-list",
      },
      coachConfig: {
        type: "object",
        description: "Coach configuration",
      },
      userProfile: {
        type: "object",
        description: "User profile (can be null)",
      },
      conversationContext: {
        type: "string",
        description: "Full conversation history",
      },
      pineconeContext: {
        type: "string",
        description: "Relevant context from Pinecone",
      },
      totalDays: {
        type: "number",
        description: "Total program duration in days",
      },
      trainingFrequency: {
        type: "number",
        description: "Training frequency (days per week)",
      },
    },
    required: [
      "todoList",
      "coachConfig",
      "conversationContext",
      "pineconeContext",
      "totalDays",
      "trainingFrequency",
    ],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<PhaseStructureResult> {
    console.info("🎯 Executing generate_phase_structure tool");

    const phaseContext = {
      userId: context.userId,
      programId: context.programId,
      todoList: input.todoList,
      coachConfig: input.coachConfig,
      userProfile: input.userProfile,
      conversationContext: input.conversationContext,
      pineconeContext: input.pineconeContext,
      totalDays: input.totalDays,
      trainingFrequency: input.trainingFrequency,
    };

    const result = await generatePhaseStructure(phaseContext);

    console.info("✅ Phase structure generated:", {
      phaseCount: result.phases.length,
      phases: result.phases.map((p) => ({
        name: p.name,
        days: `${p.startDay}-${p.endDay}`,
      })),
    });

    return result;
  },
};

/**
 * Tool 3: Generate Phase Workouts
 *
 * Generates workout templates for ONE specific phase.
 * Claude can call this multiple times in parallel for different phases.
 */
export const generatePhaseWorkoutsTool: Tool<ProgramDesignerContext> = {
  id: "generate_phase_workouts",
  description: `Generate workout templates for ONE specific phase.

CRITICAL: Call this once PER PHASE - Claude can parallelize these calls.

This tool:
- Generates complete workout templates for a single phase
- Creates detailed exercise prescriptions (sets, reps, loads)
- Respects training frequency and rest day preferences
- Uses periodization appropriate to the phase
- Each call is independent and can run in parallel

PARALLELIZATION EXAMPLE:
- For 4-phase program, make 4 separate calls to this tool
- Each call provides ONE phase from the phase structure
- The agent framework will execute these in parallel

Input: Single phase definition from phase structure
Returns: Phase with complete workout templates`,

  inputSchema: {
    type: "object",
    properties: {
      phase: {
        type: "object",
        description: "Single phase definition from phase structure",
        properties: {
          phaseId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          startDay: { type: "number" },
          endDay: { type: "number" },
          durationDays: { type: "number" },
          focusAreas: { type: "array", items: { type: "string" } },
        },
      },
      allPhases: {
        type: "array",
        description: "All phases from phase structure (for context)",
      },
      programContext: {
        type: "object",
        description: "Full program context from load_program_requirements",
      },
    },
    required: ["phase", "allPhases", "programContext"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<PhaseWorkoutsResult> {
    console.info("🏋️ Executing generate_phase_workouts tool", {
      phaseName: input.phase.name,
      phaseId: input.phase.phaseId,
    });

    const { phase, allPhases, programContext } = input;

    // Build full phase context (same structure as phase-generator expects)
    const fullContext = {
      userId: context.userId,
      programId: context.programId,
      todoList: context.todoList,
      coachConfig: programContext.coachConfig,
      userProfile: programContext.userProfile,
      conversationContext: context.conversationContext,
      pineconeContext: programContext.pineconeContext,
      totalDays: programContext.programDuration,
      trainingFrequency: programContext.trainingFrequency,
    };

    // Generate workouts for this specific phase
    const result = await generateSinglePhaseWorkouts(
      phase,
      fullContext,
      allPhases,
    );

    console.info("✅ Phase workouts generated:", {
      phaseName: result.phaseWithWorkouts.name,
      workoutCount: result.phaseWithWorkouts.workouts.length,
    });

    return {
      phaseId: result.phaseWithWorkouts.phaseId,
      phaseName: result.phaseWithWorkouts.name,
      workoutTemplates: result.phaseWithWorkouts.workouts,
      debugData: result.debugData,
    };
  },
};

/**
 * Tool 4: Validate Program Structure
 *
 * Validates program completeness and quality.
 * Checks phase continuity, workout distribution, and data quality.
 */
export const validateProgramStructureTool: Tool<ProgramDesignerContext> = {
  id: "validate_program_structure",
  description: `Validate the completeness and quality of the generated program.

CALL THIS after all phases have been generated.

This tool checks:
- Program has all required fields
- Phases have proper continuity (no gaps or overlaps)
- First phase starts at day 1, last phase ends at totalDays
- Workout templates are properly distributed
- Workout count matches training frequency
- All templates have required fields

Returns: isValid, shouldNormalize, confidence, validationIssues`,

  inputSchema: {
    type: "object",
    properties: {
      program: {
        type: "object",
        description: "The assembled program object",
      },
      phases: {
        type: "array",
        description: "Array of program phases",
      },
      workoutTemplates: {
        type: "array",
        description: "All workout templates from all phases",
      },
    },
    required: ["program", "phases", "workoutTemplates"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<ProgramValidationResult> {
    console.info("✅ Executing validate_program_structure tool");

    const { program, workoutTemplates } = input;

    // 1. Validate completeness
    const validation = validateProgramCompleteness(program, workoutTemplates);

    console.info("Validation results:", {
      isComplete: validation.isComplete,
      missingFields: validation.missingFields,
      issueCount: validation.issues.length,
    });

    // 2. Calculate confidence
    const confidence = calculateProgramConfidence(program, workoutTemplates);

    console.info("Confidence score:", confidence);

    // 3. Determine if normalization is needed
    const shouldNormalize = shouldNormalizeProgram(program, confidence);

    console.info("Should normalize:", shouldNormalize);

    return {
      isValid: validation.isComplete,
      shouldNormalize,
      confidence,
      validationIssues: [...validation.missingFields, ...validation.issues],
    };
  },
};

/**
 * Tool 5: Normalize Program Data
 *
 * Fixes structural issues using AI normalization.
 * Only called if validation recommends normalization.
 */
export const normalizeProgramDataTool: Tool<ProgramDesignerContext> = {
  id: "normalize_program_data",
  description: `Normalize and fix structural issues in program data using AI.

ONLY CALL THIS IF validate_program_structure returns shouldNormalize: true.

This tool:
- Uses AI to fix schema violations and data inconsistencies
- Corrects field types, formats, and structure
- Adds missing required fields where possible
- Validates against program schema
- CRITICAL: Preserves s3DetailKey from original program
- Improves confidence score

Common issues fixed:
- Missing or incorrect field types
- Inconsistent phase structures
- Invalid date formats
- Missing workout template fields
- Incomplete phase objects

Returns: normalizedProgram, normalizationSummary, issuesFixed, confidence`,

  inputSchema: {
    type: "object",
    properties: {
      program: {
        type: "object",
        description: "The program object to normalize",
      },
      enableThinking: {
        type: "boolean",
        description: "Whether to enable extended thinking for normalization",
      },
    },
    required: ["program"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<ProgramNormalizationResult> {
    console.info("🔧 Executing normalize_program_data tool");

    const { program, enableThinking = false } = input;
    const originalS3DetailKey = program.s3DetailKey;

    // Run normalization
    const normalizationResult = await normalizeProgram(
      program,
      context.userId,
      enableThinking,
    );

    console.info("Normalization completed:", {
      isValid: normalizationResult.isValid,
      issuesFound: normalizationResult.issues.length,
      correctionsMade: normalizationResult.issues.filter(
        (i: any) => i.corrected,
      ).length,
    });

    // Generate normalization summary
    const normalizationSummary =
      generateNormalizationSummary(normalizationResult);

    // CRITICAL: Preserve s3DetailKey if it was lost during normalization
    // Note: normalizedData is ProgramGenerationData, not Program, so we use as unknown
    const normalizedProgram =
      normalizationResult.normalizedData as unknown as Program;
    if (originalS3DetailKey && !normalizedProgram.s3DetailKey) {
      normalizedProgram.s3DetailKey = originalS3DetailKey;
      console.info("✅ Preserved s3DetailKey:", originalS3DetailKey);
    }

    return {
      normalizedProgram,
      normalizationSummary,
      issuesFixed: normalizationResult.issues.filter((i: any) => i.corrected)
        .length,
      confidence: normalizationResult.confidence,
    };
  },
};

/**
 * Tool 6: Generate Program Summary
 *
 * Creates AI-generated summary for Pinecone and UI.
 */
export const generateProgramSummaryTool: Tool<ProgramDesignerContext> = {
  id: "generate_program_summary",
  description: `Generate natural language summary of the program using AI.

CALL THIS after program is finalized (post-normalization if needed).
Required before save_program_to_database.

This tool creates a 2-3 paragraph summary including:
- Program goals and target outcomes
- Phase structure and progression strategy
- Training frequency and total duration
- Key focus areas and periodization approach
- Notable features or customizations

The summary is used for:
- Semantic search in Pinecone vector database
- Coach conversation context
- UI display in program history
- Quick program comparison

Returns: summary (string)`,

  inputSchema: {
    type: "object",
    properties: {
      program: {
        type: "object",
        description: "The finalized program object",
      },
    },
    required: ["program"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<ProgramSummaryResult> {
    console.info("📝 Executing generate_program_summary tool");

    const { program } = input;

    // Generate AI summary
    const summary = await generateProgramSummary(program, []);

    console.info("Generated summary:", {
      summaryLength: summary.length,
    });

    return {
      summary,
    };
  },
};

/**
 * Tool 7: Save Program to Database
 *
 * Saves finalized program to DynamoDB, S3, and Pinecone.
 * Final step - only called after all previous steps complete successfully.
 */
export const saveProgramToDatabaseTool: Tool<ProgramDesignerContext> = {
  id: "save_program_to_database",
  description: `Save finalized program to DynamoDB, S3, and Pinecone.

⚠️ ONLY CALL THIS AS THE FINAL STEP after:
1. load_program_requirements (complete)
2. generate_phase_structure (complete)
3. generate_phase_workouts (all phases complete)
4. validate_program_structure (passed)
5. normalize_program_data (if needed)
6. generate_program_summary (complete)

This tool:
- Saves program metadata to DynamoDB
- Stores full workout templates in S3
- Stores program summary in Pinecone for semantic search
- Generates debug data for troubleshooting
- Returns success status with all storage IDs

DO NOT call this if:
- Validation failed (isValid: false)
- Required data is missing
- Any previous step failed

Returns: success, programId, s3Key, pineconeRecordId`,

  inputSchema: {
    type: "object",
    properties: {
      program: {
        type: "object",
        description: "The finalized program object",
      },
      summary: {
        type: "string",
        description: "The AI-generated program summary",
      },
      workoutTemplates: {
        type: "array",
        description: "All workout templates from all phases",
      },
      debugData: {
        type: "object",
        description: "Debug data collected during generation",
      },
    },
    required: ["program", "summary", "workoutTemplates"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<ProgramSaveResult> {
    console.info("💾 Executing save_program_to_database tool");

    const { program, summary, workoutTemplates, debugData = {} } = input;

    // 1. Save program metadata to DynamoDB
    console.info("Saving program to DynamoDB...");
    await saveProgram(program);
    console.info("✅ Program saved to DynamoDB");

    // 2. Store workout templates in S3 (if not already done)
    let s3Key = program.s3DetailKey;
    if (!s3Key) {
      console.info("Storing program details in S3...");
      s3Key = await storeProgramDetailsInS3(
        context.programId,
        context.userId,
        context.coachId,
        workoutTemplates,
        {
          goals: context.todoList.trainingGoals?.value
            ? [context.todoList.trainingGoals.value]
            : [],
          purpose: context.todoList.trainingGoals?.value || "Training program",
          successMetrics: [],
          equipmentConstraints: context.todoList.equipmentAccess?.value || [],
        },
        {
          generatedBy: context.coachId,
          aiModel: "claude-sonnet-4",
          confidence: 0.9,
        },
      );
      console.info("✅ Program details stored in S3:", s3Key);
    }

    // 3. Store program summary in Pinecone (fire-and-forget, non-blocking)
    console.info("Storing program summary in Pinecone (async)...");
    storeProgramSummaryInPinecone(context.userId, summary, program).catch(
      (error) => {
        console.error(
          "⚠️ Failed to store program in Pinecone (non-blocking):",
          error,
        );
        // Don't throw - this is fire-and-forget
      },
    );

    // 4. Store debug data
    await storeGenerationDebugData(
      "success",
      {
        userId: context.userId,
        conversationId: context.conversationId,
        coachId: context.coachId,
        programId: context.programId,
        sessionId: context.sessionId,
      },
      {
        todoList: context.todoList,
        conversationContext: context.conversationContext,
        method: "agent_v2",
        ...debugData,
        programStructure: {
          programId: program.programId,
          name: program.name,
          totalDays: program.totalDays,
          phases: program.phases.length,
          totalWorkouts: program.totalWorkouts,
        },
      },
    );

    console.info("✅ Program saved successfully");

    return {
      success: true,
      programId: program.programId,
      s3Key,
      pineconeRecordId: null, // Fire-and-forget mode, not available
    };
  },
};
