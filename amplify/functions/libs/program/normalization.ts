/**
 * Training Program Normalization Library
 *
 * This module provides intelligent normalization of training program data
 * to ensure consistent schema compliance with ProgramGenerationData structure.
 */

import { ProgramGenerationData } from "./types";
import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import { getCondensedSchema } from "../object-utils";
import { PROGRAM_SCHEMA } from "../schemas/program-schema";
import { NORMALIZATION_RESPONSE_SCHEMA } from "../schemas/program-normalization-schema";

export interface NormalizationResult {
  isValid: boolean;
  normalizedData: ProgramGenerationData;
  issues: NormalizationIssue[];
  confidence: number;
  summary: string;
  normalizationMethod: "tool" | "fallback" | "skipped";
}

export interface NormalizationIssue {
  type:
    | "structure"
    | "data_quality"
    | "cross_reference"
    | "date_logic"
    | "phase_logic";
  severity: "error" | "warning";
  field: string;
  description: string;
  corrected: boolean;
}

/**
 * Builds AI normalization prompt that instructs the model to normalize
 * training program data against the PROGRAM_SCHEMA
 *
 * Pattern: Follows workout normalization pattern with explicit schema comparison
 */
export const buildNormalizationPrompt = (programData: any): string => {
  return `
You are a training program data normalizer. Your job is to:

1. ANALYZE the training program data against the Training Program Schema
2. NORMALIZE the structure to match the schema exactly
3. FIX any structural, data, or logical issues found
4. RETURN properly formatted program data that conforms to the schema

⚠️ CRITICAL: YOUR TOOL RESPONSE MUST INCLUDE ALL REQUIRED FIELDS:

You MUST return a complete tool response with these REQUIRED fields:
- isValid (boolean) - NEVER omit this field
- normalizedData (object) - the complete training program object
- issues (array) - empty array if no issues
- confidence (number 0-1)
- summary (string)

🔴 ISVALID LOGIC - FOLLOW THIS EXACTLY:
- isValid = true  →  IF no issues found (issues array is empty)
- isValid = true  →  IF all issues were corrected (all issues have corrected: true)
- isValid = false →  ONLY IF critical issues could NOT be corrected

TOOL RESPONSE EXAMPLES (showing structure you must return):

Example 1 - Perfect data with no issues:
{
  "isValid": true,
  "normalizedData": { ...complete program object... },
  "issues": [],
  "confidence": 1.0,
  "summary": "Data is valid, no issues found"
}

Example 2 - Found and fixed 2 issues:
{
  "isValid": true,
  "normalizedData": { ...corrected program object... },
  "issues": [
    {"type":"structure","severity":"error","field":"phases","description":"Fixed phase gap","corrected":true},
    {"type":"data_quality","severity":"warning","field":"totalDays","description":"Corrected duration","corrected":true}
  ],
  "confidence": 0.95,
  "summary": "Fixed 2 issues - data is now valid"
}

Example 3 - Found uncorrectable issue:
{
  "isValid": false,
  "normalizedData": { ...original program object... },
  "issues": [
    {"type":"structure","severity":"error","field":"phases","description":"Missing phase data","corrected":false}
  ],
  "confidence": 0.6,
  "summary": "Critical issue could not be corrected"
}

CRITICAL INSTRUCTIONS:
- Transform the input data to match the Training Program Schema structure exactly
- Move misplaced fields to their correct locations as defined in the schema
- Preserve all existing data - only restructure, don't lose information
- Fix data type inconsistencies (ensure numbers are numbers, arrays are arrays, etc.)
- Don't add placeholder values for truly missing optional fields
- Ensure the output is a complete, valid training program object matching the schema

TRAINING PROGRAM-SPECIFIC VALIDATION FOCUS:

1. PROGRAM STRUCTURE: Verify core program metadata
   - Program name MUST be concise (50-60 characters max) - truncate if longer
   - Program description, goals are clear and present
   - Duration fields (totalDays, totalWeeks) are consistent
   - Experience level and intensity level are valid enum values

2. PHASE LOGIC: Ensure phases are sequential and non-overlapping
   - Phases must be in order (Phase 1, Phase 2, Phase 3, etc.)
   - startDay and endDay must be sequential (Phase 2 starts where Phase 1 ends)
   - No gaps or overlaps between phases
   - Total phase days must equal program totalDays
   - Each phase must have name, description, focusAreas

3. DATE CONSISTENCY: Validate all date-related fields
   - Check that duration calculations are correct
   - Verify phase days align with program duration
   - Ensure no impossible date logic

4. WORKOUT TEMPLATE VALIDATION: Each daily workout template must:
   - Have valid dayNumber and phaseId references
   - Include templateType (primary, optional, accessory)
   - Have required fields: name, description, workoutContent, coachingNotes
   - workoutContent must be a non-empty string (natural language workout description)
   - estimatedDuration should be realistic (typically 45-90 minutes)
   - requiredEquipment should be an array of strings
   - prescribedExercises is optional (lightweight array for filtering only)

5. CROSS-REFERENCES: Validate relationships
   - Phase indices in workout templates must correspond to valid phases
   - Day numbers must fall within valid phase ranges
   - Equipment referenced in workouts should align with program equipment list

6. DATA COMPLETENESS: Check for required information
   - Each phase needs goals, focus areas, and progression strategy
   - Workout templates need sufficient detail for execution
   - Success metrics and tracking approach should be defined

7. TRAINING FREQUENCY VALIDATION (CRITICAL):
   - Count workout days per week (exclude recovery/rest days)
   - Workout days = days with type: strength, conditioning, metcon, accessory, skill, power, etc.
   - Recovery days (type: recovery, mobility) do NOT count as workout days
   - Rest days (no workouts) do NOT count as workout days
   - Each week MUST have AT LEAST trainingFrequency workout days
   - If any week has fewer workout days than trainingFrequency, FLAG AS ERROR
   - Example: trainingFrequency=5 means each week needs 5+ workout days minimum

CRITICAL FIXES TO PRIORITIZE:
- TRAINING FREQUENCY VIOLATION - Add missing workout days to meet trainingFrequency requirement
- Program name exceeds 60 characters - MUST truncate to 50-60 chars max
- Inconsistent or overlapping phase date ranges
- Missing required fields in phases or workout templates
- Missing or empty workoutContent field (must be natural language string)
- Incorrect phaseId references in workout templates
- Misplaced fields at wrong nesting levels
- Invalid enum values (templateType, intensityLevel, etc.)
- workoutContent that is not a string or is empty

PROGRAM SCHEMA (condensed):
${JSON.stringify(getCondensedSchema(PROGRAM_SCHEMA), null, 2)}

EXPECTED OUTPUT FORMAT:
You must return a JSON object with this exact structure:

{
  "isValid": boolean,
  "normalizedData": Program,
  "issues": [
    {
      "type": "structure|data_quality|cross_reference|date_logic|phase_logic",
      "severity": "error|warning",
      "field": "field.path",
      "description": "Clear description of issue",
      "corrected": boolean
    }
  ],
  "confidence": number (0-1),
  "summary": "Brief summary of normalization results and any corrections made"
}

The "normalizedData" field MUST contain the training program data normalized to match the schema structure exactly.

TRAINING PROGRAM DATA TO NORMALIZE:
${JSON.stringify(programData, null, 2)}

Transform this training program data to conform to the expected schema structure and return the normalization response in the exact JSON format specified above. Do not include any markdown formatting.`;
};

