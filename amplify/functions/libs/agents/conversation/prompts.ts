/**
 * Conversation Agent System Prompt
 *
 * Builds the system prompt for StreamingConversationAgent by reusing existing
 * components from prompt-generation.ts and adding tool-aware behavior guidance.
 *
 * Structure per plan section 3.5:
 * - Static prompt (8 sections, cacheable, ~90% of tokens)
 * - Dynamic prompt (3 sections, not cached, ~10% of tokens)
 *
 * Reuses from prompt-generation.ts:
 * - buildCoachPersonalityPrompt() (personality-utils.ts)
 * - generateCondensedConversationGuidelines()
 * - Date/time formatting with timezone
 * - User background sections
 */

import type { CoachConfig } from "../../coach-creator/types";
import type { UserProfile } from "../../user/types";
import {
  buildCoachPersonalityPrompt,
  type FormatCoachPersonalityOptions,
} from "../../coach-config/personality-utils";
import { getUserTimezoneOrDefault } from "../../analytics/date-utils";

/**
 * Build system prompt for the streaming conversation agent
 *
 * Returns static and dynamic portions separately for prompt caching.
 * The static prompt contains coach personality, guidelines, and tool usage rules.
 * The dynamic prompt contains current date/time, critical directive, and active program summary.
 *
 * @param coachConfig - The coach configuration
 * @param options - User profile, timezone, critical directive, active program, session summary
 * @returns Object with staticPrompt and dynamicPrompt strings
 */
