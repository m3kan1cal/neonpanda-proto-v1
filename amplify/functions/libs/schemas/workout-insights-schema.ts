/**
 * Workout Insights Schema - Bedrock Tool Config
 *
 * Defines the structured output schema for the build-workout-analysis Lambda.
 * Used with Haiku 4.5 to generate per-workout AI insights comparing the
 * current workout against recent training history.
 */

import type { BedrockToolConfig } from "../api-helpers";

export const WORKOUT_INSIGHTS_TOOL: BedrockToolConfig = {
  name: "generate_workout_insights",
  description:
    "Generate post-workout analysis insights comparing this workout to recent training history. " +
    "Provide concise, specific observations grounded in the data. Avoid generic advice.",
  inputSchema: {
    type: "object",
    required: ["performance_comparison", "recovery_impact", "coach_note"],
    properties: {
      performance_comparison: {
        type: "string",
        description:
          "1-2 sentences comparing this workout to recent sessions. " +
          "Reference specific metrics where available (volume changes, intensity trends, duration patterns). " +
          "Example: 'Total volume up 12% vs last week with heavier working sets across all compound lifts.'",
      },
      achievements: {
        type: "string",
        description:
          "PR highlights or milestone recognition. Use null if no notable achievements. " +
          "Be specific about what was achieved. " +
          "Example: 'New 3RM on back squat at 315lbs, up 10lbs from previous best.'",
      },
      scaling_analysis: {
        type: "string",
        description:
          "For template-based workouts only: how well the athlete followed the prescription. " +
          "Use null if the workout was not from a training program template. " +
          "Reference adherence score and specific modifications if available.",
      },
      recovery_impact: {
        type: "string",
        description:
          "1 sentence about recovery impact based on this workout's intensity combined with recent training load. " +
          "Consider training frequency and volume trends. " +
          "Example: 'Third heavy session this week — consider lighter recovery work tomorrow.'",
      },
      coach_note: {
        type: "string",
        description:
          "Brief (1 sentence) motivational or coaching observation. " +
          "Be specific and personal based on the actual workout data, not generic. " +
          "Example: 'Consistent progression on Olympic lifts — the technique work is paying off.'",
      },
    },
  },
};

/**
 * System prompt for the workout insights generation.
 * Provides context about the athlete training platform and expected output quality.
 */
import { buildTemporalContext } from "../analytics/temporal-context";

export const getWorkoutInsightsPrompt = (
  workoutSummary: string,
  workoutDiscipline: string,
  recentWorkoutSummaries: string[],
  templateComparison?: {
    wasScaled: boolean;
    modifications: string[];
    adherenceScore: number;
    analysisConfidence: number;
  },
  userTimezone?: string,
): string => {
  const hasTemplateContext = !!templateComparison;
  const recentContext =
    recentWorkoutSummaries.length > 0
      ? recentWorkoutSummaries.map((s, i) => `  ${i + 1}. ${s}`).join("\n")
      : "  No recent workout history available.";

  const temporal = buildTemporalContext({ userTimezone });

  return `${temporal.promptBlock}

You are analyzing a ${workoutDiscipline} workout for an athlete training platform.
Generate concise, data-driven insights comparing this workout to the athlete's recent training history.

## Current Workout
${workoutSummary}

## Recent Workout History (most recent first)
${recentContext}

${
  hasTemplateContext
    ? `## Template Comparison
This workout was from a training program template.
- Was scaled: ${templateComparison.wasScaled}
- Modifications: ${templateComparison.modifications.length > 0 ? templateComparison.modifications.join(", ") : "None"}
- Adherence score: ${(templateComparison.adherenceScore * 100).toFixed(0)}%
- Analysis confidence: ${(templateComparison.analysisConfidence * 100).toFixed(0)}%`
    : ""
}

## Guidelines
- Be specific and reference actual data from the workout
- Keep each field to 1-2 sentences maximum
- If this is the athlete's first workout (no history), focus on establishing a baseline
- Set achievements to null if there are no notable PRs or milestones
- Set scaling_analysis to null if this workout was NOT from a training program template
- Avoid generic advice — every insight should be grounded in the specific workout data`;
};