/**
 * Normalizes training program data to ensure schema compliance
 * Only normalizes if structural issues are detected or confidence is low
 */
export const normalizeProgram = async (
  programData: any,
  userId: string,
  enableThinking: boolean = false,
): Promise<NormalizationResult> => {
  try {
    console.info("🔧 Starting training program normalization:", {
      userId,
      programName: programData.name,
      phases: programData.phases?.length || 0,
      totalDays: programData.totalDays,
    });

    // Use intelligent normalization for all cases that need normalization
    return await performNormalization(programData, userId, enableThinking);
  } catch (error) {
    console.error("Program normalization failed:", error);
    return {
      isValid: false,
      normalizedData: programData as ProgramGenerationData,
      issues: [
        {
          type: "structure",
          severity: "error",
          field: "normalization_system",
          description: `Normalization error: ${error instanceof Error ? error.message : "Unknown error"}`,
          corrected: false,
        },
      ],
      confidence: 0.3,
      summary: "Normalization failed due to system error",
      normalizationMethod: "fallback",
    };
  }
};

/**
 * Perform normalization of program data with two-tier model selection
 *
 * Tier 1 (Haiku 4): Fast structural validation for high-confidence generations (>= 0.80)
 * Tier 2 (Sonnet 4): Thorough validation for low-confidence or complex cases (< 0.80)
 *
 * Pattern: Matches workout/normalization.ts exactly
 */
