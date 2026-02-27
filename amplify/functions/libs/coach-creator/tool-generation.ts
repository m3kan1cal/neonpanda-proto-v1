/**
 * Coach Creator Tool Generation Helpers
 *
 * Helper functions that encapsulate AI calls with proper tool configs.
 * These functions follow the pattern from program-designer's phase-generator.ts,
 * using Bedrock tool configs instead of prefillResponse to eliminate double-encoding.
 *
 * Parallels data-extraction.ts:
 * - data-extraction.ts: Extracts structured data FROM session conversations
 * - tool-generation.ts: Generates structured data FOR coach configuration
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import type { BedrockToolUseResult } from "../api-helpers";
import {
  PERSONALITY_SELECTION_SCHEMA,
  METHODOLOGY_SELECTION_SCHEMA,
  COACH_PROMPTS_SCHEMA,
  VALIDATION_RESULT_SCHEMA,
  COACH_NAME_SCHEMA,
} from "../schemas/coach-creator-tool-schemas";
import {
  COACH_PERSONALITY_TEMPLATES,
  METHODOLOGY_TEMPLATES,
} from "./coach-generation";
import type { CoachCreatorSession, CoachConfig } from "./types";
import type {
  SafetyProfile,
  MethodologyPreferences,
  PersonalitySelectionResult,
  MethodologySelectionResult,
  CoachPromptsResult,
} from "../agents/coach-creator/types";
import { fixDoubleEncodedProperties } from "../response-utils";
import { logger } from "../logger";

/**
 * Context for personality selection
 */
export interface PersonalitySelectionContext {
  session: CoachCreatorSession;
  safetyProfile: SafetyProfile;
  methodologyPreferences: MethodologyPreferences;
  genderPreference: "male" | "female" | "neutral";
  sessionSummary: string;
}

/**
 * Context for methodology selection
 */
export interface MethodologySelectionContext {
  session: CoachCreatorSession;
  safetyProfile: SafetyProfile;
  methodologyPreferences: MethodologyPreferences;
  genderPreference: "male" | "female" | "neutral";
  personalitySelection?: PersonalitySelectionResult; // Optional to support parallel execution
  sessionSummary: string;
}

/**
 * Context for prompt generation
 */
export interface PromptGenerationContext {
  session: CoachCreatorSession;
  safetyProfile: SafetyProfile;
  methodologyPreferences: MethodologyPreferences;
  genderPreference: "male" | "female" | "neutral";
  personalitySelection: PersonalitySelectionResult;
  methodologySelection: MethodologySelectionResult;
}

/**
 * AI validation result structure
 */
export interface AiValidationResult {
  genderConsistency: number;
  safetyLanguageQuality: number;
  brandVoiceScore: number;
  promptCoherence: number;
  issues: string[];
}

/**
 * Generate personality selection using AI with tool config
 *
 * Analyzes user preferences and session data to select the optimal
 * personality template for their coach.
 */
