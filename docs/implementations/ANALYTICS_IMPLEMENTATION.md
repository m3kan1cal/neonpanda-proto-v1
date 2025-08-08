## Weekly Analytics Pipeline Architecture

### Phase 1: Trigger & Data Collection (Sunday 6:00 AM UTC)

```yaml
1. CloudWatch Event Trigger
   - Cron expression: "0 6 ? * SUN *"
   - Targets: Lambda function (build-weekly-analytics)
   - Retry policy: 2 retries with exponential backoff

2. Lambda: build-weekly-analytics
   - Query all active users from DynamoDB (users table)
   - Process users in batches of 50 for efficiency
   - Direct DynamoDB queries (no SQS overhead)
   - Built-in retry logic for failed processing
   - Skip users with < 2 workouts that week
```

### Phase 2: Data Aggregation (Per User)

```yaml
4. Fetch Current Week Data
   - Query DynamoDB (workouts table)
   - Filter: user_id AND date BETWEEN week_start AND week_end
   - Get all workouts in UWS format (already extracted)
   - Include: completed workouts, skipped workouts, modifications

5. Fetch Historical Context
   - Previous 4 weeks of workouts (for trending)
   - Query pattern: user_id AND date BETWEEN (week_start - 28) AND week_end
   - Aggregate into weekly summaries for efficiency

6. Fetch Coaching Context
   - Query DynamoDB (conversations table)
   - Get last 2 weeks of coach-athlete messages
   - Extract: technical cues, feedback, goals discussed
   - Summarize using Claude Haiku (fast/cheap) if > 1000 words

7. Fetch User Context
   - Query DynamoDB (user_memories table)
   - Get: injuries, goals, PRs, equipment access, schedule constraints
   - Include: athlete profile (training age, competition dates)
   - Recent check-ins or subjective feedback

8. Fetch Program Context (Phase 2 - add later)
   - Query DynamoDB (programs table)
   - Get current program template/methodology
   - Include: phase, week number, intended stimulus
   - Planned vs completed for adherence metrics
```

### Phase 3: LLM Analytics Processing

```yaml
9. Construct Analytics Prompt
   - Combine all context into structured prompt
   - Format:
     * Athlete context (memories, profile)
     * Current week UWS data
     * Previous weeks summary
     * Coaching conversations summary
     * Program context
   - Add system prompt with output format requirements

10. Call Claude via Bedrock
   - Model: claude-3-opus-20240229
   - Max tokens: 4000
   - Temperature: 0.3 (for consistency)
   - Retry logic: 3 attempts with exponential backoff
   - Fallback: Claude Sonnet if Opus fails

11. Process LLM Response
   - Parse JSON response
   - Validate structure against schema
   - Handle any parsing errors gracefully
   - If invalid, retry with error feedback to LLM
```

### Phase 4: Storage & Notification

```yaml
12. Store Analytics Results
   Primary Storage (DynamoDB - existing table):
   - EntityType: "analytics"
   - Partition Key: user_id
   - Sort Key: week_id (YYYY-WW)
   - Attributes:
     * generated_at: timestamp
     * analytics_json: full LLM output
     * summary: extracted key insights
     * metrics: denormalized key metrics
     * data_quality_score: percentage
   - TTL: 90 days (configurable)

   Secondary Storage (S3 - Phase 2 - add later):
   - Bucket: analytics-archive
   - Key: {user_id}/{year}/{week_id}.json
   - Enable versioning for audit trail

13. Generate Quick Insights
   - Extract top 3 insights from LLM output
   - Create notification-friendly summary
   - Generate trend indicators (↑↓→)

14. Update User Dashboard Cache
   - Write to DynamoDB (dashboard_cache)
   - Pre-calculate:
     * Week-over-week changes
     * Achievement badges
     * Progress charts data
   - Set cache expiry: 1 week

15. Send Notifications
   In-App (Phase 1):
   - Write to DynamoDB (notifications table)
   - Set badge/counter in user session

   Email/Push (Phase 2 - add later):
   - Email (via SES): Template with top insights, link to dashboard
   - Push (via SNS): Title + body with top insight + metric
```

### Phase 5: Frontend Dashboard Display