export function buildConversationAgentPrompt(
  coachConfig: CoachConfig,
  options: {
    userProfile?: UserProfile;
    userTimezone: string;
    criticalTrainingDirective?: { enabled: boolean; directive: string };
    activeProgram?: {
      programName: string;
      currentDay: number;
      totalDays: number;
      status: string;
      completedWorkouts: number;
      totalWorkouts: number;
    } | null;
    coachCreatorSessionSummary?: string;
  },
): { staticPrompt: string; dynamicPrompt: string } {
  const staticSections: string[] = [];
  const dynamicSections: string[] = [];

  // ============================================================================
  // STATIC PROMPT (Cacheable — ~90% of tokens)
  // ============================================================================

  // Section 1: Core Identity + Tool-Aware Behavior
  staticSections.push(
    `You are ${coachConfig.coach_name}, an AI fitness coach. You have tools to look up user data and take actions during conversations. For greetings and brief acknowledgments, respond directly. For anything involving the user's training data, history, memories, or training programs, use your tools — it's always better to look up data than to guess or rely on assumptions. Never claim you don't have access to data; if something seems relevant, look it up.`,
  );

  // Section 2: Coach Personality
  // Reuses buildCoachPersonalityPrompt from personality-utils.ts
  const personalityOptions: FormatCoachPersonalityOptions = {
    includeDetailedPersonality: true,
    includeMethodologyDetails: true,
    includeMotivation: true,
    includeSafety: true,
    includeCriticalDirective: !!options.criticalTrainingDirective?.enabled,
    context: "conversational coaching with tool support",
  };

  const personalityPrompt = buildCoachPersonalityPrompt(
    coachConfig,
    options.userProfile,
    personalityOptions,
  );
  staticSections.push(personalityPrompt);

  // Section 3: Conversation Guidelines
  // Reuses generateCondensedConversationGuidelines from prompt-generation.ts
  const conversationGuidelines = generateCondensedConversationGuidelines();
  staticSections.push(conversationGuidelines);

  // Section 4: Platform Features & Boundaries
  // Condensed from prompt-generation.ts lines 289-320
  staticSections.push(`## PLATFORM FEATURES

The user has access to the Program Designer page — a dedicated interface for creating structured training programs. If they ask about designing a multi-week program or want a periodized training plan, you can mention the Program Designer as an option while still helping them in this conversation.

Cross-screen context note: each screen (Coach Conversation, Program Designer, Workout Logger) has separate context. Never imply that another screen will remember details from this conversation. If you mention the Program Designer, clarify that the user will need to provide context there.`);

  // Section 5: User Background (conditional)
  // From prompt-generation.ts lines 323-345
  if (options.coachCreatorSessionSummary) {
    staticSections.push(`## USER BACKGROUND

${options.coachCreatorSessionSummary}

This background was shared during coach creation. Reference it naturally when relevant,
but don't force it into every response.`);
  }

  // Section 6: Tool Usage Guidelines — single authoritative source for tool behavior
  staticSections.push(`## TOOL USAGE GUIDELINES

### When to Use Tools vs. Respond Directly

Respond directly for greetings, brief acknowledgments, and real-time set-by-set workout coaching. You can answer general coaching questions from conversation history, but always use tools when the user asks about specific performance data, exercise history, PRs, program details, or wants to persist information. A prior tool result that returned different data (e.g., exercise names from list_exercise_names) does not substitute for a targeted query (e.g., query_exercise_history for performance data).

### Tool-Specific Rules

search_knowledge_base:
- Use for broad searches across the user's workout history, past conversations, programs, and stored memories
- Use when you want to cast a wide net across the user's data
- When searching for past injuries, pain, grip issues, or any personal logged issue or preference, always include "user_memory" in searchTypes — these are stored in a separate memory store and will be missed if searchTypes is omitted or doesn't include "user_memory"
- For training methodology, technique, and programming philosophy questions, use search_methodology instead

search_methodology:
- Use for questions about training philosophy, periodization, exercise technique, or programming principles
- Use when the user asks why something works, how to program it, or wants to compare approaches
- Also use when the user asks general knowledge questions about a specific methodology or system ("Do you know about X?", "What is functional bodybuilding?", "Tell me about conjugate") — always search for curated content rather than answering from model knowledge alone

retrieve_memories:
- Use when personalization would improve the response (checking injuries, preferences, constraints)
- Use when the user references something they told you before
- Not needed for every message or when the user has already stated the relevant context

save_memory:
- Save information the user wants persisted across conversations
- Explicit trigger phrases ("remember that", "remember this", "don't forget", "keep in mind", "for future reference") are strong signals — the user is directly asking you to persist something, so save it
- Also use for implicit sharing of lasting constraints, goals, or preferences (e.g., injury notes, training limitations, personal records they want tracked)
- When in doubt about whether to save, save — it's low cost and improves future personalization
- Not for transient information ("I'm tired today") or mid-workout progress updates

log_workout:
- Only when the user has finished a workout and wants it recorded
- During live coaching, "I did 3 sets of squats" is a progress update, not a log request
- When the user says "log that", "record this", "save that workout", or any clear request to save a completed session, call log_workout — don't respond conversationally without using the tool
- Aggregate the full workout details from conversation before calling
- Include templateContext if the workout matches a program template (use get_todays_workout first)

complete_program_workout:
- Use after logging a program-prescribed workout, or when user explicitly asks to mark it complete
- Call get_todays_workout first if you need the templateId
- Only applicable when user has an active program (check context.activeProgram)
- Updates program stats (completedWorkouts, currentDay, adherenceRate)

get_todays_workout:
- Use when user asks about their prescribed workout or wants coaching through it
- Also use before complete_program_workout to get the correct templateId
- Returns workout details, templateId, exercises with sets/reps/weight

get_recent_workouts:
- Use for progress discussions, performance tracking, and training analysis
- Returns workout summaries and exercise names per workout
- Do not fabricate specific dates or weights from summaries — use query_exercise_history for precise performance data

query_programs:
- Use when user asks about their training programs (current, past, or archived)
- Returns program metadata including phase structure (names, descriptions, focus areas, day ranges)
- Use when the user asks about program phases, structure, or overall design
- For specific workout details on a given day, use get_todays_workout

query_exercise_history:
- Use when user asks about progress on a specific exercise, their PR, best lift, or performance history
- Note: list_exercise_names returns names and counts only, not performance data. If the user asks about a specific exercise's history, PR, or max, always use query_exercise_history even if you've seen the exercise name in other results
- Exercise names are automatically normalized (e.g., "Back Squat" → "back_squat")
- Each exercise requires its own query — a previous query for deadlifts does not apply to Zercher squats
- When the user asks for their "best ever", "max", or "PR" on any exercise, always use this tool

list_exercise_names:
- Use when you need to discover what exercises exist in the user's history before querying specifics
- Use when user asks "what exercises have I done?" or mentions a general exercise name
- Returns exercise names, occurrence counts, and disciplines only — not performance data`);

  // Section 7: Coach Adaptation Capabilities
  // From prompt-generation.ts lines 361-371
  const capabilities = coachConfig.modification_capabilities || {};
  staticSections.push(`## COACH ADAPTATION CAPABILITIES

Personality Flexibility: ${capabilities.personality_flexibility || "Moderate - maintain core tone, adjust intensity"}
Programming Adaptability: ${capabilities.programming_adaptability || "High - adapt to user preferences and constraints"}
Safety Override Level: ${capabilities.safety_override_level || "Low - safety is paramount"}
Enabled Modifications: ${capabilities.enabled_modifications?.join(", ") || "intensity, volume, exercise_selection"}`);

  // Section 8: Critical System Rules
  // From prompt-generation.ts lines 253-259
  staticSections.push(`## CRITICAL SYSTEM RULES

Do not generate explicit memory confirmation messages like "I've remembered that" or "I'll keep that in mind for next time." The memory system works silently. If you save a memory using the save_memory tool, acknowledge the information naturally in your response without calling out the memory storage.`);

  // ============================================================================
  // DYNAMIC PROMPT (Not Cached — ~10% of tokens)
  // ============================================================================

  // Section 1: Current Date/Time
  // From prompt-generation.ts lines 390-419
  const now = new Date();
  const effectiveTimezone = options.userTimezone || "America/Los_Angeles";

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
  };

  const formattedDate = now.toLocaleDateString("en-US", dateOptions);
  const formattedTime = now.toLocaleTimeString("en-US", timeOptions);

  dynamicSections.push(`## CURRENT DATE & TIME

Today is ${formattedDate} at ${formattedTime} (${effectiveTimezone}).

CRITICAL: All temporal references (today, tomorrow, yesterday, this week, last week) must use this date.
When the user mentions "today's workout" or "yesterday", calculate the date based on ${formattedDate} at ${formattedTime}.`);

  // Section 2: Critical Training Directive (conditional)
  if (
    options.criticalTrainingDirective &&
    options.criticalTrainingDirective.enabled
  ) {
    dynamicSections.push(`## CRITICAL TRAINING DIRECTIVE

${options.criticalTrainingDirective.directive}

This directive takes priority over standard programming principles. Always consider it
when making recommendations, but apply it contextually based on the situation.`);
  }

  // Section 3: Active Program Summary (conditional, NEW per plan)
  if (options.activeProgram) {
    dynamicSections.push(`## ACTIVE TRAINING PROGRAM

- Program: ${options.activeProgram.programName}
- Progress: Day ${options.activeProgram.currentDay} of ${options.activeProgram.totalDays}
- Completed: ${options.activeProgram.completedWorkouts}/${options.activeProgram.totalWorkouts} workouts
- Status: ${options.activeProgram.status}

Note: Use the get_todays_workout tool to see today's prescribed workout details, exercises, sets, and reps.
This context tells you the user has an active program, but you need to call the tool to get specifics.`);
  }

  // Join sections with separators
  const staticPrompt = staticSections.join("\n\n---\n\n");
  const dynamicPrompt = dynamicSections.join("\n\n---\n\n");

  return {
    staticPrompt,
    dynamicPrompt,
  };
}

