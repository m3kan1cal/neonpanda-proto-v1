/**
 * Emotional Intelligence Module
 *
 * Extracts emotional snapshots from conversations, tracks trends,
 * and formats emotional context for prompt injection.
 *
 * Pipeline:
 *   conversation summary → extractEmotionalSnapshot() → DynamoDB
 *   per-message: load last 3-5 snapshots → formatEmotionalContextForPrompt()
 *   weekly: calculateEmotionalTrends() from snapshots → DynamoDB
 */

import { callBedrockApi, MODEL_IDS, TEMPERATURE_PRESETS } from "../api-helpers";
import { EMOTIONAL_SNAPSHOT_SCHEMA } from "../schemas/emotional-snapshot-schema";
import { EmotionalSnapshot, EmotionalTrend } from "./emotional-types";
import { logger } from "../logger";
import { fixDoubleEncodedProperties } from "../response-utils";

/**
 * Extract an emotional snapshot from a conversation summary.
 * Called after conversation summary generation (async, chained with episodic extraction).
 * Uses Haiku for efficient structured classification/scoring.
 */
export async function extractEmotionalSnapshot(
  conversationSummary: string,
  userId: string,
  coachId: string,
  conversationId: string,
): Promise<EmotionalSnapshot | null> {
  const systemPrompt = `You are analyzing a coaching conversation summary to assess the athlete's emotional state. Provide honest, calibrated scores — not everything is a 7/10.

SCORING GUIDELINES:
- 1-3: Concerning/low — user is struggling, disengaged, or in distress
- 4-5: Below average — noticeable issues but coping
- 6-7: Normal/good — typical healthy engagement
- 8-9: Excellent — notably positive, energized, or engaged
- 10: Exceptional — rare peak state

Be calibrated. Most conversations should land in the 5-7 range. Only use extremes for genuinely extreme states.

For stress, HIGHER = MORE STRESSED (inverse of other dimensions).`;

  const userPrompt = `CONVERSATION SUMMARY:
${conversationSummary}

Use the extract_emotional_snapshot tool to assess the athlete's emotional state during this conversation.`;

  try {
    const response = await callBedrockApi(
      systemPrompt,
      userPrompt,
      MODEL_IDS.EXECUTOR_MODEL_FULL, // Haiku for efficient classification
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: "extract_emotional_snapshot",
          description:
            "Extract emotional state snapshot from coaching conversation",
          inputSchema: EMOTIONAL_SNAPSHOT_SCHEMA,
        },
        expectedToolName: "extract_emotional_snapshot",
      },
    );

    if (typeof response === "string") {
      throw new Error("Expected tool use but received text response");
    }

    const fixedInput = fixDoubleEncodedProperties(response.input);
    const result = fixedInput as any;
    const now = new Date();

    const snapshot: EmotionalSnapshot = {
      snapshotId: `es_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      coachId,
      conversationId,
      timestamp: now.toISOString(),
      motivation: result.motivation,
      energy: result.energy,
      confidence: result.confidence,
      stress: result.stress,
      coachSatisfaction: result.coachSatisfaction,
      dominantEmotion: result.dominantEmotion,
      emotionalNarrative: result.emotionalNarrative,
      triggers: result.triggers || [],
      conversationTopics: result.conversationTopics || [],
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      timeOfDay:
        now.getHours() < 12
          ? "morning"
          : now.getHours() < 17
            ? "afternoon"
            : "evening",
    };

    logger.info("Emotional snapshot extracted:", {
      snapshotId: snapshot.snapshotId,
      dominantEmotion: snapshot.dominantEmotion,
      motivation: snapshot.motivation,
      stress: snapshot.stress,
    });

    return snapshot;
  } catch (error) {
    logger.error("Error extracting emotional snapshot:", error);
    return null;
  }
}

/**
 * Calculate emotional trends from a series of snapshots.
 * Called weekly by the memory lifecycle job (no AI — pure math).
 */
export function calculateEmotionalTrends(
  snapshots: EmotionalSnapshot[],
  period: "weekly" | "monthly",
): EmotionalTrend | null {
  if (snapshots.length < 2) return null;

  // Sort by timestamp
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Calculate averages
  const avg = (
    key: keyof Pick<
      EmotionalSnapshot,
      "motivation" | "energy" | "confidence" | "stress"
    >,
  ) => sorted.reduce((sum, s) => sum + s[key], 0) / sorted.length;

  const averages = {
    motivation: Math.round(avg("motivation") * 10) / 10,
    energy: Math.round(avg("energy") * 10) / 10,
    confidence: Math.round(avg("confidence") * 10) / 10,
    stress: Math.round(avg("stress") * 10) / 10,
  };

  // Calculate trends (compare first half vs second half)
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const getTrend = (
    key: keyof Pick<
      EmotionalSnapshot,
      "motivation" | "energy" | "confidence" | "stress"
    >,
  ) => {
    const firstAvg =
      firstHalf.reduce((sum, s) => sum + s[key], 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, s) => sum + s[key], 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    if (diff > 0.5) return "rising" as const;
    if (diff < -0.5) return "declining" as const;
    return "stable" as const;
  };

  return {
    userId: first.userId,
    period,
    periodStart: first.timestamp,
    periodEnd: last.timestamp,
    averages,
    trend: {
      motivation: getTrend("motivation"),
      energy: getTrend("energy"),
      confidence: getTrend("confidence"),
      stress: getTrend("stress"),
    },
    patterns: [], // Populated by AI in weekly pattern detection
    insights: [], // Populated by AI in weekly pattern detection
  };
}

/**
 * Format emotional context for prompt injection.
 * Takes recent snapshots + latest trend and produces coaching-oriented guidance.
 */
export function formatEmotionalContextForPrompt(
  recentSnapshots: EmotionalSnapshot[],
  trend?: EmotionalTrend | null,
): string {
  if (recentSnapshots.length === 0) return "";

  const latest = recentSnapshots[0]; // Most recent first
  const sections: string[] = [
    `# EMOTIONAL CONTEXT
_Use this to read the room and adapt your tone. Don't mention these metrics directly._`,
  ];

  // Latest emotional state
  sections.push(`## Current State
${latest.emotionalNarrative}
- Mood: ${latest.dominantEmotion} | Motivation: ${latest.motivation}/10 | Energy: ${latest.energy}/10 | Stress: ${latest.stress}/10`);

  // Trend if available
  if (trend) {
    const trendSignals: string[] = [];
    if (trend.trend.motivation === "declining")
      trendSignals.push("motivation declining");
    if (trend.trend.motivation === "rising")
      trendSignals.push("motivation rising");
    if (trend.trend.stress === "rising") trendSignals.push("stress increasing");
    if (trend.trend.confidence === "declining")
      trendSignals.push("confidence dropping");
    if (trend.trend.energy === "declining")
      trendSignals.push("energy declining");

    if (trendSignals.length > 0) {
      sections.push(`## Recent Trends\n⚠️ ${trendSignals.join(", ")}`);
    }
  }

  // Coaching adaptation hints
  if (latest.stress >= 7) {
    sections.push(
      "## Coaching Hint\n→ High stress detected. Consider lighter check-in, emphasize recovery.",
    );
  } else if (latest.motivation <= 3) {
    sections.push(
      "## Coaching Hint\n→ Low motivation. Focus on small wins and intrinsic rewards, not pushing harder.",
    );
  } else if (latest.confidence >= 8 && latest.motivation >= 8) {
    sections.push(
      "## Coaching Hint\n→ User is in a great headspace. Good time for challenges or new goals.",
    );
  }

  return sections.join("\n\n");
}

