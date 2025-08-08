/**
 * Universal Workout Schema v2.0 - Shared Schema Definition
 *
 * This module contains the complete Universal Workout Schema structure that can be
 * dynamically loaded into prompts for both extraction and validation processes.
 */

/**
 * Complete Universal Workout Schema v2.0 structure as a string template
 * This ensures both extraction and validation use the exact same schema definition
 */
export const UNIVERSAL_WORKOUT_SCHEMA_V2 = `{
  "workout_id": "string",
  "user_id": "string",
  "date": "YYYY-MM-DD",
  "discipline": "crossfit|powerlifting|bodybuilding|hiit|running|swimming|cycling|yoga|martial_arts|climbing|hybrid",
  "methodology": "string|null",
  "workout_name": "string|null",
  "workout_type": "strength|cardio|flexibility|skill|competition|recovery|hybrid",
  "duration": "number|null",
  "location": "gym|box|home|outdoors|online|other",
  "coach_id": "string|null",
  "conversation_id": "string|null",

  "performance_metrics": {
    "intensity": "number[1-10]|null",
    "perceived_exertion": "number[1-10]|null",
    "heart_rate": {
      "avg": "number|null",
      "max": "number|null",
      "zones": {
        "zone_1": "number|null",
        "zone_2": "number|null",
        "zone_3": "number|null",
        "zone_4": "number|null",
        "zone_5": "number|null"
      }
    },
    "calories_burned": "number|null",
    "mood_pre": "number[1-10]|null",
    "mood_post": "number[1-10]|null",
    "energy_level_pre": "number[1-10]|null",
    "energy_level_post": "number[1-10]|null"
  },

  "discipline_specific": {
    "crossfit": {
      "workout_format": "for_time|amrap|emom|tabata|ladder|chipper|death_by|intervals|strength_then_metcon|hero_workout|custom",
      "time_cap": "number|null",
      "rx_status": "rx|scaled|modified",
      "rounds": [
        {
          "round_number": "number",
          "rep_scheme": "string|null",
          "exercises": [
            {
              "exercise_name": "string",
              "movement_type": "barbell|dumbbell|kettlebell|bodyweight|gymnastics|cardio|other",
              "variation": "string|null",
              "assistance": "string|null",
              "weight": {
                "value": "number|null",
                "unit": "lbs|kg",
                "percentage_1rm": "number|null",
                "rx_weight": "number|null",
                "scaled_weight": "number|null"
              },
              "reps": {
                "prescribed": "number|string",
                "completed": "number",
                "broken_sets": "array|null",
                "rest_between_sets": "array|null"
              },
              "distance": "number|null",
              "calories": "number|null",
              "time": "number|null",
              "form_notes": "string|null"
            }
          ]
        }
      ],
      "performance_data": {
        "total_time": "number|null",
        "rounds_completed": "number",
        "total_reps": "number|null",
        "round_times": "array|null",
        "score": {
          "value": "number|string",
          "type": "time|rounds|reps|weight|distance|points",
          "unit": "string|null"
        }
      }
    },
    "powerlifting": {
      "session_type": "max_effort|dynamic_effort|repetition_method|competition_prep",
      "competition_prep": "boolean",
      "exercises": [
        {
          "exercise_name": "string",
          "movement_category": "main_lift|accessory|mobility",
          "equipment": "array of strings (belt, sleeves, wraps, etc.)",
          "competition_commands": "boolean",
          "attempts": {
            "opener": "number|null",
            "second_attempt": "number|null",
            "third_attempt": "number|null",
            "successful_attempts": "array of numbers",
            "missed_attempts": "array of numbers",
            "miss_reasons": "array of strings"
          },
          "sets": [
            {
              "set_type": "opener|second|third|warmup|working|accessory",
              "weight": "number",
              "reps": "number",
              "rpe": "number 1-10|null",
              "rest_time": "number (seconds)|null",
              "percentage_1rm": "number|null",
              "bar_speed": "slow|moderate|fast|explosive|null",
              "competition_commands": "boolean"
            }
          ]
        }
      ]
    },
    "bodybuilding": {},
    "hiit": {},
    "running": {
      "run_type": "easy|tempo|interval|long|race|recovery|fartlek",
      "total_distance": "number (miles or km)",
      "total_time": "number (seconds)",
      "average_pace": "string (MM:SS format)",
      "elevation_gain": "number (feet)|null",
      "surface": "road|trail|track|treadmill|mixed",
      "weather": "string|null",
      "segments": [
        {
          "segment_number": "integer",
          "distance": "number",
          "time": "number (seconds)",
          "pace": "string (MM:SS)",
          "heart_rate_avg": "number|null",
          "effort_level": "easy|moderate|hard|max",
          "terrain": "flat|uphill|downhill|mixed"
        }
      ]
    }
  },

  "pr_achievements": [
    {
      "exercise": "string",
      "discipline": "string",
      "pr_type": "workout_time|1rm|volume_pr|distance_pr|pace_pr",
      "previous_best": "number|null",
      "new_best": "number",
      "improvement": "number|null",
      "improvement_percentage": "number|null",
      "date_previous": "YYYY-MM-DD|null",
      "significance": "minor|moderate|major",
      "context": "string|null"
    }
  ],

  "subjective_feedback": {
    "enjoyment": "number[1-10]|null",
    "difficulty": "number[1-10]|null",
    "form_quality": "number[1-10]|null",
    "motivation": "number[1-10]|null",
    "confidence": "number[1-10]|null",
    "mental_state": "focused|distracted|motivated|tired|energetic|stressed|calm|null",
    "pacing_strategy": "even_split|negative_split|positive_split|went_out_too_fast|conservative|null",
    "nutrition_pre_workout": "string|null",
    "hydration_level": "poor|fair|good|excellent|null",
    "sleep_quality_previous": "number[1-10]|null",
    "stress_level": "number[1-10]|null",
    "soreness_pre": {
      "overall": "number[1-10]|null",
      "legs": "number[1-10]|null",
      "arms": "number[1-10]|null",
      "back": "number[1-10]|null"
    },
    "soreness_post": {
      "overall": "number[1-10]|null",
      "legs": "number[1-10]|null",
      "arms": "number[1-10]|null",
      "back": "number[1-10]|null"
    },
    "notes": "string|null"
  },

  "environmental_factors": {
    "temperature": "number|null",
    "humidity": "number|null",
    "altitude": "number|null",
    "equipment_condition": "poor|fair|good|excellent|null",
    "gym_crowding": "empty|light|moderate|busy|packed|null"
  },

  "recovery_metrics": {
    "hrv_morning": "number|null",
    "resting_heart_rate": "number|null",
    "sleep_hours": "number|null",
    "stress_level": "number[1-10]|null",
    "readiness_score": "number[1-10]|null"
  },

  "coach_notes": {
    "programming_intent": "string|null",
    "coaching_cues_given": "array|null",
    "areas_for_improvement": "array|null",
    "positive_observations": "array|null",
    "next_session_focus": "string|null",
    "adaptation_recommendations": "array|null",
    "safety_flags": "array",
    "motivation_strategy": "string|null"
  },

  "metadata": {
    "logged_via": "conversation|app|wearable|manual",
    "logging_time": "number|null",
    "data_confidence": "number[0-1]",
    "ai_extracted": "boolean",
    "user_verified": "boolean",
    "version": "string",
    "schema_version": "2.0",
    "data_completeness": "number[0-1]",
    "extraction_method": "claude_conversation_analysis|manual_entry|api_import",
    "validation_flags": "array",
    "extraction_notes": "string|null"
  }
}`;