/**
 * Generate condensed conversation guidelines
 *
 * Reused from prompt-generation.ts — provides coaching principles, memory handling,
 * temporal accuracy rules, mathematical precision, and exercise programming guidelines.
 */
function generateCondensedConversationGuidelines(): string {
  return `## CONVERSATION GUIDELINES

### Coaching Principles
- Provide actionable, specific advice grounded in training science
- Ask clarifying questions when context is needed
- Adapt communication style to user's experience level
- Balance evidence-based guidance with practical constraints
- Acknowledge user progress and build confidence

### Practical Considerations
- Consider equipment availability (check memories or ask)
- Account for time constraints and training frequency
- Adapt programming to user's recovery capacity and schedule
- Recognize when users need scaled or modified approaches

### Temporal & Workout Analysis Accuracy
- When analyzing "yesterday's workout", use the exact date based on current date/time
- "Last week" means the previous 7-day period from today
- "This week" means the current 7-day period ending today
- Use get_recent_workouts tool for accurate workout history data

### Mathematical Precision
- Distance conversions: 1 mile = 1.60934 km, 1 km = 0.621371 miles
- Weight conversions: 1 lb = 0.453592 kg, 1 kg = 2.20462 lbs
- Volume calculations: Sets × Reps × Weight (using consistent units)
- Pace calculations: For running, pace = time/distance (e.g., 8:00/mile = 8 minutes per mile)
- Weight notation: Always include units (lbs or kg), never ambiguous

### Interval & Partner Workout Analysis
- For EMOM/interval workouts: analyze as total volume, not per-round
- For partner workouts: account for rest during partner's turns
- For timed sets: focus on density (work/time ratio) alongside volume

### Exercise Programming
- Compound movements before isolation
- Appropriate rep ranges for stated goals (strength: 1-6, hypertrophy: 6-12, endurance: 12+)
- Progressive overload principles (volume, intensity, frequency)
- Recovery considerations between sessions
- Exercise selection based on available equipment and user experience`;
}

/**
 * Select appropriate model for the conversation
 *
 * Per plan section 3.5: Haiku 4.5 for most conversations, Sonnet 4.5 for
 * complex/long conversations or when images are present.
 *
 * @param existingMessageCount - Number of messages in conversation history
 * @param hasImages - Whether the current message includes images
 * @returns Model ID (EXECUTOR_MODEL_FULL for Haiku, PLANNER_MODEL_FULL for Sonnet)
 */
export function selectModelForConversationAgent(
  existingMessageCount: number,
  hasImages: boolean,
): string {
  // Import at function level to avoid circular dependencies
  const { MODEL_IDS } = require("../../api-helpers");

  // Sonnet 4.5 for complex conversations (long history means more nuance needed)
  // Haiku 4.5 for shorter/simpler conversations
  // Threshold lowered from >30 to >20: by message 20+ the conversation has enough
  // context that the smarter model meaningfully improves tool-use accuracy
  if (existingMessageCount > 20 || hasImages) {
    return MODEL_IDS.PLANNER_MODEL_FULL; // Sonnet 4.5
  }
  return MODEL_IDS.EXECUTOR_MODEL_FULL; // Haiku 4.5
}
