/**
 * Analytics Sub-task Schemas
 *
 * Focused BedrockToolConfig objects derived from STRUCTURED_ANALYTICS_SCHEMA.
 * Each schema covers a logical subset of the full analytics output, enabling
 * parallel Bedrock calls that are smaller, faster, and more likely to call
 * the tool correctly (avoiding the text-fallback failure mode of the
 * monolithic schema).
 *
 * Sub-task layout:
 *   STEP_1 - Volume Analysis:       metadata, volume_breakdown, raw_aggregations, data_quality_report
 *   STEP_2 - Progression Analysis:  weekly_progression, performance_markers, movement_analysis, fatigue_management
 *   STEP_3 - Intelligence Analysis: training_intelligence, coaching_synthesis, actionable_insights
 *   STEP_4 - Human Summary:         human_summary (runs after the three structured steps are assembled)
 */

import type { BedrockToolConfig } from "../api-helpers";

// ---------------------------------------------------------------------------
// Tool name constants -- use these everywhere instead of bare string literals
// ---------------------------------------------------------------------------

export const ANALYTICS_SUBTASK_TOOLS = {
  VOLUME_ANALYSIS: "analyze_volume",
  PROGRESSION_ANALYSIS: "analyze_progression",
  INTELLIGENCE_ANALYSIS: "analyze_intelligence",
  HUMAN_SUMMARY: "generate_human_summary",
} as const;

// ---------------------------------------------------------------------------
// Step 1 -- Volume Analysis Tool
// Sections: metadata, volume_breakdown, raw_aggregations, data_quality_report
// ---------------------------------------------------------------------------

