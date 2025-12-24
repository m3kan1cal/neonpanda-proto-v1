/**
 * Coach Personality Utilities
 *
 * Reusable functions for extracting and formatting coach personality, methodology,
 * and configuration details for use in AI prompts (conversations, program generation, etc.)
 */

import type { CoachConfig, DynamoDBItem } from "../coach-creator/types";
import type { UserProfile } from "../user/types";

/**
 * Extract coach configuration data from DynamoDB item or direct config
 */
export function extractCoachConfig(
  coachConfigInput: CoachConfig | DynamoDBItem<CoachConfig> | undefined | null,
): CoachConfig {
  if (!coachConfigInput) {
    throw new Error("coachConfig is required but was undefined or null");
  }

  // Check if it's a DynamoDB item with attributes wrapper
  if ("attributes" in coachConfigInput) {
    return coachConfigInput.attributes as CoachConfig;
  }

  // Validate it has required structure before returning
  if (!coachConfigInput.selected_personality?.primary_template) {
    throw new Error(
      "coachConfig missing required field: selected_personality.primary_template",
    );
  }

  if (!coachConfigInput.generated_prompts) {
    throw new Error("coachConfig missing required field: generated_prompts");
  }

  return coachConfigInput;
}

/**
 * Build a comprehensive coach personality and methodology context string
 * This ensures consistency across conversational AI and training program generation
 */
export interface CoachPersonalityContext {
  // Core identity
  coachName: string;
  primaryPersonality: string;
  secondaryInfluences: string[];

  // Generated prompts (the detailed personality descriptions)
  personalityPrompt: string;
  methodologyPrompt: string;
  motivationPrompt: string;
  safetyPrompt: string;
  communicationStyle: string;
  learningAdaptationPrompt: string;
  genderTonePrompt: string;

  // Technical details
  primaryMethodology: string;
  specializations: string[];
  programmingFocus: string[];
  experienceLevel: string;

  // Safety constraints
  contraindicatedExercises: string[];
  requiredModifications: string[];
  injuryConsiderations: string[];

  // Methodology details
  methodologyReasoning: string;
  programmingEmphasis: string;
  periodizationApproach: string;

  // User context
  criticalTrainingDirective?: {
    enabled: boolean;
    content: string;
  };
}

/**
 * Extract structured coach personality context from config
 */
export function getCoachPersonalityContext(
  coachConfig: CoachConfig | DynamoDBItem<CoachConfig> | undefined | null,
  userProfile?: UserProfile | null,
): CoachPersonalityContext {
  // Extract and validate config (will throw if invalid)
  const config = extractCoachConfig(coachConfig);

  // Additional validation for nested structures
  if (!config.selected_personality) {
    throw new Error("coachConfig missing required field: selected_personality");
  }

  if (!config.generated_prompts) {
    throw new Error("coachConfig missing required field: generated_prompts");
  }

  if (!config.selected_methodology) {
    throw new Error("coachConfig missing required field: selected_methodology");
  }

  if (!config.technical_config) {
    throw new Error("coachConfig missing required field: technical_config");
  }

  return {
    // Core identity
    coachName: config.coach_name || "Coach",
    primaryPersonality: config.selected_personality.primary_template,
    secondaryInfluences: config.selected_personality.secondary_influences || [],

    // Generated prompts
    personalityPrompt: config.generated_prompts.personality_prompt,
    methodologyPrompt: config.generated_prompts.methodology_prompt,
    motivationPrompt: config.generated_prompts.motivation_prompt,
    safetyPrompt: config.generated_prompts.safety_integrated_prompt,
    communicationStyle: config.generated_prompts.communication_style,
    learningAdaptationPrompt:
      config.generated_prompts.learning_adaptation_prompt,
    genderTonePrompt:
      config.generated_prompts.gender_tone_prompt ||
      "Maintain a balanced, professional coaching approach that blends confidence with empathy.",

    // Technical details
    primaryMethodology: config.selected_methodology.primary_methodology,
    specializations: config.technical_config?.specializations || [],
    programmingFocus: config.technical_config?.programming_focus || [],
    experienceLevel:
      config.technical_config?.experience_level || "intermediate",

    // Safety constraints
    contraindicatedExercises:
      config.technical_config?.safety_constraints?.contraindicated_exercises ||
      [],
    requiredModifications:
      config.technical_config?.safety_constraints?.required_modifications || [],
    injuryConsiderations: config.technical_config?.injury_considerations || [],

    // Methodology details
    methodologyReasoning:
      config.selected_methodology.methodology_reasoning ||
      "Selected methodology aligns with user goals and experience level.",
    programmingEmphasis:
      config.selected_methodology.programming_emphasis || "balanced",
    periodizationApproach:
      config.selected_methodology.periodization_approach || "systematic",

    // User context
    criticalTrainingDirective: userProfile?.criticalTrainingDirective,
  };
}

