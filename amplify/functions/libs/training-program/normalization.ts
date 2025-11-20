/**
 * Training Program Normalization Library
 *
 * This module provides intelligent normalization of training program data
 * to ensure consistent schema compliance with TrainingProgramGenerationData structure.
 */

import { TrainingProgramGenerationData } from "./types";
import { callBedrockApi } from "../api-helpers";
import { parseJsonWithFallbacks } from "../response-utils";
import {
  getTrainingProgramStructureSchemaWithContext,
  getWorkoutTemplateArraySchemaWithContext,
} from "../schemas/training-program-schema";

export interface NormalizationResult {
  isValid: boolean;
  normalizedData: TrainingProgramGenerationData;
  issues: NormalizationIssue[];
  confidence: number;
  summary: string;
  normalizationMethod: "ai" | "skipped";
}

export interface NormalizationIssue {
  type: "structure" | "data_quality" | "cross_reference" | "date_logic" | "phase_logic";
  severity: "error" | "warning";
  field: string;
  description: string;
  corrected: boolean;
}

/**
 * Builds AI normalization prompt that instructs the model to normalize
 * training program data against the expected schema structure
 *
 * Returns both static (cacheable) and dynamic (program-specific) portions
 */
export const buildNormalizationPrompt = (programData: any): { staticPrompt: string, dynamicPrompt: string } => {
  // STATIC PORTION (cacheable - instructions, schemas, expected format)
  const staticPrompt = `
You are a training program data normalizer. Your job is to:

1. ANALYZE the training program data against the expected schema structure
2. NORMALIZE the structure to match the schema exactly
3. FIX any structural, data, or logical issues found
4. RETURN properly formatted program data that conforms to the schema

CRITICAL INSTRUCTIONS:
- Transform the input data to match the Training Program schema structure exactly
- Move misplaced fields to their correct locations as defined in the schema
- Preserve all existing data - only restructure, don't lose information
- Fix data type inconsistencies (ensure numbers are numbers, arrays are arrays, etc.)
- Don't add placeholder values for truly missing optional fields
- Ensure the output is a complete, valid training program object matching the schema

RESPONSE REQUIREMENTS:
- Return ONLY valid JSON - no markdown, no code blocks, no explanations
- Do not wrap the JSON in \`\`\`json blocks
- Start directly with { and end with }
- Ensure all JSON is properly escaped and parseable

TRAINING PROGRAM-SPECIFIC VALIDATION FOCUS:

1. PROGRAM STRUCTURE: Verify core program metadata
   - Program name, description, goals are clear and present
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

CRITICAL FIXES TO PRIORITIZE:
- Inconsistent or overlapping phase date ranges
- Missing required fields in phases or workout templates
- Missing or empty workoutContent field (must be natural language string)
- Incorrect phaseId references in workout templates
- Misplaced fields at wrong nesting levels
- Invalid enum values (templateType, intensityLevel, etc.)
- workoutContent that is not a string or is empty

${getTrainingProgramStructureSchemaWithContext()}

WORKOUT TEMPLATE SCHEMA (for nested templates):
${getWorkoutTemplateArraySchemaWithContext({
  phaseName: "Example Phase",
  phaseDescription: "Example phase description",
  phaseDurationDays: 28,
  phaseStartDay: 1,
  programName: "Training Program",
  trainingFrequency: 4,
  equipment: ["barbell", "dumbbells", "pullup bar"],
  goals: ["strength", "conditioning"],
  userId: "example_user_id",
})}

EXPECTED OUTPUT FORMAT:
You must return a JSON object with this exact structure:

{
  "isValid": boolean,
  "normalizedData": TrainingProgramGenerationData,
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

The "normalizedData" field MUST contain the training program data normalized to match the schema structure exactly.`;

  // DYNAMIC PORTION (not cacheable - changes per program)
  const dynamicPrompt = `TRAINING PROGRAM DATA TO NORMALIZE:
${JSON.stringify(programData, null, 2)}

Transform this training program data to conform to the expected schema structure and return the normalization response in the exact JSON format specified above. Do not include any markdown formatting.`;

  return { staticPrompt, dynamicPrompt };
};