/**
 * Determine if the coach should be alerted about concerning emotional patterns.
 * Threshold-based rules (no AI needed).
 */
export function shouldAlertCoach(recentSnapshots: EmotionalSnapshot[]): {
  shouldAlert: boolean;
  reason?: string;
} {
  if (recentSnapshots.length < 2) return { shouldAlert: false };

  // Check for sustained low motivation (3+ consecutive sessions)
  const lowMotivation = recentSnapshots
    .slice(0, 3)
    .every((s) => s.motivation <= 3);
  if (lowMotivation) {
    return {
      shouldAlert: true,
      reason: "Sustained low motivation across last 3 sessions",
    };
  }

  // Check for stress spike
  if (recentSnapshots[0].stress >= 9) {
    return {
      shouldAlert: true,
      reason: "Extreme stress level detected in latest session",
    };
  }

  // Check for declining satisfaction
  if (recentSnapshots.length >= 3) {
    const satisfactionTrend = recentSnapshots
      .slice(0, 3)
      .map((s) => s.coachSatisfaction);
    if (
      satisfactionTrend.every((s, i) => i === 0 || s < satisfactionTrend[i - 1])
    ) {
      return {
        shouldAlert: true,
        reason: "Coach satisfaction has been declining for 3 sessions",
      };
    }
  }

  return { shouldAlert: false };
}
