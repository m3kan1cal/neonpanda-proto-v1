import {
  CoachConversation,
  CoachConversationSummary,
  BuildCoachConversationSummaryEvent,
} from "./types";
import { CoachConfig } from "../coach-creator/types";
import { parseJsonWithFallbacks } from "../response-utils";
import { logger } from "../logger";

/**
 * Build the prompt for coach conversation summarization
 */
export function buildCoachConversationSummaryPrompt(
  conversation: CoachConversation,
  coachConfig: CoachConfig,
  existingSummary?: CoachConversationSummary,
  criticalTrainingDirective?: { content: string; enabled: boolean },
): string {
  const coachName = coachConfig.coach_name;
  const coachPersonality = coachConfig.selected_personality.primary_template;
  const coachSpecializations =
    coachConfig.technical_config.specializations?.join(", ") ||
    "General fitness";

  // Build directive section if enabled
  const directiveSection =
    criticalTrainingDirective?.enabled && criticalTrainingDirective?.content
      ? `

🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:

${criticalTrainingDirective.content}

This directive takes precedence over all other instructions except safety constraints. Consider this when summarizing the user's preferences and communication style.

---
`
      : "";

  const messages = conversation.messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n\n");

  const existingSummaryContext = existingSummary
    ? `
PREVIOUS SUMMARY TO BUILD UPON:
Narrative: ${existingSummary.narrative}
Current Goals: ${existingSummary.structuredData.current_goals.join(", ")}
Recent Progress: ${existingSummary.structuredData.recent_progress.join(", ")}
Training Preferences: ${existingSummary.structuredData.training_preferences?.join(", ") || existingSummary.structuredData.preferences?.training_preferences?.join(", ") || "None captured yet"}
Schedule Constraints: ${existingSummary.structuredData.schedule_constraints?.join(", ") || existingSummary.structuredData.preferences?.schedule_constraints?.join(", ") || "None captured yet"}
Key Insights: ${existingSummary.structuredData.key_insights.join(", ")}
Important Context: ${existingSummary.structuredData.important_context.join(", ")}

INSTRUCTIONS: This is a cumulative summary. Build upon the previous summary, updating and evolving it with new information from the recent conversation. Don't repeat old information unless it's still relevant or has changed.
`
    : `
INSTRUCTIONS: This is the first summary for this conversation. Create a comprehensive summary that captures the foundation of the coaching relationship.
`;

  return `${directiveSection}You are an AI assistant helping to create conversation memory summaries for fitness coaches.

Analyze the conversation between a user and their AI fitness coach "${coachName}" (${coachPersonality} personality, specializing in ${coachSpecializations}) and create a structured summary using the generate_conversation_summary tool.

${existingSummaryContext}

CONVERSATION TO ANALYZE:
${messages}

---

## SUMMARY CREATION GUIDELINES

### NARRATIVE (150-300 words)
Write a flowing narrative capturing:
- The essence of the coaching relationship and communication dynamic
- Goals, challenges, and progress discussed
- Emotional state and motivation patterns (include mood, motivation level, confidence level)
- Communication style preferences
- Training methodologies discussed (5/3/1, CrossFit, Starting Strength, etc.)
- Personal context and constraints
- Notable insights or breakthroughs

### TRAINING PREFERENCES
Merge all of these into a single comprehensive list:
- Training style preferences (e.g., "prefers compound movements", "likes high intensity")
- Methodology names mentioned (e.g., "uses 5/3/1 programming", "follows CrossFit methodology")
- Preferred approaches (e.g., "responds well to linear progression")
- Programming principles they referenced or responded positively to

### CONVERSATION TAGS
Generate 2-5 descriptive tags:
- **Format**: Lowercase with hyphens (e.g., "strength-training", "weekly-wods", "crossfit")
- **Content**: Main topics, methodologies, or themes discussed
- **Examples**: "strength-training", "cardio", "nutrition", "motivation", "injury-recovery", "crossfit", "powerlifting", "bodybuilding", "goal-setting", "progress-review", "technique-focus", "equipment-questions", "scheduling"

### METHODOLOGY FOCUS
Pay special attention to capturing in narrative and training_preferences:
- Specific methodologies: 5/3/1, CrossFit, Starting Strength, Westside Barbell, etc.
- Programming concepts: periodization, autoregulation, linear progression, conjugate method
- Training philosophy: frequency, volume, intensity preferences
- Authority references: Jim Wendler, Louie Simmons, Mark Rippetoe, etc.

---

IMPORTANT: The summary should help the coach remember and build upon the relationship in future conversations. Focus on actionable insights that improve coaching quality.`;
}