export const VOLUME_ANALYSIS_TOOL: BedrockToolConfig = {
  name: ANALYTICS_SUBTASK_TOOLS.VOLUME_ANALYSIS,
  description:
    "Analyze training volume data and return structured volume metrics, daily raw aggregations, and a data quality report.",
  inputSchema: {
    type: "object",
    required: [
      "metadata",
      "volume_breakdown",
      "raw_aggregations",
      "data_quality_report",
    ],
    properties: {
      metadata: {
        type: "object",
        description: "Period identification and high-level quality indicators.",
        required: [
          "week_id",
          "date_range",
          "sessions_completed",
          "sessions_planned",
          "data_completeness",
          "analysis_confidence",
        ],
        properties: {
          week_id: {
            type: "string",
            description:
              "Period identifier. ISO week format for weekly (e.g. '2025-W32') or YYYY-MM for monthly (e.g. '2025-08').",
          },
          date_range: {
            type: "object",
            required: ["start", "end"],
            properties: {
              start: {
                type: "string",
                description: "Period start date in YYYY-MM-DD format.",
              },
              end: {
                type: "string",
                description: "Period end date in YYYY-MM-DD format.",
              },
            },
          },
          sessions_completed: {
            type: "number",
            description:
              "Number of workouts the athlete actually completed during this period.",
          },
          sessions_planned: {
            type: "number",
            description:
              "Number of workouts scheduled. Use program target if known, otherwise match sessions_completed.",
          },
          data_completeness: {
            type: "number",
            description: "Fraction of expected data present, 0.0 to 1.0.",
          },
          analysis_confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description:
              "'high' = complete consistent data; 'medium' = some fields missing; 'low' = sparse or contradictory data.",
          },
        },
      },
      volume_breakdown: {
        type: "object",
        description:
          "Detailed breakdown of training volume. working_sets excludes warm-up volume. Invariant: quality_reps + failed_reps + assisted_reps + partial_reps = working_sets.total_reps.",
        required: ["working_sets", "by_movement_detail"],
        properties: {
          working_sets: {
            type: "object",
            required: [
              "total_tonnage",
              "total_reps",
              "total_sets",
              "quality_reps",
              "failed_reps",
              "assisted_reps",
              "partial_reps",
            ],
            properties: {
              total_tonnage: {
                type: "number",
                description: "Total lbs lifted across all working sets.",
              },
              total_reps: {
                type: "number",
                description:
                  "Total reps. Must equal quality + failed + assisted + partial reps.",
              },
              total_sets: {
                type: "number",
                description:
                  "Total number of working sets. Must equal the sum of by_movement_detail[].sets. " +
                  "For AMRAP and circuit workouts, count each movement-round combination as one set " +
                  "(e.g. 7 rounds × 3 movements = 21 sets). Use this same counting convention in both " +
                  "working_sets.total_sets and by_movement_detail[].sets so the numbers are always consistent.",
              },
              quality_reps: {
                type: "number",
                description: "Full ROM, no-failure reps.",
              },
              failed_reps: {
                type: "number",
                description: "Failed reps. Count as 0.5 toward tonnage.",
              },
              assisted_reps: {
                type: "number",
                description: "Assisted reps. Reduce load proportionally.",
              },
              partial_reps: {
                type: "number",
                description: "Partial ROM reps. Adjust tonnage multiplier.",
              },
            },
          },
          warm_up_volume: {
            type: "number",
            description:
              "Tonnage from warm-up sets only. Excluded from working_sets.",
          },
          skill_work_time: {
            type: "number",
            description: "Seconds spent on skill/technique work.",
          },
          conditioning_work: {
            type: "object",
            properties: {
              time_domain: {
                type: "number",
                description: "Total conditioning time in seconds.",
              },
              work_capacity: {
                type: "string",
                description: "Qualitative: 'high', 'moderate', or 'low'.",
              },
            },
          },
          by_movement_detail: {
            type: "array",
            description:
              "Per-movement volume. Sum of tonnage must approximate working_sets.total_tonnage within 10%.",
            items: {
              type: "object",
              required: ["movement", "tonnage", "sets", "reps"],
              properties: {
                movement: {
                  type: "string",
                  description:
                    "Movement name in snake_case (e.g. 'back_squat').",
                },
                tonnage: {
                  type: "number",
                  description: "Total tonnage for this movement in lbs.",
                },
                sets: {
                  type: "number",
                  description: "Number of working sets.",
                },
                reps: {
                  type: "number",
                  description: "Total reps across all sets.",
                },
                avg_intensity: {
                  type: ["number", "null"],
                  description: "Average % of 1RM (0-100). Null if unknown.",
                },
              },
            },
          },
        },
      },
      raw_aggregations: {
        type: "object",
        description: "Raw per-day data within the period.",
        required: ["daily_volume"],
        properties: {
          daily_volume: {
            type: "array",
            description:
              "One entry per calendar day in the period range, including rest days. All dates must be within metadata.date_range.",
            items: {
              type: "object",
              required: ["date", "tonnage", "sets", "workout_count"],
              properties: {
                date: {
                  type: "string",
                  description:
                    "YYYY-MM-DD. Must be within metadata.date_range.",
                },
                tonnage: {
                  type: "number",
                  description:
                    "Total working tonnage for this date. 0 if no workouts.",
                },
                sets: {
                  type: "number",
                  description:
                    "Total working sets for this date. 0 if no workouts.",
                },
                duration: {
                  type: ["number", "null"],
                  description:
                    "Total workout duration in minutes. Null if not tracked.",
                },
                avg_rpe: {
                  type: ["number", "null"],
                  description:
                    "Average RPE (1-10) across workouts on this date. Null if not logged.",
                },
                avg_intensity: {
                  type: ["number", "null"],
                  description:
                    "Average % of 1RM on this date. Null if unavailable.",
                },
                workout_count: {
                  type: "number",
                  description: "Completed workouts on this date. Integer ≥ 0.",
                },
                primary_workout_id: {
                  type: ["string", "null"],
                  description:
                    "Exact workout_id string from source data for the first workout on this date. Copy verbatim -- never generate an ID. Null if no workouts.",
                },
              },
            },
          },
          movement_matrix: {
            type: "array",
            description:
              "Two-element array: [movement_name_array, volume_array]. Ordered by descending volume.",
          },
          session_summaries: {
            type: "array",
            description:
              "Per-session summaries. Each entry: { date, type ('strength'|'conditioning'|'mixed'|'skill'), focus, quality ('excellent'|'good'|'average'|'poor') }.",
          },
        },
      },
      data_quality_report: {
        type: "object",
        description:
          "Catalogue of data quality issues encountered during analysis.",
        properties: {
          missing_critical_data: {
            type: "array",
            description: "Fields or workouts where essential data was absent.",
          },
          inconsistent_data: {
            type: "array",
            description: "Values that appear contradictory or implausible.",
          },
          data_entry_errors: {
            type: "array",
            description: "Likely logging mistakes.",
          },
          improvement_suggestions: {
            type: "array",
            description: "Recommendations for improving future data quality.",
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Step 2 -- Progression Analysis Tool
// Sections: weekly_progression, performance_markers, movement_analysis, fatigue_management
// ---------------------------------------------------------------------------

export const PROGRESSION_ANALYSIS_TOOL: BedrockToolConfig = {
  name: ANALYTICS_SUBTASK_TOOLS.PROGRESSION_ANALYSIS,
  description:
    "Analyze period-over-period progression, performance markers, movement pattern balance, and fatigue/recovery status.",
  inputSchema: {
    type: "object",
    required: ["weekly_progression", "movement_analysis", "fatigue_management"],
    properties: {
      weekly_progression: {
        type: "object",
        description:
          "Period-over-period progression analysis comparing to the most recent prior period.",
        required: ["progressive_overload_score"],
        properties: {
          vs_last_week: {
            type: "object",
            description:
              "Comparison to the immediately preceding period. Include volume_change (fractional delta), intensity_change, exercise_overlap (0-1), and performance_delta (improved/maintained/decreased lists).",
          },
          four_week_trend: {
            type: "object",
            description:
              "Rolling 4-period trend. Include volume_trend ('steadily_increasing'|'plateauing'|'decreasing'|'variable'), intensity_trend, and phase_detected ('accumulation'|'intensification'|'realization'|'deload'|'testing').",
          },
          progressive_overload_score: {
            type: "number",
            description:
              "Overall progressive overload quality score from 0 (no progression) to 10 (excellent). Penalise deload weeks and volume drops.",
          },
        },
      },
      performance_markers: {
        type: "object",
        description:
          "Notable performance achievements and competitive readiness indicators.",
        properties: {
          records_set: {
            type: "array",
            description:
              "PRs or notable bests set this period. Each entry: { exercise, previous_best, new_best, improvement_type ('weight_pr'|'rep_pr'|'time_pr'), significance ('major'|'minor') }.",
          },
          benchmark_wods: {
            type: "array",
            description:
              "Named benchmark workouts completed. Include score and comparison to previous attempts.",
          },
          competition_readiness: {
            description:
              "Null if not applicable. Otherwise: { readiness_score (0-10), upcoming_event, notes }.",
          },
        },
      },
      movement_analysis: {
        type: "object",
        description:
          "Movement pattern frequency, balance, and identified imbalances.",
        required: ["pattern_balance"],
        properties: {
          frequency_map: {
            type: "object",
            description:
              "Movement name to number of sessions it appeared in (e.g. { 'deadlift': 3 }).",
          },
          pattern_balance: {
            type: "object",
            description:
              "Volume and frequency by fundamental movement pattern: squat, hinge, push, pull, carry, core. Each: { volume: number, frequency: number }.",
          },
          imbalance_flags: {
            type: "array",
            items: { type: "string" },
            description:
              "Identified imbalances (e.g. 'pull_volume_low_vs_push'). Empty array if balanced.",
          },
          body_part_frequency: {
            type: "object",
            description:
              "Working sets per body part: legs, chest, back, shoulders, arms, core.",
          },
        },
      },
      fatigue_management: {
        type: "object",
        description:
          "Fatigue and recovery status. Determines if volume/intensity adjustments are needed.",
        required: ["recovery_score", "suggested_action"],
        properties: {
          acute_chronic_ratio: {
            type: "number",
            description:
              "ACWR. Optimal: 0.8-1.3. Above 1.5 = overreaching risk. Below 0.6 = undertraining.",
          },
          volume_spike: {
            type: "boolean",
            description:
              "True if volume increased more than 10% above the 4-period rolling average.",
          },
          deload_indicators: {
            type: "object",
            description:
              "Boolean flags: performance_decline, high_failure_rate, elevated_rpe, coach_notes_mention_fatigue.",
          },
          recovery_score: {
            type: "number",
            description:
              "Overall recovery quality 1-10. Consider ACWR, deload indicators, RPE, and coach notes.",
          },
          suggested_action: {
            type: "string",
            description:
              "One of: 'increase' (undertrained/recovering), 'maintain' (on track), 'reduce' (mild fatigue), 'deload' (significant fatigue).",
          },
          muscle_group_fatigue: {
            type: "object",
            description:
              "most_worked: body parts with highest volume. needs_recovery: body parts showing fatigue.",
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Step 3 -- Intelligence Analysis Tool
// Sections: training_intelligence, coaching_synthesis, actionable_insights
// ---------------------------------------------------------------------------

export const INTELLIGENCE_ANALYSIS_TOOL: BedrockToolConfig = {
  name: ANALYTICS_SUBTASK_TOOLS.INTELLIGENCE_ANALYSIS,
  description:
    "Analyze training structure efficiency, synthesize coaching insights, and generate prioritised actionable recommendations.",
  inputSchema: {
    type: "object",
    required: ["actionable_insights"],
    properties: {
      training_intelligence: {
        type: "object",
        description:
          "Advanced analysis of training structure, pacing, and efficiency.",
        properties: {
          set_performance_analysis: {
            type: "object",
            description: "Rep/set quality analysis across all working sets.",
            properties: {
              average_reps_drop: {
                type: "number",
                description:
                  "Average decline in reps per set across all exercises (e.g. 2.3). Use 0 if no measurable decline.",
              },
              failure_rate: {
                type: "number",
                description:
                  "Fraction of sets containing at least one failed rep, from 0.0 to 1.0.",
              },
              optimal_set_range: {
                type: "string",
                description:
                  "Recommended working set range given current fatigue and performance (e.g. '3-5').",
              },
              rest_optimization: {
                type: "string",
                description:
                  "Recommendation for rest interval adjustment ('increase', 'maintain', or 'decrease').",
              },
            },
          },
          exercise_ordering: {
            type: "object",
            description:
              "Sequencing analysis: current_pattern (movement category order), performance_impact ('optimal'|'suboptimal'|'poor'), suggested_reorder (boolean).",
          },
          superset_efficiency: {
            description:
              "Null if no supersets detected. Otherwise an object rating superset quality and time savings.",
          },
          workout_pacing: {
            type: "object",
            description:
              "Session duration and density: avg_session_duration (minutes), work_to_rest_ratio (string), density_score (0-10).",
          },
        },
      },
      coaching_synthesis: {
        type: "object",
        description:
          "Qualitative insights from coach and athlete notes and conversation summaries.",
        properties: {
          technical_focus: {
            type: "object",
            description:
              "primary_cues: technique points being worked on. breakthrough_moments: notable achievements. persistent_issues: recurring problems.",
          },
          workout_feedback: {
            type: "object",
            description:
              "athlete_notes_summary: themes from athlete notes. coach_notes_summary: themes from coach observations. video_review_points: null if no video.",
          },
          adherence_analysis: {
            type: "object",
            description:
              "program_compliance: % of prescribed work completed (0-100). common_modifications: frequent substitutions. skipped_exercises: null if none.",
          },
        },
      },
      actionable_insights: {
        type: "object",
        description:
          "Prioritised, evidence-based recommendations. Every recommendation must cite specific data from this period.",
        required: ["top_priority", "quick_wins"],
        properties: {
          top_priority: {
            type: "object",
            description:
              "The single most important focus for the next training period.",
            required: [
              "insight",
              "data_support",
              "recommended_action",
              "expected_outcome",
            ],
            properties: {
              insight: {
                type: "string",
                description:
                  "One-sentence summary of the most important finding.",
              },
              data_support: {
                type: "string",
                description: "Specific metrics supporting this insight.",
              },
              recommended_action: {
                type: "string",
                description: "Concrete, specific action to take.",
              },
              expected_outcome: {
                type: "string",
                description: "Measurable outcome if the action is taken.",
              },
            },
          },
          quick_wins: {
            type: "array",
            items: { type: "string" },
            description:
              "2-4 low-effort, high-impact adjustments. Must be specific -- avoid vague suggestions.",
          },
          week_ahead_focus: {
            type: "object",
            description:
              "Guidance for next training period: primary_goal, exercises_to_push, exercises_to_maintain, exercises_to_recover, technical_priorities, volume_recommendation ('maintain'|'increase'|'reduce'), intensity_recommendation.",
          },
          red_flags: {
            description:
              "Null if no concerns. Otherwise a string or array describing injury risk, overtraining, or critical technique issues.",
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Step 4 -- Human Summary Tool
// Section: human_summary (generated after structured steps are assembled)
// ---------------------------------------------------------------------------

export const HUMAN_SUMMARY_TOOL: BedrockToolConfig = {
  name: ANALYTICS_SUBTASK_TOOLS.HUMAN_SUMMARY,
  description:
    "Generate a coach-friendly narrative summary of the training period, referencing the structured analytics provided.",
  inputSchema: {
    type: "object",
    required: ["human_summary"],
    properties: {
      human_summary: {
        type: "string",
        description:
          "Coach-friendly narrative. Must start with 'Weekly Training Summary' or 'Monthly Training Summary'. " +
          "Include: session completion stats with data quality note, key achievements (PRs, goal progress), " +
          "volume leaders by tonnage, training intelligence insights with specific metrics, areas for improvement, " +
          "and prioritised next steps with red flag assessment.",
      },
    },
  },
};