export async function generatePersonalitySelection(
  context: PersonalitySelectionContext,
): Promise<Omit<PersonalitySelectionResult, "templateData">> {
  const startTime = Date.now();
  logger.info("🎯 Generating personality selection via AI:", {
    genderPreference: context.genderPreference,
    methodologyFocus: context.methodologyPreferences.focus,
  });

  const {
    session,
    safetyProfile,
    methodologyPreferences,
    genderPreference,
    sessionSummary,
  } = context;

  const prompt = `You are an expert fitness coach personality matcher. Analyze this user's complete profile and select the best coaching personality.

USER PROFILE FROM SESSION:
${sessionSummary}

DETAILED METHODOLOGY PREFERENCES:
- Primary focus: ${methodologyPreferences.primary || "Not specified"}
- Focus areas: ${methodologyPreferences.focus?.join(", ") || "Not specified"}
- Preferences: ${methodologyPreferences.preferences?.join(", ") || "Not specified"}
- Avoidances: ${methodologyPreferences.avoidances?.join(", ") || "None"}
- Experience level: ${methodologyPreferences.experience}

SAFETY CONSIDERATIONS:
- Injuries: ${safetyProfile.injuries?.join(", ") || "None reported"}
- Contraindications: ${safetyProfile.contraindications?.join(", ") || "None"}
- Equipment: ${safetyProfile.equipment?.join(", ") || "Standard gym"}
- Experience: ${safetyProfile.experienceLevel || "Intermediate"}

GENDER PREFERENCE: ${genderPreference}

AVAILABLE PERSONALITY TEMPLATES:
${COACH_PERSONALITY_TEMPLATES.map(
  (template) =>
    `${template.id.toUpperCase()}: ${template.name}
  Communication Style: ${template.communicationStyle}
  Motivation Style: ${template.motivationStyle}
  Best for: ${template.bestFor.join(", ")}`,
).join("\n\n")}

SELECTION CRITERIA:
1. Match coaching style to user's experience level and goals
2. Consider their personality preferences from conversation
3. Align with their methodology focus (strength vs conditioning vs balanced)
4. Account for any safety/injury considerations that require careful coaching
5. Consider gender preference alignment with personality traits

Select the optimal personality template and provide reasoning using the tool.`;

  const result = (await callBedrockApi(
    prompt,
    "Select the optimal personality template",
    MODEL_IDS.PLANNER_MODEL_FULL,
    {
      temperature: TEMPERATURE_PRESETS.BALANCED,
      tools: PERSONALITY_SELECTION_SCHEMA,
      expectedToolName: PERSONALITY_SELECTION_SCHEMA.name,
    },
  )) as BedrockToolUseResult;

  const duration = Date.now() - startTime;

  // Fix any double-encoded properties from Bedrock response
  const fixedInput = fixDoubleEncodedProperties(result.input);
  const toolInput = fixedInput as {
    primaryTemplate: string;
    secondaryInfluences?: string[];
    selectionReasoning: string;
    blendingWeights: { primary: number; secondary: number };
  };

  // Validate primary template
  const validTemplates = ["emma", "marcus", "diana", "alex"];
  const primaryTemplate = validTemplates.includes(toolInput.primaryTemplate)
    ? toolInput.primaryTemplate
    : "emma"; // Default to encouraging

  logger.info("✅ Personality selection completed:", {
    primary: primaryTemplate,
    secondary: toolInput.secondaryInfluences,
    durationMs: duration,
  });

  return {
    primaryTemplate,
    secondaryInfluences: toolInput.secondaryInfluences || [],
    selectionReasoning: toolInput.selectionReasoning || "Default selection",
    blendingWeights: toolInput.blendingWeights || {
      primary: 0.7,
      secondary: 0.3,
    },
  };
}

/**
 * Generate methodology selection using AI with tool config
 *
 * Analyzes user goals, experience, and preferences to select
 * the optimal training methodology.
 */
