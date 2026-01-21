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
import {
  queryPineconeContext,
  MODEL_IDS,
  callBedrockApi,
  TEMPERATURE_PRESETS,
} from "../../api-helpers";
import {
  generatePhaseStructure,
  generateSinglePhaseWorkouts,
  assembleProgram,
} from "../../program/phase-generator";
import {
  validateParsedProgramDuration,
  validateParsedTrainingFrequency,
} from "../../program/validation-helpers";
import {
  parseProgramDuration,
  DEFAULT_PROGRAM_DURATION_DAYS,
} from "../../program/duration-parser";
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
  calculateProgramMetrics,
  checkTrainingFrequencyCompliance,
} from "./helpers";
import { calculateEndDate } from "../../program/calendar-utils";

/**
 * Calculate program end date from start date and total days
 * Uses the existing calendar-utils helper
 */
function ensureProgramDates(program: any): any {
  if (!program.endDate && program.startDate && program.totalDays) {
    console.info("📅 Calculating missing endDate", {
      startDate: program.startDate,
      totalDays: program.totalDays,
    });
    program.endDate = calculateEndDate(program.startDate, program.totalDays);
  }

  // Also set default startDate if missing
  if (!program.startDate) {
    console.info("📅 Setting default startDate to today");
    program.startDate = new Date().toISOString().split("T")[0];
    if (program.totalDays) {
      program.endDate = calculateEndDate(program.startDate, program.totalDays);
    }
  }

  return program;
}

/**
 * Tool-specific result types
 * Exported for use in agent and other modules
 */

/**
 * Result from load_program_requirements tool
 * Contains all context needed for program generation
 */
export interface ProgramRequirementsResult {
  coachConfig: CoachConfig;
  userProfile: UserProfile | null;
  pineconeContext: string;
  programDuration: number; // In days
  trainingFrequency: number; // Days per week
  trainingGoals: string[]; // Extracted from todoList
  equipmentConstraints: string[]; // Extracted from todoList
}

/**
 * Result from generate_phase_structure tool
 * Contains phase definitions and debug data
 */
export interface PhaseStructureResult {
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
 * Contains workout templates for a single phase
 */
export interface PhaseWorkoutsResult {
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
 * Contains validation status and decisions
 */
export interface ProgramValidationResult {
  isValid: boolean;
  shouldNormalize: boolean;
  shouldPrune: boolean; // True if training days exceed frequency by >20%
  confidence: number;
  validationIssues: string[];
  pruningMetadata?: {
    // Only present if shouldPrune is true
    currentTrainingDays: number;
    expectedTrainingDays: number;
    variance: number;
    targetTrainingDays: number;
  };
}

/**
 * Result from prune_excess_workouts tool
 * Contains pruned workout templates and storage updates
 */
export interface ProgramPruningResult {
  prunedWorkoutTemplates: WorkoutTemplate[];
  removedCount: number;
  keptCount: number;
  removalReasoning: string;
  phaseUpdates: Array<{
    phaseId: string;
    storageKey: string;
    updatedResult: {
      phaseId: string;
      phaseName: string;
      workoutTemplates: WorkoutTemplate[];
      debugData?: any;
    };
  }>;
}

/**
 * Result from normalize_program_data tool
 * Contains normalized program and summary
 */
export interface ProgramNormalizationResult {
  normalizedProgram: Program;
  normalizationSummary: string;
  issuesFixed: number;
  confidence: number;
}

/**
 * Result from generate_program_summary tool
 * Contains AI-generated program summary
 */
export interface ProgramSummaryResult {
  summary: string;
}

/**
 * Result from save_program_to_database tool
 * Contains save status and storage keys
 */
export interface ProgramSaveResult {
  success: boolean;
  programId: string;
  s3Key: string;
  pineconeRecordId: string | null; // "async-pending" if storage was attempted, null if skipped
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

    const pineconeContext =
      pineconeResult.success && pineconeResult.matches
        ? pineconeResult.matches
            .map((match: any) => match.content || "")
            .filter((content: string) => content.length > 0)
            .join("\n\n")
        : "";

    // 3. Parse program duration (supports "X weeks", "X months", vague terms, or days as number)
    const programDuration = parseProgramDuration(
      todoList.programDuration?.value,
      DEFAULT_PROGRAM_DURATION_DAYS,
    );

    // Validate parsed program duration
    validateParsedProgramDuration(
      programDuration,
      todoList.programDuration?.value,
    );

    // 4. Parse training frequency
    const trainingFrequency =
      typeof todoList.trainingFrequency?.value === "number"
        ? todoList.trainingFrequency.value
        : parseInt(todoList.trainingFrequency?.value || "4", 10);

    // Validate parsed training frequency
    validateParsedTrainingFrequency(
      trainingFrequency,
      todoList.trainingFrequency?.value,
    );

    // 5. Extract training goals (split comma-separated values into array)
    const trainingGoalsRaw = todoList.trainingGoals?.value || "";
    const trainingGoals =
      typeof trainingGoalsRaw === "string"
        ? trainingGoalsRaw
            .split(",")
            .map((g) => g.trim())
            .filter((g) => g.length > 0)
        : Array.isArray(trainingGoalsRaw)
          ? trainingGoalsRaw
          : [];

    // 6. Extract equipment constraints
    const equipmentAccessRaw = todoList.equipmentAccess?.value || "";
    const equipmentConstraints =
      typeof equipmentAccessRaw === "string"
        ? equipmentAccessRaw
            .split(",")
            .map((e) => e.trim())
            .filter((e) => e.length > 0)
        : Array.isArray(equipmentAccessRaw)
          ? equipmentAccessRaw
          : [];

    console.info("✅ Requirements loaded:", {
      coachName: coachConfig.coach_name,
      hasUserProfile: !!userProfile,
      pineconeContextLength: pineconeContext.length,
      programDuration,
      trainingFrequency,
      trainingGoals,
      equipmentConstraints,
    });

