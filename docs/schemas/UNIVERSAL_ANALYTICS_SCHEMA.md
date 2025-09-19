# Universal Weekly Analytics Schema
## Complete Documentation and AI Generation Guide

### Version 1.0 | Created for Custom Fitness AI Agents Platform

---

## Table of Contents

1. [Philosophy & Design Principles](#philosophy--design-principles)
2. [Schema Overview](#schema-overview)
3. [Core Analytics Sections](#core-analytics-sections)
4. [Data Quality Requirements](#data-quality-requirements)
5. [AI Generation Guidelines](#ai-generation-guidelines)
6. [Validation & Normalization](#validation--normalization)
7. [Implementation Strategy](#implementation-strategy)
8. [Complete Schema Reference](#complete-schema-reference)

---

## Philosophy & Design Principles

### Core Design Philosophy

This schema defines the structured output format for AI-generated weekly training analytics. It transforms raw workout data into actionable insights while maintaining consistency, accuracy, and coach-friendly presentation.

### Key Design Principles

#### 1. **Dual Output Architecture**
```
Single AI Call Produces:
├── Structured Analytics (machine-readable JSON)
└── Human Summary (coach-friendly narrative)
```

#### 2. **Hierarchical Information Structure**
```
Weekly Analytics
├── Metadata (week context, confidence)
├── Volume Analysis (tonnage, reps, sets)
├── Performance Tracking (PRs, progressions)
├── Training Intelligence (patterns, optimization)
├── Movement Balance (frequency, imbalances)
├── Fatigue Management (load, recovery indicators)
├── Coaching Insights (technical focus, adherence)
├── Actionable Recommendations (priorities, next steps)
├── Raw Aggregations (daily breakdowns, matrices)
└── Data Quality Report (issues, improvements)
```

#### 3. **Evidence-Based Insights**
- Every recommendation backed by specific data points
- Confidence scoring for analytical conclusions
- Clear distinction between facts and interpretations

#### 4. **Coach-Centric Design**
- Technical insights translated to actionable coaching language
- Prioritized recommendations (top priority, quick wins, red flags)
- Context-aware suggestions based on athlete profile and history

#### 5. **Data Integrity Focus**
- Comprehensive validation of calculations and cross-references
- Date consistency enforcement within weekly boundaries
- Missing data identification and handling strategies

---

## Schema Overview

### High-Level Structure

```json
{
  // Dual output requirement
  "structured_analytics": {
    "metadata": { ... },           // Week context and confidence
    "volume_breakdown": { ... },   // Tonnage, reps, sets analysis
    "weekly_progression": { ... }, // vs. previous weeks trends
    "performance_markers": { ... },// PRs, benchmarks, competition readiness
    "training_intelligence": { ... }, // Patterns, efficiency, optimization
    "movement_analysis": { ... },  // Balance, frequency, imbalances
    "fatigue_management": { ... }, // Load management, recovery indicators
    "coaching_synthesis": { ... }, // Technical focus, adherence
    "actionable_insights": { ... }, // Prioritized recommendations
    "raw_aggregations": { ... },   // Daily data, matrices
    "data_quality_report": { ... } // Issues, improvements
  },
  "human_summary": "string"        // Conversational coach narrative
}
```

### Core Analytics Principles

- **Week-Centric**: All analysis bounded by specific 7-day period
- **Progressive**: Comparisons to previous weeks and historical trends
- **Actionable**: Every insight includes specific next steps
- **Evidence-Based**: Data citations for all recommendations
- **Safety-First**: Red flags and injury risk indicators prioritized

---

## Core Analytics Sections

### Metadata Section
**Purpose**: Week context, analysis confidence, and data completeness

```json
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
}
```

#### Validation Requirements
- `week_id` format: YYYY-W{week_number}
- `date_range` must span exactly 7 days
- `sessions_completed` ≤ `sessions_planned`
- `data_completeness` range: 0.0-1.0
- `analysis_confidence`: "high|medium|low"

### Volume Breakdown Section
**Purpose**: Quantitative training load analysis

```json
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
}
```

#### Validation Requirements
- All tonnage values must be positive numbers
- `quality_reps` + `failed_reps` + `assisted_reps` + `partial_reps` = `total_reps`
- `by_movement_detail` array must not be empty if workouts exist
- Time values in seconds (integers)

### Performance Markers Section
**Purpose**: Track achievements, benchmarks, and competition readiness

```json
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
  "benchmark_wods": [
    {
      "workout_name": "fran",
      "time": 537,
      "rx_status": "rx",
      "historical_rank": "top_10_percent"
    }
  ],
  "competition_readiness": {
    "discipline": "crossfit",
    "readiness_score": 8.5,
    "limiting_factors": ["overhead_mobility"]
  }
}
```

#### Validation Requirements
- PR improvements must be positive values
- Time values must be realistic (30-7200 seconds for most workouts)
- `readiness_score` range: 0.0-10.0
- `rx_status`: "rx|scaled|modified"

### Training Intelligence Section
**Purpose**: Pattern analysis and optimization insights

```json
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
  "workout_pacing": {
    "avg_session_duration": 61,
    "work_to_rest_ratio": "1:2.3",
    "density_score": 7.8
  }
}
```

#### Validation Requirements
- Percentages as decimals (0.0-1.0)
- Duration in minutes (positive integers)
- `density_score` range: 0.0-10.0
- Ratios as "number:number" strings

### Movement Analysis Section
**Purpose**: Balance assessment and imbalance detection

```json
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
}
```

#### Validation Requirements
- Frequency values must be positive integers
- Volume values must be positive numbers
- `imbalance_flags` array of descriptive strings
- Body part frequencies should align with movement patterns

### Fatigue Management Section
**Purpose**: Load monitoring and recovery indicators

```json
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
}
```

#### Validation Requirements
- `acute_chronic_ratio` range: 0.5-2.0 (typical safe range)
- Boolean flags for indicators
- `recovery_score` range: 1-10
- `suggested_action`: "increase|maintain|decrease|deload"

### Actionable Insights Section
**Purpose**: Prioritized recommendations and next steps

```json
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
    "technical_priorities": ["T2B technique", "overhead_mobility"],
    "volume_recommendation": "maintain",
    "intensity_recommendation": "slight_increase"
  },
  "red_flags": null
}
```

#### Validation Requirements
- All recommendation strings must be specific and actionable
- `data_support` must reference actual metrics
- Arrays must contain specific exercise names or technical skills
- `red_flags` can be null or array of urgent issues

---

## Data Quality Requirements

### Critical Data Validation

#### Date Consistency
```
REQUIREMENT: All dates within raw_aggregations.daily_volume
             MUST fall within metadata.date_range

VALIDATION: foreach entry in daily_volume:
              entry.date >= metadata.date_range.start AND
              entry.date <= metadata.date_range.end
```

#### Mathematical Consistency
```
REQUIREMENT: Volume calculations must be internally consistent

VALIDATION: sum(by_movement_detail.tonnage) ≈ working_sets.total_tonnage
            sum(by_movement_detail.reps) = working_sets.total_reps
            sum(by_movement_detail.sets) = working_sets.total_sets
```

#### Logical Constraints
```
REQUIREMENT: Performance indicators must be logically sound

VALIDATION: sessions_completed <= sessions_planned
            failure_rate >= 0.0 AND failure_rate <= 1.0
            acute_chronic_ratio > 0.0 AND acute_chronic_ratio < 3.0
            density_score >= 0.0 AND density_score <= 10.0
```

### Data Completeness Scoring

```python
def calculate_data_completeness(analytics_data):
    required_fields = [
        'metadata.week_id',
        'metadata.date_range',
        'volume_breakdown.working_sets.total_tonnage',
        'volume_breakdown.by_movement_detail',
        'actionable_insights.top_priority'
    ]

    present_fields = count_present_fields(analytics_data, required_fields)
    return present_fields / len(required_fields)
```

---

## AI Generation Guidelines

### Core Generation Principles

#### 1. **Week Boundary Enforcement**
- All analysis MUST be confined to the specified 7-day period
- Historical references for context only, not included in current week metrics
- Clear temporal boundaries in data aggregation

#### 2. **Evidence-Based Insights**
- Every recommendation must cite specific data points
- Avoid speculation without supporting metrics
- Distinguish between facts and interpretations

#### 3. **Actionability Focus**
- Prioritize concrete, implementable recommendations
- Avoid vague suggestions like "improve technique"
- Provide specific targets and timeframes

#### 4. **Safety Integration**
- Prioritize injury risk indicators
- Flag sudden volume spikes or performance declines
- Consider fatigue markers in all recommendations

### Prompt Structure Requirements

#### Input Data Processing
```
REQUIRED INPUTS:
- Current week workouts (full UWS data)
- Historical workout summaries (4 weeks)
- User coaching conversations (last 2 weeks)
- User profile and memories
- Week date boundaries (start/end)

PROCESSING ORDER:
1. Validate input data completeness
2. Calculate week-bounded metrics
3. Compare to historical context
4. Generate insights and recommendations
5. Format dual output (structured + human)
```

#### Output Format Enforcement
```
CRITICAL REQUIREMENTS:
- Return ONLY valid JSON with structured_analytics and human_summary
- No markdown formatting or code blocks
- All dates in YYYY-MM-DD format
- Numbers as actual numbers, not strings
- Arrays for list data, objects for structured data
```

### Quality Assurance Patterns

#### Confidence Scoring
```
HIGH CONFIDENCE (0.9+):
- Complete workout data for full week
- Clear performance trends
- Sufficient historical context

MEDIUM CONFIDENCE (0.7-0.9):
- Minor data gaps (1-2 workouts missing)
- Some estimated values
- Limited historical context

LOW CONFIDENCE (0.5-0.7):
- Significant data gaps
- Heavy reliance on estimates
- Insufficient context for trends
```

#### Error Prevention
```
COMMON PITFALLS TO AVOID:
- Including dates outside week boundaries in daily_volume
- Mathematical inconsistencies in volume calculations
- Vague recommendations without specific actions
- Confidence scores that don't match data quality
- Missing required sections in structured output
```

---

## Validation & Normalization

### When Analytics Require Normalization

#### Structural Issues
- Missing required sections
- Incorrect data types (strings instead of numbers)
- Invalid nested structure
- Empty arrays where data should exist

#### Data Consistency Problems
- Dates outside week boundaries
- Mathematical inconsistencies in totals
- Impossible values (negative tonnage, >100% failure rates)
- Cross-section validation failures

#### Quality Threshold Failures
- Data completeness < 0.8
- Analysis confidence < 0.6
- Missing top priority insights
- Empty movement analysis when workouts exist

### Normalization Strategy

#### Phase 1: Validation Detection
```typescript
interface NormalizationIssue {
  type: 'structural' | 'data_consistency' | 'quality_threshold';
  section: string;
  field: string;
  issue: string;
  severity: 'critical' | 'moderate' | 'minor';
}

function shouldNormalizeAnalytics(
  analytics: any,
  weeklyData: UserWeeklyData
): NormalizationIssue[] {
  // Return array of issues found
}
```

#### Phase 2: AI-Powered Normalization
```typescript
async function normalizeAnalytics(
  malformedAnalytics: any,
  weeklyData: UserWeeklyData,
  issues: NormalizationIssue[]
): Promise<NormalizedAnalyticsResult> {
  // Use Claude with thinking enabled
  // Focus on structural fixes and data consistency
  // Maintain original insights where possible
}
```

#### Phase 3: Post-Normalization Validation
```typescript
function validateNormalizedAnalytics(
  normalizedAnalytics: any,
  originalIssues: NormalizationIssue[]
): ValidationResult {
  // Ensure all critical issues resolved
  // Verify data integrity maintained
  // Confirm schema compliance
}
```

---

## Implementation Strategy

### Phase 1: Enhanced Validation (Current)
- Expand existing `validateAnalyticsSchema` function
- Add comprehensive data consistency checks
- Implement mathematical validation
- Create issue severity classification

### Phase 2: Normalization Infrastructure
- Create `shouldNormalizeAnalytics` detection function
- Implement AI-powered normalization process
- Add normalization confidence scoring
- Integrate with existing analytics pipeline

### Phase 3: Advanced Quality Assurance
- Add cross-week trend validation
- Implement intelligent data estimation for gaps
- Create normalization effectiveness monitoring
- Add user feedback integration for quality improvement

---

## Complete Schema Reference

### Full Analytics Schema v1.0

```json
{
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
          "duration": 65
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
  "human_summary": "Weekly Training Summary\n\n6 out of 6 planned sessions completed with high data quality\n18,750 lbs total tonnage across 456 reps and 67 working sets\nAverage session duration: 61 minutes with excellent density score (7.8/10)\n\nKey Highlights\nPerformance Records Set:\n\nFront Squat PR: 215lbs x 3 (up from previous 205lbs x 3)\nDeadlift Progress: 275lbs x 3 - on track toward 315lb goal (87% there)\n\nVolume Leaders:\n\nDeadlift: 4,950 lbs (strongest focus)\nBack Squat: 4,125 lbs\nFront Squat: 2,790 lbs\n\nTraining Intelligence Insights:\n\nProgressive overload score: 8.5/10 (excellent)\nVolume increased 12% from previous week\nOptimal exercise ordering maintained\n\nAreas for Improvement:\n\nPull volume slightly low vs push - needs more horizontal pulling\nT2B technique needs consistent skill work\n\nKey Actionable Insights:\n\nPriority: Continue deadlift progression toward 315lb goal (achievable in 4-6 weeks)\nQuick wins: Add more pulling volume, integrate T2B skill work\nNo red flags - training is progressing optimally"
}
```

---

## Conclusion

This Universal Analytics Schema provides the foundation for consistent, high-quality AI-generated training analytics. The combination of structured data validation and intelligent normalization ensures reliable insights while the dual output format serves both automated systems and human coaches.

The schema's validation-first design enables sophisticated quality assurance while the normalization capabilities ensure consistent output quality regardless of AI response variations.

---

*Schema Version 1.0 | Documentation Last Updated: January 2025*