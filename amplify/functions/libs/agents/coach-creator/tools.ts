/**
 * Coach Creator Agent Tools
 *
 * Tools that wrap existing coach generation utilities.
 * Each tool is a discrete capability that Claude can use to create coaches.
 */

import type { Tool } from "../core/types";
import type { CoachCreatorContext } from "./types";
import type {
  SessionRequirementsResult,
  PersonalitySelectionResult,
  MethodologySelectionResult,
  CoachPromptsResult,
  CoachConfigValidationResult,
  CoachConfigNormalizationResult,
  CoachConfigSaveResult,
} from "./types";
import type { CoachConfig } from "../../coach-creator/types";
import {
  getCoachCreatorSession,
  getUserProfile,
  saveCoachConfig,
  saveCoachCreatorSession,
} from "../../../../dynamodb/operations";
import {
  extractSafetyProfileFromSession,
  extractMethodologyPreferencesFromSession,
  extractGenderPreferenceFromSession,
  extractTrainingFrequencyFromSession,
  extractSpecializationsFromSession,
  extractGoalTimelineFromSession,
  extractIntensityPreferenceFromSession,
} from "../../coach-creator/data-extraction";
import { generateCoachCreatorSessionSummary } from "../../coach-creator/session-management";
import {
  COACH_PERSONALITY_TEMPLATES,
  METHODOLOGY_TEMPLATES,
  validateCoachConfigSafety,
  validatePersonalityCoherence,
} from "../../coach-creator/coach-generation";
import { validateCoachConfig } from "../../schemas/coach-config-schema";
import { storeCoachCreatorSummaryInPinecone } from "../../coach-creator/pinecone";
import {
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
  storeDebugDataInS3,
} from "../../api-helpers";
import type { BedrockToolUseResult } from "../../api-helpers";
import { storeGenerationDebugData, assembleCoachConfig } from "./helpers";
import {
  generatePersonalitySelection,
  generateMethodologySelection,
  generateCoachPrompts as generateCoachPromptsHelper,
  runConfigValidation,
} from "../../coach-creator/tool-generation";

/**
 * Tool 1: Load Session Requirements
 *
 * Gathers all necessary context for coach generation:
 * - Session data from DynamoDB
 * - User profile
 * - Safety profile (injuries, equipment, contraindications)
 * - Methodology preferences
 * - Gender preference
 * - Training parameters
 */
export const loadSessionRequirementsTool: Tool<CoachCreatorContext> = {
  id: "load_session_requirements",
  description: `Load all requirements and context needed for coach generation.

ALWAYS CALL THIS FIRST to gather necessary information.

This tool:
- Loads the coach creator session from DynamoDB
- Loads user profile (if exists)
- Extracts safety profile (injuries, equipment, contraindications)
- Extracts methodology preferences from conversation
- Determines gender preference for coach
- Extracts training frequency, goal timeline, intensity preference
- Identifies specializations from user goals

Returns: session, userProfile, safetyProfile, methodologyPreferences, genderPreference, trainingFrequency, goalTimeline, preferredIntensity, specializations, sessionSummary`,

  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User ID",
      },
      sessionId: {
        type: "string",
        description: "Coach creator session ID",
      },
    },
    required: ["userId", "sessionId"],
  },

  async execute(
    input: any,
    context: CoachCreatorContext,
  ): Promise<SessionRequirementsResult> {
    console.info("📥 Executing load_session_requirements tool");

    const { userId, sessionId } = input;

    // 1. Load session and user profile from DynamoDB
    console.info("Loading session and user profile...");
    const [session, userProfile] = await Promise.all([
      getCoachCreatorSession(userId, sessionId),
      getUserProfile(userId),
    ]);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.isComplete) {
      throw new Error("Session is not complete - cannot generate coach config");
    }

    // 2. Extract all data in parallel for performance
    console.info("Extracting session data in parallel...");
    const [
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      trainingFrequency,
      goalTimeline,
      preferredIntensity,
      specializations,
    ] = await Promise.all([
      extractSafetyProfileFromSession(session),
      extractMethodologyPreferencesFromSession(session),
      extractGenderPreferenceFromSession(session),
      extractTrainingFrequencyFromSession(session),
      extractGoalTimelineFromSession(session),
      extractIntensityPreferenceFromSession(session),
      extractSpecializationsFromSession(session),
    ]);

    // 3. Generate session summary
    const sessionSummary = generateCoachCreatorSessionSummary(session);

    console.info("✅ Session requirements loaded:", {
      hasUserProfile: !!userProfile,
      genderPreference,
      trainingFrequency,
      sophisticationLevel: session.sophisticationLevel,
      conversationLength: session.conversationHistory?.length || 0,
    });

    return {
      session,
      userProfile,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      trainingFrequency,
      goalTimeline,
      preferredIntensity,
      specializations,
      sessionSummary,
    };
  },
};