```yaml
16. Frontend Data Fetching
   React Dashboard requests:
   - GET /api/analytics/current-week
   - Checks dashboard_cache first
   - Falls back to analytics_results if cache miss
   - Returns immediately (pre-computed)

17. Dashboard Components
   - Weekly Summary Card (hero metrics)
   - Volume Chart (daily/weekly trends)
   - Movement Heatmap (frequency/volume by exercise)
   - PR Tracker (new records highlighted)
   - AI Insights Panel (coach notes style)
   - Data Quality Indicator
   - Week-over-week Comparison

18. Interactive Features
   - Click any metric for detailed breakdown
   - Export to PDF report
   - Share achievements to social
   - Compare to previous weeks
   - Add coach comments/responses
```

### Phase 6: Error Handling & Monitoring

```yaml
19. Error Handling
   Failed LLM calls:
   - Retry with exponential backoff
   - Fallback to basic statistical analysis
   - Notify admin if persistent failures

   Missing data:
   - Process with available data
   - Flag incompleteness in results
   - Suggest what user should track

   Invalid responses:
   - Log to CloudWatch
   - Send to DLQ for manual review
   - Provide generic insights as fallback

20. Monitoring & Alerting
   CloudWatch Dashboards:
   - Processing success rate
   - Average processing time
   - LLM token usage and costs
   - User engagement with analytics

   Alarms:
   - Failed processing > 5%
   - Processing time > 5 minutes
   - LLM costs > budget threshold
   - No analytics generated for active users
```

### System Architecture Diagram

```
[CloudWatch Event]
    ↓ (Sunday 6am)
[Lambda: weekly-analytics] → [DynamoDB: Workouts]
    ↓                        [DynamoDB: Conversations]
    ↓                        [DynamoDB: Memories]
    ↓
[Construct Prompt]
    ↓
[Amazon Bedrock: Claude Opus]
    ↓
[Parse & Validate]
    ↓
[DynamoDB: Analytics] → [S3: Archive (Phase 2)]
    ↓
[Cache Layer]
    ↓
[Notifications] → [In-App (Phase 1)]
                → [Email/Push (Phase 2)]
    ↓
[React Dashboard]
```

### Cost Optimization Strategies

1. **Batch Processing**: Process users in batches to reduce Lambda cold starts
2. **Caching**: Cache previous weeks' summaries to avoid reprocessing
3. **Tiered Processing**: Use Haiku for summarization, Opus only for final analytics
4. **Smart Querying**: Use DynamoDB query instead of scan, proper indexes
5. **Conditional Analytics**: Skip if user had < 2 workouts that week

### Scaling Considerations

- **Rate Limiting**: Limit concurrent Bedrock calls to avoid throttling
- **Queue Management**: Use SQS batch processing for efficiency
- **Regional Deployment**: Process users in their regional Bedrock endpoint
- **Progressive Rollout**: Start with power users, expand gradually

You are an elite strength and conditioning analyst examining weekly training data in Universal Workout Schema (UWS) format.

ATHLETE CONTEXT:
{athlete_profile}

THIS WEEK'S UWS DATA:
{workouts_uws_json}

PREVIOUS WEEKS DATA (for trending):
{previous_4_weeks_summary}

ANALYZE BASED ON AVAILABLE UWS FIELDS:

1. CORE VOLUME CALCULATIONS
From UWS movement data, calculate:
- Total volume INCLUDING:
  * Complete reps (sets × reps × weight)
  * Failed reps (if marked - count as 0.5 for volume)
  * Partial reps (if marked - adjust multiplier)
  * Assisted reps (if marked - reduce load accordingly)
  * Drop sets/rest-pause sets (aggregate all work)
- Exercise order impact (performance degradation in later exercises)
- Warm-up volume (if tracked separately - exclude from working volume)
- Competition/test attempts vs training volume

2. ADVANCED SET ANALYSIS
Detect and handle special set types:
- Cluster sets (multiple mini-sets with short rest)
- Supersets/giant sets (from rest_seconds between different movements)
- Complexes (multiple movements without rest)
- EMOM/Tabata/Interval work (from workout_structure)
- Time-restricted sets (AMRAP sets within strength work)

3. PROGRESSIVE OVERLOAD TRACKING
Week-over-week comparison for repeated movements:
- Volume progression per movement_id
- Intensity progression (weight increases)
- Density progression (same work, less time)
- Rep quality progression (less failed/assisted reps)
- Technical progression (from coach notes)

4. WORKOUT SEGMENT ANALYSIS
For multi-part workouts in UWS:
- Part A (typically strength) metrics
- Part B (typically conditioning) metrics
- Buy-in/Cash-out work (if marked)
- Skill/technique work (different analysis than strength)
- Accessory work completion rate

