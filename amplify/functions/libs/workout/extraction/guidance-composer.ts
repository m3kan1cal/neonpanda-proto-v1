/**
 * Guidance Composer
 * Combines base extraction guidance with discipline-specific guidance
 * to create targeted prompts that reduce token usage
 */

import type { CoachConfig } from "../../coach-creator/types";
import { buildBasePrompt } from "./base-guidance";
import { CROSSFIT_EXTRACTION_GUIDANCE } from "./crossfit-guidance";
import { POWERLIFTING_EXTRACTION_GUIDANCE } from "./powerlifting-guidance";
import { RUNNING_EXTRACTION_GUIDANCE } from "./running-guidance";
import { BODYBUILDING_EXTRACTION_GUIDANCE } from "./bodybuilding-guidance";
import { HYROX_EXTRACTION_GUIDANCE } from "./hyrox-guidance";
import { OLYMPIC_WEIGHTLIFTING_EXTRACTION_GUIDANCE } from "./olympic-weightlifting-guidance";
import { FUNCTIONAL_BODYBUILDING_EXTRACTION_GUIDANCE } from "./functional-bodybuilding-guidance";
import { CALISTHENICS_EXTRACTION_GUIDANCE } from "./calisthenics-guidance";
import { CIRCUIT_TRAINING_EXTRACTION_GUIDANCE } from "./circuit-training-guidance";
import { HYBRID_EXTRACTION_GUIDANCE } from "./hybrid-guidance";
import { logger } from "../../logger";

/**
 * Map of discipline names to their specific extraction guidance
 */
const DISCIPLINE_GUIDANCE_MAP: Record<string, string> = {
  crossfit: CROSSFIT_EXTRACTION_GUIDANCE,
  powerlifting: POWERLIFTING_EXTRACTION_GUIDANCE,
  running: RUNNING_EXTRACTION_GUIDANCE,
  bodybuilding: BODYBUILDING_EXTRACTION_GUIDANCE,
  hyrox: HYROX_EXTRACTION_GUIDANCE,
  olympic_weightlifting: OLYMPIC_WEIGHTLIFTING_EXTRACTION_GUIDANCE,
  functional_bodybuilding: FUNCTIONAL_BODYBUILDING_EXTRACTION_GUIDANCE,
  calisthenics: CALISTHENICS_EXTRACTION_GUIDANCE,
  circuit_training: CIRCUIT_TRAINING_EXTRACTION_GUIDANCE,
  hybrid: HYBRID_EXTRACTION_GUIDANCE,
};

/**
 * Get discipline-specific extraction guidance
 * Falls back to hybrid guidance if discipline not found (most flexible for mixed workouts)
 */
export function composeDisciplineGuidance(discipline: string): string {
  let guidance = DISCIPLINE_GUIDANCE_MAP[discipline];

  // If no guidance found (unrecognized discipline), fall back to hybrid
  // This handles: "strength_training", "unknown", and any other unrecognized values
  if (guidance === undefined) {
    logger.warn(
      `No extraction guidance for discipline: ${discipline}, falling back to hybrid guidance`,
    );
    guidance = HYBRID_EXTRACTION_GUIDANCE;
  }

  return guidance;
}

/**
 * Build targeted extraction prompt with base + discipline-specific guidance
 * This is the main function used by the extraction tool
 *
 * @param userMessage - The workout message from the user
 * @param coachConfig - Coach configuration for context
 * @param discipline - The detected workout discipline
 * @param userTimezone - User's timezone for temporal context
 * @param criticalTrainingDirective - Optional training directive
 * @returns Complete extraction prompt (base + discipline-specific)
 */
export function buildTargetedExtractionPrompt(
  userMessage: string,
  coachConfig: CoachConfig,
  discipline: string,
  userTimezone?: string,
  criticalTrainingDirective?: { content: string; enabled: boolean },
): string {
  // Build base prompt with universal guidance
  const basePrompt = buildBasePrompt(
    userMessage,
    coachConfig,
    userTimezone,
    criticalTrainingDirective,
  );

  // Get discipline-specific guidance
  const disciplineGuidance = composeDisciplineGuidance(discipline);

  // Build discipline enforcement instruction to prevent AI from changing discipline
  const disciplineEnforcementInstruction = `
CRITICAL DISCIPLINE ENFORCEMENT:
You MUST set discipline="${discipline}" and structure all exercise data under discipline_specific.${discipline}.
DO NOT change the discipline to a different value. The schema provided is specifically for ${discipline} workouts.
Even if the workout seems to fit another discipline better, use ${discipline} as instructed.`;

  // Combine: Base + Discipline Enforcement + Discipline-Specific (much smaller than all-in-one)
  if (disciplineGuidance) {
    return `${basePrompt}
${disciplineEnforcementInstruction}

---

DISCIPLINE-SPECIFIC GUIDANCE (${discipline.toUpperCase()}):

${disciplineGuidance}`;
  }

  // Return base + enforcement if no discipline-specific guidance
  return `${basePrompt}
${disciplineEnforcementInstruction}`;
}

/**
 * Get list of supported disciplines
 */
export function getSupportedDisciplines(): string[] {
  return Object.keys(DISCIPLINE_GUIDANCE_MAP);
}

/**
 * Check if a discipline has specific guidance
 */
export function hasDisciplineGuidance(discipline: string): boolean {
  const guidance = DISCIPLINE_GUIDANCE_MAP[discipline];
  return guidance !== undefined && guidance.length > 0;
}