const performNormalization = async (
  programData: any,
  userId: string,
  enableThinking: boolean = false,
): Promise<NormalizationResult> => {
  try {
    const normalizationPrompt = buildNormalizationPrompt(programData);
    const promptSizeKB = (normalizationPrompt.length / 1024).toFixed(1);

    // Determine which model to use based on extraction confidence
    const extractionConfidence = programData.metadata?.data_confidence || 0;
    const useHaiku = extractionConfidence >= 0.8;
    const selectedModel = useHaiku
      ? MODEL_IDS.EXECUTOR_MODEL_FULL
      : MODEL_IDS.PLANNER_MODEL_FULL;

    console.info("🔀 Two-tier normalization model selection:", {
      extractionConfidence,
      threshold: 0.8,
      selectedTier: useHaiku
        ? "Tier 1 (Haiku 4 - Fast)"
        : "Tier 2 (Sonnet 4 - Thorough)",
      selectedModel,
      reasoning: useHaiku
        ? "High confidence generation - use fast structural validation"
        : "Low confidence generation - use thorough validation with deep reasoning",
    });

    console.info("Program normalization call configuration:", {
      enableThinking,
      promptLength: normalizationPrompt.length,
      promptSizeKB: `${promptSizeKB}KB`,
      phases: programData.phases?.length || 0,
      model: useHaiku ? "Haiku 4" : "Sonnet 4",
    });

    let normalizationResult: any;
    let normalizationMethod: "tool" | "fallback" = "tool";

    // PRIMARY: Tool-based normalization with schema enforcement
    console.info("🎯 Attempting tool-based program normalization");

    try {
      const result = await callBedrockApi(
        normalizationPrompt,
        "program_normalization",
        selectedModel, // Use tier-selected model
        {
          temperature: TEMPERATURE_PRESETS.STRUCTURED,
          enableThinking,
          tools: {
            name: "normalize_program",
            description:
              "Normalize training program data to conform to the Program Schema",
            inputSchema: NORMALIZATION_RESPONSE_SCHEMA,
          },
          expectedToolName: "normalize_program",
        },
      );

      if (typeof result === "object" && result !== null) {
        console.info("✅ Tool-based program normalization succeeded");
        // Extract the input from tool use result (callBedrockApi returns { toolName, input, stopReason })
        normalizationResult = result.input || result;
        normalizationMethod = "tool";
      } else {
        throw new Error("Tool did not return structured data");
      }
    } catch (toolError) {
      // FALLBACK: Text-based normalization with parsing (using same tier-selected model)
      console.warn(
        "⚠️ Tool-based normalization failed, falling back to text parsing:",
        toolError,
      );
      console.info("🔄 Attempting fallback program normalization");

      const fallbackPrompt = `${normalizationPrompt}

Return ONLY valid JSON matching the normalization response structure (no markdown, no explanation):
${JSON.stringify(getCondensedSchema(NORMALIZATION_RESPONSE_SCHEMA), null, 2)}`;

      const fallbackResponse = (await callBedrockApi(
        fallbackPrompt,
        "program_normalization_fallback",
        selectedModel, // Use same tier-selected model for fallback
        {
          temperature: TEMPERATURE_PRESETS.STRUCTURED,
          prefillResponse: "{",
        },
      )) as string;

      normalizationResult = parseJsonWithFallbacks(fallbackResponse);
      normalizationMethod = "fallback";
      console.info("✅ Fallback program normalization succeeded");
    }

    // Validate the response structure
    if (!normalizationResult || typeof normalizationResult !== "object") {
      throw new Error("Response is not a valid object");
    }

    if (
      !normalizationResult.hasOwnProperty("isValid") ||
      !normalizationResult.hasOwnProperty("normalizedData")
    ) {
      throw new Error(
        "Response missing required fields (isValid, normalizedData)",
      );
    }

    return {
      isValid: normalizationResult.isValid || false,
      normalizedData: normalizationResult.normalizedData || programData,
      issues: normalizationResult.issues || [],
      confidence: normalizationResult.confidence || 0.8,
      summary: normalizationResult.summary || "Normalization completed",
      normalizationMethod,
    };
  } catch (error) {
    console.error("❌ Program normalization failed:", error);
    return {
      isValid: false,
      normalizedData: programData as ProgramGenerationData,
      issues: [
        {
          type: "structure",
          severity: "error",
          field: "normalization",
          description: `Normalization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          corrected: false,
        },
      ],
      confidence: 0.3,
      summary: "Normalization failed, using original data",
      normalizationMethod: "fallback",
    };
  }
};

/**
 * Determines if a training program should be normalized
 * Based on confidence score or structural red flags
 */
export const shouldNormalizeProgram = (
  programData: any,
  confidence: number,
): boolean => {
  // Always normalize if confidence is low
  if (confidence < 0.7) {
    return true;
  }

  // Check for structural red flags that warrant normalization
  const hasPhaseLogicIssues = !hasValidPhaseLogic(programData);
  const hasStructuralIssues = !hasCorrectRootStructure(programData);
  const hasTemplateIssues = !hasValidWorkoutTemplates(programData);

  return hasPhaseLogicIssues || hasStructuralIssues || hasTemplateIssues;
};

/**
 * Performs a quick structural validation to check if program has correct root-level properties
 * Returns true if structure is valid, false if normalization is needed
 */
const hasCorrectRootStructure = (programData: any): boolean => {
  // Expected root-level properties based on Program interface
  // Note: equipmentConstraints (not equipmentRequired), no totalWeeks field
  const expectedRootProperties = [
    "name",
    "description",
    "totalDays",
    "phases",
    "trainingGoals",
    "equipmentConstraints",
  ];

  // Check for required root properties and identify which are missing
  const missingProperties = expectedRootProperties.filter(
    (prop) => !programData.hasOwnProperty(prop),
  );

  if (missingProperties.length > 0) {
    console.info(
      `⚠️ Missing root properties (will be added during normalization): ${missingProperties.join(", ")}`,
    );
    return false;
  }

  // Check phases is an array
  if (!Array.isArray(programData.phases)) {
    console.info("❌ Phases is not an array");
    return false;
  }

  return true;
};

/**
 * Validates phase logic (sequential, non-overlapping, complete)
 */
const hasValidPhaseLogic = (programData: any): boolean => {
  if (!programData.phases || !Array.isArray(programData.phases)) {
    return false;
  }

  const phases = programData.phases;

  // Check if phases are sequential
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    // Check required phase fields
    if (!phase.hasOwnProperty("startDay") || !phase.hasOwnProperty("endDay")) {
      console.info(`❌ Phase ${i + 1} missing startDay or endDay`);
      return false;
    }

    // Check if phase days are valid
    if (phase.startDay >= phase.endDay) {
      console.info(`❌ Phase ${i + 1} has invalid day range`);
      return false;
    }

    // Check if phases are sequential (no gaps or overlaps)
    if (i > 0) {
      const previousPhase = phases[i - 1];
      if (phase.startDay !== previousPhase.endDay + 1) {
        console.info(
          `❌ Phase ${i + 1} does not follow previous phase sequentially`,
        );
        return false;
      }
    }
  }

  // Check if total phase days match program duration
  const lastPhase = phases[phases.length - 1];
  if (lastPhase.endDay !== programData.totalDays) {
    console.info("❌ Phase days do not match program duration");
    return false;
  }

  return true;
};

/**
 * Validates workout template structures (natural language format)
 * Note: Assembled programs store workouts in S3, not in phase objects
 */
const hasValidWorkoutTemplates = (programData: any): boolean => {
  if (!programData.phases || !Array.isArray(programData.phases)) {
    return false;
  }

  // If program has s3DetailKey, workouts are stored in S3 (assembled program)
  // This is valid - skip workout template validation
  if (programData.s3DetailKey) {
    console.info("✅ Program has s3DetailKey - workouts stored in S3 (valid)");
    return true;
  }

  // AGENT ARCHITECTURE: Phases may only have workoutCount, not full workoutTemplates array
  // In the agent flow, phases have { phaseId, name, startDay, endDay, workoutCount }
  // and workout templates are stored separately in the save tool
  // If ALL phases have workoutCount (even if no workoutTemplates array), this is valid
  const allPhasesHaveWorkoutCount = programData.phases.every(
    (phase: any) =>
      typeof phase.workoutCount === "number" && phase.workoutCount > 0,
  );

  if (allPhasesHaveWorkoutCount) {
    console.info(
      "✅ Agent architecture detected - phases have workoutCount (valid)",
    );
    return true;
  }

  // Otherwise, validate intermediate generation format (workouts in phases)
  for (const phase of programData.phases) {
    if (!phase.workoutTemplates || !Array.isArray(phase.workoutTemplates)) {
      console.info("❌ Phase missing workoutTemplates array");
      return false;
    }

    // Check each workout template (natural language format)
    for (const template of phase.workoutTemplates) {
      // Check required fields for natural language templates
      if (
        !template.name ||
        !template.description ||
        !template.workoutContent ||
        typeof template.workoutContent !== "string" ||
        template.workoutContent.trim().length === 0
      ) {
        console.info(
          "❌ Workout template missing required fields (name, description, or workoutContent)",
        );
        return false;
      }

      // Validate metadata fields
      if (
        typeof template.dayNumber !== "number" ||
        !template.templateType ||
        !["primary", "optional", "accessory"].includes(template.templateType) ||
        typeof template.estimatedDuration !== "number" ||
        !Array.isArray(template.requiredEquipment)
      ) {
        console.info("❌ Workout template has invalid metadata fields");
        return false;
      }

      // prescribedExercises is optional - if present, validate it's an array
      if (
        template.prescribedExercises !== undefined &&
        !Array.isArray(template.prescribedExercises)
      ) {
        console.info("❌ prescribedExercises must be an array if present");
        return false;
      }
    }
  }

  return true;
};

/**
 * Generates a human-readable summary of normalization results
 */
export const generateNormalizationSummary = (
  result: NormalizationResult,
): string => {
  const { isValid, issues, confidence, normalizationMethod } = result;

  if (normalizationMethod === "skipped") {
    return "Normalization skipped - program structure validated without normalization";
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const correctedCount = issues.filter((i) => i.corrected).length;

  const parts = [];

  if (isValid) {
    parts.push("✅ Program validated successfully");
  } else {
    parts.push("⚠️ Program validation found issues");
  }

  if (errorCount > 0) {
    parts.push(`${errorCount} error${errorCount > 1 ? "s" : ""}`);
  }

  if (warningCount > 0) {
    parts.push(`${warningCount} warning${warningCount > 1 ? "s" : ""}`);
  }

  if (correctedCount > 0) {
    parts.push(
      `${correctedCount} issue${correctedCount > 1 ? "s" : ""} corrected`,
    );
  }

  parts.push(`confidence: ${(confidence * 100).toFixed(0)}%`);

  return parts.join(" | ");
};
