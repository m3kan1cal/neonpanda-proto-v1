/**
 * Coach Creator Agent Helpers
 *
 * Helper functions for the coach creator agent.
 */

import { storeDebugDataInS3 } from "../../api-helpers";
import type { CoachConfig } from "../../coach-creator/types";
import {
  COACH_PERSONALITY_TEMPLATES,
  METHODOLOGY_TEMPLATES,
  SAFETY_RULES,
  COACH_MODIFICATION_OPTIONS,
} from "../../coach-creator/coach-generation";
import { generateCoachName } from "../../coach-creator/tool-generation";

/**
 * Enforce blocking decisions from validation
 *
 * Code-level enforcement that prevents save_coach_config_to_database from
 * executing when validation returned isValid: false. This ensures blocking
 * decisions are AUTHORITATIVE, not advisory.
 *
 * Returns error result if tool should be blocked, null if should proceed.
 */
export const enforceValidationBlocking = (
  toolId: string,
  validationResult: any,
): {
  error: boolean;
  blocked: boolean;
  reason: string;
  validationIssues?: string[];
} | null => {
  // No validation result yet, allow tool to proceed
  if (!validationResult) {
    return null;
  }

  // Validation passed, allow tool to proceed
  if (validationResult.isValid !== false) {
    return null;
  }

  // Block save_coach_config_to_database if validation failed
  if (toolId === "save_coach_config_to_database") {
    console.error(
      "⛔ BLOCKING save_coach_config_to_database: Validation returned isValid=false",
      {
        validationIssues: validationResult.validationIssues,
        confidence: validationResult.confidence,
        toolAttempted: toolId,
      },
    );

    return {
      error: true,
      blocked: true,
      reason: `Cannot save coach config - validation failed: ${validationResult.validationIssues?.join(", ") || "Unknown issues"}`,
      validationIssues: validationResult.validationIssues,
    };
  }

  // Tool is not subject to blocking enforcement
  return null;
};

/**
 * Store coach generation debug data in S3
 *
 * Centralized helper for storing coach generation debug information.
 * Handles success, error, and intermediate scenarios.
 */
export const storeGenerationDebugData = async (
  type: "success" | "error" | "validation-failure",
  context: {
    userId: string;
    sessionId: string;
    coachId?: string;
  },
  data: {
    coachName?: string;
    primaryPersonality?: string;
    primaryMethodology?: string;
    method?: string;
    validationErrors?: string[];
    generationError?: string;
    [key: string]: any;
  },
) => {
  try {
    const debugData = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      sessionId: context.sessionId,
      coachId: context.coachId,
      type,
      ...data,
    };

    const metadata = {
      type: `coach-creation-${type}`,
      userId: context.userId,
      sessionId: context.sessionId,
      ...(context.coachId && { coachId: context.coachId }),
      ...(data.method && { method: data.method }),
      ...(data.generationError && { errorMessage: data.generationError }),
    };

    await storeDebugDataInS3(
      JSON.stringify(debugData, null, 2),
      metadata,
      "coach-config",
    );

    console.info(`✅ Stored ${type} debug data in S3`);
  } catch (err) {
    console.warn(`⚠️ Failed to store ${type} data in S3 (non-critical):`, err);
  }
};

/**
 * Assemble complete coach config from tool results
 *
 * Combines all tool results into a complete CoachConfig object.
 * Used by the agent to build the final configuration for validation and saving.
 */