export async function generateMethodologySelection(
  context: MethodologySelectionContext,
): Promise<Omit<MethodologySelectionResult, "templateData">> {
  const startTime = Date.now();
  logger.info("🎯 Generating methodology selection via AI:", {
    personalityTemplate:
      context.personalitySelection?.primaryTemplate || "not yet selected",
    methodologyFocus: context.methodologyPreferences.focus,
  });

  const {
    session,
    safetyProfile,
    methodologyPreferences,
    genderPreference,
    personalitySelection,
    sessionSummary,
  } = context;

  // Build personality context (may not be available during parallel execution)
  const personalityContext = personalitySelection
    ? `
SELECTED PERSONALITY: ${personalitySelection.primaryTemplate}
Reasoning: ${personalitySelection.selectionReasoning}
`
    : `
PERSONALITY SELECTION: In progress (selecting in parallel)
`;

  const prompt = `You are an expert training methodology specialist. Analyze this user's complete profile and select the best training methodology.

USER PROFILE FROM SESSION:
${sessionSummary}
${personalityContext}

DETAILED METHODOLOGY PREFERENCES:
- Focus areas: ${methodologyPreferences.focus?.join(", ") || "Not specified"}
- Preferences: ${methodologyPreferences.preferences?.join(", ") || "Not specified"}
- Avoidances: ${methodologyPreferences.avoidances?.join(", ") || "None"}
- Experience level: ${methodologyPreferences.experience}

SAFETY CONSIDERATIONS:
- Injuries: ${safetyProfile.injuries?.join(", ") || "None reported"}
- Contraindications: ${safetyProfile.contraindications?.join(", ") || "None"}
- Equipment available: ${safetyProfile.equipment?.join(", ") || "Standard gym"}
- Experience: ${safetyProfile.experienceLevel || "Intermediate"}

AVAILABLE METHODOLOGIES:
${METHODOLOGY_TEMPLATES.map(
  (m) =>
    `- ${m.id}: ${m.name}
  Best for: ${m.bestFor.join(", ")}
  Strength bias: ${m.strengthBias}
  Conditioning: ${m.conditioningApproach}`,
).join("\n\n")}

SELECTION CRITERIA:
1. Match methodology to user's primary training goals
2. Consider their experience level and injury history
3. Align with equipment availability
4. Consider time constraints and training frequency preferences${personalitySelection ? "\n5. Match the selected personality's coaching approach" : ""}

Select the optimal methodology and configuration using the tool.`;

  const result = (await callBedrockApi(
    prompt,
    "Select the optimal methodology",
    MODEL_IDS.PLANNER_MODEL_FULL,
    {
      temperature: TEMPERATURE_PRESETS.BALANCED,
      tools: METHODOLOGY_SELECTION_SCHEMA,
      expectedToolName: METHODOLOGY_SELECTION_SCHEMA.name,
    },
  )) as BedrockToolUseResult;

  const duration = Date.now() - startTime;

  // Fix any double-encoded properties from Bedrock response
  const fixedInput = fixDoubleEncodedProperties(result.input);
  const toolInput = fixedInput as {
    primaryMethodology: string;
    methodologyReasoning: string;
    programmingEmphasis: "strength" | "conditioning" | "balanced";
    periodizationApproach:
      | "linear"
      | "conjugate"
      | "block"
      | "daily_undulating";
    creativityEmphasis: "high_variety" | "medium_variety" | "low_variety";
    workoutInnovation: "enabled" | "disabled";
  };

  // Validate methodology
  const validMethodologies = METHODOLOGY_TEMPLATES.map((m) => m.id);
  const primaryMethodology = validMethodologies.includes(
    toolInput.primaryMethodology,
  )
    ? toolInput.primaryMethodology
    : "prvn_fitness"; // Default to balanced

  logger.info("✅ Methodology selection completed:", {
    methodology: primaryMethodology,
    emphasis: toolInput.programmingEmphasis,
    periodization: toolInput.periodizationApproach,
    durationMs: duration,
  });

  return {
    primaryMethodology,
    methodologyReasoning: toolInput.methodologyReasoning || "Default selection",
    programmingEmphasis: toolInput.programmingEmphasis || "balanced",
    periodizationApproach: toolInput.periodizationApproach || "linear",
    creativityEmphasis: toolInput.creativityEmphasis || "medium_variety",
    workoutInnovation: toolInput.workoutInnovation || "enabled",
  };
}

/**
 * Generate coach prompts using AI with tool config
 *
 * Generates all 7 personality prompts for the coach configuration
 * based on selected personality, methodology, and user preferences.
 */
