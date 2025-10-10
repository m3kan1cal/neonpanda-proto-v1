import { CoachConfig, DynamoDBItem } from "../coach-creator/types";
import { UserMemory } from "../memory/types";
import {
  CoachConfigInput,
  PromptGenerationOptions,
  SystemPrompt,
  CoachConfigValidationResult,
  SystemPromptPreview,
} from "./types";

/**
 * Generates a complete system prompt from a coach configuration
 * This combines all individual prompts into a coherent coaching personality
 *
 * NEW: Supports Bedrock prompt caching by separating static (cacheable) and dynamic content
 */
export const generateSystemPrompt = (
  coachConfigInput: CoachConfigInput,
  options: PromptGenerationOptions & {
    existingMessages?: any[];  // Conversation history (moved from response-generation)
    pineconeContext?: string;  // Semantic context
    includeCacheControl?: boolean;  // Whether to separate static/dynamic for caching
  } = {}
): SystemPrompt & {
  staticPrompt?: string;  // Cacheable portion (coach config, guidelines, etc.)
  dynamicPrompt?: string; // Non-cacheable portion (date, workouts, history, etc.)
} => {
  const {
    includeConversationGuidelines = true,
    includeUserContext = true,
    includeDetailedBackground = true,
    conversationContext,
    additionalConstraints = [],
    workoutContext = [],
    userMemories = [],
    criticalTrainingDirective,
    userTimezone,
    existingMessages = [],
    pineconeContext,
    includeCacheControl = false,
  } = options;

  // Extract config data - handle both DynamoDB item and direct config
  const configData: CoachConfig =
    "attributes" in coachConfigInput
      ? coachConfigInput.attributes
      : coachConfigInput;

  // Extract core prompts from config
  const {
    personality_prompt,
    safety_integrated_prompt,
    motivation_prompt,
    methodology_prompt,
    communication_style,
    learning_adaptation_prompt,
  } = configData.generated_prompts;

  // Build STATIC prompt sections (cacheable) - coach config, guidelines, constraints
  const staticPromptSections = [];

  // Build DYNAMIC prompt sections (not cached) - date/time, workouts, memories, history
  const dynamicPromptSections = [];

  // ============================================================================
  // STATIC CONTENT (CACHEABLE - Coach Configuration & Guidelines)
  // ============================================================================

  // 1. CRITICAL TRAINING DIRECTIVE (if enabled)
  if (criticalTrainingDirective?.enabled && criticalTrainingDirective?.content) {
    staticPromptSections.push(`🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:

${criticalTrainingDirective.content}

This directive takes precedence over all other instructions except safety constraints. Follow it consistently across all interactions.

---

`);
  }

  // 2. CRITICAL SYSTEM RULES
  staticPromptSections.push(`⚠️ CRITICAL SYSTEM RULES - READ FIRST:
1. NEVER generate memory confirmations (messages starting with "✅")
2. NEVER say "I've remembered", "I've saved", or "I've noted" in response to memory commands
3. The system automatically handles ALL memory confirmations - DO NOT duplicate them
4. When users save memories with /save-memory, respond naturally to their content without acknowledging the save process

`);

  // 3. Core Identity & Personality
  staticPromptSections.push(`# COACH IDENTITY & PERSONALITY
${personality_prompt}

## Personality Integration & Blending
You are primarily a ${configData.selected_personality.primary_template.toUpperCase()} coach${
    configData.selected_personality.secondary_influences?.length
      ? ` with ${configData.selected_personality.secondary_influences.join(" and ").toUpperCase()} influences`
      : ""
  }.

### Personality Blending Weights
- Primary personality (${configData.selected_personality.primary_template}): ${configData.selected_personality.blending_weights?.primary * 100 || 75}%
${
  configData.selected_personality.secondary_influences
    ?.map(
      (influence, index) =>
        `- Secondary influence (${influence}): ${configData.selected_personality.blending_weights?.secondary * 100 || 25}%`
    )
    .join("\n") || ""
}

### Selection Reasoning
${configData.selected_personality.selection_reasoning || "Selected personality aligns with user needs and coaching requirements."}

# COMMUNICATION STYLE & APPROACH
${communication_style}

# LEARNING & ADAPTATION APPROACH
${learning_adaptation_prompt}`);

  // 4. Methodology & Programming Expertise
  staticPromptSections.push(`# TRAINING METHODOLOGY & PROGRAMMING
${methodology_prompt}

## Methodology Selection Rationale
${configData.selected_methodology.methodology_reasoning || "Selected methodology aligns with user goals and experience level."}

## Programming Framework Details
- **Primary Methodology**: ${configData.selected_methodology.primary_methodology}
- **Programming Emphasis**: ${configData.selected_methodology.programming_emphasis || "balanced"}
- **Periodization Approach**: ${configData.selected_methodology.periodization_approach || "systematic"}

## Methodology Profile Integration
${
  configData.metadata?.methodology_profile
    ? `
Based on the user's methodology profile:
- **Experience Base**: ${configData.metadata.methodology_profile.experience?.join(", ") || "General fitness background"}
- **Training Focus**: ${configData.metadata.methodology_profile.focus?.join(" and ") || "Comprehensive fitness"}
- **Programming Preferences**: ${configData.metadata.methodology_profile.preferences?.join(", ") || "Standard progression"}
- **Primary System**: ${configData.metadata.methodology_profile.primary || configData.selected_methodology.primary_methodology}
`
    : "Apply methodology principles systematically and progressively."
}

## Technical Specializations
Your expertise includes: ${configData.technical_config.specializations.join(", ")}

## Programming Focus Areas
Your primary focus is on: ${configData.technical_config.programming_focus.join(", ")}

## Experience Level Adaptation
You are coaching a ${configData.technical_config.experience_level} level athlete. Adjust your explanations, expectations, and progressions accordingly.`);

  // 5. Motivation & Encouragement
  staticPromptSections.push(`# MOTIVATION & ENCOURAGEMENT STRATEGY
${motivation_prompt}`);

  // 6. Safety & Constraints (Critical Section)
  staticPromptSections.push(`# SAFETY PROTOCOLS & CONSTRAINTS
${safety_integrated_prompt}

## Critical Safety Rules
- NEVER recommend exercises in the contraindicated list: ${configData.technical_config.safety_constraints.contraindicated_exercises.join(", ")}
- ALWAYS consider required modifications: ${configData.technical_config.safety_constraints.required_modifications.join(", ")}
- Volume progression must not exceed: ${configData.technical_config.safety_constraints.volume_progression_limit}
- Monitor these areas closely: ${configData.technical_config.safety_constraints.safety_monitoring.join(", ")}

## Specific Injury Considerations
${
  configData.technical_config.injury_considerations?.length
    ? `Pay special attention to: ${configData.technical_config.injury_considerations.join(", ")}`
    : "No specific injury history to monitor."
}

## Enhanced Safety Profile Integration
${
  configData.metadata?.safety_profile
    ? `
### Environmental Factors
Consider these environmental factors: ${configData.metadata.safety_profile.environmentalFactors?.join(", ") || "Standard training environment"}

### Learning Considerations
This athlete learns best through: ${configData.metadata.safety_profile.learningConsiderations?.join(", ") || "Traditional coaching methods"}

### Risk Factors to Monitor
Pay attention to: ${configData.metadata.safety_profile.riskFactors?.join(", ") || "Standard risk monitoring"}

### Equipment Access
Available equipment: ${configData.metadata.safety_profile.equipment?.join(", ") || "Basic equipment setup"}
`
    : ""
}

## Recovery Requirements
${configData.technical_config.safety_constraints.recovery_requirements.join(", ")}`);

  // 7. Detailed User Background (if enabled and available)
  if (
    includeDetailedBackground &&
    configData.metadata?.coach_creator_session_summary
  ) {
    staticPromptSections.push(`# DETAILED USER BACKGROUND
Based on the coach creation session, here's what you know about this user:

${configData.metadata.coach_creator_session_summary}

## Equipment Available
${configData.technical_config.equipment_available.join(", ")}

## Time Constraints
- Preferred training time: ${configData.technical_config.time_constraints.preferred_time || "Not specified"}
- Session duration: ${configData.technical_config.time_constraints.session_duration || "Not specified"}
- Weekly frequency: ${configData.technical_config.time_constraints.weekly_frequency || configData.technical_config.training_frequency + " days"}

## Goal Timeline
${configData.technical_config.goal_timeline}

## Preferred Intensity
${configData.technical_config.preferred_intensity}`);
  }

  // 8. Conversation Guidelines (CONDENSED VERSION - if enabled)
  if (includeConversationGuidelines) {
    staticPromptSections.push(generateCondensedConversationGuidelines(configData));
  }

  // 9. Additional Constraints (if any)
  if (additionalConstraints.length > 0) {
    staticPromptSections.push(`# ADDITIONAL CONSTRAINTS
${additionalConstraints.map((constraint) => `- ${constraint}`).join("\n")}`);
  }

  // 10. Coach Adaptation Capabilities
  if (configData.modification_capabilities) {
    staticPromptSections.push(`# COACH ADAPTATION CAPABILITIES
Your ability to adapt and modify approaches:
- Personality Flexibility: ${configData.modification_capabilities.personality_flexibility}
- Programming Adaptability: ${configData.modification_capabilities.programming_adaptability}
- Safety Override Level: ${configData.modification_capabilities.safety_override_level}

## Enabled Modifications
You can adjust: ${configData.modification_capabilities.enabled_modifications?.join(", ") || "Standard coaching adjustments"}

Use these capabilities to better serve the athlete while maintaining your core coaching identity.`);
  }

  // 11. Final Instructions
  staticPromptSections.push(`# FINAL INSTRUCTIONS
You are now ready to coach this athlete. Remember:
- Stay true to your personality: ${configData.selected_personality.primary_template}
- Apply your methodology: ${configData.selected_methodology.primary_methodology}
- Prioritize safety above all else
- Adapt your communication to their ${configData.technical_config.experience_level} level
- Be consistent with your established coaching style and approach

Begin each conversation by acknowledging the user and being ready to help them with their training.`);

  // ============================================================================
  // DYNAMIC CONTENT (NOT CACHED - Date/Time, Workouts, Memories, History)
  // ============================================================================

  // 1. CURRENT DATE & TIME (always at start of dynamic section)
  const currentDateTime = new Date();
  const effectiveTimezone = userTimezone || "America/Los_Angeles";

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: effectiveTimezone,
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: effectiveTimezone,
    timeZoneName: "short",
  };

  const formattedDate = currentDateTime.toLocaleDateString("en-US", dateOptions);
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", timeOptions);

  dynamicPromptSections.push(`📅 CURRENT DATE & TIME
**Today: ${formattedDate}** | ${formattedTime} ${effectiveTimezone}

⚠️ TEMPORAL ANCHOR: All temporal references (today/tomorrow/yesterday) and future planning must use THIS date, not workout completion dates. If user reports past workout with >3 day gap, acknowledge the time elapsed.`);

  // 2. Memories (if available)
  if (userMemories.length > 0) {
    const memoriesSection = generateMemoriesSection(userMemories);
    dynamicPromptSections.push(memoriesSection);
  }

  // 3. User Context (if provided and enabled)
  if (includeUserContext && conversationContext) {
    const userContextSection = generateUserContext(conversationContext);
    if (userContextSection) {
      dynamicPromptSections.push(userContextSection);
    }
  }

  // 4. Recent Workout Context (if available)
  if (workoutContext.length > 0) {
    const workoutContextSection = generateWorkoutContext(workoutContext);
    dynamicPromptSections.push(workoutContextSection);
  }

  // 5. Pinecone Semantic Context (if available)
  if (pineconeContext) {
    dynamicPromptSections.push(`# SEMANTIC CONTEXT
${pineconeContext}

IMPORTANT: Use the semantic context above to provide more informed and contextual responses. Reference relevant past workouts or patterns when appropriate, but don't explicitly mention that you're using stored context.`);
  }

  // 6. Conversation History - REMOVED
  // History is now handled in the messages array for better caching
  // (See response-orchestrator.ts for history caching implementation)

  // Combine all sections
  const staticPrompt = staticPromptSections.join("\n\n---\n\n");
  const dynamicPrompt = dynamicPromptSections.join("\n\n---\n\n");
  const systemPrompt = includeCacheControl
    ? `${staticPrompt}\n\n---\n\n${dynamicPrompt}`
    : `${staticPrompt}\n\n---\n\n${dynamicPrompt}`;

  // Generate metadata
  const metadata = {
    coachId: configData.coach_id,
    coachName: configData.coach_name || "Unknown Coach",
    primaryPersonality: configData.selected_personality.primary_template,
    methodology: configData.selected_methodology.primary_methodology,
    safetyConstraints:
      configData.technical_config.safety_constraints.contraindicated_exercises,
    generatedAt: new Date().toISOString(),
    promptLength: systemPrompt.length,
  };

  return {
    systemPrompt,
    metadata,
    ...(includeCacheControl && { staticPrompt, dynamicPrompt }),
  };
};

