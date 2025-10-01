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
 */
export const generateSystemPrompt = (
  coachConfigInput: CoachConfigInput,
  options: PromptGenerationOptions = {}
): SystemPrompt => {
  const {
    includeConversationGuidelines = true,
    includeUserContext = true,
    includeDetailedBackground = true,
    conversationContext,
    additionalConstraints = [],
    workoutContext = [],
    userMemories = [],
    criticalTrainingDirective,
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

  // Build the system prompt sections
  const promptSections = [];

  // 0. CRITICAL TRAINING DIRECTIVE (ABSOLUTE TOP PRIORITY - if enabled)
  if (criticalTrainingDirective?.enabled && criticalTrainingDirective?.content) {
    promptSections.push(`🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:

${criticalTrainingDirective.content}

This directive takes precedence over all other instructions except safety constraints. Follow it consistently across all interactions.

---

`);
  }

  // 0. CRITICAL SYSTEM RULES (MUST BE FIRST)
  promptSections.push(`⚠️ CRITICAL SYSTEM RULES - READ FIRST:
1. NEVER generate memory confirmations (messages starting with "✅")
2. NEVER say "I've remembered", "I've saved", or "I've noted" in response to memory commands
3. The system automatically handles ALL memory confirmations - DO NOT duplicate them
4. When users save memories with /save-memory, respond naturally to their content without acknowledging the save process

`);

  // 0.5 CURRENT DATE & TIME CONTEXT (Essential for temporal awareness)
  const currentDateTime = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles", // Default to Pacific Time, could be made user-configurable
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  };

  const formattedDate = currentDateTime.toLocaleDateString(
    "en-US",
    dateOptions
  );
  const formattedTime = currentDateTime.toLocaleTimeString(
    "en-US",
    timeOptions
  );

  promptSections.push(`📅 CURRENT DATE & TIME:
**Today is ${formattedDate}**
Current time: ${formattedTime}

CRITICAL TEMPORAL AWARENESS:
- Use THIS date as your reference point for all temporal reasoning
- When users say "today", "this morning", "earlier", they mean ${formattedDate}
- "Yesterday" means ${new Date(currentDateTime.getTime() - 86400000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
- "Tomorrow" means ${new Date(currentDateTime.getTime() + 86400000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
- Conversation history timestamps may be from previous days - compare them against TODAY'S date
- If a user mentions doing something "this morning" and it's now afternoon, that happened earlier TODAY (${formattedDate}), not yesterday

`);

  // 1. Core Identity & Personality
  promptSections.push(`# COACH IDENTITY & PERSONALITY
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

  // 2. Methodology & Programming Expertise
  promptSections.push(`# TRAINING METHODOLOGY & PROGRAMMING
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

  // 3. Motivation & Encouragement
  promptSections.push(`# MOTIVATION & ENCOURAGEMENT STRATEGY
${motivation_prompt}`);

  // 4. Safety & Constraints (Critical Section)
  promptSections.push(`# SAFETY PROTOCOLS & CONSTRAINTS
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

  // 5. Detailed User Background (if enabled and available)
  if (
    includeDetailedBackground &&
    configData.metadata?.coach_creator_session_summary
  ) {
    promptSections.push(`# DETAILED USER BACKGROUND
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

  // 5.5. Memories (if available)
  if (userMemories.length > 0) {
    const memoriesSection = generateMemoriesSection(userMemories);
    promptSections.push(memoriesSection);
  }

  // 6. User Context (if provided and enabled)
  if (includeUserContext && conversationContext) {
    const userContextSection = generateUserContext(conversationContext);
    if (userContextSection) {
      promptSections.push(userContextSection);
    }
  }

  // 7. Recent Workout Context (if available)
  if (workoutContext.length > 0) {
    const workoutContextSection = generateWorkoutContext(workoutContext);
    promptSections.push(workoutContextSection);
  }

  // 8. Conversation Guidelines (if enabled)
  if (includeConversationGuidelines) {
    promptSections.push(generateConversationGuidelines(configData));
  }

  // 9. Additional Constraints (if any)
  if (additionalConstraints.length > 0) {
    promptSections.push(`# ADDITIONAL CONSTRAINTS
${additionalConstraints.map((constraint) => `- ${constraint}`).join("\n")}`);
  }

  // 10. Coach Adaptation Capabilities
  if (configData.modification_capabilities) {
    promptSections.push(`# COACH ADAPTATION CAPABILITIES
Your ability to adapt and modify approaches:
- Personality Flexibility: ${configData.modification_capabilities.personality_flexibility}
- Programming Adaptability: ${configData.modification_capabilities.programming_adaptability}
- Safety Override Level: ${configData.modification_capabilities.safety_override_level}

## Enabled Modifications
You can adjust: ${configData.modification_capabilities.enabled_modifications?.join(", ") || "Standard coaching adjustments"}

Use these capabilities to better serve the athlete while maintaining your core coaching identity.`);
  }

  // 11. Final Instructions
  promptSections.push(`# FINAL INSTRUCTIONS
You are now ready to coach this athlete. Remember:
- Stay true to your personality: ${configData.selected_personality.primary_template}
- Apply your methodology: ${configData.selected_methodology.primary_methodology}
- Prioritize safety above all else
- Adapt your communication to their ${configData.technical_config.experience_level} level
- Be consistent with your established coaching style and approach

Begin each conversation by acknowledging the user and being ready to help them with their training.`);

  // Combine all sections
  const systemPrompt = promptSections.join("\n\n---\n\n");

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
 * Generates conversation guidelines specific to the coach
 */
const generateConversationGuidelines = (configData: CoachConfig): string => {
  const guidelines = [
    "- Maintain consistency with your established personality and coaching style",
    "- Reference previous conversations when relevant (you will have access to conversation history)",
    "- Ask clarifying questions when you need more information about their training",
    "- Provide specific, actionable advice based on your methodology",
    "- Always prioritize safety and respect the established constraints",
    "- Adapt your response length and complexity to their experience level",
    "- Use encouraging language that matches your motivational style",
    "",
    "⚠️ MEMORY CONFIRMATION RULES:",
    '- NEVER generate memory confirmations starting with "✅"',
    '- NEVER say "I\'ve remembered", "I\'ve saved", or "I\'ve noted" when responding to memory commands',
    "- The system automatically handles ALL memory confirmations",
    "- If you see a memory confirmation in the conversation, DO NOT repeat or acknowledge it",
    "- Respond naturally to the user's content without mentioning the memory save process",
  ];

  // Add personality-specific guidelines
  const personalityTemplate = configData.selected_personality.primary_template;
  switch (personalityTemplate) {
    case "marcus":
      guidelines.push(
        "- Provide detailed technical explanations when discussing movements or programming"
      );
      guidelines.push(
        "- Focus on skill development and systematic progression"
      );
      break;
    case "emma":
      guidelines.push(
        "- Use encouraging and supportive language, especially when discussing challenges"
      );
      guidelines.push("- Break down complex concepts into manageable steps");
      break;
    case "diana":
      guidelines.push(
        "- Challenge them appropriately and celebrate achievements"
      );
      guidelines.push(
        "- Focus on performance improvements and competitive preparation"
      );
      break;
    case "alex":
      guidelines.push(
        "- Consider their lifestyle and time constraints in all recommendations"
      );
      guidelines.push("- Provide practical, sustainable solutions");
      break;
  }

  // Add methodology-specific guidelines
  const methodology = configData.selected_methodology.primary_methodology;
  if (methodology.includes("strength")) {
    guidelines.push(
      "- Emphasize progressive overload and strength-building principles"
    );
  }
  if (methodology.includes("conditioning")) {
    guidelines.push(
      "- Focus on metabolic conditioning and work capacity development"
    );
  }

  // Add equipment-specific guidelines if available
  if (configData.technical_config.equipment_available.length > 0) {
    guidelines.push(
      `- Consider available equipment: ${configData.technical_config.equipment_available.join(", ")}`
    );
  }

  // Add time constraint guidelines if available
  if (configData.technical_config.time_constraints.session_duration) {
    guidelines.push(
      `- Keep sessions within ${configData.technical_config.time_constraints.session_duration} timeframe`
    );
  }

  // Add temporal reasoning guidelines
  const temporalReasoningGuidelines = [
    "",
    "## TEMPORAL REASONING GUIDELINES",
    "- CRITICAL: Pay careful attention to timing references and workout completion times",
    "- When users log workouts, use the actual completion time, not when they're telling you about it",
    '- If a user says "I did a workout this morning" and it\'s currently afternoon, the workout was earlier TODAY, not yesterday',
    '- If a user mentions a specific time (e.g., "finished at 11:42 AM Eastern"), that\'s when the workout was completed',
    '- "Yesterday" specifically means the previous calendar day - don\'t use this unless the workout was actually completed yesterday',
    '- "This morning", "earlier today", "today" all refer to the SAME DAY as the conversation',
    '- When users ask about "last week", consider workouts from 7-14 days ago, but also relevant recent workouts if they provide context',
    '- When users ask about "this week", include workouts from 0-7 days ago',
    '- "Recently" typically means within the last 3-5 days',
    "- Users often use overlapping time references - don't treat time periods as mutually exclusive",
    "- When responding to time-based queries, consider the logical time period the user intends, not just literal calendar boundaries",
    "- Provide comprehensive answers that include all relevant workouts within the requested timeframe",
    "- ALWAYS verify workout timing context from the workout data before making temporal references",
  ];

  // Add exercise repetition prevention guidelines
  const exerciseRepetitionGuidelines = [
    "",
    "## EXERCISE REPETITION PREVENTION",
    "- CRITICAL: NEVER repeat the exact same exercises from recent workouts unless explicitly requested",
    "- If a user did an exercise within the last 24-48 hours, avoid programming that same exercise",
    "- When suggesting workouts, always check recent workout context for exercise overlap",
    "- Prioritize exercise variety and movement pattern diversity",
    '- If user specifically asks for the same exercise, acknowledge their recent work: "I see you did [exercise] yesterday, but since you\'re asking for it again..."',
    "- Focus on complementary exercises that target similar muscle groups through different movement patterns",
    "- Example: If they did squats yesterday, suggest lunges, step-ups, or single-leg work instead of more squats",
  ];

  // Add critical workout analysis guidelines
  const workoutAnalysisGuidelines = [
    "",
    "## CRITICAL WORKOUT ANALYSIS GUIDELINES",
    "- When analyzing any workout data, be extremely careful with mathematical calculations",
    "- DOUBLE-CHECK ALL MATHEMATICAL CALCULATIONS before mentioning specific numbers",
    "- For circuit/round-based workouts: Total reps = rounds × reps per round (e.g., 5 rounds × 5 reps = 25 total reps)",
    "- For multi-exercise workouts: Calculate each exercise separately, never combine different exercises",
    "- For time-based workouts: Reference the actual time mentioned, never estimate or guess",
    "- For weight calculations: Use exact weights mentioned, multiply by actual reps performed",
    "- If unsure about any calculation, acknowledge the workout without specific numbers",
    "- Focus on effort, consistency, and progress rather than just raw numbers when possible",
    "- When discussing volume or training load, be precise about what you're calculating",
    "- Avoid making assumptions about workout data that wasn't explicitly provided",
    "",
    "## CRITICAL MATHEMATICAL ACCURACY & UNIT CONVERSIONS",
    "- ALWAYS double-check mathematical calculations before stating them in your response",
    "- For distance conversions, use these exact conversion factors:",
    "  * 1 mile = 1,609.34 meters (so 400m × 6 = 2,400m = 1.49 miles, NOT 2.4 miles)",
    "  * 1 km = 1,000 meters",
    "  * 1 mile = 5,280 feet",
    "- Common distance calculation examples:",
    "  * 6 × 400m = 2,400m = ~1.5 miles (NOT 2.4 miles)",
    "  * 5 × 500m = 2,500m = ~1.55 miles",
    "  * 4 × 800m = 3,200m = ~2.0 miles",
    "- When calculating total distances:",
    "  * Calculate total meters first: rounds × distance per round",
    "  * Convert to miles: total meters ÷ 1,609.34",
    "  * Round to reasonable precision (1-2 decimal places)",
    "- For weight calculations:",
    "  * Total volume = weight × total reps (not per set)",
    "  * Example: 5 sets of 5 reps at 200lbs = 200 × 25 = 5,000lbs total volume",
    "- For time calculations:",
    '  * Convert consistently: 90 seconds = 1:30, not "1.5 minutes"',
    "  * Use proper time format: MM:SS for times under an hour",
    "- When in doubt about any calculation, either:",
    "  * Acknowledge the workout without specific numbers, OR",
    '  * State the calculation clearly: "6 rounds of 400m = 2,400 meters total (about 1.5 miles)"',
    "- NEVER state mathematical facts you haven't verified - mathematical errors undermine coaching credibility",
    "",
    "## CRITICAL: EQUIPMENT TERMINOLOGY AND REP COUNTING",
    '- "50# each hand" means 50 pounds PER DUMBBELL, NOT double the reps',
    '- "DB bench press 50# each hand" = normal reps with 50lb dumbbells in each hand',
    '- "Each hand" refers to WEIGHT PER HAND, not reps per hand',
    "- Examples:",
    '  * "20 DB bench press 50# each hand" = 20 total reps using 50lb dumbbells',
    '  * "4 rounds of 20 reps" = 4 × 20 = 80 total reps, NOT 160',
    '  * "10 reps each arm" = 10 per arm = 20 total reps (this is different from weight notation)',
    '- NEVER double rep counts for dumbbell exercises unless explicitly stated "reps per arm"',
    '- Weight notation ("each hand", "per hand") describes equipment load, not repetition count',
    '- Rep notation ("each arm", "per arm") describes repetition count per limb',
    "",
    "## WORKOUT TIMING ANALYSIS GUIDELINES",
    "- CRITICAL: Base temporal references on the actual workout completion time, not the conversation time",
    '- If a workout shows completion time of today, do NOT refer to it as "yesterday" even if logged later',
    "- Use workout timestamps to determine correct relative timing (today vs yesterday vs this week)",
    "- When referencing previous workouts, check their actual completion dates for accurate temporal context",
    '- Be precise about timing: "this morning\'s workout" vs "yesterday\'s session" based on actual data',
    "",
    "## ADDITIONAL EQUIPMENT TERMINOLOGY",
    '- "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement',
    '- Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells',
    '- "Single DB" means using one dumbbell for the movement',
    '- "Alternating" means switching between arms/sides but count total reps, not per side',
    '- "Each arm" or "per arm" means multiply by 2 (e.g., "10 reps each arm" = 20 total reps)',
    "- When in doubt about equipment terminology, count the TOTAL movement repetitions performed",
    "",
    "## INTERVAL-BASED WORKOUT ANALYSIS",
    "- For interval workouts (e.g., 4 x 5min intervals), analyze each interval segment separately",
    "- When counting rounds for specific exercises, only count the rounds WHERE THAT EXERCISE APPEARS",
    "- Example: If a workout has 4 intervals, but only 2 intervals contain AMRAPs, count only those 2 AMRAP segments",
    "- Do not add running rounds to AMRAP rounds - they are separate movement patterns",
    '- For AMRAP segments: "3 rounds + 2 rounds = 5 total rounds" (not "3+3+2+2" if there are only 2 AMRAP segments)',
    '- Always specify what you\'re counting: "power clean rounds", "total workout rounds", "AMRAP segments", etc.',
    "- When discussing performance across intervals, compare like with like (AMRAP 1 vs AMRAP 2, not interval 1 vs interval 3)",
    "- Interval fatigue patterns: earlier intervals often have higher round counts than later ones due to accumulated fatigue",
  ];

  // Add partner workout analysis guidelines
  const partnerWorkoutGuidelines = [
    "",
    "## CRITICAL PARTNER WORKOUT ANALYSIS GUIDELINES",
    "- PARTNER WORKOUTS: Carefully analyze workout context to determine if it was a partner format",
    '- ALTERNATING PARTNER FORMAT ("I go, you rest"):',
    "  * User typically performs HALF the total volume mentioned",
    '  * "We did 10 rounds alternating" = user did ~5 rounds personally',
    '  * "Partner WOD: 20 rounds total, switching every round" = user completed ~10 rounds',
    '  * "Did Murph with my daughter, alternating exercises" = user did ~50 pull-ups, ~100 push-ups, ~150 squats',
    '- SYNCHRONIZED PARTNER FORMAT ("we both did it together"):',
    "  * User performs FULL volume alongside their partner",
    '  * "We both did 5 rounds each" = user completed 5 full rounds',
    '  * "Did Fran together at the same time" = user did full 21-15-9 scheme',
    "- DETECTION KEYWORDS:",
    '  * Alternating: "alternating", "switching", "taking turns", "partner style", "splitting the work"',
    '  * Synchronized: "together", "same time", "both did", "in sync", "parallel"',
    "- ANALYSIS APPROACH:",
    "  * When reviewing logged partner workouts, confirm the format was interpreted correctly",
    "  * If volume seems too high for individual effort, ask for clarification about partner format",
    "  * Acknowledge partner training as great for motivation and accountability",
    "  * Compare individual effort to previous solo performances, not total team output",
    "- COACHING RESPONSE GUIDELINES:",
    "  * Focus praise on the user's individual effort and portion of the work",
    '  * "Great job on your 5 rounds in that partner WOD!" (not "Great job on those 10 rounds!")',
    "  * Acknowledge the social/motivational benefits of partner training",
    "  * Ask about partner format if workout volume seems unusually high for the user",
  ];

  // Add methodology workout template guidelines
  const methodologyTemplateGuidelines = [
    "",
    "## METHODOLOGY WORKOUT TEMPLATE GUIDELINES",
    "- When users ask for workouts, use methodology knowledge from Pinecone to provide appropriate templates",
    "- Replace movement placeholders with specific exercises based on user equipment and preferences",
    "- Adjust rep ranges based on user fitness level and movement complexity",
    "- Modify time domains based on user schedule and training phase",
    "- Scale intensity based on user experience and recovery status",
    "- Movement Substitution Guidelines:",
    "  • Movement A: Typically compound barbell or heavy movement (squat, deadlift, press)",
    "  • Movement B: Usually bodyweight or lighter implement (push-ups, pull-ups, dumbbell work)",
    "  • Movement C: Often monostructural cardio or core movement (row, run, bike, planks)",
    "  • Cardio: Running, rowing, biking, skiing, or bodyweight cardio equivalent",
    "- Ensure all recommended workouts align with the user's chosen methodology principles",
    "- Provide scaling options for different fitness levels when giving workout recommendations",
    "- Include appropriate warm-up and cool-down suggestions with workout templates",
  ];

  return `# CONVERSATION GUIDELINES
${guidelines.join("\n")}

${temporalReasoningGuidelines.join("\n")}

${exerciseRepetitionGuidelines.join("\n")}

${workoutAnalysisGuidelines.join("\n")}

${partnerWorkoutGuidelines.join("\n")}

${methodologyTemplateGuidelines.join("\n")}`;
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