export async function generateCoachPrompts(
  context: PromptGenerationContext,
): Promise<CoachPromptsResult> {
  const startTime = Date.now();
  logger.info("🎯 Generating coach prompts via AI:", {
    personalityTemplate: context.personalitySelection.primaryTemplate,
    methodology: context.methodologySelection.primaryMethodology,
    genderPreference: context.genderPreference,
  });

  const {
    session,
    safetyProfile,
    methodologyPreferences,
    genderPreference,
    personalitySelection,
    methodologySelection,
  } = context;

  // Get full template data
  const personalityTemplate = COACH_PERSONALITY_TEMPLATES.find(
    (t) => t.id === personalitySelection.primaryTemplate,
  );
  const methodologyTemplate = METHODOLOGY_TEMPLATES.find(
    (m) => m.id === methodologySelection.primaryMethodology,
  );

  const prompt = `You are an expert coach prompt engineer. Generate 7 complete, personalized coaching prompts.

SELECTED PERSONALITY TEMPLATE: ${personalitySelection.primaryTemplate}
- Name: ${personalityTemplate?.name || personalitySelection.primaryTemplate}
- Communication Style: ${personalityTemplate?.communicationStyle || "Professional and encouraging"}
- Motivation Style: ${personalityTemplate?.motivationStyle || "Balanced coaching"}

SELECTED METHODOLOGY: ${methodologySelection.primaryMethodology}
- Emphasis: ${methodologySelection.programmingEmphasis}
- Periodization: ${methodologySelection.periodizationApproach}
- Strength bias: ${methodologyTemplate?.strengthBias || "moderate"}
- Conditioning: ${methodologyTemplate?.conditioningApproach || "mixed"}

GENDER PREFERENCE: ${genderPreference}

USER SAFETY PROFILE:
- Injuries: ${safetyProfile.injuries?.join(", ") || "None"}
- Contraindications: ${safetyProfile.contraindications?.join(", ") || "None"}
- Equipment: ${safetyProfile.equipment?.join(", ") || "Standard gym"}
- Experience: ${safetyProfile.experienceLevel || "Intermediate"}

USER METHODOLOGY PREFERENCES:
- Focus: ${methodologyPreferences.focus?.join(", ") || "General fitness"}
- Preferences: ${methodologyPreferences.preferences?.join(", ") || "None specific"}
- Avoidances: ${methodologyPreferences.avoidances?.join(", ") || "None"}

NEONPANDA BRAND: "Playful power" - seriously smart coaching wrapped in approachable, energetic package.

PROMPT REQUIREMENTS:
- Each prompt should be 100-300 words
- Personalized to THIS user's specific profile and needs
- Ready to use as a system prompt
- Consistent in tone and voice across all prompts
- Safety-aware without being overly restrictive

Generate all 7 prompts using the tool:
1. personality_prompt - Main coaching personality and behavior
2. safety_integrated_prompt - Safety-aware coaching with injury awareness
3. motivation_prompt - Motivation and encouragement approach
4. methodology_prompt - Programming and training methodology
5. communication_style - Response format and interaction style
6. learning_adaptation_prompt - Teaching and progression approach
7. gender_tone_prompt - ${genderPreference === "male" ? "Male coach persona with he/him pronouns" : genderPreference === "female" ? "Female coach persona with she/her pronouns" : "Gender-neutral coach persona"}`;

  const result = (await callBedrockApi(
    prompt,
    "Generate all coach prompts",
    MODEL_IDS.PLANNER_MODEL_FULL,
    {
      temperature: TEMPERATURE_PRESETS.CREATIVE,
      tools: COACH_PROMPTS_SCHEMA,
      expectedToolName: COACH_PROMPTS_SCHEMA.name,
    },
  )) as BedrockToolUseResult;

  const duration = Date.now() - startTime;

  // Fix any double-encoded properties from Bedrock response
  const fixedInput = fixDoubleEncodedProperties(result.input);
  const toolInput = fixedInput as {
    personality_prompt: string;
    safety_integrated_prompt: string;
    motivation_prompt: string;
    methodology_prompt: string;
    communication_style: string;
    learning_adaptation_prompt: string;
    gender_tone_prompt: string;
  };

  // Validate all prompts exist and have minimum length
  const requiredPrompts = [
    "personality_prompt",
    "safety_integrated_prompt",
    "motivation_prompt",
    "methodology_prompt",
    "communication_style",
    "learning_adaptation_prompt",
    "gender_tone_prompt",
  ] as const;

  for (const promptKey of requiredPrompts) {
    if (!toolInput[promptKey] || toolInput[promptKey].length < 50) {
      throw new Error(`Missing or too short prompt: ${promptKey}`);
    }
  }

  logger.info("✅ Coach prompts generated:", {
    promptCount: 7,
    personalityLength: toolInput.personality_prompt.length,
    durationMs: duration,
  });

  return {
    personalityPrompt: toolInput.personality_prompt,
    safetyIntegratedPrompt: toolInput.safety_integrated_prompt,
    motivationPrompt: toolInput.motivation_prompt,
    methodologyPrompt: toolInput.methodology_prompt,
    communicationStyle: toolInput.communication_style,
    learningAdaptationPrompt: toolInput.learning_adaptation_prompt,
    genderTonePrompt: toolInput.gender_tone_prompt,
  };
}

/**
 * Run AI-powered validation on coach configuration
 *
 * Validates gender consistency, safety language quality, brand voice,
 * and prompt coherence across the generated configuration.
 */