/**
 * Schema version information
 */
export const SCHEMA_VERSION = "2.0";
export const SCHEMA_LAST_UPDATED = "2025-01-14";

/**
 * Helper function to get the schema with custom context or modifications
 * Useful for adding extraction-specific or validation-specific instructions
 */
export const getSchemaWithContext = (context: 'extraction' | 'validation'): string => {
  let contextualInstructions = '';

  if (context === 'extraction') {
    contextualInstructions = `
EXTRACTION CONTEXT:
You must extract data into this exact JSON structure. Use null for missing data, never omit fields.

CRITICAL EFFICIENCY RULE: For workouts with >8 rounds, apply aggressive consolidation:
- Consolidate warmup progressions into 1-2 rounds maximum
- Use concise form_notes to capture progression details
- Omit null fields that don't add contextual value
- Prioritize working sets and metcon rounds for individual tracking

ANTI-MALFORMED JSON STRATEGY:
- For workouts with >15 rounds, prioritize JSON structural integrity over complete detail
- Consider grouping similar consecutive rounds into single rounds with range notation
- Example: Instead of 8 separate identical warmup rounds, use 1 round with form_notes: "Rounds 1-8: 135lbs x 3 reps progression"
- Better to have valid parseable JSON with some detail loss than malformed JSON with full detail
- Focus on: working sets, key lifts, metcon rounds - these are most important for tracking

UNIVERSAL WORKOUT SCHEMA STRUCTURE:`;
  } else if (context === 'validation') {
    contextualInstructions = `
VALIDATION CONTEXT:
Analyze this workout data for schema compliance and fix any structural issues you find.

VALIDATION APPROACH:
- Only fix actual problems, don't add missing fields unless they contain misplaced data
- Preserve all existing data, just move it to the correct location if needed
- Don't create default/placeholder values for missing optional fields
- Focus on structural correctness and data integrity

COMMON ISSUES TO FIX:
1. coach_notes misplaced inside discipline_specific (should be at root level)
2. discipline_specific misplaced inside performance_metrics (should be at root level)
3. Inconsistent round counts in CrossFit workouts
4. Invalid data ranges or types that break the schema

UNIVERSAL WORKOUT SCHEMA v2.0 (Complete Structure):`;
  }

  return contextualInstructions + '\n' + UNIVERSAL_WORKOUT_SCHEMA_V2;
};
