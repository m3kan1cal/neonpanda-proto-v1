/**
 * Universal Analytics Schema v1.0 - Shared Schema Definition
 *
 * This module contains the complete Universal Analytics Schema structure that can be
 * dynamically loaded into prompts for both generation and normalization processes.
 */

/**
 * Complete Universal Analytics Schema v1.0 structure as a string template
 * This ensures both generation and normalization use the exact same schema definition
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
 * Helper function to get the analytics schema with custom context or modifications
 * Useful for adding generation-specific or normalization-specific instructions
 */
export const getAnalyticsSchemaWithContext = (context: 'generation' | 'normalization'): string => {
  let contextualInstructions = '';

  if (context === 'generation') {
    contextualInstructions = `
ANALYTICS GENERATION CONTEXT:
You must generate analytics data into this exact JSON structure. Use calculated values based on workout data, never omit required fields.

CRITICAL DUAL OUTPUT REQUIREMENT:
- MUST include both "structured_analytics" and "human_summary" fields
- structured_analytics: Complete JSON following the schema below
- human_summary: Coach-friendly narrative (conversational, actionable, specific)

CRITICAL CALCULATION REQUIREMENTS:
- All tonnage calculations must be accurate sums from workout data
- quality_reps + failed_reps + assisted_reps + partial_reps = total_reps
- Ensure mathematical consistency across all volume calculations
- Date boundaries: ALL dates in raw_aggregations.daily_volume MUST be within the specified week range

EVIDENCE-BASED INSIGHTS REQUIREMENT:
- Every recommendation in actionable_insights must cite specific data points
- top_priority must reference actual metrics and provide specific actions
- quick_wins must be concrete, implementable suggestions
- Avoid vague recommendations - be specific and measurable

HUMAN SUMMARY FORMAT:
- Start with "Weekly Training Summary"
- Include session completion stats and data quality note
- Highlight key achievements (PRs, progress toward goals)
- List volume leaders by tonnage
- Provide training intelligence insights with specific metrics
- Identify areas for improvement with actionable suggestions
- End with prioritized next steps and red flag assessment

UNIVERSAL ANALYTICS SCHEMA STRUCTURE:`;
  } else if (context === 'normalization') {
    contextualInstructions = `
ANALYTICS NORMALIZATION CONTEXT:
Analyze this analytics data for schema compliance and fix any structural, mathematical, or data consistency issues you find.

CRITICAL NORMALIZATION PRIORITIES:
1. FIX DATE BOUNDARY VIOLATIONS: Remove/correct any dates in raw_aggregations.daily_volume outside the week range
2. ENSURE MATHEMATICAL CONSISTENCY: Verify volume calculations are internally consistent
3. VALIDATE REQUIRED SECTIONS: All top-level sections must be present and properly structured
4. FIX DATA TYPE ISSUES: Ensure numbers are numbers, strings are strings, arrays are arrays
5. COMPLETE MISSING REQUIRED FIELDS: Add missing critical fields with appropriate calculated/default values

WEEK BOUNDARY ENFORCEMENT:
- ALL dates in raw_aggregations.daily_volume MUST fall within metadata.date_range
- Remove any daily_volume entries with dates outside the specified week
- Ensure metadata.date_range exactly matches the provided week boundaries

MATHEMATICAL VALIDATION REQUIREMENTS:
- sum(by_movement_detail.tonnage) ≈ working_sets.total_tonnage (within 10% tolerance)
- sum(by_movement_detail.reps) = working_sets.total_reps (exact match)
- sum(by_movement_detail.sets) = working_sets.total_sets (exact match)
- quality_reps + failed_reps + assisted_reps + partial_reps = total_reps

REQUIRED SECTIONS VALIDATION:
All these sections MUST be present in structured_analytics:
- metadata, volume_breakdown, weekly_progression, performance_markers
- training_intelligence, movement_analysis, fatigue_management
- coaching_synthesis, actionable_insights, raw_aggregations, data_quality_report

UNIVERSAL ANALYTICS SCHEMA STRUCTURE:`;
  }

  return `${contextualInstructions}

${UNIVERSAL_ANALYTICS_SCHEMA_V1}`;
};

/**
 * Schema version information
 */
export const ANALYTICS_SCHEMA_VERSION = "1.0";
