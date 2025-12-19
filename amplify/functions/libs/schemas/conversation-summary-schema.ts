/**
 * Conversation Summary Schema - JSON Schema Definition
 *
 * This module contains the complete conversation summary structure used for
 * AI-powered extraction via Bedrock toolConfig and validation.
 *
 * Pattern: Follows build-workout toolConfig approach for structured output
 *
 * Related files:
 * - amplify/functions/libs/coach-conversation/types.ts (TypeScript interfaces)
 * - amplify/functions/build-conversation-summary/handler.ts (Summary generation handler)
 * - amplify/functions/libs/coach-conversation/summary.ts (Summary logic)
 */

import { BedrockToolConfig } from "../api-helpers";

/**
 * JSON Schema for dual-format conversation summary
 * Used for Bedrock tool-based extraction with guaranteed structure
 */
export const CONVERSATION_SUMMARY_SCHEMA = {
  type: "object",
  required: ["full_summary", "compact_summary"],
  properties: {
    full_summary: {
      type: "object",
      required: [
        "narrative",
        "current_goals",
        "recent_progress",
        "preferences",
        "methodology_preferences",
        "emotional_state",
        "key_insights",
        "important_context",
        "conversation_tags",
      ],
      properties: {
        narrative: {
          type: "string",
          description:
            "A flowing 150-300 word narrative that captures: the essence of the coaching relationship and communication dynamic, key goals/challenges/progress discussed, important personal context and constraints, emotional state and motivation patterns, notable insights or breakthroughs, communication style preferences, training methodologies discussed/preferred/referenced, and any methodology-specific programming or approach preferences",
        },
        current_goals: {
          type: "array",
          items: { type: "string" },
          description: "Specific, actionable goals the user is working towards",
        },
        recent_progress: {
          type: "array",
          items: { type: "string" },
          description: "Recent progress updates, achievements, and milestones",
        },
        preferences: {
          type: "object",
          required: [
            "communication_style",
            "training_preferences",
            "schedule_constraints",
          ],
          properties: {
            communication_style: {
              type: "string",
              description:
                "Brief description of how the user likes to communicate with their coach",
            },
            training_preferences: {
              type: "array",
              items: { type: "string" },
              description: "User's training preferences and workout style",
            },
            schedule_constraints: {
              type: "array",
              items: { type: "string" },
              description:
                "Schedule limitations, time constraints, and availability patterns",
            },
          },
        },
        methodology_preferences: {
          type: "object",
          required: [
            "mentioned_methodologies",
            "preferred_approaches",
            "methodology_questions",
          ],
          properties: {
            mentioned_methodologies: {
              type: "array",
              items: { type: "string" },
              description:
                "Methodology names discussed (5/3/1, CrossFit, Starting Strength, etc.) and programming approaches referenced",
            },
            preferred_approaches: {
              type: "array",
              items: { type: "string" },
              description:
                "User's stated preferences for training styles and programming principles they responded well to",
            },
            methodology_questions: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific questions about methodologies and areas of methodology interest",
            },
          },
        },
        emotional_state: {
          type: "object",
          required: ["current_mood", "motivation_level", "confidence_level"],
          properties: {
            current_mood: {
              type: "string",
              description:
                "Brief description of user's current emotional state",
            },
            motivation_level: {
              type: "string",
              description:
                "Motivation level (high/medium/low) with brief context",
            },
            confidence_level: {
              type: "string",
              description:
                "Confidence level (high/medium/low) with brief context",
            },
          },
        },
        key_insights: {
          type: "array",
          items: { type: "string" },
          description:
            "Important insights about the user's training, mindset, or behavior patterns",
        },
        important_context: {
          type: "array",
          items: { type: "string" },
          description:
            "Critical context items (personal circumstances, injuries, equipment, life events)",
        },
        conversation_tags: {
          type: "array",
          items: { type: "string" },
          description:
            "2-5 descriptive tags (lowercase with hyphens) categorizing the conversation topics (e.g., 'strength-training', 'goal-setting', 'crossfit')",
        },
      },
    },
    compact_summary: {
      type: "object",
      required: [
        "narrative",
        "current_goals",
        "recent_progress",
        "preferences",
        "methodology_preferences",
        "emotional_state",
        "key_insights",
        "important_context",
        "conversation_tags",
      ],
      properties: {
        narrative: {
          type: "string",
          description:
            "A concise 75-150 word narrative preserving key coaching context, goals, and critical information. Use shorter phrases while maintaining searchability.",
        },
        current_goals: {
          type: "array",
          items: { type: "string" },
          description: "Top 2-3 most important goals (concise phrasing)",
          maxItems: 3,
        },
        recent_progress: {
          type: "array",
          items: { type: "string" },
          description: "Top 2-3 most significant progress updates (concise)",
          maxItems: 3,
        },
        preferences: {
          type: "object",
          required: [
            "communication_style",
            "training_preferences",
            "schedule_constraints",
          ],
          properties: {
            communication_style: {
              type: "string",
              description: "Brief communication style summary",
            },
            training_preferences: {
              type: "array",
              items: { type: "string" },
              description: "Top 2-3 training preferences",
              maxItems: 3,
            },
            schedule_constraints: {
              type: "array",
              items: { type: "string" },
              description: "Top 2 most important schedule constraints",
              maxItems: 2,
            },
          },
        },
        methodology_preferences: {
          type: "object",
          required: [
            "mentioned_methodologies",
            "preferred_approaches",
            "methodology_questions",
          ],
          properties: {
            mentioned_methodologies: {
              type: "array",
              items: { type: "string" },
              description: "Top 2-3 methodologies discussed",
              maxItems: 3,
            },
            preferred_approaches: {
              type: "array",
              items: { type: "string" },
              description: "Top 2 preferred approaches",
              maxItems: 2,
            },
            methodology_questions: {
              type: "array",
              items: { type: "string" },
              description: "Top 1-2 methodology questions",
              maxItems: 2,
            },
          },
        },
        emotional_state: {
          type: "object",
          required: ["current_mood", "motivation_level", "confidence_level"],
          properties: {
            current_mood: {
              type: "string",
              description: "Brief mood description",
            },
            motivation_level: {
              type: "string",
              description: "Motivation level with brief context",
            },
            confidence_level: {
              type: "string",
              description: "Confidence level with brief context",
            },
          },
        },
        key_insights: {
          type: "array",
          items: { type: "string" },
          description: "Top 2-3 most important insights",
          maxItems: 3,
        },
        important_context: {
          type: "array",
          items: { type: "string" },
          description: "Top 2-3 most critical context items",
          maxItems: 3,
        },
        conversation_tags: {
          type: "array",
          items: { type: "string" },
          description: "2-5 descriptive tags (same as full_summary)",
          minItems: 2,
          maxItems: 5,
        },
      },
    },
  },
};

/**
 * Bedrock toolConfig for conversation summary generation
 * Use with callBedrockApi({ tools: [CONVERSATION_SUMMARY_TOOL] })
 */
export const CONVERSATION_SUMMARY_TOOL: BedrockToolConfig = {
  name: "generate_conversation_summary",
  description:
    "Generate a comprehensive dual-format conversation summary that captures the coaching relationship, goals, progress, preferences, and context. Generates both a full summary (complete details) and a compact summary (optimized for semantic search, ~25KB target).",
  inputSchema: CONVERSATION_SUMMARY_SCHEMA,
};

/**
 * Schema version information
 */
export const SCHEMA_VERSION = "1.0";
export const SCHEMA_LAST_UPDATED = "2025-01-14";
