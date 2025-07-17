/**
 * Workout Session Extraction Library
 *
 * This module provides functionality for extracting structured workout data
 * from natural language using the Universal Workout Schema.
 */

import { CoachConfig } from '../coach-creator/types';
import { TimeIndicator, UniversalWorkoutSchema } from './types';
import { storeDebugDataInS3, callBedrockApi } from '../api-helpers';



/**
 * Detects if a workout is likely to be complex and need optimization
 */
export const isComplexWorkout = (userMessage: string): boolean => {
  const complexityIndicators = [
    /warmup.*\d+.*\d+.*\d+/i, // Multiple warmup weights
    /\d+\s*sets.*\d+\s*reps/i, // Multiple sets mentioned
    /amrap.*\d+.*rounds/i, // AMRAP with multiple rounds
    /strength.*metcon/i, // Strength + metcon combination
    /\d+\s*rounds.*\d+\s*rounds/i, // Multiple round mentions
    /progression/i, // Progression workouts
    /then.*then/i, // Multiple phases (then X then Y)
  ];

  const matchCount = complexityIndicators.filter(pattern => pattern.test(userMessage)).length;
  const messageLength = userMessage.length;

  // Complex if multiple indicators OR very long message
  return matchCount >= 2 || messageLength > 500;
};

/**
 * Builds a comprehensive workout extraction prompt using the Universal Workout Schema
 */