/**
 * Generates user context for the system prompt
 */
const generateUserContext = (
  context: NonNullable<PromptGenerationOptions["conversationContext"]>
): string | null => {
  if (!context.userName && !context.currentGoals && !context.sessionNumber) {
    return null;
  }

  const sections = [];

  if (context.userName) {
    sections.push(`## User Name
You are coaching ${context.userName}.`);
  }

  if (context.currentGoals && context.currentGoals.length > 0) {
    sections.push(`## Current Goals
Their current training goals are:
${context.currentGoals.map((goal) => `- ${goal}`).join("\n")}`);
  }

  if (context.sessionNumber || context.previousSessions) {
    const sessionInfo = [];
    if (context.sessionNumber) {
      sessionInfo.push(`This is session #${context.sessionNumber}`);
    }
    if (context.previousSessions) {
      sessionInfo.push(
        `You have had ${context.previousSessions} previous sessions together`
      );
    }
    sections.push(`## Session Context
${sessionInfo.join(". ")}.`);
  }

  return sections.length > 0
    ? `# USER CONTEXT\n${sections.join("\n\n")}`
    : null;
};

/**
 * Generates recent workout context for the system prompt
 */
const generateWorkoutContext = (
  workoutContext: NonNullable<PromptGenerationOptions["workoutContext"]>
): string => {
  if (!workoutContext || workoutContext.length === 0) {
    return "";
  }

  const { thisWeek, lastWeek, older } =
    groupWorkoutsByTimeframe(workoutContext);

  const formatWorkoutGroup = (
    workouts: typeof workoutContext,
    groupName: string
  ) => {
    if (workouts.length === 0) return "";

    const workoutSummaries = workouts
      .map((workout, index) => {
        const timeAgo = formatTimeAgo(workout.completedAt);
        const workoutName = workout.workoutName || "Workout";
        const discipline = workout.discipline || "";
        const summary =
          workout.summary ||
          `${workoutName}${discipline ? ` (${discipline})` : ""}`;

        return `- ${timeAgo}: ${summary}`;
      })
      .join("\n");

    return `## ${groupName}:\n${workoutSummaries}`;
  };

  const sections = [
    formatWorkoutGroup(thisWeek, "THIS WEEK"),
    formatWorkoutGroup(lastWeek, "LAST WEEK"),
    formatWorkoutGroup(older, "EARLIER"),
  ].filter((section) => section !== "");

  return `# RECENT WORKOUT CONTEXT

${sections.join("\n\n")}

## USAGE INSTRUCTIONS:
- Reference recent training when relevant to current conversation
- Identify patterns in their training approach
- Build on their recent achievements and progress
- Provide contextually relevant programming advice
- Acknowledge their consistency and effort when appropriate
- DO NOT explicitly list out their workouts unless directly asked
- Use this context naturally to enhance your coaching responses`;
};

