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
  SafetyProfile,
  MethodologyPreferences,
} from "./types";
import type { CoachConfig, CoachCreatorSession } from "../../coach-creator/types";
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
  SAFETY_RULES,
  COACH_MODIFICATION_OPTIONS,
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
import { parseJsonWithFallbacks } from "../../response-utils";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../../prompt-helpers";
import { storeGenerationDebugData } from "./helpers";

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
      session: {
        type: "object",
        description: "The coach creator session with conversation history",
      },
      safetyProfile: {
        type: "object",
        description: "Extracted safety profile",
      },
      methodologyPreferences: {
        type: "object",
        description: "Extracted methodology preferences",
      },
      genderPreference: {
        type: "string",
        description: "User's coach gender preference",
      },
    },
    required: ["session", "safetyProfile", "methodologyPreferences", "genderPreference"],
  },

  async execute(
    input: any,
    context: CoachCreatorContext,
  ): Promise<PersonalitySelectionResult> {
    console.info("🎭 Executing select_personality_template tool");

    const { session, safetyProfile, methodologyPreferences, genderPreference } = input;

    // Build user profile summary for AI analysis
    const userResponses = session.conversationHistory
      ?.filter((m: any) => m.role === "user")
      .map((m: any) => m.content)
      .join("\n") || "";

    const prompt = `Analyze this user profile and select the most appropriate coach personality template.

USER SOPHISTICATION: ${session.sophisticationLevel}
GENDER PREFERENCE: ${genderPreference}
EXPERIENCE: ${methodologyPreferences.experience || "intermediate"}
GOALS: ${methodologyPreferences.focus?.join(", ") || "general fitness"}
INJURIES/LIMITATIONS: ${safetyProfile.injuries?.length > 0 ? safetyProfile.injuries.join(", ") : "none"}

USER CONVERSATION EXCERPTS:
${userResponses.substring(0, 1500)}

AVAILABLE TEMPLATES:
${COACH_PERSONALITY_TEMPLATES.map((t) => `- ${t.id.toUpperCase()}: ${t.name}
  Best for: ${t.bestFor.join(", ")}
  Style: ${t.communicationStyle}`).join("\n\n")}

SELECTION GUIDELINES:
- Beginner/returning → Often Emma (Encouraging)
- Intermediate/skill-focused → Often Marcus (Technical)
- Advanced/competitive → Often Diana (Competitive)
- Busy lifestyle/sustainable → Often Alex (Balanced)

Consider the user's complete profile. Return JSON with:
{
  "primaryTemplate": "emma|marcus|diana|alex",
  "secondaryInfluences": ["template_id"],
  "selectionReasoning": "Detailed explanation...",
  "blendingWeights": { "primary": 0.7, "secondary": 0.3 }
}`;

    const response = await callBedrockApi(
      prompt,
      "Select the optimal personality template",
      MODEL_IDS.PLANNER_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        prefillResponse: "{",
      },
    ) as string;

    const result = parseJsonWithFallbacks(response);

    // Validate primary template
    const validTemplates = ["emma", "marcus", "diana", "alex"];
    if (!validTemplates.includes(result.primaryTemplate)) {
      result.primaryTemplate = "emma"; // Default to encouraging
    }

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
      primaryTemplate: result.primaryTemplate,
      secondaryInfluences: result.secondaryInfluences || [],
      selectionReasoning: result.selectionReasoning || "Default selection",
      blendingWeights: result.blendingWeights || { primary: 0.7, secondary: 0.3 },
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
      session: {
        type: "object",
        description: "The coach creator session",
      },
      safetyProfile: {
        type: "object",
        description: "Extracted safety profile",
      },
      methodologyPreferences: {
        type: "object",
        description: "Extracted methodology preferences",
      },
      personalitySelection: {
        type: "object",
        description: "Selected personality template result",
      },
    },
    required: ["session", "safetyProfile", "methodologyPreferences", "personalitySelection"],
  },

  async execute(
    input: any,
    context: CoachCreatorContext,
  ): Promise<MethodologySelectionResult> {
    console.info("📋 Executing select_methodology_template tool");

    const { session, safetyProfile, methodologyPreferences, personalitySelection } = input;

    const prompt = `Select the optimal training methodology for this user.

USER PROFILE:
- Sophistication: ${session.sophisticationLevel}
- Experience: ${methodologyPreferences.experience || "intermediate"}
- Goals: ${methodologyPreferences.focus?.join(", ") || "general fitness"}
- Personality: ${personalitySelection.primaryTemplate}
- Equipment: ${safetyProfile.equipment?.join(", ") || "basic"}
- Injuries: ${safetyProfile.injuries?.length > 0 ? safetyProfile.injuries.join(", ") : "none"}

AVAILABLE METHODOLOGIES:
${METHODOLOGY_TEMPLATES.map((m) => `- ${m.id}: ${m.name}
  Best for: ${m.bestFor.join(", ")}
  Strength bias: ${m.strengthBias}
  Conditioning: ${m.conditioningApproach}`).join("\n\n")}

Return JSON with:
{
  "primaryMethodology": "methodology_id",
  "methodologyReasoning": "Explanation...",
  "programmingEmphasis": "strength|conditioning|balanced",
  "periodizationApproach": "linear|conjugate|block|daily_undulating",
  "creativityEmphasis": "high_variety|medium_variety|low_variety",
  "workoutInnovation": "enabled|disabled"
}`;

    const response = await callBedrockApi(
      prompt,
      "Select the optimal methodology",
      MODEL_IDS.PLANNER_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        prefillResponse: "{",
      },
    ) as string;

    const result = parseJsonWithFallbacks(response);

    // Validate methodology
    const validMethodologies = METHODOLOGY_TEMPLATES.map((m) => m.id);
    if (!validMethodologies.includes(result.primaryMethodology)) {
      result.primaryMethodology = "prvn_fitness"; // Default to balanced
    }

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
      primaryMethodology: result.primaryMethodology,
      methodologyReasoning: result.methodologyReasoning || "Default selection",
      programmingEmphasis: result.programmingEmphasis || "balanced",
      periodizationApproach: result.periodizationApproach || "linear",
      creativityEmphasis: result.creativityEmphasis || "medium_variety",
      workoutInnovation: result.workoutInnovation || "enabled",
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
      session: {
        type: "object",
        description: "The coach creator session",
      },
      safetyProfile: {
        type: "object",
        description: "Extracted safety profile",
      },
      methodologyPreferences: {
        type: "object",
        description: "Extracted methodology preferences",
      },
      genderPreference: {
        type: "string",
        description: "User's coach gender preference",
      },
      personalitySelection: {
        type: "object",
        description: "Selected personality template result",
      },
      methodologySelection: {
        type: "object",
        description: "Selected methodology template result",
      },
    },
    required: [
      "session",
      "safetyProfile",
      "methodologyPreferences",
      "genderPreference",
      "personalitySelection",
      "methodologySelection",
    ],
  },

  async execute(
    input: any,
    context: CoachCreatorContext,
  ): Promise<CoachPromptsResult> {
    console.info("📝 Executing generate_coach_prompts tool");

    const {
      session,
      safetyProfile,
      methodologyPreferences,
      genderPreference,
      personalitySelection,
      methodologySelection,
    } = input;

    // Build comprehensive prompt for AI generation
    const personalityTemplate = personalitySelection.templateData;
    const methodologyTemplate = methodologySelection.templateData;

    const prompt = `Generate comprehensive coach prompts for this personalized AI fitness coach.

COACH IDENTITY:
- Personality: ${personalitySelection.primaryTemplate} (${personalityTemplate.name})
- Methodology: ${methodologySelection.primaryMethodology} (${methodologyTemplate.name})
- Gender: ${genderPreference}

USER PROFILE:
- Experience: ${session.sophisticationLevel}
- Goals: ${methodologyPreferences.focus?.join(", ") || "general fitness"}
- Injuries: ${safetyProfile.injuries?.length > 0 ? safetyProfile.injuries.join(", ") : "none"}
- Equipment: ${safetyProfile.equipment?.join(", ") || "basic"}

PERSONALITY TEMPLATE REFERENCE:
${personalityTemplate.fullPrompt}

METHODOLOGY REFERENCE:
- Approach: ${methodologyTemplate.programmingApproach}
- Strength bias: ${methodologyTemplate.strengthBias}
- Conditioning: ${methodologyTemplate.conditioningApproach}

NEONPANDA BRAND: "Playful power" - seriously smart coaching wrapped in approachable, energetic package.

Generate JSON with 7 complete, ready-to-use prompts:
{
  "personality_prompt": "Complete personality system prompt...",
  "safety_integrated_prompt": "Safety-aware coaching prompt with specific injury awareness...",
  "motivation_prompt": "Motivation approach based on user preferences...",
  "methodology_prompt": "Programming methodology with safety constraints...",
  "communication_style": "Response format and interaction style...",
  "learning_adaptation_prompt": "Teaching approach for this user's level...",
  "gender_tone_prompt": "${genderPreference === "male" ? "Male coach persona with he/him pronouns, confident direct style..." : genderPreference === "female" ? "Female coach persona with she/her pronouns, warm supportive style..." : "Gender-neutral coach with balanced professional characteristics..."}"
}

Each prompt should be 100-300 words, personalized to THIS user, and ready to use as a system prompt.`;

    const response = await callBedrockApi(
      prompt,
      "Generate all coach prompts",
      MODEL_IDS.PLANNER_MODEL_FULL,
      {
        temperature: TEMPERATURE_PRESETS.CREATIVE,
        prefillResponse: "{",
      },
    ) as string;

    const result = parseJsonWithFallbacks(response);

    // Validate all prompts exist
    const requiredPrompts = [
      "personality_prompt",
      "safety_integrated_prompt",
      "motivation_prompt",
      "methodology_prompt",
      "communication_style",
      "learning_adaptation_prompt",
      "gender_tone_prompt",
    ];

    for (const promptKey of requiredPrompts) {
      if (!result[promptKey] || result[promptKey].length < 50) {
        throw new Error(`Missing or too short prompt: ${promptKey}`);
      }
    }

    console.info("✅ Coach prompts generated:", {
      promptCount: 7,
      personalityLength: result.personality_prompt.length,
    });

    return {
      personalityPrompt: result.personality_prompt,
      safetyIntegratedPrompt: result.safety_integrated_prompt,
      motivationPrompt: result.motivation_prompt,
      methodologyPrompt: result.methodology_prompt,
      communicationStyle: result.communication_style,
      learningAdaptationPrompt: result.learning_adaptation_prompt,
      genderTonePrompt: result.gender_tone_prompt,
    };
  },
};