export async function runConfigValidation(
  config: CoachConfig,
  safetyProfile: SafetyProfile,
): Promise<AiValidationResult> {
  const startTime = Date.now();
  logger.info("🎯 Running AI validation on coach config:", {
    coachId: config.coach_id,
    personality: config.selected_personality?.primary_template,
    methodology: config.selected_methodology?.primary_methodology,
  });

  const prompt = `Validate this coach configuration for consistency and quality.

COACH CONFIGURATION:
- Name: ${config.coach_name}
- Gender Preference: ${config.gender_preference}
- Primary Personality: ${config.selected_personality?.primary_template}
- Primary Methodology: ${config.selected_methodology?.primary_methodology}

USER SAFETY PROFILE:
- Injuries: ${safetyProfile.injuries?.join(", ") || "None"}
- Contraindications: ${safetyProfile.contraindications?.join(", ") || "None"}
- Required modifications: ${safetyProfile.modifications?.join(", ") || "None"}

GENERATED PROMPTS:
1. Personality: ${config.generated_prompts?.personality_prompt?.substring(0, 500)}...
2. Safety: ${config.generated_prompts?.safety_integrated_prompt?.substring(0, 500)}...
3. Gender Tone: ${config.generated_prompts?.gender_tone_prompt?.substring(0, 500)}...

VALIDATE THESE AREAS:
1. Gender Consistency: Do pronouns and tone match the gender preference throughout?
2. Safety Language Quality: Are injury considerations integrated naturally (not robotic/awkward)?
3. Brand Voice: Does tone match "playful power" (energetic but professional)?
4. Prompt Coherence: Do all prompts complement each other without contradictions?

Provide validation scores and any issues found using the tool.`;

  const result = (await callBedrockApi(
    prompt,
    "Validate coach configuration quality",
    MODEL_IDS.UTILITY_MODEL_FULL, // Small 5-field schema, structured scores output consumed programmatically
    {
      temperature: TEMPERATURE_PRESETS.STRUCTURED,
      tools: VALIDATION_RESULT_SCHEMA,
      expectedToolName: VALIDATION_RESULT_SCHEMA.name,
    },
  )) as BedrockToolUseResult;

  const duration = Date.now() - startTime;

  // Fix any double-encoded properties from Bedrock response
  const fixedInput = fixDoubleEncodedProperties(result.input);
  const toolInput = fixedInput as {
    gender_consistency: boolean;
    safety_language_quality: number;
    brand_voice_score: number;
    prompt_coherence: number;
    issues: string[];
  };

  logger.info("✅ AI validation completed:", {
    genderConsistency: toolInput.gender_consistency,
    safetyScore: toolInput.safety_language_quality,
    brandScore: toolInput.brand_voice_score,
    coherenceScore: toolInput.prompt_coherence,
    issueCount: toolInput.issues?.length || 0,
    durationMs: duration,
  });

  return {
    genderConsistency: toolInput.gender_consistency ? 10 : 0,
    safetyLanguageQuality: toolInput.safety_language_quality || 0,
    brandVoiceScore: toolInput.brand_voice_score || 0,
    promptCoherence: toolInput.prompt_coherence || 0,
    issues: toolInput.issues || [],
  };
}

/**
 * Context for coach name generation
 */
export interface CoachNameContext {
  personalityTemplate: string;
  personalityReasoning: string;
  methodologyTemplate: string;
  methodologyReasoning: string;
  genderPreference: "male" | "female" | "neutral";
  primaryGoals: string;
  specializations: string[];
  userAge?: number;
  experienceLevel?: string;
}

/**
 * Result from coach name generation
 */
export interface CoachNameResult {
  coachName: string;
  nameReasoning: string;
  coachDescription: string;
}

/**
 * Generate creative, contextual coach name using AI
 *
 * Uses Claude Sonnet with high creativity to generate names that:
 * - Incorporate personality template essence
 * - Reflect user's specific training goals
 * - Match gender preference appropriately
 * - Embody NeonPanda's "playful power" philosophy
 */
