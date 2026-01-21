/**
 * AI-powered duration normalization fallback
 * Uses tool config for structured JSON output - more reliable than text parsing
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";

/**
 * Schema for the normalize_duration tool response
 */
const DURATION_NORMALIZATION_SCHEMA = {
  type: "object" as const,
  properties: {
    normalizedDuration: {
      type: "string",
      description:
        "The normalized duration in format 'N weeks', 'N days', or 'N months' where N is a number",
    },
    originalInterpretation: {
      type: "string",
      description: "Brief explanation of how the input was interpreted",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "Confidence level in the normalization",
    },
  },
  required: ["normalizedDuration", "confidence"],
};

export interface DurationNormalizationResult {
  normalizedDuration: string;
  originalInterpretation?: string;
  confidence: "high" | "medium" | "low";
}

export async function normalizeDuration(
  rawValue: string,
  conversationContext?: string,
): Promise<DurationNormalizationResult> {
  const systemPrompt = `You are a duration normalizer for fitness training programs. Convert vague duration descriptions to standard format.

RULES:
- normalizedDuration MUST contain a number (e.g., "4 weeks", "30 days", "2 months")
- Prefer "weeks" for most fitness programs
- If truly ambiguous, default to "8 weeks"

EXAMPLES:
- "couple weeks" → "2 weeks" (high confidence)
- "a few weeks" → "3 weeks" (high confidence)
- "about a month" → "4 weeks" (high confidence)
- "6-8 weeks" → "7 weeks" (medium confidence - averaged range)
- "not too long" → "4 weeks" (low confidence - ambiguous)
- "until my race" → "8 weeks" (low confidence - no duration specified)`;

  const userMessage = conversationContext
    ? `Normalize this duration: "${rawValue}"\n\nContext: ${conversationContext}`
    : `Normalize this duration: "${rawValue}"`;

  try {
    const result = await callBedrockApi(
      systemPrompt,
      userMessage,
      MODEL_IDS.CONTEXTUAL_MODEL_FULL, // Nova 2 Lite - fast and cheap
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "normalize_duration",
          description: "Return the normalized duration in a structured format",
          inputSchema: DURATION_NORMALIZATION_SCHEMA,
        },
        expectedToolName: "normalize_duration",
      },
    );

    // Standard pattern for tool result extraction (see api-helpers.ts)
    if (result && typeof result === "object" && result.input) {
      const toolResult = result.input as DurationNormalizationResult;

      console.info("📅 AI normalized duration (tool response):", {
        input: rawValue,
        output: toolResult.normalizedDuration,
        confidence: toolResult.confidence,
        interpretation: toolResult.originalInterpretation,
      });

      return toolResult;
    }

    // Fallback if tool wasn't used properly
    console.warn("⚠️ Tool response not in expected format, using default");
    return {
      normalizedDuration: "8 weeks",
      confidence: "low",
      originalInterpretation: "Fallback - unexpected response format",
    };
  } catch (error) {
    console.error("❌ AI normalization failed:", error);
    return {
      normalizedDuration: "8 weeks",
      confidence: "low",
      originalInterpretation: `Fallback - error: ${error}`,
    };
  }
}