/**
 * Tool 5: Validate Coach Config
 *
 * Validates the assembled coach configuration for completeness and coherence.
 */
export const validateCoachConfigTool: Tool<CoachCreatorContext> = {
  id: "validate_coach_config",
  description: `Validate the assembled coach configuration.

CALL THIS FIFTH after generate_coach_prompts.

This tool checks:
- Schema compliance (all required fields present)
- Safety validation (injury considerations properly integrated)
- Personality coherence (no conflicting traits)
- Gender preference matching

Returns: isValid, shouldNormalize, confidence, validationIssues, safetyValidation, personalityCoherence`,

  inputSchema: {
    type: "object",
    properties: {
      coachConfig: {
        type: "object",
        description: "The assembled coach configuration to validate",
      },
      safetyProfile: {
        type: "object",
        description: "Original safety profile for validation",
      },
    },
    required: ["coachConfig", "safetyProfile"],
  },

  async execute(
    input: any,
    context: CoachCreatorContext,
  ): Promise<CoachConfigValidationResult> {
    console.info("✅ Executing validate_coach_config tool");

    const { coachConfig, safetyProfile } = input;

    // 1. Schema validation
    const schemaValidation = validateCoachConfig(coachConfig);

    // 2. Safety validation
    const safetyValidation = await validateCoachConfigSafety(
      coachConfig,
      safetyProfile,
    );

    // 3. Personality coherence
    const personalityCoherence = await validatePersonalityCoherence(coachConfig);

    // 4. Gender preference validation
    const genderIssues: string[] = [];
    if (coachConfig.gender_preference && safetyProfile.requestedGender) {
      if (coachConfig.gender_preference !== safetyProfile.requestedGender) {
        genderIssues.push(
          `Gender mismatch: requested ${safetyProfile.requestedGender}, got ${coachConfig.gender_preference}`,
        );
      }
    }

    // Combine all issues
    const allIssues = [
      ...schemaValidation.errors,
      ...safetyValidation.issues,
      ...(personalityCoherence.consistency_score < 7
        ? personalityCoherence.conflicting_traits
        : []),
      ...genderIssues,
    ];

    // Determine if normalization is needed
    const shouldNormalize =
      allIssues.length > 0 &&
      allIssues.length < 5 && // Not too many issues
      !allIssues.some((i) => i.includes("Missing required field")); // Not critical

    // Calculate confidence
    let confidence = 1.0;
    confidence -= schemaValidation.errors.length * 0.1;
    confidence -= safetyValidation.issues.length * 0.05;
    confidence -= (10 - personalityCoherence.consistency_score) * 0.05;
    confidence = Math.max(0, Math.min(1, confidence));

    const isValid = schemaValidation.isValid && genderIssues.length === 0;

    console.info("Validation results:", {
      isValid,
      shouldNormalize,
      confidence,
      issueCount: allIssues.length,
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
    };
  },
};

/**
 * Tool 6: Normalize Coach Config
 *
 * Fixes minor issues in the coach configuration using AI.
 */
export const normalizeCoachConfigTool: Tool<CoachCreatorContext> = {
  id: "normalize_coach_config",
  description: `Normalize and fix minor issues in the coach configuration.

ONLY CALL THIS IF validate_coach_config returns shouldNormalize: true.

This tool:
- Fixes field format issues
- Fills missing optional fields with sensible defaults
- Corrects personality/methodology inconsistencies
- Ensures all arrays have valid content

Returns: normalizedConfig, issuesFixed, normalizationSummary`,

  inputSchema: {
    type: "object",
    properties: {
      coachConfig: {
        type: "object",
        description: "The coach configuration to normalize",
      },
      validationIssues: {
        type: "array",
        description: "Issues identified during validation",
      },
    },
    required: ["coachConfig", "validationIssues"],
  },

  async execute(
    input: any,
    context: CoachCreatorContext,
  ): Promise<CoachConfigNormalizationResult> {
    console.info("🔧 Executing normalize_coach_config tool");

    const { coachConfig, validationIssues } = input;

    // Create a mutable copy
    const normalizedConfig = JSON.parse(JSON.stringify(coachConfig));
    let issuesFixed = 0;
    const fixes: string[] = [];

    // Fix common issues
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
    if (!["beginner", "intermediate", "advanced"].includes(
      normalizedConfig.technical_config?.experience_level,
    )) {
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
    if (!normalizedConfig.technical_config.time_constraints ||
        typeof normalizedConfig.technical_config.time_constraints !== "object") {
      normalizedConfig.technical_config.time_constraints = {
        preferred_time: "flexible",
        session_duration: "45-60 minutes",
        weekly_frequency: `${normalizedConfig.technical_config.training_frequency} days per week`,
      };
      issuesFixed++;
      fixes.push("Created default time_constraints");
    }

    const normalizationSummary = fixes.length > 0
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
 * Tool 7: Save Coach Config to Database
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
5. validate_coach_config (passed)
6. normalize_coach_config (if needed)

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
      coachConfig: {
        type: "object",
        description: "The finalized coach configuration",
      },
      session: {
        type: "object",
        description: "The coach creator session",
      },
      sessionSummary: {
        type: "string",
        description: "Generated session summary",
      },
      creationTimestamp: {
        type: "string",
        description: "ISO timestamp for consistent dating",
      },
    },
    required: ["coachConfig", "session", "sessionSummary", "creationTimestamp"],
  },

  async execute(
    input: any,
    context: CoachCreatorContext & { getToolResult?: (key: string) => any },
  ): Promise<CoachConfigSaveResult> {
    console.info("💾 Executing save_coach_config_to_database tool");

    const { coachConfig, session, sessionSummary, creationTimestamp } = input;

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
        primaryMethodology: coachConfig.selected_methodology.primary_methodology,
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