/**
 * Tool 2: Select Personality Template
 *
 * AI-powered selection of the best personality template for the user.
 * Analyzes user profile, goals, and preferences to choose the optimal coach personality.
 */
export const selectPersonalityTemplateTool: Tool<CoachCreatorContext> = {
  id: "select_personality_template",
  description: `Select the optimal personality template for the user using AI analysis.

CALL THIS SECOND after load_session_requirements.

This tool analyzes:
- User sophistication level
- Training goals and preferences
- Coaching style preferences from conversation
- Experience level and history

Available templates:
- emma: The Encouraging Coach - Patient, supportive, great for beginners
- marcus: The Technical Expert - Analytical, skill-focused, for technique development
- diana: The Elite Performance Expert - Demanding, results-driven, for competitors
- alex: The Lifestyle Integration Expert - Practical, sustainable, for busy people

Returns: primaryTemplate, secondaryInfluences, selectionReasoning, blendingWeights, templateData`,

  inputSchema: {
    type: "object",
    properties: {
      // No inputs needed - retrieves from stored requirements
    },
    required: [],
  },

  async execute(
    _input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<PersonalitySelectionResult> {
    console.info("🎭 Executing select_personality_template tool");

    // Retrieve stored requirements (pattern from program-designer)
    const requirements = context.getToolResult?.("requirements");
    if (!requirements) {
      throw new Error(
        "Requirements not loaded - call load_session_requirements first",
      );
    }

    const {
      session,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      sessionSummary,
    } = requirements;

    // Call helper function with tool config (eliminates double-encoding)
    const result = await generatePersonalitySelection({
      session,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      sessionSummary,
    });

    // Get full template data
    const templateData = COACH_PERSONALITY_TEMPLATES.find(
      (t) => t.id === result.primaryTemplate,
    )!;

    console.info("✅ Personality template selected:", {
      primary: result.primaryTemplate,
      secondary: result.secondaryInfluences,
      reasoning: result.selectionReasoning?.substring(0, 100),
    });

    return {
      ...result,
      templateData,
    };
  },
};

/**
 * Tool 3: Select Methodology Template
 *
 * AI-powered selection of the best training methodology for the user.
 * Analyzes goals, experience, and preferences to choose optimal approach.
 */
export const selectMethodologyTemplateTool: Tool<CoachCreatorContext> = {
  id: "select_methodology_template",
  description: `Select the optimal training methodology for the user using AI analysis.

CALL THIS THIRD after select_personality_template.

This tool analyzes:
- Training goals and preferences
- Experience level
- Equipment available
- Time constraints
- Injury considerations

Available methodologies:
- comptrain_strength: Strength focus with intelligent conditioning
- mayhem_conditioning: High-intensity conditioning
- hwpo_training: Balanced competition preparation
- invictus_fitness: Injury prevention and longevity
- misfit_athletics: High-volume competitive training
- functional_bodybuilding: Movement quality with hypertrophy
- opex_fitness: Individualized energy system development
- crossfit_linchpin: General physical preparedness
- prvn_fitness: Balanced strength and conditioning

Returns: primaryMethodology, methodologyReasoning, programmingEmphasis, periodizationApproach, creativityEmphasis, workoutInnovation, templateData`,

  inputSchema: {
    type: "object",
    properties: {
      // No inputs needed - retrieves from stored requirements and personality selection
    },
    required: [],
  },

  async execute(
    _input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<MethodologySelectionResult> {
    console.info("📋 Executing select_methodology_template tool");

    // Retrieve stored requirements (personality may not be available during parallel execution)
    const requirements = context.getToolResult?.("requirements");
    const personalitySelection = context.getToolResult?.(
      "personality_selection",
    );

    if (!requirements) {
      throw new Error(
        "Requirements not loaded - call load_session_requirements first",
      );
    }

    const {
      session,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      sessionSummary,
    } = requirements;

    // Call helper function with tool config (eliminates double-encoding)
    // personalitySelection is optional to support parallel execution with personality selection
    const result = await generateMethodologySelection({
      session,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      personalitySelection,
      sessionSummary,
    });

    // Get full template data
    const templateData = METHODOLOGY_TEMPLATES.find(
      (m) => m.id === result.primaryMethodology,
    )!;

    console.info("✅ Methodology template selected:", {
      methodology: result.primaryMethodology,
      emphasis: result.programmingEmphasis,
      periodization: result.periodizationApproach,
    });

    return {
      ...result,
      templateData,
    };
  },
};

/**
 * Tool 4: Generate Coach Prompts
 *
 * Generate all 7 personality prompts for the coach configuration.
 * Uses AI to create personalized, coherent prompts.
 */
export const generateCoachPromptsTool: Tool<CoachCreatorContext> = {
  id: "generate_coach_prompts",
  description: `Generate all coach personality prompts using AI.

CALL THIS FOURTH after select_methodology_template.

This tool generates 7 prompts:
1. personality_prompt - Main coaching personality and behavior
2. safety_integrated_prompt - Safety-aware coaching with injury awareness
3. motivation_prompt - Motivation and encouragement approach
4. methodology_prompt - Programming and training methodology
5. communication_style - How the coach communicates
6. learning_adaptation_prompt - Teaching and progression approach
7. gender_tone_prompt - Gender-specific persona and tone

Returns: All 7 prompts as strings`,

  inputSchema: {
    type: "object",
    properties: {
      // No inputs needed - retrieves from stored results
    },
    required: [],
  },

  async execute(
    _input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<CoachPromptsResult> {
    console.info("📝 Executing generate_coach_prompts tool");

    // Retrieve all required stored results
    const requirements = context.getToolResult?.("requirements");
    const personalitySelection = context.getToolResult?.(
      "personality_selection",
    );
    const methodologySelection = context.getToolResult?.(
      "methodology_selection",
    );

    if (!requirements) {
      throw new Error(
        "Requirements not loaded - call load_session_requirements first",
      );
    }
    if (!personalitySelection) {
      throw new Error(
        "Personality not selected - call select_personality_template first",
      );
    }
    if (!methodologySelection) {
      throw new Error(
        "Methodology not selected - call select_methodology_template first",
      );
    }

    const { session, safetyProfile, methodologyPreferences, genderPreference } =
      requirements;

    // Call helper function with tool config (eliminates double-encoding)
    const result = await generateCoachPromptsHelper({
      session,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      personalitySelection,
      methodologySelection,
    });

    console.info("✅ Coach prompts generated:", {
      promptCount: 7,
      personalityLength: result.personalityPrompt.length,
    });

    return result;
  },
};

/**
 * Tool 5: Assemble Coach Config
 *
 * Assembles the complete coach configuration from all tool results.
 * Uses the assembleCoachConfig helper to build the structure.
 */
export const assembleCoachConfigTool: Tool<CoachCreatorContext> = {
  id: "assemble_coach_config",
  description: `Assemble the complete coach configuration from tool results.

CALL THIS FIFTH after generate_coach_prompts.

This tool automatically builds the complete CoachConfig structure using:
- Session requirements (from load_session_requirements)
- Personality selection (from select_personality_template)
- Methodology selection (from select_methodology_template)
- Coach prompts (from generate_coach_prompts)

You DO NOT need to manually construct the coach config - this tool does it for you.

Returns: coachConfig (complete assembled structure)`,

  inputSchema: {
    type: "object",
    properties: {
      creationTimestamp: {
        type: "string",
        description: "ISO timestamp for consistent dating",
      },
    },
    required: ["creationTimestamp"],
  },

  async execute(
    input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<{ coachConfig: CoachConfig }> {
    console.info("🔧 Executing assemble_coach_config tool");

    const { creationTimestamp } = input;

    // Get all required tool results using semantic keys
    const sessionRequirements = context.getToolResult?.("requirements");
    const personalitySelection = context.getToolResult?.(
      "personality_selection",
    );
    const methodologySelection = context.getToolResult?.(
      "methodology_selection",
    );
    const coachPrompts = context.getToolResult?.("coach_prompts");

    if (
      !sessionRequirements ||
      !personalitySelection ||
      !methodologySelection ||
      !coachPrompts
    ) {
      throw new Error(
        "Missing required tool results - ensure all tools (load_session_requirements, select_personality_template, select_methodology_template, generate_coach_prompts) have been called first",
      );
    }

    // Use helper function to assemble complete coach config (now async with AI name generation)
    const coachConfig = await assembleCoachConfig(
      context.userId,
      sessionRequirements,
      personalitySelection,
      methodologySelection,
      coachPrompts,
      creationTimestamp,
    );

    console.info("✅ Coach config assembled:", {
      coachId: coachConfig.coach_id,
      coachName: coachConfig.coach_name,
      personality: coachConfig.selected_personality.primary_template,
      methodology: coachConfig.selected_methodology.primary_methodology,
    });

    return {
      coachConfig,
    };
  },
};

/**
 * Tool 6: Validate Coach Config
 *
 * Validates the assembled coach configuration for completeness and coherence.
 */
export const validateCoachConfigTool: Tool<CoachCreatorContext> = {
  id: "validate_coach_config",
  description: `Validate the assembled coach configuration.

CALL THIS SIXTH after assemble_coach_config.

This tool checks:
- Schema compliance (all required fields present)
- Safety validation (injury considerations properly integrated)
- Personality coherence (no conflicting traits)
- Gender preference matching

Returns: isValid, shouldNormalize, confidence, validationIssues, safetyValidation, personalityCoherence`,

  inputSchema: {
    type: "object",
    properties: {
      // No inputs needed - retrieves from stored results
    },
    required: [],
  },

  async execute(
    _input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<CoachConfigValidationResult> {
    console.info("✅ Executing validate_coach_config tool");

    // Retrieve from stored results
    const requirements = context.getToolResult?.("requirements");
    const assembledConfig = context.getToolResult?.("assembled_config");

    if (!requirements) {
      throw new Error(
        "Requirements not loaded - call load_session_requirements first",
      );
    }
    if (!assembledConfig) {
      throw new Error(
        "Coach config not assembled - call assemble_coach_config first",
      );
    }

    const { safetyProfile, genderPreference: requestedGender } = requirements;
    const { coachConfig } = assembledConfig;

    // 1. Schema validation
    const schemaValidation = validateCoachConfig(coachConfig);

    // 2. Safety validation
    const safetyValidation = await validateCoachConfigSafety(
      coachConfig,
      safetyProfile,
    );

    // 3. Personality coherence
    const personalityCoherence =
      await validatePersonalityCoherence(coachConfig);

    // 4. Gender preference validation
    const genderIssues: string[] = [];

    if (coachConfig.gender_preference && requestedGender) {
      if (coachConfig.gender_preference !== requestedGender) {
        genderIssues.push(
          `Gender mismatch: requested ${requestedGender}, got ${coachConfig.gender_preference}`,
        );
      }
    }

    // 5. AI-POWERED ENHANCED VALIDATION using helper with tool config
    console.info("Running AI-powered validation checks...");
    let aiValidationIssues: string[] = [];
    let aiScores = {
      genderConsistency: 10,
      safetyLanguageQuality: 10,
      brandVoiceScore: 10,
      promptCoherence: 10,
    };

    try {
      // Use helper function with tool config (eliminates double-encoding)
      const aiValidation = await runConfigValidation(
        coachConfig,
        safetyProfile,
      );

      // Store debug data for AI validation
      try {
        await storeDebugDataInS3(
          JSON.stringify(
            {
              aiResponse: aiValidation,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
          {
            type: "ai-validation",
            userId: context.userId,
            sessionId: context.sessionId,
          },
          "coach-config",
        );
      } catch (err) {
        console.warn("⚠️ Failed to store AI validation debug data:", err);
      }

      // Extract AI validation results
      if (aiValidation.genderConsistency < 7) {
        aiValidationIssues.push(
          "AI detected gender tone inconsistency across prompts",
        );
      }

      if (aiValidation.safetyLanguageQuality < 7) {
        aiValidationIssues.push(
          `AI detected poor safety language quality (score: ${aiValidation.safetyLanguageQuality}/10)`,
        );
      }

      if (aiValidation.brandVoiceScore < 7) {
        aiValidationIssues.push(
          `AI detected brand voice issues (score: ${aiValidation.brandVoiceScore}/10)`,
        );
      }

      if (aiValidation.promptCoherence < 7) {
        aiValidationIssues.push(
          `AI detected prompt coherence issues (score: ${aiValidation.promptCoherence}/10)`,
        );
      }

      // Add any specific issues identified by AI
      if (aiValidation.issues && Array.isArray(aiValidation.issues)) {
        aiValidationIssues.push(...aiValidation.issues);
      }

      aiScores = {
        genderConsistency: aiValidation.genderConsistency,
        safetyLanguageQuality: aiValidation.safetyLanguageQuality,
        brandVoiceScore: aiValidation.brandVoiceScore,
        promptCoherence: aiValidation.promptCoherence,
      };

      console.info("✅ AI validation completed:", {
        issuesFound: aiValidationIssues.length,
        scores: aiScores,
      });
    } catch (error) {
      console.warn("⚠️ AI validation failed (non-critical):", error);
      aiValidationIssues.push(
        "AI validation unavailable - using programmatic validation only",
      );
    }

    // Combine all issues (programmatic + AI)
    const allIssues = [
      ...schemaValidation.errors,
      ...safetyValidation.issues,
      ...(personalityCoherence.consistency_score < 7
        ? personalityCoherence.conflicting_traits
        : []),
      ...genderIssues,
      ...aiValidationIssues,
    ];

    // Determine if normalization is needed
    const shouldNormalize =
      allIssues.length > 0 &&
      allIssues.length < 10 && // Not too many issues (increased from 5 to account for AI checks)
      !allIssues.some((i) => i.includes("Missing required field")); // Not critical

    // Calculate confidence (including AI scores)
    let confidence = 1.0;
    confidence -= schemaValidation.errors.length * 0.1;
    confidence -= safetyValidation.issues.length * 0.05;
    confidence -= (10 - personalityCoherence.consistency_score) * 0.05;
    confidence -= (10 - aiScores.genderConsistency) * 0.02;
    confidence -= (10 - aiScores.safetyLanguageQuality) * 0.02;
    confidence -= (10 - aiScores.brandVoiceScore) * 0.02;
    confidence -= (10 - aiScores.promptCoherence) * 0.02;
    confidence = Math.max(0, Math.min(1, confidence));

    // CRITICAL: Include safety validation approval in isValid determination
    // Safety validation must pass for a coach config to be considered valid
    const isValid =
      schemaValidation.isValid &&
      genderIssues.length === 0 &&
      safetyValidation.approved &&
      aiScores.genderConsistency >= 7 && // AI must confirm gender consistency
      aiScores.safetyLanguageQuality >= 7; // AI must confirm safety language quality

    console.info("Validation results:", {
      isValid,
      shouldNormalize,
      confidence,
      issueCount: allIssues.length,
      aiScores,
    });

    return {
      isValid,
      shouldNormalize,
      confidence,
      validationIssues: allIssues,
      safetyValidation: {
        approved: safetyValidation.approved,
        issues: safetyValidation.issues,
        safetyScore: safetyValidation.safetyScore,
      },
      personalityCoherence: {
        consistencyScore: personalityCoherence.consistency_score,
        conflictingTraits: personalityCoherence.conflicting_traits,
      },
      aiValidation: aiScores,
    };
  },
};

/**
 * Tool 7: Normalize Coach Config
 *
 * Fixes minor issues in the coach configuration using AI.
 */
export const normalizeCoachConfigTool: Tool<CoachCreatorContext> = {
  id: "normalize_coach_config",
  description: `Normalize and fix minor issues in the coach configuration.

ONLY CALL THIS SEVENTH IF validate_coach_config returns shouldNormalize: true.

This tool:
- Fixes field format issues
- Fills missing optional fields with sensible defaults
- Corrects personality/methodology inconsistencies
- Ensures all arrays have valid content

Returns: normalizedConfig, issuesFixed, normalizationSummary`,

  inputSchema: {
    type: "object",
    properties: {
      // No inputs needed - retrieves from stored results
    },
    required: [],
  },

  async execute(
    _input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<CoachConfigNormalizationResult> {
    console.info("🔧 Executing normalize_coach_config tool");

    // Retrieve from stored results
    const assembledConfig = context.getToolResult?.("assembled_config");
    const validation = context.getToolResult?.("validation");

    if (!assembledConfig) {
      throw new Error(
        "Coach config not assembled - call assemble_coach_config first",
      );
    }
    if (!validation) {
      throw new Error(
        "Validation not completed - call validate_coach_config first",
      );
    }

    const { coachConfig } = assembledConfig;
    const { validationIssues } = validation;

    // Create a mutable copy
    const normalizedConfig = JSON.parse(JSON.stringify(coachConfig));
    let issuesFixed = 0;
    const fixes: string[] = [];

    // PHASE 1: PROGRAMMATIC FIXES (fast, deterministic)

    // 1. Ensure arrays are arrays
    const arrayFields = [
      "technical_config.programming_focus",
      "technical_config.specializations",
      "technical_config.injury_considerations",
      "technical_config.equipment_available",
      "technical_config.safety_constraints.contraindicated_exercises",
      "technical_config.safety_constraints.required_modifications",
      "technical_config.safety_constraints.recovery_requirements",
      "technical_config.safety_constraints.safety_monitoring",
      "modification_capabilities.enabled_modifications",
    ];

    for (const fieldPath of arrayFields) {
      const parts = fieldPath.split(".");
      let obj = normalizedConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      const finalKey = parts[parts.length - 1];
      if (!Array.isArray(obj[finalKey])) {
        obj[finalKey] = obj[finalKey] ? [obj[finalKey]] : [];
        issuesFixed++;
        fixes.push(`Converted ${fieldPath} to array`);
      }
    }

    // 2. Ensure valid enum values
    if (
      !["beginner", "intermediate", "advanced"].includes(
        normalizedConfig.technical_config?.experience_level,
      )
    ) {
      normalizedConfig.technical_config.experience_level = "intermediate";
      issuesFixed++;
      fixes.push("Set default experience_level to intermediate");
    }

    // 3. Ensure training frequency is valid number
    const freq = normalizedConfig.technical_config?.training_frequency;
    if (typeof freq !== "number" || freq < 1 || freq > 7) {
      normalizedConfig.technical_config.training_frequency = 4;
      issuesFixed++;
      fixes.push("Set default training_frequency to 4");
    }

    // 4. Ensure time_constraints is properly structured
    if (
      !normalizedConfig.technical_config.time_constraints ||
      typeof normalizedConfig.technical_config.time_constraints !== "object"
    ) {
      normalizedConfig.technical_config.time_constraints = {
        preferred_time: "flexible",
        session_duration: "45-60 minutes",
        weekly_frequency: `${normalizedConfig.technical_config.training_frequency} days per week`,
      };
      issuesFixed++;
      fixes.push("Created default time_constraints");
    }

    // PHASE 2: AI-POWERED SMART NORMALIZATION using Nova 2 Lite
    // Only run if there are quality issues that need fixing
    const qualityIssues = validationIssues.filter(
      (issue: string) =>
        issue.includes("gender") ||
        issue.includes("safety") ||
        issue.includes("brand") ||
        issue.includes("coherence") ||
        issue.includes("AI detected"),
    );

    if (qualityIssues.length > 0) {
      console.info(
        `Running AI-powered normalization for ${qualityIssues.length} quality issues (Nova 2 Lite)...`,
      );

      try {
        // Identify which prompts need fixing
        const promptsToFix: Array<{
          key: string;
          prompt: string;
          issues: string[];
        }> = [];

        const promptKeys = [
          "personality_prompt",
          "safety_integrated_prompt",
          "motivation_prompt",
          "methodology_prompt",
          "communication_style",
          "learning_adaptation_prompt",
          "gender_tone_prompt",
        ];

        for (const key of promptKeys) {
          const relevantIssues = qualityIssues.filter((issue: string) => {
            const lowerIssue = issue.toLowerCase();
            if (key.includes("gender") && lowerIssue.includes("gender"))
              return true;
            if (key.includes("safety") && lowerIssue.includes("safety"))
              return true;
            if (
              lowerIssue.includes("brand") ||
              lowerIssue.includes("coherence")
            )
              return true;
            return false;
          });

          if (relevantIssues.length > 0) {
            promptsToFix.push({
              key,
              prompt: normalizedConfig.generated_prompts[key],
              issues: relevantIssues,
            });
          }
        }

        console.info(`Fixing ${promptsToFix.length} prompts with AI...`);

        // Fix each prompt using AI
        for (const { key, prompt, issues } of promptsToFix) {
          const aiNormalizationPrompt = `Fix this coach prompt to improve quality and resolve identified issues.

ORIGINAL PROMPT:
${prompt}

ISSUES TO FIX:
${issues.join("\n")}

COACH CONTEXT:
- Gender: ${normalizedConfig.gender_preference}
- Personality: ${normalizedConfig.selected_personality.primary_template}
- Methodology: ${normalizedConfig.selected_methodology.primary_methodology}
- Brand Voice: "playful power" (energetic but professional, not corporate or cheesy)

INSTRUCTIONS:
1. If gender tone is weak, strengthen pronouns and gender-appropriate language
2. If safety language is awkward, rephrase naturally (supportive, not restrictive)
3. If brand voice is too corporate, make it more energetic
4. If prompt has coherence issues, smooth transitions and fix contradictions
5. Keep changes MINIMAL - only fix identified issues
6. Maintain the core message and technical content
7. Keep length similar to original (100-300 words)

Return JSON:
{
  "fixed_prompt": "the rephrased prompt text",
  "changes_made": ["specific change 1", "specific change 2"]
}`;

          // callBedrockApi with tools option already extracts tool result
          // and returns BedrockToolUseResult { toolName, input, stopReason }
          const response = (await callBedrockApi(
            aiNormalizationPrompt,
            `Normalize ${key}`,
            MODEL_IDS.EXECUTOR_MODEL_FULL, // Nova 2 Lite
            {
              temperature: TEMPERATURE_PRESETS.BALANCED,
              tools: {
                name: "fixed_prompt_output",
                description: "The fixed prompt text and a summary of changes.",
                inputSchema: {
                  type: "object",
                  properties: {
                    fixed_prompt: {
                      type: "string",
                      description: "The rephrased prompt text",
                    },
                    changes_made: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of specific changes made",
                    },
                  },
                  required: ["fixed_prompt", "changes_made"],
                },
              },
              expectedToolName: "fixed_prompt_output",
            },
          )) as BedrockToolUseResult;

          // callBedrockApi already extracted the tool result, so just access .input
          const result = response.input;

          // Store debug data for AI normalization (prompt + response)
          try {
            await storeDebugDataInS3(
              JSON.stringify(
                {
                  promptKey: key,
                  originalPrompt: prompt.substring(0, 500),
                  issues,
                  aiPrompt: aiNormalizationPrompt.substring(0, 1000),
                  aiResponse: result,
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
              {
                type: "ai-normalization",
                promptKey: key,
                userId: context.userId,
                sessionId: context.sessionId,
              },
              "coach-config",
            );
          } catch (err) {
            console.warn(
              "⚠️ Failed to store AI normalization debug data:",
              err,
            );
          }

          if (result.fixed_prompt && result.fixed_prompt.length > 50) {
            normalizedConfig.generated_prompts[key] = result.fixed_prompt;
            issuesFixed++;
            fixes.push(
              `AI fixed ${key}: ${result.changes_made?.join(", ") || "quality improvements"}`,
            );
            console.info(`✅ AI normalized ${key}`);
          } else {
            console.warn(
              `⚠️ AI normalization for ${key} produced invalid result`,
            );
          }
        }

        console.info("✅ AI normalization completed");
      } catch (error) {
        console.warn("⚠️ AI normalization failed (non-critical):", error);
        fixes.push(
          "AI normalization unavailable - using programmatic fixes only",
        );
      }
    } else {
      console.info("No quality issues detected - skipping AI normalization");
    }

    const normalizationSummary =
      fixes.length > 0
        ? `Fixed ${issuesFixed} issues: ${fixes.join("; ")}`
        : "No normalization needed";

    console.info("Normalization completed:", {
      issuesFixed,
      summary: normalizationSummary,
    });

    return {
      normalizedConfig,
      issuesFixed,
      normalizationSummary,
    };
  },
};

/**
 * Tool 8: Save Coach Config to Database
 *
 * Saves the finalized coach configuration to DynamoDB and Pinecone.
 */
export const saveCoachConfigToDatabaseTool: Tool<CoachCreatorContext> = {
  id: "save_coach_config_to_database",
  description: `Save finalized coach config to DynamoDB and Pinecone.

⚠️ ONLY CALL THIS AS THE FINAL STEP after:
1. load_session_requirements (complete)
2. select_personality_template (complete)
3. select_methodology_template (complete)
4. generate_coach_prompts (complete)
5. assemble_coach_config (complete)
6. validate_coach_config (passed)
7. normalize_coach_config (if needed)

This tool:
- Saves coach config to DynamoDB
- Stores session summary in Pinecone for semantic search
- Updates session status to COMPLETE
- Generates debug data for troubleshooting

DO NOT call this if validation failed.

Returns: success, coachConfigId, coachName, pineconeStored, pineconeRecordId`,

  inputSchema: {
    type: "object",
    properties: {
      // No inputs needed - retrieves from stored results
    },
    required: [],
  },

  async execute(
    _input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<CoachConfigSaveResult> {
    console.info("💾 Executing save_coach_config_to_database tool");

    // Retrieve from stored results
    const requirements = context.getToolResult?.("requirements");
    const assembledConfig = context.getToolResult?.("assembled_config");
    const normalization = context.getToolResult?.("normalization");

    if (!requirements) {
      throw new Error(
        "Requirements not loaded - call load_session_requirements first",
      );
    }
    if (!assembledConfig) {
      throw new Error(
        "Coach config not assembled - call assemble_coach_config first",
      );
    }

    const { session, sessionSummary } = requirements;
    // Use normalized config if available, otherwise use assembled config
    const coachConfig =
      normalization?.normalizedConfig || assembledConfig.coachConfig;
    // Use timestamp from assembled_config tool call
    const creationTimestamp =
      coachConfig.metadata?.created_date || new Date().toISOString();

    // 1. Set metadata timestamps
    if (!coachConfig.metadata) {
      coachConfig.metadata = {} as any;
    }
    coachConfig.metadata.created_date = creationTimestamp;
    coachConfig.metadata.generation_method = "tool";
    coachConfig.metadata.generation_timestamp = creationTimestamp;

    // 2. Save to DynamoDB
    console.info("Saving coach config to DynamoDB...");
    await saveCoachConfig(context.userId, coachConfig, creationTimestamp);
    console.info("✅ Coach config saved to DynamoDB");

    // 3. Store in Pinecone (fire-and-forget)
    console.info("Storing session summary in Pinecone...");
    let pineconeRecordId: string | null = null;
    let pineconeStored = false;

    try {
      const pineconeResult = await storeCoachCreatorSummaryInPinecone(
        context.userId,
        sessionSummary,
        session,
        coachConfig,
      );
      if (pineconeResult.success !== false) {
        pineconeStored = true;
        pineconeRecordId = (pineconeResult as any).recordId || null;
      }
    } catch (error) {
      console.warn("⚠️ Pinecone storage failed (non-blocking):", error);
    }

    // 4. Update session to COMPLETE
    console.info("Updating session status to COMPLETE...");
    const completedSession = {
      ...session,
      configGeneration: {
        status: "COMPLETE" as const,
        completedAt: new Date(creationTimestamp),
        coachConfigId: coachConfig.coach_id,
      },
      isDeleted: true, // Soft delete
      lastActivity: new Date(creationTimestamp),
    };
    await saveCoachCreatorSession(completedSession);
    console.info("✅ Session updated to COMPLETE status");

    // 5. Store debug data
    await storeGenerationDebugData(
      "success",
      {
        userId: context.userId,
        sessionId: context.sessionId,
        coachId: coachConfig.coach_id,
      },
      {
        coachName: coachConfig.coach_name,
        primaryPersonality: coachConfig.selected_personality.primary_template,
        primaryMethodology:
          coachConfig.selected_methodology.primary_methodology,
        method: "tool",
      },
    );

    console.info("✅ Coach config saved successfully:", {
      coachId: coachConfig.coach_id,
      coachName: coachConfig.coach_name,
      pineconeStored,
    });

    return {
      success: true,
      coachConfigId: coachConfig.coach_id,
      coachName: coachConfig.coach_name,
      pineconeStored,
      pineconeRecordId,
    };
  },
};
