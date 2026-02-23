/**
 * Conversation Summary Schema - JSON Schema Definition
 *
 * Simplified flat structure to reduce grammar compilation size for Bedrock strict mode.
 * Previously used dual full_summary + compact_summary format; now uses a single flat
 * structure with compact summaries derived programmatically via deriveCompactSummary().
 *
 * Related files:
 * - amplify/functions/libs/coach-conversation/types.ts (TypeScript interfaces)
 * - amplify/functions/libs/build-conversation-summary/handler.ts (Summary generation handler)
 * - amplify/functions/libs/coach-conversation/summary.ts (Summary logic + deriveCompactSummary)
 */

import { BedrockToolConfig } from "../api-helpers";

/**
 * JSON Schema for conversation summary generation.
 * Flat structure with 8 top-level fields - no nested objects.
 * Used for Bedrock tool-based extraction with guaranteed structure.
 */
export const CONVERSATION_SUMMARY_SCHEMA = {
  type: "object",
  required: [
    "narrative",
    "current_goals",
    "recent_progress",
    "training_preferences",
    "schedule_constraints",
    "key_insights",
    "important_context",
    "conversation_tags",
  ],
  additionalProperties: false,
  properties: {
    narrative: {
      type: "string",
      description:
        "A flowing 150-300 word narrative capturing: the coaching relationship and communication dynamic, key goals/challenges/progress discussed, emotional state and motivation level, communication style preferences, training methodology preferences and approaches, specific methodologies referenced (5/3/1, CrossFit, Starting Strength, etc.), personal context and constraints, notable insights or breakthroughs",
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
    training_preferences: {
      type: "array",
      items: { type: "string" },
      description:
        "Training preferences, methodology names, preferred approaches, and programming principles. Merge training style preferences (e.g., 'prefers compound movements'), methodology names (e.g., 'uses 5/3/1 programming'), and approach preferences (e.g., 'responds well to linear progression') into this single list for comprehensive semantic searchability",
    },
    schedule_constraints: {
      type: "array",
      items: { type: "string" },
      description:
        "Schedule limitations, time constraints, and availability patterns",
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
};

/**
 * Bedrock toolConfig for conversation summary generation.
 * Use with callBedrockApi({ tools: [CONVERSATION_SUMMARY_TOOL] })
 */
export const CONVERSATION_SUMMARY_TOOL: BedrockToolConfig = {
  name: "generate_conversation_summary",
  description:
    "Generate a structured conversation summary capturing the coaching relationship, goals, progress, training preferences, and context. The narrative field should be comprehensive (150-300 words) and include emotional state, communication style, and methodology preferences. Other fields provide structured data for semantic search.",
  inputSchema: CONVERSATION_SUMMARY_SCHEMA,
};

/**
 * Schema version information
 */
export const SCHEMA_VERSION = "2.0";
export const SCHEMA_LAST_UPDATED = "2026-02-11";
