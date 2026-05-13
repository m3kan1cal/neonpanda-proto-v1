/**
 * Program Insights Schema - Bedrock Tool Config
 *
 * Defines the structured output schema for the build-program-insights Lambda.
 * Used with Haiku 4.5 to synthesize an evolving view of how the athlete is
 * progressing through their training program, drawing from per-workout
 * insights, weekly analytics, memories, and the living profile.
 */

import type { BedrockToolConfig } from "../api-helpers";
import { buildTemporalContext } from "../analytics/temporal-context";

export const PROGRAM_INSIGHTS_TOOL: BedrockToolConfig = {
  name: "generate_program_insights",
  description:
    "Synthesize a structured snapshot of how the athlete is progressing through this training program. " +
    "Compose pre-digested signals (per-workout insights, weekly analytics actionable_insights) rather than re-deriving from raw data. " +
    "Be specific, data-grounded, and avoid generic advice. Set optional string fields to null when the signal is weak or absent.",
  inputSchema: {
    type: "object",
    required: [
      "adherence_trend",
      "goal_progress",
      "phase_progress",
      "risk_flags",
      "coach_recommendation",
      "coach_note",
    ],
    properties: {
      adherence_trend: {
        type: "string",
        description:
          "1-2 sentences on completion rate, scaling patterns, and missed days across the program window. " +
          "Reference numbers when available. " +
          "Example: 'Completed 8 of 10 scheduled sessions plus 3 ad-hoc workouts; scaling on conditioning days is decreasing.'",
      },
      goal_progress: {
        type: "array",
        description:
          "Status of each tracked training goal (max 3). Each entry includes the goal, a status, and one-sentence evidence grounded in the data.",
        items: {
          type: "object",
          required: ["goal", "status", "evidence"],
          properties: {
            goal: { type: "string" },
            status: {
              type: "string",
              enum: ["on_track", "ahead", "behind", "unclear"],
            },
            evidence: { type: "string" },
          },
        },
      },
      exercise_pr_trends: {
        type: "string",
        description:
          "1-2 sentences on PRs and strength/skill trajectory observed across program-linked workouts. " +
          "Set to null if there is no notable trend yet.",
      },
      memory_signals: {
        type: "string",
        description:
          "Notable themes from recent memories that affect the program (motivation, injury, life stress, schedule changes). " +
          "Set to null if there are no relevant signals.",
      },
      living_profile_shifts: {
        type: "string",
        description:
          "Meaningful changes in the athlete's living profile since the program started (e.g., shifted goals, new identity narrative, recovery patterns). " +
          "Set to null if no meaningful shifts.",
      },
      phase_progress: {
        type: "object",
        required: ["current_phase", "on_pace", "notes"],
        description: "Pace and notes about the program's current phase.",
        properties: {
          current_phase: {
            type: "string",
            description:
              "Name of the current phase, or 'Not currently in a phase' if the program has no phases or the day is outside the defined phase range.",
          },
          on_pace: {
            type: "boolean",
            description:
              "True if the athlete is on pace for the phase's objectives based on adherence + performance signals.",
          },
          notes: {
            type: "string",
            description: "1 sentence explaining the pace assessment.",
          },
        },
      },
      risk_flags: {
        type: "array",
        description:
          "Risk signals worth surfacing (max 3). Return an empty array if there are no concerns.",
        items: {
          type: "object",
          required: ["type", "note"],
          properties: {
            type: {
              type: "string",
              enum: [
                "overtraining",
                "underrecovery",
                "plateau",
                "adherence_drop",
                "injury_signal",
              ],
            },
            note: { type: "string" },
          },
        },
      },
      coach_recommendation: {
        type: "string",
        description:
          "1-2 sentences with a concrete next action grounded in this synthesis. Avoid generic advice.",
      },
      coach_note: {
        type: "string",
        description:
          "Warm narrative summary, 2-3 sentences, in the athlete-facing coach voice. " +
          "Reference specific moments or trends from the data. Avoid platitudes.",
      },
    },
  },
};

export interface ProgramInsightsPromptInputs {
  programSnapshot: string;
  programLinkedWorkouts: string;
  adHocWorkouts: string;
  weeklyAnalytics: string;
  memories: string;
  livingProfile: string;
  userTimezone?: string;
}

/**
 * System prompt for the program insights generation.
 * Composes the structured context blocks into a single prompt that asks the
 * model to call generate_program_insights.
 */
export const getProgramInsightsPrompt = (
  inputs: ProgramInsightsPromptInputs,
): string => {
  const temporal = buildTemporalContext({ userTimezone: inputs.userTimezone });

  return `${temporal.promptBlock}

You are synthesizing the athlete's progress through a training program for an AI fitness coaching platform.
Your output drives the "Program Insights" panel on the athlete's program dashboard.

Compose your synthesis from these pre-digested signals; do not re-derive observations from raw data when a per-workout insight or weekly analytics field already addresses it.

## Program
${inputs.programSnapshot}

## Program-linked workouts (most recent first)
${inputs.programLinkedWorkouts}

## Ad-hoc workouts logged during this program (most recent first)
${inputs.adHocWorkouts}

## Recent weekly analytics (most recent first)
${inputs.weeklyAnalytics}

## Recent memories
${inputs.memories}

## Living profile
${inputs.livingProfile}

## Guidelines
- Ground every observation in specific data from the context above.
- Treat program-linked and ad-hoc workouts as distinct signals: program-linked speaks to plan adherence, ad-hoc speaks to additional self-directed training.
- Keep arrays bounded (goal_progress ≤ 3, risk_flags ≤ 3). If no risk flags apply, return an empty array.
- Set optional string fields (exercise_pr_trends, memory_signals, living_profile_shifts) to null when the signal is weak or absent.
- coach_note must be warm and athlete-facing, 2-3 sentences, referencing specific evidence.
- Output via the generate_program_insights tool. Do not write free-form prose outside the tool call.`;
};
