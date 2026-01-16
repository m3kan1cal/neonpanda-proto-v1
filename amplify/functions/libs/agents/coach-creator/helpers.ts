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
 * executing when validation returned isValid: false or threw an error.
 * This ensures blocking decisions are AUTHORITATIVE, not advisory.
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
  // Only enforce blocking for save tool
  if (toolId !== "save_coach_config_to_database") {
    return null;
  }

  // No validation result yet - this is OK for tools that run before validation
  // But for save_coach_config_to_database, this should never happen in a valid workflow
  if (!validationResult) {
    return null;
  }

  // CASE 1: Validation threw an exception (has error field instead of isValid)
  if (validationResult.error) {
    console.error(
      "⛔ BLOCKING save_coach_config_to_database: Validation threw exception",
      {
        error: validationResult.error,
        toolAttempted: toolId,
      },
    );

    return {
      error: true,
      blocked: true,
      reason: `Cannot save coach config - validation failed with error: ${validationResult.error}`,
    };
  }

  // CASE 2: Validation returned isValid: false
  if (validationResult.isValid === false) {
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

  // Validation passed, allow tool to proceed
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
 * Extract the user's fitness experience level from session data
 *
 * Priority:
 * 1. todoList.experienceLevel.value (extracted from conversation)
 * 2. sophisticationLevel if it's a valid experience level
 * 3. Default to "intermediate"
 */
function getExperienceLevel(
  session: any,
): "beginner" | "intermediate" | "advanced" {
  const validLevels = ["beginner", "intermediate", "advanced"];

  // First priority: todoList.experienceLevel.value (extracted from conversation)
  const todoExperience =
    session.todoList?.experienceLevel?.value?.toLowerCase();
  if (todoExperience && validLevels.includes(todoExperience)) {
    return todoExperience as "beginner" | "intermediate" | "advanced";
  }

  // Second priority: sophisticationLevel if it's a valid value
  const sophistication = session.sophisticationLevel?.toLowerCase();
  if (sophistication && validLevels.includes(sophistication)) {
    return sophistication as "beginner" | "intermediate" | "advanced";
  }

  // Default fallback
  return "intermediate";
}

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
    experienceLevel: getExperienceLevel(session),
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
  const experienceLevel = getExperienceLevel(session);
  const safetyConstraints = {
    volume_progression_limit:
      experienceLevel === "beginner" ? "10%_weekly" : "5%_weekly",
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
      experience_level: experienceLevel,
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