export const buildWorkoutExtractionPrompt = (userMessage: string, coachConfig: CoachConfig): string => {
  const isComplex = isComplexWorkout(userMessage);

  return `
${isComplex ? 'COMPLEX WORKOUT DETECTED - APPLY AGGRESSIVE OPTIMIZATION!' : ''}

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON. No markdown backticks, no explanations, no text outside JSON
- Response must start with { and end with }
- NEVER include trailing commas before closing braces } or brackets ]
- Use double quotes for all strings, never single quotes
- Ensure all arrays and objects are properly closed
- If unsure about a value, use null instead of omitting the field
- Test JSON validity before responding
- CRITICAL: Generate MINIFIED JSON with NO extra whitespace, newlines, or formatting
- Remove all unnecessary spaces, tabs, and line breaks to minimize payload size
- Example: {"key":"value","array":[1,2,3]} NOT { "key": "value", "array": [ 1, 2, 3 ] }

EXTRACTION REQUIREMENTS:
- Include ALL schema fields, use null for missing data
- Provide detailed extraction_notes explaining your reasoning
- Be conservative with confidence scores - better to underestimate than overestimate
- Focus on accuracy over completeness
- For complex multi-phase workouts, break into clear round structures
- EFFICIENCY: For workouts with >10 rounds, group similar warmup sets to stay within token limits
- JSON OPTIMIZATION: Use concise structures and avoid repetitive null fields where possible
- WORKOUT NAMING: ALWAYS generate a Latin-inspired workout name based on workout characteristics. Use meaningful Latin terms that reflect the workout's nature:
  * Create 1- or 2-word combinations that sound powerful and meaningful
${isComplex ? '- COMPLEX WORKOUT OPTIMIZATION: Consolidate warmup rounds, use minimal weight objects, prioritize working sets and metcon rounds' : ''}

You are an expert fitness data extraction AI that converts natural language workout descriptions into structured data following the Universal Workout Schema v2.0.

USER WORKOUT DESCRIPTION:
"${userMessage}"

COACH CONTEXT:
- Coach Name: ${coachConfig.coach_name}
- Primary Methodology: ${coachConfig.selected_methodology?.primary_methodology || 'general'}
- Coach Specializations: ${coachConfig.technical_config?.specializations?.join(', ') || 'general fitness'}
- Programming Focus: ${coachConfig.technical_config?.programming_focus?.join(', ') || 'general'}
- Preferred Intensity: ${coachConfig.technical_config?.preferred_intensity || 'moderate'}
- Equipment Available: ${coachConfig.technical_config?.equipment_available?.join(', ') || 'standard gym'}

EXTRACTION GUIDELINES:

1. LITERAL LANGUAGE INTERPRETATION:
   - CRITICAL: When users specify "each", "all", "same", or similar terms, interpret LITERALLY
   - Example: "three warm-up sets at 135 pounds 185 pounds 205 pounds each" = 135×[same reps], 185×[same reps], 205×[same reps]
   - DO NOT apply sport-specific conventions that contradict explicit language
   - LITERAL KEYWORDS: "each", "all", "same", "every", "identical", "uniform", "equal", "matching", "consistent"
   - "Each" means uniform application across all items mentioned
   - "All" means every item gets the same treatment
   - "Same/identical/uniform" means identical parameters across sets
   - "Every" means universal application to all mentioned items
   - Only use sport-specific inference when language is ambiguous or incomplete

2. INTELLIGENT INFERENCE: Use context clues to infer missing information intelligently
   - If someone says "did Fran in 8:57", infer crossfit discipline, for_time format
   - If they mention weights without units, use coach's methodology to infer (lbs for US, kg for international)
   - Estimate intensity/RPE from language: "crushed it" = 8-9, "easy day" = 4-5

3. DISCIPLINE DETECTION:
   - CrossFit: Named benchmarks (Fran, Murph, Grace), AMRAP/EMOM formats, functional movements (thrusters, pull-ups, burpees), time domains, RX/scaled mentions
   - Powerlifting: Competition lifts (squat, bench, deadlift), percentages, RPE, attempt structure, equipment mentions
   - Running: Distance, pace, splits, cardio terminology, route descriptions
   - Auto-detect from context or default to "hybrid" if unclear

4. CROSSFIT-SPECIFIC INTELLIGENCE:
   - Benchmark Recognition: Fran (21-15-9 thrusters/pull-ups), Murph (1mi run, 100 pull-ups, 200 push-ups, 300 squats, 1mi run), Grace (30 clean & jerks), etc.
   - Scaling Detection: "RX" = prescribed weights, "scaled" = modified weights/movements
   - Movement Variations: kipping vs strict pull-ups, butterfly vs chest-to-bar
   - Time Domains: Sprint (<5min), medium (5-15min), long (15-30min), very long (30+min)
   - Common Formats: For time, AMRAP (as many rounds as possible), EMOM (every minute on minute)

5. CONFIDENCE SCORING:
   - 0.9+: Explicit data provided ("my time was 8:57")
   - 0.7-0.9: Strong contextual inference ("crushed Fran today" → likely good time)
   - 0.5-0.7: Moderate inference from patterns
   - <0.5: Low confidence guess

6. VALIDATION FLAGS: Include flags for:
   - missing_heart_rate, estimated_calories, inferred_weights, assumed_reps
   - unusual_performance (times/weights outside normal ranges)
   - incomplete_description, ambiguous_exercises

   CRITICAL BLOCKING FLAGS (these prevent workout from being saved):
   - 'planning_inquiry': User is asking about future workouts, planning, or "what should I do"
   - 'advice_seeking': User is asking for advice, technique tips, or general fitness questions
   - 'future_planning': User is discussing future workout plans or scheduling
   - 'no_performance_data': No actual workout performance data found in the message

   EXAMPLES OF BLOCKING FLAG USAGE:
   - "What did I do for back squat last week?" → ['planning_inquiry'] (asking about past, not logging new)
   - "Can you tell me what workouts I did yesterday?" → ['planning_inquiry'] (inquiry about past)
   - "Should I do Fran today?" → ['advice_seeking', 'future_planning'] (asking for advice about future)
   - "What's a good warm-up routine?" → ['advice_seeking'] (seeking general advice)
   - "I'm thinking about doing Murph tomorrow" → ['future_planning'] (planning future workout)
   - "Just to confirm, what was my time on Fran?" → ['planning_inquiry'] (confirming past data)

   IMPORTANT: If the message is clearly a question about past workouts, advice seeking, or future planning,
   set the appropriate blocking flags even if workout terms are present. These flags prevent inappropriate
   workout logging when users are asking questions rather than reporting completed workouts.

7. STANDARDIZATION:
   - Exercise names: Use standard terms (thruster not "front squat to press", pull-up not "chin-up")
   - Units: Be consistent (convert if needed, note original)
   - Times: Always in seconds for calculations, but preserve original format in notes
   - CrossFit Movement Standards: Use official CrossFit terminology (chest-to-bar pull-up, box jump, wall ball, etc.)

7.5. EQUIPMENT TERMINOLOGY INTERPRETATION:
   - "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement
   - Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells
   - "Single DB" means using one dumbbell for the movement
   - "Alternating" means switching between arms/sides but count total reps, not per side
   - "Each arm" or "per arm" means multiply by 2 (e.g., "10 reps each arm" = 20 total reps)
   - When in doubt about equipment terminology, count the TOTAL movement repetitions performed

8. CROSSFIT EXTRACTION EXAMPLES:
   - "Did Fran in 8:57 with 95lb thrusters" → workout_name: "Fran", total_time: 537, rx_status: "rx"
   - "Scaled Murph with 65lb thrusters" → workout_name: "Murph", rx_status: "scaled", scaled_weight: 65
   - "20 minute AMRAP: 5 pull-ups, 10 push-ups, 15 squats - got 12 rounds" → workout_format: "amrap", rounds_completed: 12
   - "EMOM 10: 3 thrusters at 135" → workout_format: "emom", time_cap: 600, weight: 135
   - "Broke the 21 thrusters into 10-6-5" → broken_sets: [10, 6, 5]
   - "3 sets of squats at 185, then 5 rounds of burpees and pull-ups" → workout_format: "strength_then_metcon", rounds_completed: 8 (3 squat rounds + 5 metcon rounds)

8.5. OPTIMIZATION EXAMPLES FOR COMPLEX WORKOUTS:
   - BEFORE: 4 separate warmup rounds (135×3, 185×3, 225×3, 245×3)
   - AFTER: 1 consolidated round with form_notes: "Warmup progression: 135×3, 185×3, 225×3, 245×3"
   - BEFORE: Full weight objects with all null fields for bodyweight exercises
   - AFTER: Minimal weight object: {"value": null, "unit": "lbs"}
   - BEFORE: Detailed form_notes for every similar AMRAP round
   - AFTER: Brief notes on first round, null for subsequent identical rounds

8.5. POWERLIFTING WARMUP INTERPRETATION EXAMPLES:
   - LITERAL INTERPRETATION (when explicit language is used):
     * "three warm-up sets at 135 pounds 185 pounds 205 pounds each" = 135×5, 185×5, 205×5 (same reps "each")
     * "did all my warmups at 5 reps" = every warmup set gets 5 reps
     * "same reps for 135, 185, 205" = identical rep count across all weights
     * "every warmup set was 3 reps" = uniform 3 reps across all warmup weights
   - SPORT-SPECIFIC INTERPRETATION (when language is ambiguous):
     * "warmed up with 135, 185, 205" = 135×5, 185×3, 205×1 (typical powerlifting progression)
     * "worked up to 225" = infer standard powerlifting warmup progression
     * "three warmup sets before my working sets" = apply sport-specific rep progression
   - PRIORITY: Always prioritize literal language over sport conventions

9. CRITICAL: DESCENDING REP SCHEMES (21-15-9) ARE MULTIPLE ROUNDS:
   - Fran (21-15-9) = 3 SEPARATE ROUNDS, not one round with "21-15-9" rep scheme
   - Round 1: 21 thrusters + 21 pull-ups (prescribed: 21, completed: 21 for each exercise)
   - Round 2: 15 thrusters + 15 pull-ups (prescribed: 15, completed: 15 for each exercise)
   - Round 3: 9 thrusters + 9 pull-ups (prescribed: 9, completed: 9 for each exercise)
   - Same applies to other descending schemes: 15-12-9, 10-8-6, etc.
   - DO NOT create a single round with rep_scheme "21-15-9"
   - DO create 3 separate rounds with different prescribed rep counts

10. CRITICAL: MULTI-PHASE WORKOUT ROUND STRUCTURING:

   A. STRENGTH_THEN_METCON FORMAT:
   - Strength phase: Each exercise (or exercise group) = separate round(s)
   - Metcon phase: Each repetition of the circuit = separate round
   - IMPORTANT: Keep JSON structure manageable - group similar sets when possible
   - Example: "3 sets of squats, 3 sets of bench, then 6 rounds of row+KB swings"
     * Round 1: Squat set 1, Round 2: Squat set 2, Round 3: Squat set 3
     * Round 4: Bench set 1, Round 5: Bench set 2, Round 6: Bench set 3
     * Round 7: Row+KB round 1, Round 8: Row+KB round 2, ... Round 12: Row+KB round 6
   - For warmup progressions, you MAY group similar sets to reduce JSON complexity

   B. REPEATED CIRCUIT ROUNDS:
   - "6 rounds of X" = 6 separate rounds, each with round_number incremented
   - Each round contains the same exercises with same prescribed reps
   - Track rest periods between rounds in rest_between_sets

   C. WORKING SETS vs BURNOUT SETS:
   - Multiple working sets of same exercise = separate rounds
   - Burnout sets = separate round with variation: "burnout"
   - Example: "3 working sets of 5 reps at 175lbs, then burnout set of 12 reps at 135lbs"
     * Round 1: 175lbs x 5, Round 2: 175lbs x 5, Round 3: 175lbs x 5, Round 4: 135lbs x 12 (burnout)

   D. WARMUP vs WORKING SETS:
   - Warmup sets: Can be grouped or separate rounds (use judgment based on detail provided)
   - Working sets: Always separate rounds for proper progression tracking

   E. DETAILED STRENGTH_THEN_METCON EXAMPLE:
   User says: "I did front squats with 3 working sets at 5 reps each at 175 pounds, then a burnout set with 135 pounds for 12 reps. Then I did bench press with 3 working sets of 225 pounds, then a burnout set of 175 pounds at 10 reps. Then I did the Metcon where I rowed and did kettlebell swings for 6 rounds. I rowed for 250m and then 15 American kettlebell swings at 55 pounds with 90 seconds rest between rounds."

   CORRECT STRUCTURE:
   - Round 1: Front squat 175lbs x 5 (working set 1)
   - Round 2: Front squat 175lbs x 5 (working set 2)
   - Round 3: Front squat 175lbs x 5 (working set 3)
   - Round 4: Front squat 135lbs x 12 (burnout set, variation: "burnout")
   - Round 5: Bench press 225lbs x 5 (working set 1)
   - Round 6: Bench press 225lbs x 5 (working set 2)
   - Round 7: Bench press 225lbs x 5 (working set 3)
   - Round 8: Bench press 175lbs x 10 (burnout set, variation: "burnout")
   - Round 9: Row 250m + KB swings 15 reps (metcon round 1, rest: 90 seconds)
   - Round 10: Row 250m + KB swings 15 reps (metcon round 2, rest: 90 seconds)
   - Round 11: Row 250m + KB swings 15 reps (metcon round 3, rest: 90 seconds)
   - Round 12: Row 250m + KB swings 15 reps (metcon round 4, rest: 90 seconds)
   - Round 13: Row 250m + KB swings 15 reps (metcon round 5, rest: 90 seconds)
   - Round 14: Row 250m + KB swings 15 reps (metcon round 6, no rest after final round)

   Total rounds_completed: 14

   F. PERFORMANCE_DATA FOR MULTI-PHASE WORKOUTS:
   - total_time: Overall workout duration (strength + metcon combined)
   - rounds_completed: Total number of rounds across ALL phases
   - total_reps: Sum of all reps from all exercises (optional, calculate if clear)
   - round_times: Only applicable for timed rounds (usually metcon portion)

   G. JSON SIZE OPTIMIZATION STRATEGIES:
   - WARMUP CONSOLIDATION: Group warmup sets into single rounds with progression notes
   - OMIT REDUNDANT NULLS: Only include null fields that are contextually important
   - CONCISE FORM NOTES: Use brief, descriptive notes rather than verbose explanations
   - METCON EFFICIENCY: For repeated AMRAP rounds, use round_number progression but avoid duplicate exercise details
   - WEIGHT OBJECTS: Only include relevant weight fields (omit rx_weight/scaled_weight if not applicable)
   - MINIMAL NESTED OBJECTS: Flatten structures where possible without losing data integrity
   - STRENGTH+METCON OPTIMIZATION: For "strength then metcon" format, consolidate warmup progression into 1-2 rounds max

UNIVERSAL WORKOUT SCHEMA STRUCTURE:
You must extract data into this exact JSON structure. Use null for missing data, never omit fields.

CRITICAL EFFICIENCY RULE: For workouts with >8 rounds, apply aggressive consolidation:
- Consolidate warmup progressions into 1-2 rounds maximum
- Use concise form_notes to capture progression details
- Omit null fields that don't add contextual value
- Prioritize working sets and metcon rounds for individual tracking

{
  "workout_id": "auto_generated_by_system",
  "user_id": "auto_populated_by_system",
  "date": "YYYY-MM-DD format of workout completion",
  "discipline": "crossfit|powerlifting|bodybuilding|hiit|running|swimming|cycling|yoga|martial_arts|climbing|hybrid",
  "methodology": "string (e.g., comptrain, westside_conjugate, etc.)",
  "workout_name": "string (e.g., Fran, Murph, custom name)",
  "workout_type": "strength|cardio|flexibility|skill|competition|recovery|conditioning|hybrid",
  "duration": "number (total workout duration in minutes)",
  "location": "gym|box|home|outdoors|online|other",

  "performance_metrics": {
    "intensity": "integer 1-10 (perceived intensity)",
    "perceived_exertion": "integer 1-10 (RPE scale)",
    "heart_rate": {
      "avg": "number|null",
      "max": "number|null",
      "zones": {
        "zone_1": "number|null (seconds in zone)",
        "zone_2": "number|null",
        "zone_3": "number|null",
        "zone_4": "number|null",
        "zone_5": "number|null"
      }
    },
    "calories_burned": "number|null (estimated if not provided)",
    "mood_pre": "integer 1-10|null",
    "mood_post": "integer 1-10|null",
    "energy_level_pre": "integer 1-10|null",
    "energy_level_post": "integer 1-10|null"
  },

  "discipline_specific": {
    "crossfit": {
      "workout_format": "for_time|amrap|emom|tabata|ladder|chipper|death_by|intervals|strength_then_metcon|hero_workout|custom",
      "time_cap": "number (seconds)|null",
      "rx_status": "rx|scaled|modified",
      "rounds": [
        {
          "round_number": "integer",
          "exercises": [
            {
              "exercise_name": "string (standardized name)",
              "movement_type": "barbell|dumbbell|kettlebell|bodyweight|gymnastics|cardio|other",
              "variation": "string|null (kipping, strict, butterfly, etc.)",
              "assistance": "string|null (none, band, box, etc.)",
              "weight": {
                "value": "number|null",
                "unit": "lbs|kg",
                "percentage_1rm": "number|null",
                "rx_weight": "number|null",
                "scaled_weight": "number|null"
              },
              "reps": {
                "prescribed": "number",
                "completed": "number",
                "broken_sets": "array of numbers|null",
                "rest_between_sets": "array of seconds|null"
              },
              "distance": "number|null (in meters)",
              "calories": "number|null",
              "time": "number|null (in seconds)",
              "form_notes": "string|null"
            }
          ]
        }
      ],
      "performance_data": {
        "total_time": "number (seconds)|null",
        "rounds_completed": "number",
        "total_reps": "number|null",
        "round_times": "array of seconds|null"
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
    "enjoyment": "integer 1-10|null",
    "difficulty": "integer 1-10|null",
    "form_quality": "integer 1-10|null",
    "motivation": "integer 1-10|null",
    "confidence": "integer 1-10|null",
    "mental_state": "focused|distracted|motivated|tired|energetic|stressed|calm|null",
    "pacing_strategy": "even_split|negative_split|positive_split|went_out_too_fast|conservative|null",
    "nutrition_pre_workout": "string|null",
    "hydration_level": "poor|fair|good|excellent|null",
    "sleep_quality_previous": "integer 1-10|null",
    "stress_level": "integer 1-10|null",
    "soreness_pre": {
      "overall": "integer 1-10|null",
      "legs": "integer 1-10|null",
      "arms": "integer 1-10|null",
      "back": "integer 1-10|null"
    },
    "soreness_post": {
      "overall": "integer 1-10|null",
      "legs": "integer 1-10|null",
      "arms": "integer 1-10|null",
      "back": "integer 1-10|null"
    },
    "notes": "string|null"
  },

  "coach_notes": {
    "programming_intent": "string|null",
    "coaching_cues_given": "array of strings|null",
    "areas_for_improvement": "array of strings|null",
    "positive_observations": "array of strings|null",
    "next_session_focus": "string|null",
    "adaptation_recommendations": "array of strings|null",
    "safety_flags": "array of strings",
    "motivation_strategy": "string|null"
  },

  "metadata": {
    "logged_via": "conversation",
    "logging_time": "number (seconds to log)|null",
    "data_confidence": "number 0-1 (confidence in extraction accuracy)",
    "ai_extracted": true,
    "user_verified": false,
    "version": "1.0",
    "schema_version": "2.0",
    "data_completeness": "number 0-1 (how complete the data is)",
    "extraction_method": "claude_conversation_analysis",
    "validation_flags": "array of strings (missing_heart_rate, estimated_calories, etc.)",
    "extraction_notes": "string|null"
  }
}
`;
};