export async function generateCoachName(
  context: CoachNameContext,
): Promise<CoachNameResult> {
  const startTime = Date.now();
  logger.info("🎨 Generating creative coach name via AI:", {
    personality: context.personalityTemplate,
    methodology: context.methodologyTemplate,
    gender: context.genderPreference,
  });

  const {
    personalityTemplate,
    personalityReasoning,
    methodologyTemplate,
    methodologyReasoning,
    genderPreference,
    primaryGoals,
    specializations,
    userAge,
    experienceLevel,
  } = context;

  // Get personality and methodology template data for context
  const personalityData = COACH_PERSONALITY_TEMPLATES.find(
    (t) => t.id === personalityTemplate,
  );
  const methodologyData = METHODOLOGY_TEMPLATES.find(
    (t) => t.id === methodologyTemplate,
  );

  const genderGuidance =
    genderPreference === "male"
      ? "Generate a MASCULINE name variant (e.g., Marcus, Derek, Max, Ethan, Dylan). Use strong, confident naming that reflects male coaching persona."
      : genderPreference === "female"
        ? "Generate a FEMININE name variant (e.g., Maria, Diana, Maya, Alexa, Emma, Mara). Use empowering, confident naming that reflects female coaching persona."
        : "Generate a GENDER-NEUTRAL name - do NOT use gendered names like Marcus/Maria/Diana. Use truly neutral names: Alex, Max, Jordan, Riley, Em, Taylor, Morgan, Casey, or similar.";

  const prompt = `You are a creative branding expert for NeonPanda, an innovative AI coaching platform known for "playful power" - energetic, memorable coaching with serious results.

SELECTED PERSONALITY: ${personalityTemplate.toUpperCase()} - ${personalityData?.name || personalityTemplate}
Reasoning: ${personalityReasoning}

SELECTED METHODOLOGY: ${methodologyTemplate} - ${methodologyData?.name || methodologyTemplate}
Reasoning: ${methodologyReasoning}

USER PROFILE:
- Primary Goals: ${primaryGoals}
- Specializations: ${specializations.join(", ") || "general fitness"}
- Experience Level: ${experienceLevel || "intermediate"}
${userAge ? `- Age: ${userAge}` : ""}

GENDER PREFERENCE: ${genderPreference}
${genderGuidance}

CREATE A CREATIVE COACH NAME that:
1. **Incorporates the personality template base** (${personalityTemplate}) but makes it unique
2. **Reflects the user's specific training focus** from their goals and methodology
3. **Embodies NeonPanda's "playful power"** - fun, memorable, professional (not cheesy)
4. **Uses underscore format**: [BaseName]_[Descriptor] - KEEP TO 2-3 PARTS MAXIMUM (e.g., "Maria_Strength_Architect", NOT "Maria_Strength_Architect_Power_Builder")
5. **Matches gender appropriately** - see guidance above

NAMING EXAMPLES FOR INSPIRATION (don't copy, create unique):
- Emma personality + strength focus + female → "Emma_Foundation_Builder"
- Marcus personality + technical focus + female → "Maria_Movement_Maestro"
- Diana personality + competition + female → "Diana_the_Champion_Maker"
- Alex personality + lifestyle + neutral → "Alex_Balance_Architect"

The name should feel:
✓ Energetic and powerful
✓ Specific to this user's journey
✓ Professional but playful
✓ Gender-appropriate
✓ Memorable and unique

Also provide a 3-5 word coach description of their specialty (e.g., "Technical Excellence & Muscle Building", "Elite Performance & Competition Prep").`;

  const result = (await callBedrockApi(
    prompt,
    "Generate a creative, contextual coach name",
    MODEL_IDS.EXECUTOR_MODEL_FULL, // Nova 2 Lite for creative naming
    {
      temperature: 1.0, // High creativity for unique names
      tools: COACH_NAME_SCHEMA,
      expectedToolName: COACH_NAME_SCHEMA.name,
    },
  )) as BedrockToolUseResult;

  // Fix any double-encoded properties from Bedrock response
  const fixedInput = fixDoubleEncodedProperties(result.input);
  const toolInput = fixedInput as {
    coach_name: string;
    name_reasoning: string;
    coach_description: string;
  };

  const duration = Date.now() - startTime;

  logger.info("✅ Coach name generated:", {
    coachName: toolInput.coach_name,
    description: toolInput.coach_description,
    durationMs: duration,
  });

  return {
    coachName: toolInput.coach_name,
    nameReasoning: toolInput.name_reasoning,
    coachDescription: toolInput.coach_description,
  };
}