5. FAILURE & INTENSITY ANALYSIS
Critical for understanding true effort:
- Failed rep patterns (which set, which exercise)
- Technical failure vs muscular failure (from notes)
- Rep drop-off across sets (fatigue accumulation)
- Time to complete sets (rest-pause indicators)
- Grinding reps (if bar velocity or time per rep tracked)

6. PERIODIZATION DETECTION
Identify training phase from patterns:
- Accumulation (high volume, moderate intensity)
- Intensification (lower volume, higher intensity)
- Realization/Peaking (very high intensity, low volume)
- Deload (>40% volume reduction)
- Testing week (1RM attempts, benchmark WODs)

COMPREHENSIVE OUTPUT FORMAT:
{
  "metadata": {
    "week_id": "YYYY-WW",
    "date_range": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD"
    },
    "sessions_completed": number,
    "sessions_planned": number,
    "data_completeness": percentage,
    "analysis_confidence": "high|medium|low" // based on data quality
  },

  "volume_breakdown": {
    "working_sets": {
      "total_tonnage": number,
      "total_reps": number,
      "total_sets": number,
      "quality_reps": number, // completed successfully
      "failed_reps": number,
      "assisted_reps": number,
      "partial_reps": number
    },
    "warm_up_volume": number || null,
    "skill_work_time": minutes || null,
    "conditioning_work": {
      "time_domain": minutes,
      "work_capacity": "reps or rounds"
    },
    "by_movement_detail": [
      {
        "movement_id": "string",
        "movement_name": "string",
        "total_volume": number,
        "sets_data": [
          {
            "set_number": number,
            "reps_completed": number,
            "reps_failed": number,
            "weight": number,
            "rpe": number || null,
            "rest_after": seconds || null
          }
        ],
        "best_set": {
          "weight": number,
          "reps": number,
          "e1rm": number || null
        },
        "average_rest": seconds || null,
        "performance_trend": "improving|maintaining|declining",
        "technique_notes": ["string"] || null
      }
    ]
  },

  "weekly_progression": {
    "vs_last_week": {
      "volume_change": percentage,
      "intensity_change": percentage,
      "exercise_overlap": percentage, // how many same exercises
      "performance_delta": { // for repeated exercises
        "improved": ["movement_id"],
        "maintained": ["movement_id"],
        "decreased": ["movement_id"]
      }
    },
    "four_week_trend": {
      "volume_trend": "increasing|stable|decreasing|undulating",
      "intensity_trend": "increasing|stable|decreasing|undulating",
      "phase_detected": "accumulation|intensification|realization|deload|maintenance"
    },
    "progressive_overload_score": percentage // are you progressing appropriately?
  },

  "performance_markers": {
    "records_set": [
      {
        "movement_id": "string",
        "record_type": "1RM|3RM|5RM|10RM|volume|density|time",
        "value": "string",
        "previous": "string" || null,
        "improvement": percentage || null,
        "context": "fresh|fatigued|competition" // based on workout structure
      }
    ],
    "benchmark_wods": [
      {
        "workout_name": "string",
        "result": "string",
        "scaled_or_rx": "string",
        "previous_attempts": array || null,
        "percentile": number || null // if community data available
      }
    ],
    "competition_readiness": { // if meet/comp date set
      "weeks_out": number || null,
      "current_estimated_total": number || null,
      "projected_peak": "YYYY-MM-DD" || null
    }
  },

  "training_intelligence": {
    "set_performance_analysis": {
      "average_reps_drop": percentage, // rep decline across sets
      "failure_rate": percentage,
      "optimal_set_range": "string", // "3-4 sets optimal based on drop-off"
      "rest_optimization": "string" // "Consider 30s more rest on squats"
    },
    "exercise_ordering": {
      "current_pattern": ["category"], // ["compound", "accessory", "conditioning"]
      "performance_impact": "string", // "Late accessories showing 15% performance drop"
      "suggested_reorder": boolean
    },
    "superset_efficiency": [
      {
        "movements": ["movement_id"],
        "time_saved": minutes,
        "performance_cost": percentage // if any
      }
    ] || null,
    "workout_pacing": {
      "avg_session_duration": minutes,
      "work_to_rest_ratio": "string",
      "density_score": number // work per minute
    }
  },

  "movement_analysis": {
    "frequency_map": {
      "movement_id": count // how often each exercise appears
    },
    "pattern_balance": {
      "squat": { "volume": number, "frequency": number },
      "hinge": { "volume": number, "frequency": number },
      "push": { "volume": number, "frequency": number },
      "pull": { "volume": number, "frequency": number },
      "carry": { "volume": number, "frequency": number },
      "core": { "volume": number, "frequency": number }
    },
    "imbalance_flags": [
      {
        "issue": "string", // "Push:Pull ratio 3:1"
        "severity": "high|medium|low",
        "recommendation": "string"
      }
    ],
    "body_part_frequency": { // if trackable from movement_id
      "chest": days,
      "back": days,
      "legs": days,
      "shoulders": days,
      "arms": days
    } || null
  },

  "fatigue_management": {
    "acute_chronic_ratio": number, // this week vs 4-week average
    "volume_spike": boolean,
    "deload_indicators": {
      "performance_decline": boolean,
      "high_failure_rate": boolean,
      "elevated_rpe": boolean,
      "coach_notes_mention_fatigue": boolean
    },
    "recovery_score": number, // 1-10
    "suggested_action": "push|maintain|deload",
    "muscle_group_fatigue": { // based on volume distribution
      "most_worked": ["string"],
      "needs_recovery": ["string"]
    }
  },

  "coaching_synthesis": {
    "technical_focus": {
      "primary_cues": ["string"],
      "breakthrough_moments": ["string"],
      "persistent_issues": ["string"]
    },
    "workout_feedback": {
      "athlete_notes_summary": ["string"], // key themes from athlete
      "coach_notes_summary": ["string"], // key themes from coach
      "video_review_points": ["string"] || null
    },
    "adherence_analysis": {
      "program_compliance": percentage,
      "common_modifications": ["string"],
      "skipped_exercises": ["movement_id"] || null
    }
  },

  "actionable_insights": {
    "top_priority": {
      "insight": "string",
      "data_support": "string", // what data backs this up
      "recommended_action": "string",
      "expected_outcome": "string"
    },
    "quick_wins": [ // 2-3 easy improvements
      {
        "area": "string",
        "suggestion": "string",
        "effort": "low|medium|high"
      }
    ],
    "week_ahead_focus": {
      "primary_goal": "string",
      "exercises_to_push": ["movement_id"],
      "exercises_to_maintain": ["movement_id"],
      "exercises_to_recover": ["movement_id"],
      "technical_priorities": ["string"],
      "volume_recommendation": "increase|maintain|decrease",
      "intensity_recommendation": "increase|maintain|decrease"
    },
    "red_flags": [ // urgent issues
      {
        "issue": "string",
        "severity": "high|medium",
        "immediate_action": "string"
      }
    ] || null
  },

  "raw_aggregations": { // For frontend to build custom views
    "daily_volume": [
      { "date": "YYYY-MM-DD", "volume": number }
    ],
    "movement_matrix": [ // every set of every movement
      {
        "date": "YYYY-MM-DD",
        "movement_id": "string",
        "sets": number,
        "reps": number,
        "weight": number,
        "rpe": number || null
      }
    ],
    "session_summaries": [
      {
        "workout_id": "string",
        "date": "YYYY-MM-DD",
        "duration": minutes,
        "movements": number,
        "total_volume": number,
        "workout_type": "string"
      }
    ]
  },

  "data_quality_report": {
    "missing_critical_data": ["string"], // e.g., "No RPE for heavy sets"
    "inconsistent_data": ["string"], // e.g., "Rest times vary wildly"
    "data_entry_errors": ["string"], // e.g., "500kg squat seems wrong"
    "improvement_suggestions": ["string"] // what to track better
  }
}

CRITICAL ANALYSIS RULES:
1. ALWAYS compare to previous weeks - never analyze in isolation
2. Detect workout structure (straight sets vs circuits vs supersets) from rest patterns
3. Flag any weight that's >20% different from recent history as potential error
4. Separate competition/testing from training volume
5. Account for failed work differently than completed work
6. Recognize deload weeks and adjust expectations accordingly
7. Use movement_id relationships (e.g., back_squat_variants) if available
8. Calculate true training density (exclude excessive rest, setup time)
9. Identify repeated workout templates for accurate comparison
10. Consider workout time of day if it affects performance
11. Track exercise substitutions as continuous progression (e.g., box squat → regular squat)
12. Note when equipment limitations affect programming (e.g., "max weight available")

ERROR HANDLING:
- If data seems impossible (e.g., 1000lb bench press), flag but still process
- If movement_id unknown, attempt to categorize by name pattern
- If no previous data for comparison, note as "baseline week"
- If workout incomplete, calculate based on completed portion
- Handle timezone differences in workout timestamps