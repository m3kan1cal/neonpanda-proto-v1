/**
 * Behavioral Pattern Detection Module
 *
 * Detects implicit patterns from conversation history and workout data
 * that the user hasn't explicitly stated. These are "observed" patterns
 * the coach picks up on over time.
 *
 * Examples:
 * - "User consistently trains harder on Mondays"
 * - "Avoids discussing nutrition when it comes up"
 * - "Gets more engaged when competition is mentioned"
 * - "Tends to underreport difficulty of workouts"
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import { UserMemory } from "./types";
import { generateMemoryId } from "./utils";
import { logger } from "../logger";
import { fixDoubleEncodedProperties } from "../response-utils";

/** Schema for behavioral pattern detection */
const BEHAVIORAL_PATTERN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Overall analysis of patterns observed across the conversation history",
    },
    patterns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          pattern: {
            type: "string",
            description: "Concise description of the observed behavior pattern",
          },
          patternType: {
            type: "string",
            enum: [
              "training",
              "communication",
              "adherence",
              "emotional",
              "avoidance",
            ],
          },
          confidence: {
            type: "number",
            description: "How confident we are in this pattern (0.0-1.0)",
          },
          evidence: {
            type: "string",
            description:
              "Brief description of the evidence supporting this pattern",
          },
          coachingImplication: {
            type: "string",
            description:
              "How the coach should use this insight (e.g., 'Avoid pushing nutrition topics directly')",
          },
        },
        required: [
          "pattern",
          "patternType",
          "confidence",
          "evidence",
          "coachingImplication",
        ],
      },
    },
  },
  required: ["reasoning", "patterns"],
};

export interface BehavioralDetectionResult {
  patterns: Array<{
    pattern: string;
    patternType:
      | "training"
      | "communication"
      | "adherence"
      | "emotional"
      | "avoidance";
    confidence: number;
    evidence: string;
    coachingImplication: string;
  }>;
}

/**
 * Detect behavioral patterns from conversation summaries and workout data.
 * Runs weekly as part of the memory lifecycle job.
 * Uses Sonnet for synthesizing longitudinal data.
 */
export async function detectBehavioralPatterns(
  conversationSummaries: string[],
  existingPatterns: UserMemory[],
): Promise<BehavioralDetectionResult> {
  const existingPatternsText =
    existingPatterns.length > 0
      ? `\n\nEXISTING PATTERNS (update confidence or mark as weakening if contradicted):\n${existingPatterns.map((p) => `- ${p.content}`).join("\n")}`
      : "";

  const systemPrompt = `You are analyzing a series of coaching conversation summaries to detect implicit behavioral patterns — things the user does consistently but hasn't explicitly stated.

WHAT TO LOOK FOR:
- **Training patterns**: Consistent timing, exercise selection biases, intensity preferences
- **Communication patterns**: How they ask questions, response style, engagement level changes
- **Adherence patterns**: Follow-through on commitments, consistency, excuses, avoidance
- **Emotional patterns**: Mood correlations with training, stress responses, motivation cycles
- **Avoidance patterns**: Topics they deflect, exercises they dodge, conversations they redirect

GUIDELINES:
- Minimum confidence 0.5 to report a pattern
- A pattern needs evidence across at least 2-3 conversations to be meaningful
- If an existing pattern is contradicted, don't include it (let confidence decay naturally)
- New patterns start at 0.5-0.6 confidence; increase with more evidence
- Each pattern must include a concrete coaching implication${existingPatternsText}`;

  const userPrompt = `CONVERSATION SUMMARIES (chronological):
${conversationSummaries.map((s, i) => `--- Summary ${i + 1} ---\n${s}`).join("\n\n")}

Use the detect_behavioral_patterns tool to identify behavioral patterns.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.PLANNER_MODEL_FULL, // Sonnet for pattern synthesis
      {
        temperature: TEMPERATURE_PRESETS.BALANCED,
        tools: {
          name: "detect_behavioral_patterns",
          description:
            "Detect implicit behavioral patterns from coaching conversation history",
          inputSchema: BEHAVIORAL_PATTERN_SCHEMA,
        },
        expectedToolName: "detect_behavioral_patterns",
      },
    );

    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    const fixedInput = fixDoubleEncodedProperties(response.input);
    return fixedInput as BehavioralDetectionResult;
  } catch (error) {
    logger.error("Error detecting behavioral patterns:", error);
    return { patterns: [] };
  }
}

/**
 * Convert detected behavioral patterns into UserMemory objects.
 * Behavioral memories are always global (coachId: null) — accessible by all coaches.
 */
export function buildBehavioralMemories(
  detection: BehavioralDetectionResult,
  userId: string,
): UserMemory[] {
  if (!detection.patterns?.length) return [];

  return detection.patterns
    .filter((p) => p.confidence >= 0.5)
    .map((pattern) => ({
      memoryId: generateMemoryId(userId),
      userId,
      coachId: null,
      content: `${pattern.pattern} — ${pattern.coachingImplication}`,
      memoryType: "behavioral" as const,
      metadata: {
        createdAt: new Date(),
        lastUsed: new Date(),
        usageCount: 0,
        source: "system_extraction" as const,
        importance:
          pattern.confidence >= 0.8 ? ("high" as const) : ("medium" as const),
        tags: ["behavioral", pattern.patternType, "observed_pattern"],
      },
    }));
}

/**
 * Format behavioral memories for prompt injection.
 * Presents patterns as coaching guidance, not raw data.
 */
export function formatBehavioralPatternsForPrompt(
  memories: UserMemory[],
): string {
  if (memories.length === 0) return "";

  const sections = [
    `## Observed Behavioral Patterns
_These are patterns you've noticed over time — use them to guide your approach, not as labels._`,
  ];

  for (const memory of memories.slice(0, 5)) {
    sections.push(`- ${memory.content}`);
  }

  return sections.join("\n");
}
