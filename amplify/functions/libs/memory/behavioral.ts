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
    existingMemoryId?: string;
  }>;
}

/**
 * Calculate similarity score between two strings (0-1 scale).
 * Used to match detected patterns against existing ones for deduplication.
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  // Levenshtein distance approach
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(shorter, longer);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function getEditDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[s1.length][s2.length];
}

/**
 * Find existing memory that matches a detected pattern.
 * Uses string similarity (0.7+ = match) and pattern type to identify duplicates.
 */
function findMatchingExistingMemory(
  detectedPattern: string,
  patternType: string,
  existingPatterns: UserMemory[],
): UserMemory | undefined {
  return existingPatterns.find((existing) => {
    const existingMeta = existing.metadata as any;
    const existingPatternType = existingMeta.tags?.find((t: string) =>
      ["training", "communication", "adherence", "emotional", "avoidance"].includes(
        t,
      ),
    );

    if (existingPatternType !== patternType) {
      return false;
    }

    // Extract just the pattern description (before the " — " separator)
    const existingContent = existing.content.split(" — ")[0];
    const similarity = calculateStringSimilarity(
      detectedPattern,
      existingContent,
    );

    return similarity >= 0.7;
  });
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
    const result = fixedInput as BehavioralDetectionResult;

    // Match detected patterns against existing ones and add existingMemoryId if matched
    result.patterns = result.patterns.map((pattern) => {
      const matchingMemory = findMatchingExistingMemory(
        pattern.pattern,
        pattern.patternType,
        existingPatterns,
      );
      return {
        ...pattern,
        existingMemoryId: matchingMemory?.memoryId,
      };
    });

    return result;
  } catch (error) {
    logger.error("Error detecting behavioral patterns:", error);
    return { patterns: [] };
  }
}

/**
 * Convert detected behavioral patterns into UserMemory objects or update objects.
 * Behavioral memories are always global (coachId: null) — accessible by all coaches.
 * If a pattern has an existingMemoryId, returns an update; otherwise returns a new memory.
 */
export function buildBehavioralMemories(
  detection: BehavioralDetectionResult,
  userId: string,
): (UserMemory | { memoryId: string; updates: Partial<UserMemory> })[] {
  if (!detection.patterns?.length) return [];

  return detection.patterns
    .filter((p) => p.confidence >= 0.5)
    .map((pattern) => {
      const memoryContent = `${pattern.pattern} — ${pattern.coachingImplication}`;

      // If this pattern already exists, return an update object
      if (pattern.existingMemoryId) {
        return {
          memoryId: pattern.existingMemoryId,
          updates: {
            content: memoryContent,
            metadata: {
              lastUsed: new Date(),
              importance:
                pattern.confidence >= 0.8 ? ("high" as const) : ("medium" as const),
            },
          },
        };
      }

      // Otherwise, return a new memory object
      return {
        memoryId: generateMemoryId(userId),
        userId,
        coachId: null,
        content: memoryContent,
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
      };
    }) as (UserMemory | { memoryId: string; updates: Partial<UserMemory> })[];
}