/**
 * Recursively converts all undefined values to null in an object
 * This ensures consistent data structure for DynamoDB storage
 */
const convertUndefinedToNull = (obj: any): any => {
  if (obj === undefined) {
    return null;
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertUndefinedToNull(item));
  }

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = convertUndefinedToNull(obj[key]);
    }
  }
  return result;
};

/**
 * Parses and validates the extracted workout data from Claude's response
 */
export const parseAndValidateWorkoutData = async (extractedData: string, userId: string): Promise<UniversalWorkoutSchema> => {
  try {
    // Log the raw response for debugging
    console.info('Raw Claude response length:', extractedData.length);
    console.info('Raw Claude response preview (first 500 chars):', extractedData.substring(0, 500));
    console.info('Raw Claude response end (last 500 chars):', extractedData.substring(Math.max(0, extractedData.length - 500)));

    // Store raw response in S3 for debugging large responses
    console.info('Storing Bedrock response in S3 for debugging...');
    storeDebugDataInS3(extractedData, {
      userId,
      type: 'large-raw-response',
      length: extractedData.length,
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.warn('Failed to store large response in S3:', error);
    });

    // Check if response starts and ends with proper JSON structure
    const trimmedData = extractedData.trim();
    if (!trimmedData.startsWith('{')) {
      console.error('Response does not start with {. First 100 chars:', trimmedData.substring(0, 100));
      throw new Error('Response does not start with valid JSON opening brace');
    }
    if (!trimmedData.endsWith('}')) {
      console.error('Response does not end with }. Last 100 chars:', trimmedData.substring(Math.max(0, trimmedData.length - 100)));
      throw new Error('Response does not end with valid JSON closing brace');
    }

    // Parse the JSON response
    const workoutData = JSON.parse(extractedData);

    // Set system-generated fields
    workoutData.workout_id = `ws_${userId}_${Date.now()}`;
    workoutData.user_id = userId;

    // Ensure required fields have defaults
    if (!workoutData.date) {
      workoutData.date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD
    }

    if (!workoutData.discipline) {
      workoutData.discipline = 'hybrid';
    }

    if (!workoutData.workout_type) {
      workoutData.workout_type = 'hybrid';
    }



    // Ensure complete metadata structure according to Universal Workout Schema
    if (!workoutData.metadata) {
      workoutData.metadata = {};
    }

    // Set default values for all required metadata fields
    workoutData.metadata.logged_via = 'conversation';
    workoutData.metadata.logging_time = workoutData.metadata.logging_time || null;
    workoutData.metadata.data_confidence = workoutData.metadata.data_confidence || 0.5;
    workoutData.metadata.ai_extracted = true;
    workoutData.metadata.user_verified = false;
    workoutData.metadata.version = '1.0';
    workoutData.metadata.schema_version = '2.0';
    workoutData.metadata.data_completeness = workoutData.metadata.data_completeness || 0.5;
    workoutData.metadata.extraction_method = 'claude_conversation_analysis';
    workoutData.metadata.validation_flags = workoutData.metadata.validation_flags || [];
    workoutData.metadata.extraction_notes = workoutData.metadata.extraction_notes || null;

    // Convert all undefined values to null for consistent DynamoDB storage
    const cleanedWorkoutData = convertUndefinedToNull(workoutData);

    return cleanedWorkoutData as UniversalWorkoutSchema;
    } catch (error) {
    console.error('Error parsing workout data:', error);
    console.error('Raw extracted data length:', extractedData.length);

    // Store the problematic response in S3 for debugging
    try {
      const s3Location = await storeDebugDataInS3(extractedData, {
        userId,
        type: 'json-parse-error',
        length: extractedData.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      console.error('Problematic response stored in S3:', s3Location);
    } catch (s3Error) {
      console.warn('Failed to store problematic response in S3:', s3Error);
    }

    // If it's a JSON parsing error, try to identify the problematic location
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error('JSON Syntax Error Details:', error.message);

      // Try to find the position mentioned in the error
      const positionMatch = error.message.match(/position (\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const contextStart = Math.max(0, position - 200);
        const contextEnd = Math.min(extractedData.length, position + 200);

        console.error('Context around error position:', {
          position,
          contextStart,
          contextEnd,
          contextBefore: extractedData.substring(contextStart, position),
          contextAfter: extractedData.substring(position, contextEnd)
        });
      }

      // Try to validate JSON structure by checking for common issues
      const commonIssues = [
        { pattern: /,\s*}/, issue: 'Trailing comma before closing brace' },
        { pattern: /,\s*]/, issue: 'Trailing comma before closing bracket' },
        { pattern: /}\s*{/, issue: 'Missing comma between objects' },
        { pattern: /]\s*\[/, issue: 'Missing comma between arrays' },
        { pattern: /"\s*"/, issue: 'Missing comma between strings' },
        { pattern: /\n\s*"[^"]*":\s*"[^"]*"\n\s*"/, issue: 'Missing comma between object properties' }
      ];

      commonIssues.forEach(({ pattern, issue }) => {
        const matches = extractedData.match(pattern);
        if (matches) {
          console.error(`Potential JSON issue found: ${issue}`, matches[0]);
        }
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Failed to parse workout data: ${errorMessage}`);
  }
};

/**
 * Calculates confidence score based on the extracted data quality
 */
export const calculateConfidence = (workoutData: UniversalWorkoutSchema): number => {
  let confidence = 0.5; // Base confidence

  // Higher confidence for explicit data
  if (workoutData.workout_name) confidence += 0.2;
  if (workoutData.discipline_specific?.crossfit?.performance_data?.total_time) confidence += 0.2;
  if (workoutData.performance_metrics?.perceived_exertion) confidence += 0.1;
  if (workoutData.subjective_feedback?.notes) confidence += 0.1;

  // Lower confidence for validation flags
  const validationFlags = workoutData.metadata.validation_flags || [];
  confidence -= validationFlags.length * 0.05;

  return Math.max(0.1, Math.min(1.0, confidence));
};

/**
 * Extracts the completed time from user message if explicitly mentioned
 */
export const extractCompletedAtTime = (userMessage: string): Date | null => {
  // Look for explicit time references like "yesterday", "this morning", etc.
  const timeIndicators: TimeIndicator[] = [
    { pattern: /yesterday/i, offset: -1 },
    { pattern: /this morning/i, offset: 0, hour: 9 },
    { pattern: /earlier today/i, offset: 0, hour: 14 },
    { pattern: /last night/i, offset: -1, hour: 19 }
  ];

  for (const indicator of timeIndicators) {
    if (indicator.pattern.test(userMessage)) {
      const date = new Date();
      date.setDate(date.getDate() + indicator.offset);
      if (indicator.hour) {
        date.setHours(indicator.hour, 0, 0, 0);
      }
      return date;
    }
  }

  return null; // Default to current time
};

/**
 * Generate AI summary for workout context and UI display
 */
export const generateWorkoutSummary = async (workoutData: UniversalWorkoutSchema, originalMessage: string): Promise<string> => {
  const summaryPrompt = `
You are a fitness coach creating a concise summary of a completed workout for coaching context and display.

WORKOUT DATA:
${JSON.stringify(workoutData, null, 2)}

ORIGINAL USER MESSAGE:
"${originalMessage}"

Create a 2-3 sentence summary that captures:
1. What workout was completed (name, discipline, key movements) - be sure to include any workout names included in the WORKOUT DATA section.
2. Key performance highlights (weights, times, rounds, notable achievements, reps, sets)
3. Any relevant context (conditions, how it felt, modifications)

Keep it concise, engaging, and useful for coaching reference. Focus on the most important performance details.

EXAMPLE GOOD SUMMARIES:
- "Completed Fran (21-15-9 thrusters/pull-ups) in 8:47 Rx. Strong performance with unbroken thrusters in first round and only 2 breaks on pull-ups."
- "Heavy deadlift session with 5x3 at 315lbs, hitting a new 3RM. Form stayed solid throughout with controlled negatives."
- "30-minute EMOM alternating air squats and push-ups. Maintained consistent pace despite fatigue, completing all 15 rounds as prescribed."

SUMMARY:`;

  try {
    const response = await callBedrockApi(summaryPrompt, originalMessage);

    // Clean up the response - remove any prefix like "SUMMARY:" and trim
    const cleanSummary = response.trim();

    return cleanSummary;
  } catch (error) {
    console.error('Error generating workout summary:', error);

    // Fallback to basic summary if AI fails
    const workoutName = workoutData.workout_name || 'Workout';
    const discipline = workoutData.discipline || '';
    const duration = workoutData.duration ? `${workoutData.duration}min` : '';

    let fallback = `Completed ${workoutName}`;
    if (discipline) fallback += ` (${discipline})`;
    if (duration) fallback += ` in ${duration}`;

    return fallback;
  }
};