import {
  CoachConversation,
  CoachConversationSummary,
  BuildCoachConversationSummaryEvent,
} from "./types";
import { CoachConfig } from "../coach-creator/types";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";
import { parseJsonWithFallbacks } from "../response-utils";

/**
 * Build the prompt for coach conversation summarization
 */
export function buildCoachConversationSummaryPrompt(
  conversation: CoachConversation,
  coachConfig: CoachConfig,
  existingSummary?: CoachConversationSummary,
  criticalTrainingDirective?: { content: string; enabled: boolean }
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
Communication Style: ${existingSummary.structuredData.preferences.communication_style}
Training Preferences: ${existingSummary.structuredData.preferences.training_preferences.join(", ")}
Methodology Preferences: ${
        existingSummary.structuredData.methodology_preferences
          ? `Mentioned: ${existingSummary.structuredData.methodology_preferences.mentioned_methodologies?.join(", ") || "None"},
          Preferred: ${existingSummary.structuredData.methodology_preferences.preferred_approaches?.join(", ") || "None"}`
          : "None captured yet"
}
Emotional State: ${existingSummary.structuredData.emotional_state.current_mood} (motivation: ${existingSummary.structuredData.emotional_state.motivation_level})
Key Insights: ${existingSummary.structuredData.key_insights.join(", ")}
Important Context: ${existingSummary.structuredData.important_context.join(", ")}

INSTRUCTIONS: This is a cumulative summary. Build upon the previous summary, updating and evolving it with new information from the recent conversation. Don't repeat old information unless it's still relevant or has changed.
`
    : `
INSTRUCTIONS: This is the first summary for this conversation. Create a comprehensive summary that captures the foundation of the coaching relationship.
`;

  return `${directiveSection}You are an AI assistant helping to create conversation memory summaries for fitness coaches. Your task is to analyze a conversation between a user and their AI fitness coach "${coachName}" (${coachPersonality} personality, specializing in ${coachSpecializations}) and create a comprehensive summary that will help the coach provide better, more personalized coaching in future conversations.

${existingSummaryContext}

CONVERSATION TO ANALYZE:
${messages}

Please create a comprehensive conversation summary as a JSON object with the following structure:

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

{
  "narrative": "A flowing 150-300 word narrative that captures: the essence of the coaching relationship and communication dynamic, key goals/challenges/progress discussed, important personal context and constraints, emotional state and motivation patterns, notable insights or breakthroughs, communication style preferences, training methodologies discussed/preferred/referenced, and any methodology-specific programming or approach preferences",
  "current_goals": ["specific goal 1", "specific goal 2"],
  "recent_progress": ["progress item 1", "progress item 2"],
  "preferences": {
    "communication_style": "brief description of how they like to communicate",
    "training_preferences": ["preference 1", "preference 2"],
    "schedule_constraints": ["constraint 1", "constraint 2"]
  },
  "methodology_preferences": {
    "mentioned_methodologies": ["methodology names discussed", "programming approaches referenced"],
    "preferred_approaches": ["user's stated preferences for training styles", "programming principles they responded well to"],
    "methodology_questions": ["specific questions about methodologies", "areas of methodology interest"]
  },
  "emotional_state": {
    "current_mood": "brief description",
    "motivation_level": "high/medium/low with context",
    "confidence_level": "high/medium/low with context"
  },
  "key_insights": ["insight 1", "insight 2"],
  "important_context": ["context item 1", "context item 2"],
  "conversation_tags": ["tag1", "tag2", "tag3"]
}

GUIDELINES:
- Focus on information that will help the coach provide better future coaching
- Capture personality, communication style, and relationship dynamics
- Include specific goals, challenges, and progress patterns
- Note any important personal context (schedule, family, work, etc.)
- Track emotional and motivational patterns
- Be concise but comprehensive
- Update/evolve information from previous summaries rather than repeating
- Use specific examples when relevant
- Maintain professional coaching context

## CONVERSATION TAGS GUIDELINES:
Generate 2-5 descriptive tags that categorize this conversation. Tags should be:
- Lowercase with hyphens (e.g., "strength-training", "weekly-wods", "crossfit")
- Based on the main topics, methodologies, or themes discussed
- Useful for filtering and organizing conversations
- Examples: "strength-training", "cardio", "nutrition", "motivation", "injury-recovery", "crossfit", "powerlifting", "bodybuilding", "weekly-wods", "goal-setting", "progress-review", "technique-focus", "equipment-questions", "scheduling", "methodology-comparison"

## METHODOLOGY FOCUS AREAS:
Pay special attention to capturing:
- Specific methodology names mentioned (5/3/1, CrossFit, Starting Strength, etc.)
- Programming concepts discussed (periodization, autoregulation, linear progression, etc.)
- Training philosophy preferences (high frequency, conjugate method, block periodization, etc.)
- Questions about different training approaches or systems
- User responses to methodology-based coaching advice
- Creator names or methodology sources referenced (Jim Wendler, Louie Simmons, etc.)
- Discipline preferences (powerlifting, CrossFit, bodybuilding, etc.)
- Any methodology comparison discussions or preferences expressed

The summary should help the coach remember and build upon the relationship in future conversations.`;
}

/**
 * Parse and validate the coach conversation summary from AI response
 */
export function parseCoachConversationSummary(
  aiResponse: string,
  event: BuildCoachConversationSummaryEvent,
  conversation: CoachConversation
): CoachConversationSummary {
  try {
    console.info("Parsing AI response..", {
      responseLength: aiResponse.length,
      responsePreview: aiResponse.substring(0, 200)
    });

    // Use centralized parsing utility (handles markdown cleanup and JSON fixing)
    const parsedData = parseJsonWithFallbacks(aiResponse);

    // Extract narrative from the parsed data (can be at top level or nested)
    const narrative = parsedData.narrative || parsedData.narrative_summary || "";

    // The rest is structured data (remove narrative if it exists at top level)
    const structuredData = { ...parsedData };
    if (structuredData.narrative) delete structuredData.narrative;
    if (structuredData.narrative_summary) delete structuredData.narrative_summary;

    console.info("Parsed conversation data:", {
      narrativeLength: narrative.length,
      hasGoals: !!structuredData.current_goals,
      hasProgress: !!structuredData.recent_progress
    });

    // Validate required fields
    if (
      !structuredData.current_goals ||
      !Array.isArray(structuredData.current_goals)
    ) {
      structuredData.current_goals = [];
    }
    if (
      !structuredData.recent_progress ||
      !Array.isArray(structuredData.recent_progress)
    ) {
      structuredData.recent_progress = [];
    }
    if (!structuredData.preferences) {
      structuredData.preferences = {
        communication_style: "",
        training_preferences: [],
        schedule_constraints: [],
      };
    }
    if (!structuredData.methodology_preferences) {
      structuredData.methodology_preferences = {
        mentioned_methodologies: [],
        preferred_approaches: [],
        methodology_questions: [],
      };
    }
    if (!structuredData.emotional_state) {
      structuredData.emotional_state = {
        current_mood: "",
        motivation_level: "",
        confidence_level: "",
      };
    }
    if (
      !structuredData.key_insights ||
      !Array.isArray(structuredData.key_insights)
    ) {
      structuredData.key_insights = [];
    }
    if (
      !structuredData.important_context ||
      !Array.isArray(structuredData.important_context)
    ) {
      structuredData.important_context = [];
    }
    if (
      !structuredData.conversation_tags ||
      !Array.isArray(structuredData.conversation_tags)
    ) {
      structuredData.conversation_tags = [];
    }

    // Calculate confidence based on narrative length and structured data completeness
    const confidence = calculateSummaryConfidence(narrative, structuredData);

    // Get message range
    const messages = conversation.messages;
    const messageRange = {
      startMessageId: messages[0]?.id || "",
      endMessageId: messages[messages.length - 1]?.id || "",
      totalMessages: messages.length,
    };

    const summary: CoachConversationSummary = {
      summaryId: `conversation_summary_${event.userId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      narrative,
      structuredData,
      metadata: {
        createdAt: new Date(),
        messageRange,
        triggerReason: event.triggerReason,
        // Only include complexityIndicators if it's defined and not empty
        ...(event.complexityIndicators &&
          event.complexityIndicators.length > 0 && {
            complexityIndicators: event.complexityIndicators,
          }),
        confidence,
      },
    };

    return summary;
  } catch (error) {
    console.error("Error parsing conversation summary:", error);
    console.error("AI Response:", aiResponse);
    throw new Error(
      `Failed to parse conversation summary: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Calculate confidence score for conversation summary
 */
function calculateSummaryConfidence(
  narrative: string,
  structuredData: any
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

  // Structured data completeness (0-60 points)
  const fields = [
    { field: structuredData.current_goals, weight: 12 },
    { field: structuredData.recent_progress, weight: 10 },
    { field: structuredData.preferences?.communication_style, weight: 8 },
    { field: structuredData.preferences?.training_preferences, weight: 7 },
    {
      field: structuredData.methodology_preferences?.mentioned_methodologies,
      weight: 6,
    },
    {
      field: structuredData.methodology_preferences?.preferred_approaches,
      weight: 5,
    },
    { field: structuredData.emotional_state?.current_mood, weight: 7 },
    { field: structuredData.emotional_state?.motivation_level, weight: 5 },
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

