/**
 * Episodic Memory Module
 *
 * Extracts "highlight moments" from conversation summaries — significant
 * shared experiences that build rapport and should be referenced naturally.
 *
 * Examples:
 * - "Hit their first 3-plate squat PR, got emotional about their dad's influence"
 * - "Broke down about work stress, we pivoted to a recovery-focused session"
 * - "Celebrated completing their first full program without missing a session"
 */

import {
  callBedrockApi,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
} from "../api-helpers";
import { UserMemory } from "./types";
import { generateMemoryId } from "./utils";
import { logger } from "../logger";
import { fixDoubleEncodedProperties } from "../response-utils";

/** Schema for episodic moment extraction */
const EPISODIC_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description: "Brief explanation of what moments were identified",
    },
    moments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          moment: {
            type: "string",
            description:
              "Rich description of the moment (2-3 sentences capturing what happened and why it matters)",
          },
          emotionalValence: {
            type: "string",
            enum: ["positive", "negative", "neutral", "mixed"],
          },
          significance: {
            type: "string",
            enum: ["high", "medium"],
          },
          themes: {
            type: "array",
            items: { type: "string" },
            description:
              "2-4 themes (e.g., 'achievement', 'vulnerability', 'persistence', 'breakthrough')",
          },
          originalExchange: {
            type: "string",
            description:
              "Brief paraphrase of the 2-4 message exchange that constituted this moment",
          },
        },
        required: [
          "moment",
          "emotionalValence",
          "significance",
          "themes",
          "originalExchange",
        ],
      },
    },
  },
  required: ["reasoning", "moments"],
};

export interface EpisodicExtractionResult {
  moments: Array<{
    moment: string;
    emotionalValence: "positive" | "negative" | "neutral" | "mixed";
    significance: "high" | "medium";
    themes: string[];
    originalExchange: string;
  }>;
}

/**
 * Extract episodic moments from a conversation summary.
 * Called by the build-conversation-summary handler after summary generation.
 * Uses Sonnet for nuanced emotional understanding.
 */
export async function extractEpisodicMoments(
  conversationSummary: string,
  coachName: string,
): Promise<EpisodicExtractionResult> {
  const systemPrompt = `You are analyzing a coaching conversation summary to identify significant "episodic moments" — shared experiences between coach and athlete that build rapport and are worth referencing in future conversations.

WHAT MAKES A MOMENT SIGNIFICANT:
- Emotional breakthroughs (PR celebrations, overcoming fear, vulnerability)
- Personal revelations (sharing life challenges, connecting fitness to personal meaning)
- Coaching pivots (moment where approach changed based on user's needs)
- Achievement milestones (completing a program, hitting a long-term goal)
- Struggle moments (injuries, setbacks, frustration that was worked through)
- Connection moments (humor, inside jokes, shared references)

WHAT IS NOT AN EPISODIC MOMENT:
- Routine workout discussions
- Standard coaching advice
- General small talk without emotional depth
- Technical discussions without personal significance

BE SELECTIVE: Only extract moments that a human coach would naturally remember and reference. Quality over quantity. Most conversations have 0-2 significant moments. Only extract "high" significance for truly notable moments.`;

  const userPrompt = `CONVERSATION SUMMARY:
${conversationSummary}

COACH NAME: ${coachName}

Use the extract_episodic_moments tool to identify any significant shared moments.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL, // Sonnet for emotional nuance
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        tools: {
          name: "extract_episodic_moments",
          description:
            "Extract significant episodic moments from conversation summary",
          inputSchema: EPISODIC_EXTRACTION_SCHEMA,
        },
        expectedToolName: "extract_episodic_moments",
      },
    );

    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    const fixedInput = fixDoubleEncodedProperties(response.input);
    return fixedInput as EpisodicExtractionResult;
  } catch (error) {
    logger.error("Error extracting episodic moments:", error);
    return { moments: [] };
  }
}

/**
 * Convert extracted episodic moments into UserMemory objects.
 */
export function buildEpisodicMemories(
  extraction: EpisodicExtractionResult,
  userId: string,
  coachId: string,
  conversationId: string,
): UserMemory[] {
  if (!extraction.moments?.length) return [];

  return extraction.moments.map((moment) => ({
    memoryId: generateMemoryId(userId),
    userId,
    coachId,
    content: moment.moment,
    memoryType: "episodic" as const,
    metadata: {
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      source: "system_extraction" as const,
      importance: moment.significance === "high" ? "high" : "medium",
      tags: [
        "episodic",
        moment.emotionalValence,
        ...moment.themes.slice(0, 3),
      ],
    },
  }));
}
