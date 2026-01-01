/**
 * Coach Creator Agent Types
 *
 * Specific type definitions for the coach creator agent.
 * Extends the core agent types with coach-creator-specific context.
 */

import type { AgentContext } from "../core/types";
import type {
  CoachCreatorSession,
  CoachConfig,
  CoachPersonalityTemplate,
  MethodologyTemplate,
} from "../../coach-creator/types";

/**
 * Event for triggering coach config generation
 * Matches the existing build-coach-config handler interface
 */
export interface BuildCoachConfigEvent {
  userId: string;
  sessionId: string;
}

/**
 * Coach Creator Context
 *
 * Contains all data needed for coach creator tools.
 * Based on BuildCoachConfigEvent with additional loaded data.
 */
export interface CoachCreatorContext
  extends AgentContext, BuildCoachConfigEvent {
  // Inherits from AgentContext:
  // - userId (required)
  // Inherits from BuildCoachConfigEvent:
  // - sessionId (required)
}

/**
 * Result from coach creation process
 */
export interface CoachCreatorResult {
  success: boolean;

  // Success case
  coachConfigId?: string;
  coachName?: string;
  coachDescription?: string;
  primaryPersonality?: string;
  primaryMethodology?: string;
  genderPreference?: string;
  generationMethod?: "tool" | "fallback";
  pineconeStored?: boolean;
  pineconeRecordId?: string | null;

  // Failure case
  skipped?: boolean;
  reason?: string;
  validationIssues?: string[];
}

/**
 * Session requirements loaded by load_session_requirements tool
 */
export interface SessionRequirementsResult {
  session: CoachCreatorSession;
  userProfile: any;
  safetyProfile: SafetyProfile;
  methodologyPreferences: MethodologyPreferences;
  genderPreference: "male" | "female" | "neutral";
  trainingFrequency: number;
  goalTimeline: string;
  preferredIntensity: string;
  specializations: string[];
  sessionSummary: string;
}

/**
 * Safety profile extracted from session
 */
export interface SafetyProfile {
  injuries: string[];
  contraindications: string[];
  equipment: string[];
  modifications: string[];
  recoveryNeeds: string[];
  experienceLevel?: string;
  timeConstraints?: {
    preferred_time?: string;
    session_length?: number;
  };
}

/**
 * Methodology preferences extracted from session
 */
export interface MethodologyPreferences {
  primary?: string;
  focus: string[];
  preferences: string[];
  avoidances: string[];
  experience: string;
}

/**
 * Result from select_personality_template tool
 */
export interface PersonalitySelectionResult {
  primaryTemplate: string;
  secondaryInfluences: string[];
  selectionReasoning: string;
  blendingWeights: {
    primary: number;
    secondary: number;
  };
  templateData: CoachPersonalityTemplate;
}

/**
 * Result from select_methodology_template tool
 */
export interface MethodologySelectionResult {
  primaryMethodology: string;
  methodologyReasoning: string;
  programmingEmphasis: "strength" | "conditioning" | "balanced";
  periodizationApproach: "linear" | "conjugate" | "block" | "daily_undulating";
  creativityEmphasis: "high_variety" | "medium_variety" | "low_variety";
  workoutInnovation: "enabled" | "disabled";
  templateData: MethodologyTemplate;
}

/**
 * Result from generate_coach_prompts tool
 */
export interface CoachPromptsResult {
  personalityPrompt: string;
  safetyIntegratedPrompt: string;
  motivationPrompt: string;
  methodologyPrompt: string;
  communicationStyle: string;
  learningAdaptationPrompt: string;
  genderTonePrompt: string;
}

/**
 * Result from validate_coach_config tool
 */
export interface CoachConfigValidationResult {
  isValid: boolean;
  shouldNormalize: boolean;
  confidence: number;
  validationIssues: string[];
  safetyValidation: {
    approved: boolean;
    issues: string[];
    safetyScore: number;
  };
  personalityCoherence: {
    consistencyScore: number;
    conflictingTraits: string[];
  };
  aiValidation?: {
    genderConsistency: number;
    safetyLanguageQuality: number;
    brandVoiceScore: number;
    promptCoherence: number;
  };
}

/**
 * Result from normalize_coach_config tool
 */
export interface CoachConfigNormalizationResult {
  normalizedConfig: CoachConfig;
  issuesFixed: number;
  normalizationSummary: string;
}

/**
 * Result from save_coach_config_to_database tool
 */
export interface CoachConfigSaveResult {
  success: boolean;
  coachConfigId: string;
  coachName: string;
  pineconeStored: boolean;
  pineconeRecordId: string | null;
}
