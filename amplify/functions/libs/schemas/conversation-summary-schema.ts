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
      examples: [
        ["Increase squat to 315 lbs", "Complete a 5K run", "Lose 10 lbs by June"],
      ],
      description:
        'Specific, actionable goals the user is working towards. Return a single JSON array with all items, e.g. ["goal1", "goal2"]. Do NOT split across lines, return multiple arrays, or use XML tags.',
    },
    recent_progress: {
      type: "array",
      items: { type: "string" },
      examples: [
        ["Hit a new deadlift PR of 405 lbs", "Completed first unassisted pull-up", "Lost 3 lbs this month"],
      ],
      description:
        'Recent progress updates, achievements, and milestones. Return a single JSON array with all items, e.g. ["progress1", "progress2"]. Do NOT split across lines, return multiple arrays, or use XML tags.',
    },
    training_preferences: {
      type: "array",
      items: { type: "string" },
      examples: [
        ["prefers compound movements", "uses 5/3/1 programming", "responds well to linear progression", "trains 4 days per week"],
      ],
      description:
        'Training preferences, methodology names, preferred approaches, and programming principles. Merge training style preferences (e.g., "prefers compound movements"), methodology names (e.g., "uses 5/3/1 programming"), and approach preferences (e.g., "responds well to linear progression") into this single list for comprehensive semantic searchability. Return a single JSON array with all items. Do NOT split across lines, return multiple arrays, or use XML tags.',
    },
    schedule_constraints: {
      type: "array",
      items: { type: "string" },
      examples: [
        ["can only train Mon/Wed/Fri", "limited to 60-minute sessions", "no morning availability"],
      ],
      description:
        'Schedule limitations, time constraints, and availability patterns. Return a single JSON array with all items, e.g. ["constraint1", "constraint2"]. Do NOT split across lines, return multiple arrays, or use XML tags.',
    },
    key_insights: {
      type: "array",
      items: { type: "string" },
      examples: [
        ["responds well to positive reinforcement", "tends to overtrain when motivated", "needs rest day reminders"],
      ],
      description:
        'Important insights about the user\'s training, mindset, or behavior patterns. Return a single JSON array with all items, e.g. ["insight1", "insight2"]. Do NOT split across lines, return multiple arrays, or use XML tags.',
    },
    important_context: {
      type: "array",
      items: { type: "string" },
      examples: [
        ["recovering from a left shoulder injury", "home gym with barbell and rack only", "works a desk job"],
      ],
      description:
        'Critical context items (personal circumstances, injuries, equipment, life events). Return a single JSON array with all items, e.g. ["context1", "context2"]. Do NOT split across lines, return multiple arrays, or use XML tags.',
    },
    conversation_tags: {
      type: "array",
      items: { type: "string" },
      examples: [["strength-training", "goal-setting", "progress-review"]],
      description:
        '2-5 descriptive tags (lowercase with hyphens) categorizing the conversation topics. Return a single JSON array, e.g. ["strength-training", "goal-setting"]. Do NOT split across lines, return multiple arrays, or use XML tags.',
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
export const SCHEMA_LAST_UPDATED = "2026-03-03";