/**
 * Normalizes training program data to ensure schema compliance
 * Only normalizes if structural issues are detected or confidence is low
 */
export const normalizeTrainingProgram = async (
  programData: any,
  userId: string,
  enableThinking: boolean = false
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
      normalizedData: programData as TrainingProgramGenerationData,
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
      normalizationMethod: "ai",
    };
  }
};

/**
 * Perform normalization of training program data
 */
const performNormalization = async (
  programData: any,
  userId: string,
  enableThinking: boolean = false
): Promise<NormalizationResult> => {
  try {
    const { staticPrompt, dynamicPrompt } = buildNormalizationPrompt(programData);

    console.info("Program normalization call configuration:", {
      enableThinking,
      staticPromptLength: staticPrompt.length,
      dynamicPromptLength: dynamicPrompt.length,
      phases: programData.phases?.length || 0,
    });

    const normalizationResponse = await callBedrockApi(
      staticPrompt,
      dynamicPrompt,
      undefined, // Use default model
      {
        enableThinking,
        staticPrompt,
        dynamicPrompt,
        prefillResponse: "{", // Force JSON response format
      }
    ) as string; // No tools used, always returns string

    // Parse JSON with cleaning and fixing (handles markdown-wrapped JSON and common issues)
    const normalizationResult = parseJsonWithFallbacks(normalizationResponse);

    // Validate the response structure
    if (!normalizationResult || typeof normalizationResult !== "object") {
      throw new Error("Response is not a valid object");
    }

    if (
      !normalizationResult.hasOwnProperty("isValid") ||
      !normalizationResult.hasOwnProperty("normalizedData")
    ) {
      throw new Error(
        "Response missing required fields (isValid, normalizedData)"
      );
    }

    return {
      isValid: normalizationResult.isValid || false,
      normalizedData: normalizationResult.normalizedData || programData,
      issues: normalizationResult.issues || [],
      confidence: normalizationResult.confidence || 0.8,
      summary: normalizationResult.summary || "Normalization completed",
      normalizationMethod: "ai",
    };
  } catch (error) {
    console.error("Program normalization failed:", error);
    return {
      isValid: false,
      normalizedData: programData as TrainingProgramGenerationData,
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
      normalizationMethod: "ai",
    };
  }
};

/**
 * Determines if a training program should be normalized
 * Based on confidence score or structural red flags
 */
export const shouldNormalizeTrainingProgram = (
  programData: any,
  confidence: number
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
  // Expected root-level properties based on TrainingProgramGenerationData
  const expectedRootProperties = [
    "name",
    "description",
    "totalDays",
    "totalWeeks",
    "phases",
    "trainingGoals",
    "equipmentRequired",
  ];

  // Check for required root properties
  const hasRequiredProperties = expectedRootProperties.every(
    (prop) => programData.hasOwnProperty(prop)
  );

  if (!hasRequiredProperties) {
    console.info("❌ Missing required root properties");
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
          `❌ Phase ${i + 1} does not follow previous phase sequentially`
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
 */
const hasValidWorkoutTemplates = (programData: any): boolean => {
  if (!programData.phases || !Array.isArray(programData.phases)) {
    return false;
  }

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
        typeof template.workoutContent !== 'string' ||
        template.workoutContent.trim().length === 0
      ) {
        console.info("❌ Workout template missing required fields (name, description, or workoutContent)");
        return false;
      }

      // Validate metadata fields
      if (
        typeof template.dayNumber !== 'number' ||
        !template.templateType ||
        !['primary', 'optional', 'accessory'].includes(template.templateType) ||
        typeof template.estimatedDuration !== 'number' ||
        !Array.isArray(template.requiredEquipment)
      ) {
        console.info("❌ Workout template has invalid metadata fields");
        return false;
      }

      // prescribedExercises is optional - if present, validate it's an array
      if (template.prescribedExercises !== undefined && !Array.isArray(template.prescribedExercises)) {
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
  result: NormalizationResult
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
    parts.push(`${correctedCount} issue${correctedCount > 1 ? "s" : ""} corrected`);
  }

  parts.push(`confidence: ${(confidence * 100).toFixed(0)}%`);

  return parts.join(" | ");
};
