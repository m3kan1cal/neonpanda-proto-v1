import { v4 as uuidv4 } from "uuid";
import {
  CoachConversation,
  CoachConversationSummary,
  BuildCoachConversationSummaryEvent,
} from "./types";
import { CoachConfig } from "../coach-creator/types";
import { storePineconeContext } from "../api-helpers";
import { JSON_FORMATTING_INSTRUCTIONS_STANDARD } from "../prompt-helpers";

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

Please create a conversation summary with the following structure:

## NARRATIVE SUMMARY (150-300 words)
Write a flowing narrative that captures:
- The essence of the coaching relationship and communication dynamic
- Key goals, challenges, and progress discussed
- Important personal context and constraints
- Emotional state and motivation patterns
- Notable insights or breakthroughs
- Communication style preferences
- Training methodologies discussed, preferred, or referenced
- Any methodology-specific programming or approach preferences

${JSON_FORMATTING_INSTRUCTIONS_STANDARD}

## STRUCTURED DATA
Provide the following as a JSON object:

{
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
    // Extract narrative (everything before "## STRUCTURED DATA" or similar)
    const narrativeMatch = aiResponse.match(
      /## NARRATIVE SUMMARY[^\n]*\n([\s\S]*?)(?=## STRUCTURED DATA|$)/i
    );
    const narrative = narrativeMatch ? narrativeMatch[1].trim() : "";

    // Extract JSON (look for JSON block)
    const jsonMatch =
      aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
      aiResponse.match(/{\s*"current_goals"[\s\S]*?}/);

    if (!jsonMatch) {
      throw new Error("Could not find structured data JSON in AI response");
    }

    const structuredData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

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
      summaryId: uuidv4(),
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

/**
 * Store coach conversation summary in Pinecone for semantic search
 */
export async function storeCoachConversationSummaryInPinecone(
  summary: CoachConversationSummary
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    // Create searchable content combining narrative and key structured data
    const searchableContent = `
${summary.narrative}

Goals: ${summary.structuredData.current_goals.join(", ")}
Recent Progress: ${summary.structuredData.recent_progress.join(", ")}
Communication Style: ${summary.structuredData.preferences.communication_style}
Training Preferences: ${summary.structuredData.preferences.training_preferences.join(", ")}
Methodology Preferences: ${summary.structuredData.methodology_preferences.mentioned_methodologies.join(", ")} | Preferred Approaches: ${summary.structuredData.methodology_preferences.preferred_approaches.join(", ")} | Questions: ${summary.structuredData.methodology_preferences.methodology_questions.join(", ")}
Emotional State: ${summary.structuredData.emotional_state.current_mood} (motivation: ${summary.structuredData.emotional_state.motivation_level})
Key Insights: ${summary.structuredData.key_insights.join(", ")}
Important Context: ${summary.structuredData.important_context.join(", ")}
    `.trim();

    // Create metadata for Pinecone
    const metadata = {
      type: "conversation_summary",
      userId: summary.userId,
      coachId: summary.coachId,
      conversationId: summary.conversationId,
      summaryId: summary.summaryId,
      createdAt: summary.metadata.createdAt.toISOString(),
      messageCount: summary.metadata.messageRange.totalMessages,
      triggerReason: summary.metadata.triggerReason,
      confidence: summary.metadata.confidence,
      // Add structured data for filtering
      hasGoals: summary.structuredData.current_goals.length > 0,
      hasProgress: summary.structuredData.recent_progress.length > 0,
      hasEmotionalState: !!summary.structuredData.emotional_state.current_mood,
      hasInsights: summary.structuredData.key_insights.length > 0,
      hasMethodologyPreferences:
        summary.structuredData.methodology_preferences.mentioned_methodologies
          .length > 0 ||
        summary.structuredData.methodology_preferences.preferred_approaches
          .length > 0,
    };

    // Store in Pinecone using the same pattern as workout summaries
    const recordId = `conversation_summary_${summary.userId}_${summary.conversationId}`;

    await storePineconeContext(summary.userId, searchableContent, metadata);

    console.info("✅ Conversation summary stored in Pinecone:", {
      recordId,
      summaryId: summary.summaryId,
      contentLength: searchableContent.length,
      confidence: summary.metadata.confidence,
    });

    return { success: true, recordId };
  } catch (error) {
    console.error("❌ Error storing conversation summary in Pinecone:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