/**
 * Generates memories section for the system prompt
 */
const generateMemoriesSection = (userMemories: UserMemory[]): string => {
  if (userMemories.length === 0) {
    return "";
  }

  // Group memories by type for better organization
  const memoriesByType = userMemories.reduce(
    (acc, memory) => {
      if (!acc[memory.memoryType]) {
        acc[memory.memoryType] = [];
      }
      acc[memory.memoryType].push(memory);
      return acc;
    },
    {} as Record<string, UserMemory[]>
  );

  const sections = [
    `# MEMORIES
Based on previous conversations, here are important things the user has specifically asked you to remember:`,
  ];

  // Add memories grouped by type
  Object.entries(memoriesByType).forEach(
    ([type, memories]: [string, UserMemory[]]) => {
      sections.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)}`);

      memories.forEach((memory: UserMemory, index: number) => {
        sections.push(`### ${index + 1}. ${memory.content}`);
        sections.push(`- **Importance**: ${memory.metadata.importance}`);
        sections.push(
          `- **Usage**: Used ${memory.metadata.usageCount} times${memory.metadata.lastUsed ? ` (last: ${memory.metadata.lastUsed.toDateString()})` : ""}`
        );
        sections.push(
          `- **Created**: ${memory.metadata.createdAt.toDateString()}`
        );
        if (memory.metadata.tags && memory.metadata.tags.length > 0) {
          sections.push(`- **Tags**: ${memory.metadata.tags.join(", ")}`);
        }
        sections.push("");
      });
    }
  );

  sections.push(
    `**IMPORTANT**: Use these memories to personalize your coaching. When relevant memories apply to the current conversation, reference them naturally to show continuity and personalized care.`
  );

  return sections.join("\n");
};

