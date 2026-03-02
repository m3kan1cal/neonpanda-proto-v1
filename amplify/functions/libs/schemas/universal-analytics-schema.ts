/**
 * Universal Analytics Schema v1.0 - Shared Schema Definition
 *
 * This module provides:
 *  - JSON Schema objects for Bedrock tool configs (ANALYTICS_GENERATION_TOOL,
 *    ANALYTICS_NORMALIZATION_TOOL) — these enforce output structure via tool use
 *  - UNIVERSAL_ANALYTICS_SCHEMA_V1 — a string example kept for reference/documentation
 *  - getAnalyticsSchemaWithContext — prompt instructions (no longer includes the schema
 *    example; schema enforcement is handled by the tool config)
 */

import type { BedrockToolConfig } from "../api-helpers";

// ---------------------------------------------------------------------------
// JSON Schema — structured_analytics object
// Used as inputSchema.structured_analytics in both tool configs
// ---------------------------------------------------------------------------
const STRUCTURED_ANALYTICS_SCHEMA = {
  type: "object",
  description:
    "Complete training analytics for a single period (week or month).",
  required: [
    "metadata",
    "volume_breakdown",
    "weekly_progression",
    "performance_markers",
    "training_intelligence",
    "movement_analysis",
    "fatigue_management",
    "coaching_synthesis",
    "actionable_insights",
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
            "Period identifier. Use ISO week format for weekly (e.g. '2025-W32') or YYYY-MM for monthly (e.g. '2025-08').",
        },
        date_range: {
          type: "object",
          description:
            "Inclusive start and end dates for the period in YYYY-MM-DD format. All daily_volume entries must fall within this range.",
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
            "Number of workouts the athlete was scheduled to complete. Use the program target if known, otherwise match sessions_completed.",
        },
        data_completeness: {
          type: "number",
          description:
            "Fraction of expected data present, from 0.0 (no data) to 1.0 (fully complete). Reduce for missing RPE, weights, or incomplete workout logs.",
        },
        analysis_confidence: {
          type: "string",
          description:
            "'high' when data is complete and consistent; 'medium' when some fields are missing or estimated; 'low' when data is sparse or contradictory.",
          enum: ["high", "medium", "low"],
        },
      },
    },
    volume_breakdown: {
      type: "object",
      description:
        "Detailed breakdown of training volume. working_sets excludes warm-up volume. Mathematical invariant: quality_reps + failed_reps + assisted_reps + partial_reps = working_sets.total_reps.",
      required: ["working_sets", "by_movement_detail"],
      properties: {
        working_sets: {
          type: "object",
          description:
            "Aggregate volume for all working (non-warm-up) sets. These values must be internally consistent and match the sum of by_movement_detail within 10% tolerance.",
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
              description:
                "Total weight lifted in lbs across all working sets (sets × reps × weight).",
            },
            total_reps: {
              type: "number",
              description:
                "Total reps across all working sets. Must equal quality_reps + failed_reps + assisted_reps + partial_reps.",
            },
            total_sets: {
              type: "number",
              description: "Total number of working sets completed.",
            },
            quality_reps: {
              type: "number",
              description:
                "Reps completed with full range of motion and no failure.",
            },
            failed_reps: {
              type: "number",
              description:
                "Reps where the athlete failed to complete the lift. Count as 0.5 toward tonnage.",
            },
            assisted_reps: {
              type: "number",
              description:
                "Reps completed with external assistance (spotter, bands). Reduce load proportionally for tonnage.",
            },
            partial_reps: {
              type: "number",
              description:
                "Reps completed with reduced range of motion. Adjust multiplier for tonnage based on depth.",
            },
          },
        },
        warm_up_volume: {
          type: "number",
          description:
            "Total tonnage from warm-up sets only. Excluded from working_sets calculations.",
        },
        skill_work_time: {
          type: "number",
          description:
            "Time in seconds spent on skill or technique work (gymnastics, Olympic lifting drills, etc.).",
        },
        conditioning_work: {
          type: "object",
          description:
            "Conditioning and metabolic work that does not fit the sets×reps×weight model.",
          properties: {
            time_domain: {
              type: "number",
              description: "Total conditioning time in seconds.",
            },
            work_capacity: {
              type: "string",
              description:
                "Qualitative assessment: 'high', 'moderate', or 'low'.",
            },
          },
        },
        by_movement_detail: {
          type: "array",
          description:
            "Per-movement volume breakdown. The sum of tonnage here should approximate working_sets.total_tonnage (within 10%). The sum of reps and sets must match working_sets exactly.",
          items: {
            type: "object",
            required: ["movement", "tonnage", "sets", "reps"],
            properties: {
              movement: {
                type: "string",
                description:
                  "Movement name using snake_case (e.g. 'back_squat', 'deadlift', 'pull_up').",
              },
              tonnage: {
                type: "number",
                description: "Total tonnage for this movement in lbs.",
              },
              sets: {
                type: "number",
                description: "Number of working sets for this movement.",
              },
              reps: {
                type: "number",
                description: "Total reps for this movement across all sets.",
              },
              avg_intensity: {
                type: ["number", "null"],
                description:
                  "Average intensity as a percentage of estimated 1RM (0–100). Null if 1RM is unknown.",
              },
            },
          },
        },
      },
    },
    weekly_progression: {
      type: "object",
      description:
        "Period-over-period progression analysis. Compare to the most recent prior period with comparable data.",
      required: ["progressive_overload_score"],
      properties: {
        vs_last_week: {
          type: "object",
          description:
            "Comparison to the immediately preceding period. Include volume_change (fractional delta, e.g. 0.12 = +12%), intensity_change, exercise_overlap (0–1), and performance_delta (improved/maintained/decreased movement lists).",
        },
        four_week_trend: {
          type: "object",
          description:
            "Rolling 4-period trend. Include volume_trend ('steadily_increasing', 'plateauing', 'decreasing', 'variable'), intensity_trend, and phase_detected ('accumulation', 'intensification', 'realization', 'deload', 'testing').",
        },
        progressive_overload_score: {
          type: "number",
          description:
            "Overall progressive overload quality score from 0 (no progression) to 10 (excellent, well-structured overload). Penalise for deload weeks, volume drops, or lack of week-over-week improvement.",
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
            "PRs or notable bests set this period. Each entry should include exercise, previous_best, new_best, improvement_type ('weight_pr', 'rep_pr', 'time_pr'), and significance ('major', 'minor').",
        },
        benchmark_wods: {
          type: "array",
          description:
            "Named benchmark workouts completed (e.g. 'Fran', 'Helen'). Include score and comparison to previous attempts.",
        },
        competition_readiness: {
          description:
            "Null if not applicable. Otherwise an object with readiness_score (0–10), upcoming_event, and notes.",
        },
      },
    },
    training_intelligence: {
      type: "object",
      description:
        "Advanced analysis of training structure, pacing, and efficiency.",
      properties: {
        set_performance_analysis: {
          type: "object",
          description:
            "Rep and set quality analysis. Include average_reps_drop (rep decline across sets), failure_rate (fraction of sets with failed reps), optimal_set_range, and rest_optimization recommendation.",
        },
        exercise_ordering: {
          type: "object",
          description:
            "Analysis of exercise sequencing. Include current_pattern (array of movement categories in order), performance_impact ('optimal', 'suboptimal', 'poor'), and suggested_reorder (boolean).",
        },
        superset_efficiency: {
          description:
            "Null if no supersets detected. Otherwise an object rating superset pairing quality and time savings.",
        },
        workout_pacing: {
          type: "object",
          description:
            "Session duration and density metrics. Include avg_session_duration (minutes), work_to_rest_ratio (string, e.g. '1:2.3'), and density_score (0–10).",
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
            "Map of movement name to number of sessions it appeared in this period (e.g. { 'deadlift': 3 }).",
        },
        pattern_balance: {
          type: "object",
          description:
            "Volume and frequency by fundamental movement pattern: squat, hinge, push, pull, carry, core. Each entry: { volume: number, frequency: number }.",
        },
        imbalance_flags: {
          type: "array",
          items: { type: "string" },
          description:
            "List of identified imbalances that warrant attention (e.g. 'pull_volume_low_vs_push', 'no_carry_work', 'posterior_chain_dominant'). Empty array if balanced.",
        },
        body_part_frequency: {
          type: "object",
          description:
            "Number of working sets targeting each body part: legs, chest, back, shoulders, arms, core.",
        },
      },
    },
    fatigue_management: {
      type: "object",
      description:
        "Fatigue and recovery status assessment. Used to determine if volume/intensity should be modified.",
      required: ["recovery_score", "suggested_action"],
      properties: {
        acute_chronic_ratio: {
          type: "number",
          description:
            "Acute:Chronic Workload Ratio (ACWR). Values 0.8–1.3 are optimal; above 1.5 indicates overreaching risk; below 0.6 indicates undertraining.",
        },
        volume_spike: {
          type: "boolean",
          description:
            "True if this period's volume increased more than 10% above the 4-period rolling average.",
        },
        deload_indicators: {
          type: "object",
          description:
            "Boolean flags for deload signals: performance_decline, high_failure_rate, elevated_rpe, coach_notes_mention_fatigue.",
        },
        recovery_score: {
          type: "number",
          description:
            "Overall recovery quality on a 1–10 scale. Consider ACWR, deload indicators, subjective RPE, and coach notes.",
        },
        suggested_action: {
          type: "string",
          description:
            "One of: 'increase' (athlete is undertrained/recovering well), 'maintain' (on track), 'reduce' (mild fatigue signals), 'deload' (significant fatigue or overreaching risk).",
        },
        muscle_group_fatigue: {
          type: "object",
          description:
            "most_worked: array of body parts with highest volume. needs_recovery: array of body parts showing fatigue indicators.",
        },
      },
    },
    coaching_synthesis: {
      type: "object",
      description:
        "Qualitative insights drawn from coach and athlete notes and conversation summaries.",
      properties: {
        technical_focus: {
          type: "object",
          description:
            "primary_cues: key technique points currently being worked on. breakthrough_moments: notable technical achievements. persistent_issues: recurring problems to address.",
        },
        workout_feedback: {
          type: "object",
          description:
            "athlete_notes_summary: themes from athlete-logged notes. coach_notes_summary: themes from coach observations. video_review_points: null if no video review.",
        },
        adherence_analysis: {
          type: "object",
          description:
            "program_compliance: percentage of prescribed work completed (0–100). common_modifications: list of frequent substitutions. skipped_exercises: null if none.",
        },
      },
    },
    actionable_insights: {
      type: "object",
      description:
        "Prioritised, evidence-based recommendations for the athlete and coach. Every recommendation must cite specific data from this period.",
      required: ["top_priority", "quick_wins"],
      properties: {
        top_priority: {
          type: "object",
          description:
            "The single most important focus for the next training period, supported by data.",
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
              description:
                "Specific metrics that support this insight (e.g. 'Current max 275x3, progression rate 2.5% weekly over 4 weeks').",
            },
            recommended_action: {
              type: "string",
              description:
                "Concrete, specific action to take (e.g. 'Increase deadlift weight by 5–10 lbs next session').",
            },
            expected_outcome: {
              type: "string",
              description:
                "Measurable outcome if the action is taken (e.g. '315 lb goal achievable in 4–6 weeks').",
            },
          },
        },
        quick_wins: {
          type: "array",
          items: { type: "string" },
          description:
            "2–4 low-effort, high-impact adjustments that can be made immediately. Must be specific and actionable — avoid vague suggestions like 'improve technique'.",
        },
        week_ahead_focus: {
          type: "object",
          description:
            "Guidance for structuring the next training period. Include primary_goal, exercises_to_push, exercises_to_maintain, exercises_to_recover, technical_priorities, volume_recommendation ('maintain', 'increase', 'reduce'), and intensity_recommendation.",
        },
        red_flags: {
          description:
            "Null if no concerns. Otherwise a string or array describing injury risk, overtraining signs, or critical technique issues requiring immediate attention.",
        },
      },
    },
    raw_aggregations: {
      type: "object",
      description:
        "Raw per-day data used to construct the aggregated analytics above.",
      required: ["daily_volume"],
      properties: {
        daily_volume: {
          type: "array",
          description:
            "One entry per calendar day within the period's date_range, including days with no workouts. All dates must be within metadata.date_range.",
          items: {
            type: "object",
            required: ["date", "tonnage", "sets", "workout_count"],
            properties: {
              date: {
                type: "string",
                description:
                  "Calendar date in YYYY-MM-DD format. Must be within metadata.date_range.",
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
                  "Total workout duration in minutes for this date. Null if not tracked.",
              },
              avg_rpe: {
                type: ["number", "null"],
                description:
                  "Average perceived exertion (1–10 scale) across all workouts on this date. Null if RPE was not logged.",
              },
              avg_intensity: {
                type: ["number", "null"],
                description:
                  "Average intensity as a percentage of 1RM across all workouts on this date. Null if intensity data is unavailable.",
              },
              workout_count: {
                type: "number",
                description:
                  "Number of completed workouts on this date. Must be an integer ≥ 0. Days with no workouts must appear with workout_count: 0.",
              },
              primary_workout_id: {
                type: ["string", "null"],
                description:
                  "The exact workout_id string from the source data for the first chronologically completed workout on this date (e.g. 'workout_userId_1234567890_abc123'). Copy the value verbatim — never generate or invent a workout ID. Null if no workouts on this date.",
              },
            },
          },
        },
        movement_matrix: {
          type: "array",
          description:
            "Two-element array: [movement_name_array, volume_array]. E.g. [['deadlift', 'squat'], [4950, 4125]]. Ordered by descending volume.",
        },
        session_summaries: {
          type: "array",
          description:
            "Brief per-session summaries. Each entry: { date, type ('strength', 'conditioning', 'mixed', 'skill'), focus, quality ('excellent', 'good', 'average', 'poor') }.",
        },
      },
    },
    data_quality_report: {
      type: "object",
      description:
        "Catalogue of data quality issues encountered during analysis. Use this to communicate gaps to the athlete and coach.",
      properties: {
        missing_critical_data: {
          type: "array",
          description:
            "Fields or workouts where essential data (weight, reps, date) was absent.",
        },
        inconsistent_data: {
          type: "array",
          description:
            "Values that appear contradictory or implausible (e.g. tonnage spikes >20% above recent history).",
        },
        data_entry_errors: {
          type: "array",
          description:
            "Likely logging mistakes (e.g. weight entered in kg instead of lbs, duplicate entries).",
        },
        improvement_suggestions: {
          type: "array",
          description:
            "Recommendations for improving future data quality (e.g. 'Log RPE after each session').",
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Tool configs
// ---------------------------------------------------------------------------

/** Tool config for generateAnalytics — enforces { structured_analytics, human_summary } */
export const ANALYTICS_GENERATION_TOOL: BedrockToolConfig = {
  name: "generate_analytics",
  description:
    "Generate comprehensive training analytics from workout and coaching data. Returns structured analytics and a coach-friendly human summary.",
  inputSchema: {
    type: "object",
    required: ["structured_analytics", "human_summary"],
    properties: {
      structured_analytics: STRUCTURED_ANALYTICS_SCHEMA,
      human_summary: {
        type: "string",
        description:
          "Coach-friendly narrative starting with 'Weekly Training Summary' or 'Monthly Training Summary'.",
      },
    },
  },
};

/** Tool config for normalizeAnalytics — enforces the normalization response envelope */
export const ANALYTICS_NORMALIZATION_TOOL: BedrockToolConfig = {
  name: "normalize_analytics",
  description:
    "Analyze analytics data for schema compliance and return corrected data with a list of issues found.",
  inputSchema: {
    type: "object",
    required: ["isValid", "normalizedData", "issues", "confidence", "summary"],
    properties: {
      isValid: {
        type: "boolean",
        description: "Whether the analytics data is valid after normalization.",
      },
      normalizedData: {
        type: "object",
        required: ["structured_analytics", "human_summary"],
        properties: {
          structured_analytics: STRUCTURED_ANALYTICS_SCHEMA,
          human_summary: { type: "string" },
        },
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          required: [
            "type",
            "severity",
            "section",
            "field",
            "description",
            "corrected",
          ],
          properties: {
            type: {
              type: "string",
              enum: [
                "structural",
                "data_consistency",
                "quality_threshold",
                "cross_validation",
              ],
            },
            severity: { type: "string", enum: ["error", "warning"] },
            section: { type: "string" },
            field: { type: "string" },
            description: { type: "string" },
            corrected: { type: "boolean" },
          },
        },
      },
      confidence: {
        type: "number",
        description: "Normalization confidence score between 0 and 1.",
      },
      summary: {
        type: "string",
        description: "Short summary of normalization actions taken.",
      },
    },
  },
};

// ---------------------------------------------------------------------------
// String example — kept for reference/documentation only.
// NOT injected into prompts; schema enforcement is handled by the tool configs above.
// ---------------------------------------------------------------------------

/**
 * Complete Universal Analytics Schema v1.0 structure as a string example.
 * @deprecated For prompt injection use getAnalyticsSchemaWithContext. For output
 * enforcement use ANALYTICS_GENERATION_TOOL / ANALYTICS_NORMALIZATION_TOOL.
 */
export const UNIVERSAL_ANALYTICS_SCHEMA_V1 = `{
  "structured_analytics": {
    "metadata": {
      "week_id": "2025-W32",
      "date_range": {
        "start": "2025-08-04",
        "end": "2025-08-10"
      },
      "sessions_completed": 6,
      "sessions_planned": 6,
      "data_completeness": 0.95,
      "analysis_confidence": "high"
    },
    "volume_breakdown": {
      "working_sets": {
        "total_tonnage": 18750,
        "total_reps": 456,
        "total_sets": 67,
        "quality_reps": 445,
        "failed_reps": 8,
        "assisted_reps": 3,
        "partial_reps": 0
      },
      "warm_up_volume": 2340,
      "skill_work_time": 240,
      "conditioning_work": {
        "time_domain": 1830,
        "work_capacity": "high"
      },
      "by_movement_detail": [
        {
          "movement": "deadlift",
          "tonnage": 4950,
          "sets": 12,
          "reps": 36,
          "avg_intensity": 85.2
        }
      ]
    },
    "weekly_progression": {
      "vs_last_week": {
        "volume_change": 0.12,
        "intensity_change": 0.08,
        "exercise_overlap": 0.85,
        "performance_delta": {
          "improved": ["deadlift", "front_squat"],
          "maintained": ["bench_press"],
          "decreased": []
        }
      },
      "four_week_trend": {
        "volume_trend": "steadily_increasing",
        "intensity_trend": "maintaining_with_spikes",
        "phase_detected": "strength_development"
      },
      "progressive_overload_score": 8.5
    },
    "performance_markers": {
      "records_set": [
        {
          "exercise": "front_squat",
          "previous_best": "205x3",
          "new_best": "215x3",
          "improvement_type": "weight_pr",
          "significance": "major"
        }
      ],
      "benchmark_wods": [],
      "competition_readiness": null
    },
    "training_intelligence": {
      "set_performance_analysis": {
        "average_reps_drop": 2.3,
        "failure_rate": 0.12,
        "optimal_set_range": "3-5_sets",
        "rest_optimization": "increase_by_15_seconds"
      },
      "exercise_ordering": {
        "current_pattern": ["power", "strength", "accessories", "conditioning"],
        "performance_impact": "optimal",
        "suggested_reorder": false
      },
      "superset_efficiency": null,
      "workout_pacing": {
        "avg_session_duration": 61,
        "work_to_rest_ratio": "1:2.3",
        "density_score": 7.8
      }
    },
    "movement_analysis": {
      "frequency_map": {
        "deadlift": 3,
        "squat": 4,
        "bench_press": 2,
        "pull_up": 5
      },
      "pattern_balance": {
        "squat": {"volume": 4125, "frequency": 4},
        "hinge": {"volume": 4950, "frequency": 3},
        "push": {"volume": 2220, "frequency": 2},
        "pull": {"volume": 1890, "frequency": 5},
        "carry": {"volume": 0, "frequency": 0},
        "core": {"volume": 0, "frequency": 0}
      },
      "imbalance_flags": ["pull_volume_low_vs_push"],
      "body_part_frequency": {
        "legs": 12,
        "chest": 6,
        "back": 8,
        "shoulders": 4,
        "arms": 3
      }
    },
    "fatigue_management": {
      "acute_chronic_ratio": 1.15,
      "volume_spike": false,
      "deload_indicators": {
        "performance_decline": false,
        "high_failure_rate": false,
        "elevated_rpe": false,
        "coach_notes_mention_fatigue": false
      },
      "recovery_score": 7,
      "suggested_action": "maintain",
      "muscle_group_fatigue": {
        "most_worked": ["legs", "back"],
        "needs_recovery": []
      }
    },
    "coaching_synthesis": {
      "technical_focus": {
        "primary_cues": ["front_rack_position", "hip_hinge_timing"],
        "breakthrough_moments": ["first_time_under_9_minutes_fran"],
        "persistent_issues": ["overhead_mobility_limitations"]
      },
      "workout_feedback": {
        "athlete_notes_summary": ["felt_strong", "good_energy"],
        "coach_notes_summary": ["excellent_form_under_fatigue"],
        "video_review_points": null
      },
      "adherence_analysis": {
        "program_compliance": 100,
        "common_modifications": ["overhead_mobility_accommodations"],
        "skipped_exercises": null
      }
    },
    "actionable_insights": {
      "top_priority": {
        "insight": "Continue deadlift progression toward 315lb goal",
        "data_support": "Current max 275x3, progression rate 2.5% weekly",
        "recommended_action": "Increase deadlift weight by 5-10lbs next session",
        "expected_outcome": "315lb goal achievable in 4-6 weeks"
      },
      "quick_wins": [
        "Add horizontal pulling volume",
        "Integrate T2B skill work in warm-ups"
      ],
      "week_ahead_focus": {
        "primary_goal": "Maintain deadlift progression momentum",
        "exercises_to_push": ["deadlift", "front_squat"],
        "exercises_to_maintain": ["bench_press"],
        "exercises_to_recover": [],
        "technical_priorities": ["T2B_technique", "overhead_mobility"],
        "volume_recommendation": "maintain",
        "intensity_recommendation": "slight_increase"
      },
      "red_flags": null
    },
    "raw_aggregations": {
      "daily_volume": [
        {
          "date": "2025-08-04",
          "tonnage": 3125,
          "sets": 12,
          "duration": 65,
          "avg_rpe": 7.5,
          "avg_intensity": 8.2,
          "workout_count": 1,
          "primary_workout_id": "workout_userId_1234567890_abc123"
        }
      ],
      "movement_matrix": [
        ["deadlift", "squat", "bench_press"],
        [4950, 4125, 2220]
      ],
      "session_summaries": [
        {
          "date": "2025-08-04",
          "type": "strength",
          "focus": "deadlift_progression",
          "quality": "excellent"
        }
      ]
    },
    "data_quality_report": {
      "missing_critical_data": [],
      "inconsistent_data": [],
      "data_entry_errors": [],
      "improvement_suggestions": [
        "Consider_tracking_heart_rate_for_conditioning_workouts"
      ]
    }
  },
  "human_summary": "Weekly Training Summary\\n\\n6 out of 6 planned sessions completed with high data quality\\n18,750 lbs total tonnage across 456 reps and 67 working sets\\nAverage session duration: 61 minutes with excellent density score (7.8/10)\\n\\nKey Highlights\\nPerformance Records Set:\\n\\nFront Squat PR: 215lbs x 3 (up from previous 205lbs x 3)\\nDeadlift Progress: 275lbs x 3 - on track toward 315lb goal (87% there)\\n\\nVolume Leaders:\\n\\nDeadlift: 4,950 lbs (strongest focus)\\nBack Squat: 4,125 lbs\\nFront Squat: 2,790 lbs\\n\\nTraining Intelligence Insights:\\n\\nProgressive overload score: 8.5/10 (excellent)\\nVolume increased 12% from previous week\\nOptimal exercise ordering maintained\\n\\nAreas for Improvement:\\n\\nPull volume slightly low vs push - needs more horizontal pulling\\nT2B technique needs consistent skill work\\n\\nKey Actionable Insights:\\n\\nPriority: Continue deadlift progression toward 315lb goal (achievable in 4-6 weeks)\\nQuick wins: Add more pulling volume, integrate T2B skill work\\nNo red flags - training is progressing optimally"
}`;

/**
 * Returns analytical guidance instructions to include in the prompt.
 * Output structure is enforced by ANALYTICS_GENERATION_TOOL / ANALYTICS_NORMALIZATION_TOOL,
 * so this function only returns the reasoning and calculation directives.
 */
export const getAnalyticsSchemaWithContext = (
  context: "generation" | "normalization",
  period: "weekly" | "monthly" = "weekly",
): string => {
  const periodLabel = period === "monthly" ? "Monthly" : "Weekly";
  const periodBoundaryLabel = period === "monthly" ? "month" : "week";

  if (context === "generation") {
    return `ANALYTICS GENERATION CONTEXT:
You are an elite strength and conditioning analyst. Use the generate_analytics tool to return your analysis. Field-level guidance is provided in the tool schema descriptions.

ANALYSIS APPROACH:
- Always compare to previous periods — never analyse in isolation
- Detect workout structure (straight sets vs circuits vs supersets) from rest patterns
- Separate competition/testing from training volume
- Recognise deload weeks and adjust expectations accordingly
- Account for failed and assisted work differently from completed quality reps
- Track exercise substitutions as continuous progression
- Flag any weight that is >20% different from recent history as a potential error

HUMAN SUMMARY FORMAT:
- Start with "${periodLabel} Training Summary"
- Include session completion stats with a data quality note
- Highlight key achievements (PRs, progress toward goals)
- List volume leaders by tonnage
- Provide training intelligence insights with specific metrics
- Identify areas for improvement with actionable suggestions
- End with prioritised next steps and red flag assessment`;
  }

  return `ANALYTICS NORMALIZATION CONTEXT:
Analyse the provided analytics data for schema compliance and fix issues. Use the normalize_analytics tool to return your result. Field-level guidance is provided in the tool schema descriptions.

NORMALIZATION PRIORITIES (in order):
1. Remove any daily_volume entries with dates outside the ${periodBoundaryLabel} range
2. Verify mathematical consistency: quality_reps + failed_reps + assisted_reps + partial_reps = total_reps; sum of by_movement_detail tonnage within 10% of working_sets.total_tonnage
3. Ensure all required top-level sections are present and correctly typed
4. Complete any missing required fields with calculated or sensible default values`;
};

/**
 * Schema version information
 */
export const ANALYTICS_SCHEMA_VERSION = "1.0";