export async function assembleCoachConfig(
  userId: string,
  sessionRequirements: any,
  personalitySelection: any,
  methodologySelection: any,
  coachPrompts: any,
  creationTimestamp: string,
): Promise<CoachConfig> {
  const {
    session,
    safetyProfile,
    methodologyPreferences,
    genderPreference,
    trainingFrequency,
    goalTimeline,
    preferredIntensity,
    specializations,
    sessionSummary,
  } = sessionRequirements;

  // Generate coach ID
  const coachId = `user_${userId}_coach_${Date.now()}`;

  // Generate creative, contextual coach name using AI
  console.info("🎨 Generating creative coach name via AI...");
  const nameResult = await generateCoachName({
    personalityTemplate: personalitySelection.primaryTemplate,
    personalityReasoning: personalitySelection.selectionReasoning,
    methodologyTemplate: methodologySelection.primaryMethodology,
    methodologyReasoning: methodologySelection.methodologyReasoning,
    genderPreference,
    primaryGoals:
      session.primaryGoals ||
      methodologyPreferences.focus?.join(", ") ||
      "fitness",
    specializations: specializations || [],
    userAge: session.age,
    experienceLevel: session.sophisticationLevel,
  });

  const coachName = nameResult.coachName;
  const coachDescription = nameResult.coachDescription;

  // Build time constraints
  const timeConstraints = {
    preferred_time: safetyProfile.timeConstraints?.preferred_time || "flexible",
    session_duration: safetyProfile.timeConstraints?.session_length
      ? `${safetyProfile.timeConstraints.session_length} minutes`
      : "45-60 minutes",
    weekly_frequency: `${trainingFrequency} days per week`,
  };

  // Build safety constraints
  const safetyConstraints = {
    volume_progression_limit:
      session.sophisticationLevel === "BEGINNER" ? "10%_weekly" : "5%_weekly",
    contraindicated_exercises: safetyProfile.contraindications || [],
    required_modifications: safetyProfile.modifications || [],
    recovery_requirements: safetyProfile.recoveryNeeds || [],
    safety_monitoring: SAFETY_RULES.filter(
      (rule) => rule.severity === "critical",
    ).map((rule) => rule.id),
  };

  // Build modification capabilities
  const modificationCapabilities = {
    enabled_modifications: Object.keys(COACH_MODIFICATION_OPTIONS),
    personality_flexibility: "medium" as const,
    programming_adaptability: "medium" as const,
    creative_programming:
      methodologySelection.creativityEmphasis === "high_variety"
        ? ("high" as const)
        : ("medium" as const),
    workout_variety_emphasis:
      methodologySelection.creativityEmphasis === "high_variety"
        ? ("high" as const)
        : ("medium" as const),
    safety_override_level: "limited" as const,
  };

  const coachConfig: CoachConfig = {
    coach_id: coachId,
    coach_name: coachName,
    coach_description: coachDescription,
    status: "active",
    gender_preference: genderPreference,
    selected_personality: {
      primary_template: personalitySelection.primaryTemplate,
      secondary_influences: personalitySelection.secondaryInfluences || [],
      selection_reasoning: personalitySelection.selectionReasoning,
      blending_weights: personalitySelection.blendingWeights || {
        primary: 0.7,
        secondary: 0.3,
      },
    },
    selected_methodology: {
      primary_methodology: methodologySelection.primaryMethodology,
      methodology_reasoning: methodologySelection.methodologyReasoning,
      programming_emphasis: methodologySelection.programmingEmphasis,
      periodization_approach: methodologySelection.periodizationApproach,
      creativity_emphasis: methodologySelection.creativityEmphasis,
      workout_innovation: methodologySelection.workoutInnovation,
    },
    technical_config: {
      methodology: methodologySelection.primaryMethodology,
      programming_focus: methodologyPreferences.focus || [
        "strength",
        "conditioning",
      ],
      experience_level: (session.sophisticationLevel?.toLowerCase() ||
        "intermediate") as "beginner" | "intermediate" | "advanced",
      training_frequency: trainingFrequency,
      specializations: specializations || [],
      injury_considerations: safetyProfile.injuries || [],
      goal_timeline: goalTimeline,
      preferred_intensity: preferredIntensity,
      equipment_available: safetyProfile.equipment || [],
      time_constraints: timeConstraints,
      safety_constraints: safetyConstraints,
    },
    generated_prompts: {
      personality_prompt: coachPrompts.personalityPrompt,
      safety_integrated_prompt: coachPrompts.safetyIntegratedPrompt,
      motivation_prompt: coachPrompts.motivationPrompt,
      methodology_prompt: coachPrompts.methodologyPrompt,
      communication_style: coachPrompts.communicationStyle,
      learning_adaptation_prompt: coachPrompts.learningAdaptationPrompt,
      gender_tone_prompt: coachPrompts.genderTonePrompt,
    },
    modification_capabilities: modificationCapabilities,
    metadata: {
      version: "1.0",
      created_date: creationTimestamp,
      user_satisfaction: null,
      total_conversations: 0,
      safety_profile: safetyProfile,
      methodology_profile: {
        primary: methodologySelection.primaryMethodology,
        focus: methodologyPreferences.focus || [],
        preferences: methodologyPreferences.preferences || [],
        experience: [methodologyPreferences.experience || "intermediate"],
      },
      coach_creator_session_summary: sessionSummary,
      generation_method: "tool",
      generation_timestamp: creationTimestamp,
    },
  };

  return coachConfig;
}

/**
 * Validate gender consistency between config and request
 */
export function validateGenderConsistency(
  coachConfig: CoachConfig,
  requestedGender: string,
): { isValid: boolean; issue?: string } {
  if (!requestedGender) {
    return { isValid: true };
  }

  if (coachConfig.gender_preference !== requestedGender) {
    return {
      isValid: false,
      issue: `Gender mismatch: requested ${requestedGender}, got ${coachConfig.gender_preference}`,
    };
  }

  return { isValid: true };
}