/**
 * Format coach personality context into a prompt string for AI consumption
 * This is the key reusable function for building consistent coach prompts
 */
export interface FormatCoachPersonalityOptions {
  includeDetailedPersonality?: boolean; // Include full personality_prompt
  includeMethodologyDetails?: boolean; // Include full methodology_prompt
  includeMotivation?: boolean; // Include motivation_prompt
  includeSafety?: boolean; // Include safety constraints
  includeCriticalDirective?: boolean; // Include user's critical training directive
  context?: string; // Additional context (e.g., "program creation", "workout design")
}

export function formatCoachPersonalityForPrompt(
  personalityContext: CoachPersonalityContext,
  options: FormatCoachPersonalityOptions = {},
): string {
  const {
    includeDetailedPersonality = true,
    includeMethodologyDetails = true,
    includeMotivation = true,
    includeSafety = true,
    includeCriticalDirective = true,
    context = "",
  } = options;

  const sections: string[] = [];

  // Context-specific introduction
  if (context) {
    sections.push(
      `YOU ARE ${personalityContext.coachName.toUpperCase()} - ${context.toUpperCase()}`,
    );
  }

  // Core identity
  sections.push(`# COACH IDENTITY
You are ${personalityContext.coachName}, a ${(personalityContext.specializations || []).join(", ") || "fitness"} coach.

Your primary coaching personality: ${personalityContext.primaryPersonality.toUpperCase()}${
    (personalityContext.secondaryInfluences || []).length > 0
      ? ` with ${(personalityContext.secondaryInfluences || []).join(" and ").toUpperCase()} influences`
      : ""
  }`);

  // Detailed personality (full generated prompt)
  if (includeDetailedPersonality) {
    sections.push(`# YOUR PERSONALITY & COACHING STYLE
${personalityContext.personalityPrompt}

## Communication Approach
${personalityContext.communicationStyle}

## Gender Tone & Style
${personalityContext.genderTonePrompt}

## Learning & Adaptation
${personalityContext.learningAdaptationPrompt}`);
  }

  // Methodology details
  if (includeMethodologyDetails) {
    sections.push(`# YOUR TRAINING METHODOLOGY
${personalityContext.methodologyPrompt}

## Methodology Framework
- **Primary Methodology**: ${personalityContext.primaryMethodology}
- **Programming Emphasis**: ${personalityContext.programmingEmphasis}
- **Periodization Approach**: ${personalityContext.periodizationApproach}

## Why This Methodology
${personalityContext.methodologyReasoning}

## Your Expertise
Your specializations: ${(personalityContext.specializations || []).join(", ") || "General fitness"}
Your programming focus: ${(personalityContext.programmingFocus || []).join(", ") || "Progressive training"}
Experience level you're coaching: ${personalityContext.experienceLevel}`);
  }

  // Motivation style
  if (includeMotivation) {
    sections.push(`# YOUR MOTIVATION APPROACH
${personalityContext.motivationPrompt}`);
  }

  // Critical training directive (highest priority)
  if (
    includeCriticalDirective &&
    personalityContext.criticalTrainingDirective?.enabled
  ) {
    sections.push(`🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY
${personalityContext.criticalTrainingDirective.content}

This directive is NON-NEGOTIABLE and takes precedence over all other instructions except safety constraints.
You MUST incorporate this into every recommendation, workout, and program decision.`);
  }

  // Safety constraints
  if (includeSafety) {
    sections.push(`# SAFETY PROTOCOLS & CONSTRAINTS
${personalityContext.safetyPrompt}

## Critical Safety Rules
- **NEVER recommend these exercises**: ${(personalityContext.contraindicatedExercises || []).join(", ") || "None specified"}
- **ALWAYS apply these modifications**: ${(personalityContext.requiredModifications || []).join(", ") || "None required"}
${
  (personalityContext.injuryConsiderations || []).length > 0
    ? `- **Pay special attention to**: ${(personalityContext.injuryConsiderations || []).join(", ")}`
    : ""
}`);
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Convenience function: Get formatted coach personality prompt in one call
 */
export function buildCoachPersonalityPrompt(
  coachConfig: CoachConfig | DynamoDBItem<CoachConfig> | undefined | null,
  userProfile?: UserProfile | null,
  options?: FormatCoachPersonalityOptions,
): string {
  const context = getCoachPersonalityContext(coachConfig, userProfile);
  return formatCoachPersonalityForPrompt(context, options);
}