/**
 * Parse and validate the coach conversation summary.
 * Supports the new flat format (v2) and backward compat with old nested format (v1)
 * and dual-format (full_summary + compact_summary) from the previous iteration.
 */
export function parseCoachConversationSummary(
  dataOrString: any | string,
  event: BuildCoachConversationSummaryEvent,
  conversation: CoachConversation,
): CoachConversationSummary {
  try {
    let parsedData: any;
    if (typeof dataOrString === "string") {
      logger.info("Parsing JSON string (legacy mode)..", {
        responseLength: dataOrString.length,
        responsePreview: dataOrString.substring(0, 200),
      });
      parsedData = parseJsonWithFallbacks(dataOrString);
    } else {
      logger.info("Processing tool result data (toolConfig mode)..");
      parsedData = dataOrString;
    }

    let narrative: string;
    let structuredData: any;

    if (parsedData.full_summary) {
      // Old dual-format response (v1 schema) - migrate to flat
      logger.info("Migrating from old dual-format response to flat structure");
      const full = parsedData.full_summary;
      narrative = full.narrative || "";
      structuredData = migrateLegacyStructuredData(full);
    } else if (
      parsedData.preferences ||
      parsedData.methodology_preferences ||
      parsedData.emotional_state
    ) {
      // Old single nested format (v1) - migrate to flat
      logger.info("Migrating from old nested single-format to flat structure");
      narrative = parsedData.narrative || parsedData.narrative_summary || "";
      structuredData = migrateLegacyStructuredData(parsedData);
    } else {
      // New flat format (v2)
      logger.info("Processing new flat-format response (v2)");
      narrative = parsedData.narrative || "";
      structuredData = { ...parsedData };
      if (structuredData.narrative) delete structuredData.narrative;
    }

    logger.info("Parsed conversation data:", {
      narrativeLength: narrative.length,
      hasGoals: !!structuredData.current_goals,
      hasProgress: !!structuredData.recent_progress,
    });

    // Validate and default required fields
    if (!Array.isArray(structuredData.current_goals)) {
      structuredData.current_goals = [];
    }
    if (!Array.isArray(structuredData.recent_progress)) {
      structuredData.recent_progress = [];
    }
    if (!Array.isArray(structuredData.training_preferences)) {
      structuredData.training_preferences = [];
    }
    if (!Array.isArray(structuredData.schedule_constraints)) {
      structuredData.schedule_constraints = [];
    }
    if (!Array.isArray(structuredData.key_insights)) {
      structuredData.key_insights = [];
    }
    if (!Array.isArray(structuredData.important_context)) {
      structuredData.important_context = [];
    }
    if (!Array.isArray(structuredData.conversation_tags)) {
      structuredData.conversation_tags = [];
    }

    const confidence = calculateSummaryConfidence(narrative, structuredData);

    const messages = conversation.messages;
    const messageRange = {
      startMessageId: messages[0]?.id || "",
      endMessageId: messages[messages.length - 1]?.id || "",
      totalMessages: messages.length,
    };

    return {
      summaryId: `conversation_summary_${event.conversationId}`,
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      narrative,
      structuredData,
      metadata: {
        createdAt: new Date(),
        messageRange,
        triggerReason: event.triggerReason,
        ...(event.complexityIndicators &&
          event.complexityIndicators.length > 0 && {
            complexityIndicators: event.complexityIndicators,
          }),
        confidence,
      },
    };
  } catch (error) {
    logger.error("Error parsing conversation summary:", error);
    logger.error(
      "Input data:",
      typeof dataOrString === "string"
        ? dataOrString.substring(0, 500)
        : JSON.stringify(dataOrString, null, 2).substring(0, 500),
    );
    throw new Error(
      `Failed to parse conversation summary: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Migrate old nested structuredData format (v1) to the new flat format (v2).
 * Handles backward compatibility for existing DynamoDB records and old AI responses.
 */
function migrateLegacyStructuredData(data: any): any {
  const preferences = data.preferences || {};
  const methodologyPrefs = data.methodology_preferences || {};
  const emotionalState = data.emotional_state || {};

  // Merge all training-related arrays into the flat training_preferences field
  const trainingPreferences: string[] = [
    ...(Array.isArray(preferences.training_preferences)
      ? preferences.training_preferences
      : []),
    ...(Array.isArray(methodologyPrefs.mentioned_methodologies)
      ? methodologyPrefs.mentioned_methodologies
      : []),
    ...(Array.isArray(methodologyPrefs.preferred_approaches)
      ? methodologyPrefs.preferred_approaches
      : []),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i); // deduplicate

  return {
    current_goals: Array.isArray(data.current_goals) ? data.current_goals : [],
    recent_progress: Array.isArray(data.recent_progress)
      ? data.recent_progress
      : [],
    training_preferences: trainingPreferences,
    schedule_constraints: Array.isArray(preferences.schedule_constraints)
      ? preferences.schedule_constraints
      : [],
    key_insights: Array.isArray(data.key_insights) ? data.key_insights : [],
    important_context: Array.isArray(data.important_context)
      ? data.important_context
      : [],
    conversation_tags: Array.isArray(data.conversation_tags)
      ? data.conversation_tags
      : [],
  };
}

/**
 * Derive a compact summary for Pinecone storage by programmatically truncating the full summary.
 * Takes at most 2-3 items per array and trims the narrative to ~150 words.
 */
export function deriveCompactSummary(
  summary: CoachConversationSummary,
): CoachConversationSummary["structuredData"] & { narrative: string } {
  const sd = summary.structuredData;

  // Trim narrative to ~150 words
  const words = summary.narrative.split(/\s+/);
  const compactNarrative =
    words.length > 150
      ? words.slice(0, 150).join(" ") + "..."
      : summary.narrative;

  return {
    narrative: compactNarrative,
    current_goals: sd.current_goals.slice(0, 3),
    recent_progress: sd.recent_progress.slice(0, 3),
    training_preferences: sd.training_preferences.slice(0, 5),
    schedule_constraints: sd.schedule_constraints.slice(0, 2),
    key_insights: sd.key_insights.slice(0, 3),
    important_context: sd.important_context.slice(0, 3),
    conversation_tags: sd.conversation_tags.slice(0, 5),
  };
}

/**
 * Calculate confidence score for conversation summary
 */
function calculateSummaryConfidence(
  narrative: string,
  structuredData: any,
): number {
  let confidence = 0;

  // Narrative quality (0-40 points)
  if (narrative.length >= 150 && narrative.length <= 500) {
    confidence += 40;
  } else if (narrative.length >= 100) {
    confidence += 30;
  } else if (narrative.length >= 50) {
    confidence += 20;
  }

  // Structured data completeness (0-60 points) - flat v2 fields
  const fields = [
    { field: structuredData.current_goals, weight: 15 },
    { field: structuredData.recent_progress, weight: 12 },
    { field: structuredData.training_preferences, weight: 13 },
    { field: structuredData.schedule_constraints, weight: 5 },
    { field: structuredData.key_insights, weight: 10 },
    { field: structuredData.important_context, weight: 5 },
  ];

  fields.forEach(({ field, weight }) => {
    if (Array.isArray(field) && field.length > 0) {
      confidence += weight;
    } else if (typeof field === "string" && field.trim().length > 0) {
      confidence += weight;
    }
  });

  return Math.min(confidence, 100);
}
