/**
 * JSON Schema for emotional snapshot extraction tool use.
 * Used to extract emotional state from a conversation summary.
 *
 * Field ordering follows reasoning-first pattern per Bedrock structured output best practices.
 */

export const EMOTIONAL_SNAPSHOT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Brief explanation of the emotional assessment and what signals were used",
    },
    motivation: {
      type: "number",
      description:
        "Motivation level 1-10 (1=completely unmotivated, 10=fired up and driven)",
      default: 5,
    },
    energy: {
      type: "number",
      description:
        "Energy level 1-10 (1=exhausted/drained, 10=high energy and alert)",
      default: 5,
    },
    confidence: {
      type: "number",
      description:
        "Confidence level 1-10 (1=deeply insecure about training, 10=supremely confident)",
      default: 5,
    },
    stress: {
      type: "number",
      description:
        "Stress level 1-10 (1=completely relaxed, 10=overwhelmed with stress)",
      default: 5,
    },
    coachSatisfaction: {
      type: "number",
      description:
        "Satisfaction with coaching 1-10 (1=frustrated with coach, 10=loves the coaching)",
      default: 5,
    },
    dominantEmotion: {
      type: "string",
      description:
        "Primary emotion label (e.g., 'excited', 'frustrated', 'anxious', 'calm', 'determined', 'discouraged')",
    },
    emotionalNarrative: {
      type: "string",
      description:
        "1-2 sentence narrative of the emotional state (e.g., 'User seems burnt out from work stress but still showed up — resilient despite fatigue')",
    },
    triggers: {
      type: "array",
      items: { type: "string" },
      description:
        "What triggered/influenced the emotional state (e.g., ['work_stress', 'pr_attempt_failed', 'vacation_recovery'])",
    },
    conversationTopics: {
      type: "array",
      items: { type: "string" },
      description:
        "Main topics discussed in the conversation (e.g., ['program_design', 'injury_update', 'motivation'])",
    },
    coachingGuidance: {
      type: "string",
      description:
        "Brief coaching guidance based on emotional state (e.g., 'Keep encouragement high — they need wins right now, not challenges')",
    },
  },
  required: [
    "reasoning",
    "motivation",
    "energy",
    "confidence",
    "stress",
    "coachSatisfaction",
    "dominantEmotion",
    "emotionalNarrative",
    "triggers",
    "conversationTopics",
    "coachingGuidance",
  ],
};