    return {
      coachConfig,
      userProfile,
      pineconeContext,
      programDuration,
      trainingFrequency,
      trainingGoals,
      equipmentConstraints,
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

MULTI-SESSION TRAINING DAYS:
- You can generate 1-5 workout templates per training day
- Multiple templates for the same day MUST share the same groupId
- Examples:
  * Simple day: 1 template (e.g., "Full Body Strength")
  * Complex day: 2-3 templates (e.g., "Squat Strength" + "Conditioning" + "Core Work")
- Use the same dayNumber for all templates on the same training day
- This allows tracking each session independently while grouping them logically

Template Structure:
- templateId: unique identifier for each workout template
- groupId: shared identifier linking templates to the same training day
- dayNumber: which day of the program (1 to totalDays)
- Multiple templates with same dayNumber + groupId = multi-session day

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

🚨 CRITICAL DATA PASSING:
You MUST pass the COMPLETE result from load_program_requirements as programContext.
Do NOT construct programContext manually - use the entire requirementsResult object.

Example:
  const requirementsResult = await load_program_requirements(...)
  const phaseStructureResult = await generate_phase_structure(...)

  // Simple usage - program requirements are auto-retrieved
  await generate_phase_workouts({
    phase: phaseStructureResult.phases[0],
    allPhases: phaseStructureResult.phases
  })

Input: Single phase definition from phase structure
Returns: Phase with complete workout templates
Note: Program requirements (coach config, training frequency, etc.) are automatically
retrieved from the stored load_program_requirements result.`,

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
    },
    required: ["phase", "allPhases"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext,
  ): Promise<PhaseWorkoutsResult> {
    console.info("🏋️ Executing generate_phase_workouts tool", {
      phaseName: input.phase?.name,
      phaseId: input.phase?.phaseId,
    });

    const { phase, allPhases } = input;

    // ============================================================
    // Retrieve programContext from stored tool results
    // ============================================================
    // This eliminates token bloat from Claude echoing large objects
    // through tool parameters. programContext is retrieved from memory
    // where it was stored by load_program_requirements.
    // ============================================================

    const programContext = context.getToolResult?.("requirements");

    if (!programContext) {
      throw new Error(
        "❌ Program requirements not loaded.\n\n" +
          "Ensure load_program_requirements tool was called successfully before generate_phase_workouts.\n" +
          "The requirements result is automatically stored and retrieved - no manual passing needed.",
      );
    }

    console.info("✅ Retrieved programContext from stored tool results");

    // Validate required fields in programContext
    const requiredFields = [
      "coachConfig",
      "pineconeContext",
      "programDuration",
      "trainingFrequency",
    ];
    const missingFields = requiredFields.filter(
      (field) => programContext[field] === undefined,
    );

    if (missingFields.length > 0) {
      const errorMsg =
        `❌ Stored program requirements are incomplete. Missing fields: ${missingFields.join(", ")}\n\n` +
        "This indicates load_program_requirements did not return all required data.\n" +
        "Expected fields: coachConfig, pineconeContext, programDuration, trainingFrequency";
      console.error(errorMsg);
      console.error("Retrieved programContext structure:", {
        hasCoachConfig: !!programContext.coachConfig,
        hasPineconeContext: !!programContext.pineconeContext,
        hasProgramDuration: !!programContext.programDuration,
        hasTrainingFrequency: !!programContext.trainingFrequency,
        hasUserProfile: programContext.userProfile !== undefined,
        actualKeys: Object.keys(programContext),
      });
      throw new Error(errorMsg);
    }

    // Additional validation for coachConfig structure
    if (
      programContext.coachConfig &&
      !programContext.coachConfig.selected_personality?.primary_template
    ) {
      // Enhanced error diagnostics
      const receivedStructure = {
        hasCoachConfig: !!programContext.coachConfig,
        coachConfigKeys: programContext.coachConfig
          ? Object.keys(programContext.coachConfig)
          : [],
        hasSelectedPersonality:
          !!programContext.coachConfig?.selected_personality,
        hasPrimaryTemplate:
          !!programContext.coachConfig?.selected_personality?.primary_template,
        hasGeneratedPrompts: !!programContext.coachConfig?.generated_prompts,
        hasSelectedMethodology:
          !!programContext.coachConfig?.selected_methodology,
        hasTechnicalConfig: !!programContext.coachConfig?.technical_config,
      };

      const errorMsg =
        "❌ Retrieved coachConfig is incomplete or malformed.\n\n" +
        "Expected: selected_personality.primary_template, generated_prompts, selected_methodology, technical_config\n" +
        `Received: ${JSON.stringify(receivedStructure, null, 2)}\n\n` +
        "This indicates load_program_requirements returned incomplete coach configuration data.";

      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.info("✅ Program requirements validation passed");

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

CRITICAL: To prevent token bloat and timeouts, pass ONLY:
- Lightweight program object (name, programId, totalDays, startDate, trainingGoals, equipmentConstraints, description, trainingFrequency)
- Array of phaseIds (strings only)
The tool will automatically retrieve full phase workout data from storage.

Returns: isValid, shouldNormalize, confidence, validationIssues`,

  inputSchema: {
    type: "object",
    properties: {
      program: {
        type: "object",
        description:
          "LIGHTWEIGHT program object with basic fields: name, programId, totalDays, startDate, trainingGoals (array), equipmentConstraints (array), description, trainingFrequency. Do NOT include phases array or full workout data.",
      },
      phaseIds: {
        type: "array",
        description:
          "Array of phaseIds from generated phases - tool will retrieve full data from storage",
        items: { type: "string" },
      },
    },
    required: ["program", "phaseIds"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext & { getToolResult?: (key: string) => any },
  ): Promise<ProgramValidationResult> {
    console.info("✅ Executing validate_program_structure tool");

    let { program, phaseIds } = input;

    // Retrieve stored phase workout results and phase structure
    let workoutTemplates: WorkoutTemplate[] = [];
    const getToolResult = context.getToolResult;
    if (getToolResult && phaseIds) {
      // ROBUST: Auto-populate missing required fields from stored requirements
      const requirementsResult = getToolResult("requirements");
      if (requirementsResult) {
        // Auto-populate trainingGoals if missing or empty
        if (
          !program.trainingGoals ||
          (Array.isArray(program.trainingGoals) &&
            program.trainingGoals.length === 0)
        ) {
          program.trainingGoals = requirementsResult.trainingGoals || [];
          if (program.trainingGoals.length > 0) {
            console.info(
              `🔧 Auto-populated trainingGoals from requirements: ${program.trainingGoals.length} goals`,
            );
          }
        }

        // Auto-populate equipmentConstraints if missing or empty
        if (
          !program.equipmentConstraints ||
          (Array.isArray(program.equipmentConstraints) &&
            program.equipmentConstraints.length === 0)
        ) {
          program.equipmentConstraints =
            requirementsResult.equipmentConstraints || [];
          if (program.equipmentConstraints.length > 0) {
            console.info(
              `🔧 Auto-populated equipmentConstraints from requirements: ${program.equipmentConstraints.length} constraints`,
            );
          }
        }

        // Auto-populate trainingFrequency if missing
        if (
          !program.trainingFrequency &&
          requirementsResult.trainingFrequency
        ) {
          program.trainingFrequency = requirementsResult.trainingFrequency;
          console.info(
            `🔧 Auto-populated trainingFrequency from requirements: ${program.trainingFrequency}`,
          );
        }
      }

      // Get phase structure
      const phaseStructure = getToolResult("phase_structure");

      const phaseWorkoutResults = phaseIds
        .map((phaseId: string) => getToolResult(`phase_workouts:${phaseId}`))
        .filter(Boolean);

      // Extract all workout templates
      workoutTemplates = phaseWorkoutResults.flatMap(
        (result: any) => result.workoutTemplates || [],
      );

      console.info(
        `📦 Retrieved ${workoutTemplates.length} workouts from ${phaseWorkoutResults.length} phases`,
      );

      // CRITICAL: Assemble phases array on program object before validation
      if (
        phaseStructure &&
        phaseStructure.phases &&
        phaseStructure.phases.length > 0
      ) {
        program.phases = phaseStructure.phases.map((phase: any) => {
          // Find workout results for this phase
          const phaseWorkouts = phaseWorkoutResults.find(
            (result: any) => result.phaseId === phase.phaseId,
          );

          return {
            phaseId: phase.phaseId,
            name: phase.name,
            description: phase.description,
            startDay: phase.startDay,
            endDay: phase.endDay,
            durationDays: phase.durationDays,
            workoutCount: phaseWorkouts?.workoutTemplates?.length || 0,
          };
        });

        console.info(
          `📦 Assembled ${program.phases.length} phases on program object`,
        );
      }
    }

    // Calculate missing dates before validation
    program = ensureProgramDates(program);

    // Validate program completeness
    const isValid = !!(
      program.programId &&
      program.name &&
      program.startDate &&
      program.endDate &&
      program.totalDays &&
      program.phases &&
      program.phases.length > 0 &&
      workoutTemplates &&
      workoutTemplates.length > 0
    );

    // Calculate confidence based on data completeness
    let confidence = 1.0;
    const validationIssues: string[] = [];

    if (!program.programId) validationIssues.push("Missing programId");
    if (!program.name) validationIssues.push("Missing name");
    if (!program.startDate) validationIssues.push("Missing startDate");
    if (!program.endDate) validationIssues.push("Missing endDate");
    if (!program.totalDays) validationIssues.push("Missing totalDays");
    if (!program.phases || program.phases.length === 0)
      validationIssues.push("Missing phases");
    if (!workoutTemplates || workoutTemplates.length === 0)
      validationIssues.push("No workout templates");

    // Deduct confidence for issues
    confidence -= validationIssues.length * 0.1;
    confidence = Math.max(0, Math.min(1, confidence));

    // Determine if normalization is needed
    const shouldNormalize = shouldNormalizeProgram(program, confidence);

    // Build result object
    const result: ProgramValidationResult = {
      isValid,
      shouldNormalize,
      shouldPrune: false,
      confidence,
      validationIssues,
    };

    // Validation: Check training day coverage and determine if pruning is needed
    if (getToolResult) {
      const requirementsResult = getToolResult("requirements");
      if (requirementsResult && workoutTemplates.length > 0) {
        const programDurationDays = requirementsResult.programDuration || 0;
        const trainingFrequency = requirementsResult.trainingFrequency || 0;

        const frequencyCheck = checkTrainingFrequencyCompliance(
          workoutTemplates,
          programDurationDays,
          trainingFrequency,
        );

        if (frequencyCheck.shouldPrune) {
          result.shouldPrune = true;
          result.pruningMetadata = frequencyCheck.pruningMetadata;
        }
      }
    }

    console.info("Validation results:", {
      isValid,
      confidence,
      shouldNormalize,
      shouldPrune: result.shouldPrune,
      issueCount: validationIssues.length,
    });

    return result;
  },
};

/**
 * Tool 5: Prune Excess Workouts
 *
 * Removes excess workout days when training frequency is exceeded.
 * Only called if validation returns shouldPrune: true.
 */
export const pruneExcessWorkoutsTool: Tool<ProgramDesignerContext> = {
  id: "prune_excess_workouts",
  description: `Remove excess workout days to match user's requested training frequency.

ONLY CALL THIS IF validate_program_structure returns shouldPrune: true.

This tool uses AI to intelligently remove the least essential training days while:
- Maintaining program progression and logic
- Preserving key workouts (primary strength, skill work)
- Keeping workouts evenly distributed across phases
- Maintaining program coherence

The AI will prioritize removal of:
- Optional accessory work
- Extra conditioning sessions
- Redundant training days
- Days that don't compromise phase goals

CRITICAL: This tool automatically updates the stored phase workout results with pruned templates.
Subsequent tools (like save_program_to_database) will retrieve the pruned versions, ensuring
consistency between S3 storage and DynamoDB program structure.

Returns: prunedWorkoutTemplates, removedCount, keptCount, removalReasoning, phaseUpdates`,

  inputSchema: {
    type: "object",
    properties: {
      phaseIds: {
        type: "array",
        description:
          "Array of phaseIds - tool will retrieve full workout data from storage",
        items: { type: "string" },
      },
      targetTrainingDays: {
        type: "number",
        description: "Target number of training days (from pruningMetadata)",
      },
      currentTrainingDays: {
        type: "number",
        description: "Current number of training days (from pruningMetadata)",
      },
    },
    required: ["phaseIds", "targetTrainingDays", "currentTrainingDays"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext & { getToolResult?: (key: string) => any },
  ): Promise<ProgramPruningResult> {
    console.info("✂️ Executing prune_excess_workouts tool");

    const { phaseIds, targetTrainingDays, currentTrainingDays } = input;
    const excessDays = currentTrainingDays - targetTrainingDays;

    console.info("Pruning parameters:", {
      currentDays: currentTrainingDays,
      targetDays: targetTrainingDays,
      excessDays,
      phaseCount: phaseIds.length,
    });

    // Retrieve all workout templates from stored phase results
    const getToolResult = context.getToolResult;
    if (!getToolResult) {
      console.error(
        "⚠️ Pruning cannot proceed - getToolResult not available in context. " +
          "Returning empty result. Program will save with original workouts.",
      );
      return {
        prunedWorkoutTemplates: [],
        removedCount: 0,
        keptCount: 0,
        removalReasoning:
          "Pruning skipped - tool context unavailable. Program saved with original workout count.",
        phaseUpdates: [],
      };
    }

    // Retrieve phase results (best-effort - work with what we have)
    const phaseWorkoutResults: any[] = [];
    const missingPhaseIds: string[] = [];

    for (const phaseId of phaseIds) {
      const result = getToolResult(`phase_workouts:${phaseId}`);
      if (!result) {
        missingPhaseIds.push(phaseId);
      } else {
        phaseWorkoutResults.push(result);
      }
    }

    // Warn if any phase results are missing but continue with available phases
    if (missingPhaseIds.length > 0) {
      console.warn(
        `⚠️ Pruning proceeding with incomplete data - ${missingPhaseIds.length} phase result(s) not found: ${missingPhaseIds.join(", ")}. ` +
          `Will prune based on available ${phaseWorkoutResults.length} phase(s). ` +
          `Program will save regardless of pruning outcome.`,
      );

      // If we have no phases at all, return early
      if (phaseWorkoutResults.length === 0) {
        console.error(
          "⚠️ Pruning cannot proceed - no phase results available. " +
            "Returning empty result. Program will save with original workouts.",
        );
        return {
          prunedWorkoutTemplates: [],
          removedCount: 0,
          keptCount: 0,
          removalReasoning:
            "Pruning skipped - no phase workout data available. Program saved with original workout count.",
          phaseUpdates: [],
        };
      }
    }

    const allWorkoutTemplates = phaseWorkoutResults.flatMap(
      (result: any) => result.workoutTemplates || [],
    );

    console.info(
      `📦 Retrieved ${allWorkoutTemplates.length} workout templates from ${phaseWorkoutResults.length} phases`,
    );

    // Build prompt for AI to select which workouts to remove
    const workoutMetadata = allWorkoutTemplates.map((w: WorkoutTemplate) => ({
      templateId: w.templateId,
      dayNumber: w.dayNumber,
      phaseId: w.phaseId,
      name: w.name,
      type: w.type,
      estimatedDuration: w.estimatedDuration,
    }));

    const prompt = `You are a training program optimizer. You need to remove ${excessDays} training days from this program to match the user's requested training frequency.

## CURRENT PROGRAM STRUCTURE

Total workout templates: ${allWorkoutTemplates.length}
Unique training days: ${currentTrainingDays}
Target training days: ${targetTrainingDays}
Days to remove: ${excessDays}

## WORKOUT METADATA

${JSON.stringify(workoutMetadata, null, 2)}

## YOUR TASK

Select ${excessDays} training days (dayNumber values) to REMOVE from the program.

## PRIORITIZATION FOR REMOVAL (remove these first):
1. Days with type: "accessory" or "optional"
2. Extra conditioning/metcon days
3. Days in later phases (preserve early foundation work)
4. Days with longer estimated duration (easier to skip)
5. Days that create clusters (remove to spread out rest days)

## PRESERVATION PRIORITIES (keep these):
1. Days with type: "primary" or "strength"
2. Early phase foundation work
3. Skill development days
4. Days with progressive overload markers
5. Workouts critical to program goals

## CONSTRAINTS
- Remove ENTIRE training days (all templates sharing the same dayNumber)
- Maintain even distribution across the program
- Don't create large gaps in training
- Preserve program progression logic

Return an array of dayNumber values to REMOVE (not keep).`;

    const response = await callBedrockApi(
      "", // systemPrompt
      prompt, // userMessage
      MODEL_IDS.PLANNER_MODEL_FULL, // Use Sonnet for nuanced reasoning
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED, // 0.2 for structured data generation
        enableThinking: true,
        tools: [
          {
            name: "select_days_to_remove",
            description: "Select training days to remove from the program",
            inputSchema: {
              type: "object",
              properties: {
                daysToRemove: {
                  type: "array",
                  description:
                    "Array of dayNumber values to remove from the program",
                  items: { type: "number" },
                },
                reasoning: {
                  type: "string",
                  description:
                    "Brief explanation of why these days were selected for removal",
                },
              },
              required: ["daysToRemove", "reasoning"],
            },
          },
        ],
      },
    );

    // Extract tool result from response (response.input contains the tool arguments)
    const toolResult = typeof response === "string" ? {} : response.input || {};
    const daysToRemove: number[] = toolResult.daysToRemove || [];
    const reasoning: string = toolResult.reasoning || "No reasoning provided";

    console.info("🔍 AI selected days to remove:", {
      daysToRemove,
      count: daysToRemove.length,
      reasoning,
    });

    // Filter out workouts for the selected days
    const prunedWorkoutTemplates = allWorkoutTemplates.filter(
      (w: WorkoutTemplate) => !daysToRemove.includes(w.dayNumber),
    );

    const removedCount =
      allWorkoutTemplates.length - prunedWorkoutTemplates.length;
    const removedDays = new Set(
      allWorkoutTemplates
        .filter((w: WorkoutTemplate) => daysToRemove.includes(w.dayNumber))
        .map((w: WorkoutTemplate) => w.dayNumber),
    ).size;

    console.info("✅ Pruning complete:", {
      originalTemplates: allWorkoutTemplates.length,
      prunedTemplates: prunedWorkoutTemplates.length,
      removedTemplates: removedCount,
      removedDays,
      targetRemovalDays: excessDays,
    });

    // ============================================================
    // OBSERVABILITY: Log pruning effectiveness (non-blocking)
    // We prioritize program delivery over perfect frequency adherence
    // ============================================================
    if (daysToRemove.length === 0) {
      console.warn(
        `⚠️ Pruning ineffective - AI did not select any days to remove. ` +
          `Target was to remove ${excessDays} excess training days. ` +
          `Program will be saved with excess days. ` +
          `AI response: ${reasoning}`,
      );
    }

    const pruningDeficit = excessDays - removedDays;
    if (pruningDeficit > 1) {
      console.warn(
        `⚠️ Pruning incomplete - removed ${removedDays} days but needed to remove ${excessDays} days. ` +
          `Deficit: ${pruningDeficit} days. Program will have more training days than requested. ` +
          `AI selected ${daysToRemove.length} day numbers: ${daysToRemove.join(", ")}. ` +
          `AI reasoning: ${reasoning}`,
      );
    } else if (removedDays > excessDays + 1) {
      console.warn(
        `⚠️ Pruning over-achieved - removed ${removedDays} days, target was ${excessDays}. ` +
          `Program will have fewer training days than expected.`,
      );
    } else {
      console.info(
        `✅ Pruning achieved target - removed ${removedDays} days (target: ${excessDays})`,
      );
    }

    // ============================================================
    // CRITICAL: Build phase updates with pruned templates
    // The agent will apply these updates to stored phase results,
    // ensuring save_program_to_database retrieves pruned templates
    // ============================================================
    console.info("📝 Building phase updates with pruned workout templates...");

    // ============================================================
    // VALIDATION: Filter to only templates with phaseId (required for storage)
    // Calculate counts based on VALID templates only for accuracy
    // ============================================================

    // First, filter allWorkoutTemplates to only valid ones
    const validAllTemplates = allWorkoutTemplates.filter(
      (t: WorkoutTemplate) => !!t.phaseId,
    );
    const invalidTemplatesInOriginal =
      allWorkoutTemplates.length - validAllTemplates.length;

    if (invalidTemplatesInOriginal > 0) {
      console.warn(
        `⚠️ Found ${invalidTemplatesInOriginal} template(s) in original set missing phaseId. ` +
          `These cannot be saved and will be excluded from counts.`,
      );
    }

    // Filter pruned templates to only those with phaseId
    const validPrunedTemplates = prunedWorkoutTemplates.filter(
      (t: WorkoutTemplate) => !!t.phaseId,
    );
    const invalidTemplatesInPruned =
      prunedWorkoutTemplates.length - validPrunedTemplates.length;

    if (invalidTemplatesInPruned > 0) {
      const templateIds = prunedWorkoutTemplates
        .filter((t: WorkoutTemplate) => !t.phaseId)
        .map((t: WorkoutTemplate) => t.templateId || "unknown")
        .join(", ");
      console.warn(
        `⚠️ Pruning found ${invalidTemplatesInPruned} template(s) missing phaseId: ${templateIds}. ` +
          `These will be excluded from save. This indicates malformed workout data.`,
      );
    }

    // Recalculate removedCount based on VALID templates only
    // This ensures: validRemoved + validKept = totalValid (math consistency)
    const validRemovedCount =
      validAllTemplates.length - validPrunedTemplates.length;

    console.info("📊 Valid template counts:", {
      originalValid: validAllTemplates.length,
      prunedValid: validPrunedTemplates.length,
      removedValid: validRemovedCount,
      excluded: invalidTemplatesInOriginal,
      mathCheck: `${validRemovedCount} removed + ${validPrunedTemplates.length} kept = ${validAllTemplates.length} total`,
    });

    // Group pruned templates by phaseId
    const prunedByPhase = validPrunedTemplates.reduce(
      (acc: Record<string, WorkoutTemplate[]>, template: WorkoutTemplate) => {
        const phaseId = template.phaseId!; // Safe - filtered above
        if (!acc[phaseId]) {
          acc[phaseId] = [];
        }
        acc[phaseId].push(template);
        return acc;
      },
      {},
    );

    // Build phase updates for each phase (agent will apply to storage)
    // Best-effort: only update phases that have both original results and pruned templates
    const phaseUpdates = phaseIds
      .map((phaseId: string) => {
        const originalPhaseResult = getToolResult(`phase_workouts:${phaseId}`);
        const prunedTemplatesForPhase = prunedByPhase[phaseId] || [];

        if (!originalPhaseResult) {
          console.warn(
            `  ⚠️ Skipping update for ${phaseId} - original phase result not found`,
          );
          return null;
        }

        console.info(
          `  Updated ${phaseId}: ${originalPhaseResult.workoutTemplates?.length || 0} → ${prunedTemplatesForPhase.length} templates`,
        );

        return {
          phaseId,
          storageKey: `phase_workouts:${phaseId}`,
          updatedResult: {
            ...originalPhaseResult,
            workoutTemplates: prunedTemplatesForPhase,
          },
        };
      })
      .filter((update: any) => update !== null);

    // Return truthful counts based on VALID templates (those that can actually be saved)
    // Ensures: removedCount + keptCount = originalValidCount (math consistency)
    return {
      prunedWorkoutTemplates: validPrunedTemplates, // Only templates that can be saved
      removedCount: validRemovedCount, // Removed from valid templates
      keptCount: validPrunedTemplates.length, // Valid templates kept
      removalReasoning: reasoning,
      phaseUpdates,
    };
  },
};

/**
 * Tool 6: Normalize Program Data
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
 * Tool 7: Generate Program Summary
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

    // Generate AI summary with extended thinking enabled
    const summary = await generateProgramSummary(program, [], true);

    console.info("Generated summary:", {
      summaryLength: summary.length,
    });

    return {
      summary,
    };
  },
};

/**
 * Tool 8: Save Program to Database
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
      debugData: {
        type: "object",
        description: "Optional debug data collected during generation",
      },
    },
    required: ["program", "summary"],
  },

  async execute(
    input: any,
    context: ProgramDesignerContext & { getToolResult?: (key: string) => any },
  ): Promise<ProgramSaveResult> {
    console.info("💾 Executing save_program_to_database tool");

    let { program, summary, debugData = {} } = input;

    const getToolResult = context.getToolResult;

    // ============================================================
    // CRITICAL: ALWAYS retrieve workouts from stored phase results
    // This is the SINGLE SOURCE OF TRUTH - never trust Claude's input
    //
    // NOTE: If prune_excess_workouts was called, the stored phase results
    // will already contain pruned templates (updated by the agent after pruning).
    // ============================================================
    console.info(
      "📦 Retrieving workouts from stored phase results (single source of truth)...",
    );

    if (!getToolResult) {
      throw new Error(
        "Cannot retrieve workout templates - getToolResult not available in context",
      );
    }

    if (!program.phases || program.phases.length === 0) {
      throw new Error(
        "Cannot retrieve workout templates - no phases defined on program object",
      );
    }

    const phaseIds = program.phases.map((phase: any) => phase.phaseId);
    console.info(
      `🔍 Looking for workouts in ${phaseIds.length} phases:`,
      phaseIds,
    );

    const phaseWorkoutResults = phaseIds
      .map((phaseId: string) => {
        const result = getToolResult(`phase_workouts:${phaseId}`);
        if (result) {
          console.info(
            `  ✓ Found ${result.workoutTemplates?.length || 0} workouts for ${phaseId}`,
          );
        } else {
          console.warn(`  ✗ No workouts found for ${phaseId}`);
        }
        return result;
      })
      .filter(Boolean);

    const workoutTemplates = phaseWorkoutResults.flatMap(
      (result: any) => result.workoutTemplates || [],
    );

    console.info(
      `📦 Retrieved ${workoutTemplates.length} workout templates from ${phaseWorkoutResults.length} phases`,
    );

    // Validation: Ensure we have workouts
    if (workoutTemplates.length === 0) {
      throw new Error(
        `No workout templates found in stored phase results. ` +
          `Phases checked: ${phaseIds.join(", ")}. ` +
          `Ensure generate_phase_workouts completed successfully for all phases.`,
      );
    }

    // Validation: Check training day coverage (account for multi-session days)
    const requirementsResult = getToolResult("requirements");
    if (requirementsResult) {
      const programDurationDays = requirementsResult.programDuration || 0;
      const trainingFrequency = requirementsResult.trainingFrequency || 0;

      // Calculate metrics using shared helper
      const metrics = calculateProgramMetrics(workoutTemplates);
      const expectedTrainingDays = Math.floor(
        (programDurationDays / 7) * trainingFrequency,
      );

      // Group templates by day to identify multi-session days
      const templatesByDay = workoutTemplates.reduce(
        (acc: Record<number, any[]>, t: any) => {
          if (!acc[t.dayNumber]) acc[t.dayNumber] = [];
          acc[t.dayNumber].push(t);
          return acc;
        },
        {} as Record<number, any[]>,
      );

      const multiSessionDays = Object.entries(templatesByDay).filter(
        ([_, templates]) => (templates as any[]).length > 1,
      ).length;

      console.info("🔍 Workout template analysis:", {
        totalTemplates: metrics.totalWorkoutTemplates,
        uniqueTrainingDays: metrics.uniqueTrainingDays,
        expectedTrainingDays,
        multiSessionDays,
        averageSessionsPerDay: metrics.averageSessionsPerDay,
        dayCoverage: `${metrics.uniqueTrainingDays}/${expectedTrainingDays} days (${Math.round((metrics.uniqueTrainingDays / expectedTrainingDays) * 100)}%)`,
      });

      // Validate day coverage (allow ±20% variance)
      const variance = expectedTrainingDays * 0.2;
      if (
        Math.abs(metrics.uniqueTrainingDays - expectedTrainingDays) > variance
      ) {
        console.warn(
          `⚠️ Training day coverage variance: expected ~${expectedTrainingDays} days, got ${metrics.uniqueTrainingDays} days`,
        );
      }

      // Validate reasonable sessions per day (1-5 templates per day is normal)
      const templatesPerDay = parseFloat(metrics.averageSessionsPerDay);
      if (templatesPerDay > 5) {
        console.warn(
          `⚠️ Unusually high sessions per day: ${templatesPerDay.toFixed(1)} templates/day (expected 1-5)`,
        );
      }

      // Validate that training days are properly distributed throughout the program
      const dayNumbers: number[] = Array.from<number>(
        new Set(workoutTemplates.map((w: any) => w.dayNumber as number)),
      ).sort((a, b) => a - b);

      // Check for gaps in coverage
      const gaps: string[] = [];
      let expectedDay = 1;
      for (const dayNum of dayNumbers) {
        // Allow small gaps (rest days), but flag large gaps
        const gap = dayNum - expectedDay;
        if (gap > 7) {
          // More than a week gap
          gaps.push(
            `Gap of ${gap} days between day ${expectedDay} and day ${dayNum}`,
          );
        }
        expectedDay = dayNum + 1;
      }

      if (gaps.length > 0) {
        console.warn("⚠️ Large gaps in training day coverage:", gaps);
      }

      // Validate day numbers don't exceed program duration
      const invalidDays = dayNumbers.filter(
        (d: number) => d < 1 || d > programDurationDays,
      );
      if (invalidDays.length > 0) {
        console.error(
          `❌ Invalid day numbers detected: ${invalidDays.join(", ")} (program is ${programDurationDays} days)`,
        );
      }

      // Log coverage summary
      console.info("✅ Day coverage summary:", {
        firstDay: dayNumbers[0],
        lastDay: dayNumbers[dayNumbers.length - 1],
        totalDaysWithWorkouts: dayNumbers.length,
        programDuration: programDurationDays,
        expectedTrainingDays: expectedTrainingDays,
        coveragePercentage: `${Math.round((dayNumbers.length / programDurationDays) * 100)}%`,
        trainingDayCoverage: `${Math.round((dayNumbers.length / expectedTrainingDays) * 100)}%`,
        hasGaps: gaps.length > 0,
      });

      // Validate training day coverage against expected training days (not total program days)
      const trainingDayCoveragePercent =
        (dayNumbers.length / expectedTrainingDays) * 100;
      if (trainingDayCoveragePercent < 90) {
        console.warn(
          `⚠️ Training day coverage below 90%: ${trainingDayCoveragePercent.toFixed(0)}% (${dayNumbers.length}/${expectedTrainingDays} expected). ` +
            `Missing training days may indicate incomplete program generation.`,
        );
      }

      // Check for missing days at end of program (possible taper/rest period)
      const lastWorkoutDay = dayNumbers[dayNumbers.length - 1];
      const daysWithoutWorkouts = programDurationDays - lastWorkoutDay;
      if (daysWithoutWorkouts > 0) {
        console.info(
          `ℹ️ Final ${daysWithoutWorkouts} day(s) of program have no scheduled workouts (days ${lastWorkoutDay + 1}-${programDurationDays}). ` +
            `This may be intentional taper/recovery period.`,
        );
      }
    }

    // ROBUST: Auto-populate missing required fields from stored requirements
    if (requirementsResult) {
      // Auto-populate trainingGoals if missing or empty
      if (
        !program.trainingGoals ||
        (Array.isArray(program.trainingGoals) &&
          program.trainingGoals.length === 0)
      ) {
        program.trainingGoals = requirementsResult.trainingGoals || [];
        if (program.trainingGoals.length > 0) {
          console.info(
            `🔧 Auto-populated trainingGoals: ${program.trainingGoals.length} goals`,
          );
        }
      }

      // Auto-populate equipmentConstraints if missing or empty
      if (
        !program.equipmentConstraints ||
        (Array.isArray(program.equipmentConstraints) &&
          program.equipmentConstraints.length === 0)
      ) {
        program.equipmentConstraints =
          requirementsResult.equipmentConstraints || [];
        if (program.equipmentConstraints.length > 0) {
          console.info(
            `🔧 Auto-populated equipmentConstraints: ${program.equipmentConstraints.length} constraints`,
          );
        }
      }

      // Auto-populate trainingFrequency if missing
      if (!program.trainingFrequency && requirementsResult.trainingFrequency) {
        program.trainingFrequency = requirementsResult.trainingFrequency;
        console.info(
          `🔧 Auto-populated trainingFrequency: ${program.trainingFrequency}`,
        );
      }
    }

    // CRITICAL: Auto-populate missing identity fields from context
    // Claude often omits these when constructing the program object
    console.info("Validating and auto-populating identity fields...");

    if (!program.userId) {
      program.userId = context.userId;
      console.info(`🔧 Auto-populated userId: ${program.userId}`);
    }

    if (!program.programId) {
      program.programId = context.programId;
      console.info(`🔧 Auto-populated programId: ${program.programId}`);
    }

    if (!program.coachIds || program.coachIds.length === 0) {
      program.coachIds = [context.coachId];
      console.info(`🔧 Auto-populated coachIds: ${program.coachIds}`);
    }

    // Validate critical fields are present
    const missingFields = [];
    if (!program.userId) missingFields.push("userId");
    if (!program.programId) missingFields.push("programId");
    if (!program.coachIds || program.coachIds.length === 0)
      missingFields.push("coachIds");

    if (missingFields.length > 0) {
      throw new Error(
        `Program object is missing critical fields after auto-population: ${missingFields.join(", ")}. ` +
          `Context may be invalid: userId=${context.userId}, programId=${context.programId}, coachId=${context.coachId}`,
      );
    }

    console.info("✅ All identity fields validated and present");

    // ============================================================
    // Auto-populate coachNames from coachIds if missing or empty
    // ============================================================
    if (!program.coachNames || program.coachNames.length === 0) {
      console.info("Resolving coach names from coach IDs...");
      const coachNames: string[] = [];
      for (const coachId of program.coachIds) {
        try {
          const coachConfig = await getCoachConfig(context.userId, coachId);
          if (coachConfig?.coach_name) {
            coachNames.push(coachConfig.coach_name);
          }
        } catch (error) {
          console.error(`Failed to resolve coach name for ${coachId}:`, error);
        }
      }
      program.coachNames = coachNames;
      console.info(`🔧 Auto-populated coachNames: ${coachNames.length} names`);
    }

    // ============================================================
    // Initialize tracking fields if not present
    // ============================================================
    console.info("Initializing program tracking fields...");

    if (program.completedWorkouts === undefined) {
      program.completedWorkouts = 0;
      console.info("🔧 Initialized completedWorkouts: 0");
    }

    if (program.skippedWorkouts === undefined) {
      program.skippedWorkouts = 0;
      console.info("🔧 Initialized skippedWorkouts: 0");
    }

    if (program.adherenceRate === undefined) {
      program.adherenceRate = 0;
      console.info("🔧 Initialized adherenceRate: 0");
    }

    // Calculate totalWorkouts from workout templates
    if (program.totalWorkouts === undefined) {
      program.totalWorkouts = workoutTemplates.length;
      console.info(
        `🔧 Calculated totalWorkouts: ${program.totalWorkouts} from templates`,
      );
    }

    if (program.lastActivityAt === undefined) {
      program.lastActivityAt = null;
      console.info("🔧 Initialized lastActivityAt: null");
    }

    if (program.pausedAt === undefined) {
      program.pausedAt = null;
      console.info("🔧 Initialized pausedAt: null");
    }

    if (program.pausedDuration === undefined) {
      program.pausedDuration = 0;
      console.info("🔧 Initialized pausedDuration: 0");
    }

    if (!program.adaptationLog) {
      program.adaptationLog = [];
      console.info("🔧 Initialized adaptationLog: []");
    }

    if (!program.dayCompletionStatus) {
      program.dayCompletionStatus = {};
      console.info("🔧 Initialized dayCompletionStatus: {}");
    }

    // Remove creationConversationId (no longer used)
    if (program.creationConversationId) {
      delete program.creationConversationId;
      console.info("🔧 Removed creationConversationId (deprecated)");
    }

    console.info("✅ All tracking fields initialized");

    // ============================================================
    // Initialize status and currentDay BEFORE validation
    // ============================================================
    if (!program.status) {
      program.status = "active";
      console.info("🔧 Initialized status: active");
    }

    if (program.currentDay === undefined) {
      program.currentDay = 1; // New programs start at day 1
      console.info("🔧 Initialized currentDay: 1");
    }

    // ============================================================
    // Validate program structure compliance
    // ============================================================
    console.info("Validating program structure...");

    const requiredFields = {
      // Identity
      userId: program.userId,
      programId: program.programId,
      coachIds: program.coachIds,
      coachNames: program.coachNames,

      // Core metadata
      name: program.name,
      description: program.description,
      status: program.status,

      // Dates
      startDate: program.startDate,
      endDate: program.endDate,
      totalDays: program.totalDays,
      currentDay: program.currentDay,

      // Training parameters
      trainingGoals: program.trainingGoals,
      equipmentConstraints: program.equipmentConstraints,
      trainingFrequency: program.trainingFrequency,

      // Tracking
      completedWorkouts: program.completedWorkouts,
      skippedWorkouts: program.skippedWorkouts,
      adherenceRate: program.adherenceRate,
      totalWorkouts: program.totalWorkouts,

      // Structure
      phases: program.phases,
      adaptationLog: program.adaptationLog,
      dayCompletionStatus: program.dayCompletionStatus,
    };

    const missingValidationFields = Object.entries(requiredFields)
      .filter(([_, value]) => value === undefined || value === null)
      .map(([field]) => field);

    const emptyArrayFields = Object.entries(requiredFields)
      .filter(
        ([field, value]) =>
          ["coachIds", "coachNames", "trainingGoals", "phases"].includes(
            field,
          ) &&
          Array.isArray(value) &&
          value.length === 0,
      )
      .map(([field]) => field);

    if (missingValidationFields.length > 0) {
      const errorMsg = `Program validation failed - missing required fields: ${missingValidationFields.join(", ")}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    if (emptyArrayFields.length > 0) {
      const errorMsg = `Program validation failed - empty required arrays: ${emptyArrayFields.join(", ")}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    console.info("✅ Program structure validation passed", {
      totalFields: Object.keys(requiredFields).length,
      coachCount: program.coachIds.length,
      phaseCount: program.phases.length,
      totalWorkouts: program.totalWorkouts,
      hasS3Key: !!program.s3DetailKey,
    });

    // Store workout templates in S3 FIRST (if not already done)
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

      // CRITICAL: Update program object with s3DetailKey BEFORE saving
      program.s3DetailKey = s3Key;
    }

    // 4. Save program metadata to DynamoDB (with s3DetailKey)
    console.info("Saving program to DynamoDB...");
    await saveProgram(program);
    console.info("✅ Program saved to DynamoDB with complete structure:", {
      programId: program.programId,
      name: program.name,
      status: program.status,

      // Structure
      totalDays: program.totalDays,
      phaseCount: program.phases.length,
      totalWorkouts: program.totalWorkouts,

      // Tracking (initialized)
      completedWorkouts: program.completedWorkouts,
      skippedWorkouts: program.skippedWorkouts,
      adherenceRate: program.adherenceRate,

      // Keys
      hasS3DetailKey: !!program.s3DetailKey,
      coachCount: program.coachIds.length,

      // Validation
      allFieldsPresent: true,
      validationPassed: true,
    });

    // 5. Store program summary in Pinecone (async, attempt but don't block)
    console.info("Storing program summary in Pinecone (async)...");
    let pineconeAttempted = false;
    storeProgramSummaryInPinecone(context.userId, summary, program)
      .then(() => {
        console.info("✅ Program stored in Pinecone successfully");
      })
      .catch((error) => {
        console.error(
          "⚠️ Failed to store program in Pinecone (non-blocking):",
          error,
        );
        // Don't throw - this is fire-and-forget
      });
    pineconeAttempted = true;

    // 6. Store debug data
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
      pineconeRecordId: pineconeAttempted ? "async-pending" : null,
    };
  },
};