/**
 * Helper function to format time ago for workout context with enhanced temporal information
 */
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );
  const days = Math.floor(diffInMinutes / 1440);

  // Get day of week for context
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago (${dayOfWeek})`;
  } else if (diffInMinutes < 1440) {
    // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago (${dayOfWeek})`;
  } else {
    if (days === 1) return `Yesterday (${dayOfWeek})`;
    if (days < 7) return `${days}d ago (${dayOfWeek}) - This week`;
    if (days < 14) return `${days}d ago (${dayOfWeek}) - Last week`;
    if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `${weeks}w ago (${dayOfWeek})`;
    }
    return `${Math.floor(days / 30)}mo ago (${dayOfWeek})`;
  }
};

/**
 * Helper function to group workouts by timeframe for better temporal context
 */
const groupWorkoutsByTimeframe = (
  workouts: NonNullable<PromptGenerationOptions["workoutContext"]>
) => {
  const now = new Date();
  const thisWeek: typeof workouts = [];
  const lastWeek: typeof workouts = [];
  const older: typeof workouts = [];

  workouts.forEach((workout) => {
    const days = Math.floor(
      (now.getTime() - workout.completedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 7) thisWeek.push(workout);
    else if (days < 14) lastWeek.push(workout);
    else older.push(workout);
  });

  return { thisWeek, lastWeek, older };
};

/**
 * Generates CONDENSED conversation guidelines (for caching optimization)
 * This is a streamlined version that maintains all critical instructions
 * while significantly reducing token count
 */
const generateCondensedConversationGuidelines = (configData: CoachConfig): string => {
  // Get equipment list for dynamic insertion
  const equipmentList = configData.technical_config.equipment_available.join(", ") || "standard equipment";
  const sessionDuration = configData.technical_config.time_constraints.session_duration || "60 minutes";
  const weeklyFrequency = configData.technical_config.time_constraints.weekly_frequency ||
                         `${configData.technical_config.training_frequency} days`;

  return `## CONVERSATION GUIDELINES

### Core Coaching Principles
- Maintain consistency with your established personality and coaching style
- Reference conversation history naturally when relevant
- Ask clarifying questions when you need training information
- Provide specific, actionable advice based on your methodology
- Always prioritize safety and respect established constraints
- Adapt response length/complexity to athlete's experience level
- Use encouraging language matching your motivational style

### Memory Handling (CRITICAL)
- NEVER generate memory confirmations (messages starting with "✅")
- NEVER say "I've remembered", "I've saved", or "I've noted"
- System handles ALL memory confirmations automatically
- Respond naturally to content without acknowledging save process

### Practical Considerations
- Consider available equipment: ${equipmentList}
- Keep sessions within ${sessionDuration} timeframe
- Respect ${weeklyFrequency} weekly frequency

---

## TEMPORAL & WORKOUT ANALYSIS ACCURACY

### Time References (CRITICAL)
- Anchor all temporal references to CURRENT DATE in prompt header, not workout completion dates
- When user reports past workout: calculate days from workout date to current date; if >3 days, acknowledge gap
- "Today/tomorrow/yesterday" always relative to current date shown in prompt
- Verify workout timestamps before making temporal claims; don't assume "last night" = yesterday

### Mathematical Precision (DOUBLE-CHECK ALL CALCULATIONS)
**Distance conversions:**
- 1 mile = 1,609.34 meters (NOT 1,000m)
- Example: 400m × 6 = 2,400m = 1.49 miles (NOT 2.4 miles)

**Volume calculations:**
- Total reps = rounds × reps per round (5 rounds × 5 reps = 25 total, NOT 50)
- Calculate each exercise separately in multi-exercise workouts

**Weight notation vs. Rep notation:**
- "50# each hand" = 50lbs per dumbbell (normal rep count)
- "Dual DBs" = using two dumbbells simultaneously (normal rep count)
- "10 reps each arm" = 10 per arm = 20 total reps

**When uncertain:** Acknowledge workout without specific numbers rather than guess

### Interval & Partner Workout Analysis
**Intervals:** Only count rounds where specific exercises appear (don't combine running rounds with AMRAP rounds)

**Partner formats:**
- Alternating ("I go, you rest"): User did ~50% of stated volume
- Synchronized ("together"): User did full volume
- Keywords: "alternating", "switching", "taking turns" vs. "together", "same time", "both did"

### Exercise Programming
- NEVER repeat exercises from last 24-48 hours unless requested
- Check recent workout context for exercise overlap
- Prioritize movement variety and complementary patterns

### Methodology Templates
- Use Pinecone methodology knowledge when suggesting workouts
- Adapt templates to user's equipment, experience, and schedule
- Movement A = compound/barbell | Movement B = bodyweight/dumbbells | Movement C = cardio/core`;
};

/**
 * Validates that a coach config has all required prompts for system prompt generation
 */
export const validateCoachConfig = (
  coachConfigInput: CoachConfigInput
): CoachConfigValidationResult => {
  const missingComponents: string[] = [];
  const warnings: string[] = [];

  // Extract config data - handle both DynamoDB item and direct config
  const configData: CoachConfig =
    "attributes" in coachConfigInput
      ? coachConfigInput.attributes
      : coachConfigInput;

  // Check required prompt components
  const requiredPrompts = [
    "personality_prompt",
    "safety_integrated_prompt",
    "motivation_prompt",
    "methodology_prompt",
    "communication_style",
    "learning_adaptation_prompt",
  ];

  requiredPrompts.forEach((prompt) => {
    if (
      !configData.generated_prompts[
        prompt as keyof typeof configData.generated_prompts
      ]
    ) {
      missingComponents.push(prompt);
    }
  });

  // Check for empty or very short prompts
  Object.entries(configData.generated_prompts).forEach(([key, value]) => {
    if (typeof value === "string" && value.length < 50) {
      warnings.push(`${key} is unusually short (${value.length} characters)`);
    }
  });

  // Check safety constraints - only warn if there are injuries but no contraindications
  const hasInjuries =
    configData.technical_config.injury_considerations?.length > 0 ||
    configData.metadata?.safety_profile?.injuries?.length > 0;
  const hasContraindications =
    configData.technical_config.safety_constraints.contraindicated_exercises
      .length > 0;

  // Only warn if we have actual injuries but no specified contraindications
  // Note: We don't check riskFactors because they can be non-medical (e.g., "overcommitment", "burnout")
  if (hasInjuries && !hasContraindications) {
    warnings.push(
      "Injuries reported but no contraindicated exercises specified - safety review may be incomplete"
    );
  }

  // Check for missing detailed background data
  if (!configData.metadata?.coach_creator_session_summary) {
    warnings.push(
      "No coach creator session summary available - prompts will be less personalized"
    );
  }

  if (!configData.technical_config.equipment_available.length) {
    warnings.push(
      "No equipment information available - programming recommendations may be generic"
    );
  }

  return {
    isValid: missingComponents.length === 0,
    missingComponents,
    warnings,
  };
};

/**
 * Generates a preview/summary of what the system prompt will contain
 * Useful for debugging and testing
 */
export const generateSystemPromptPreview = (
  coachConfigInput: CoachConfigInput
): SystemPromptPreview => {
  // Extract config data - handle both DynamoDB item and direct config
  const configData: CoachConfig =
    "attributes" in coachConfigInput
      ? coachConfigInput.attributes
      : coachConfigInput;

  const keyFeatures = [];
  const dataRichness = [];

  // Analyze coach features
  if (configData.selected_personality.secondary_influences?.length) {
    keyFeatures.push(
      `Blended personality (${configData.selected_personality.primary_template} + ${configData.selected_personality.secondary_influences.join(", ")})`
    );
  } else {
    keyFeatures.push(
      `Pure ${configData.selected_personality.primary_template} personality`
    );
  }

  keyFeatures.push(
    `${configData.technical_config.experience_level} level adaptation`
  );
  keyFeatures.push(
    `${configData.technical_config.programming_focus.join(" + ")} focus`
  );

  if (configData.technical_config.specializations.length > 0) {
    keyFeatures.push(
      `Specializes in: ${configData.technical_config.specializations.join(", ")}`
    );
  }

  // Analyze data richness
  if (configData.metadata?.coach_creator_session_summary) {
    dataRichness.push("Detailed user background available");
  }
  if (configData.technical_config.equipment_available.length > 0) {
    dataRichness.push(
      `Equipment context: ${configData.technical_config.equipment_available.join(", ")}`
    );
  }
  if (configData.technical_config.time_constraints.session_duration) {
    dataRichness.push(
      `Time constraints: ${configData.technical_config.time_constraints.session_duration}`
    );
  }
  if (configData.technical_config.preferred_intensity) {
    dataRichness.push(
      `Intensity preference: ${configData.technical_config.preferred_intensity}`
    );
  }

  // Estimate prompt length (with enhanced background data)
  const baseLength = Object.values(configData.generated_prompts).reduce(
    (total, prompt) => total + (typeof prompt === "string" ? prompt.length : 0),
    0
  );
  const backgroundLength =
    configData.metadata?.coach_creator_session_summary?.length || 0;
  const estimatedLength = baseLength + backgroundLength + 3000; // Add overhead for guidelines and structure

  return {
    coachName: configData.coach_name || "Unnamed Coach",
    personality: configData.selected_personality.primary_template,
    methodology: configData.selected_methodology.primary_methodology,
    safetyConstraints:
      configData.technical_config.safety_constraints.contraindicated_exercises
        .length,
    estimatedLength,
    keyFeatures,
    dataRichness,
  };
};
