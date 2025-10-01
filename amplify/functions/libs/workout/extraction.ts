/**
 * Workout Session Extraction Library
 *
 * This module provides functionality for extracting structured workout data
 * from natural language using the Universal Workout Schema.
 */

import { CoachConfig } from "../coach-creator/types";
import {
  TimeIndicator,
  UniversalWorkoutSchema,
  DisciplineClassification,
} from "./types";
import { storeDebugDataInS3, callBedrockApi, MODEL_IDS } from "../api-helpers";
import { cleanResponse, fixMalformedJson } from "../response-utils";
import { getSchemaWithContext } from "../schemas/universal-workout-schema";

/**
 * Simple complexity check to determine if thinking should be enabled
 */
export const checkWorkoutComplexity = (workoutContent: string): boolean => {
  const content = workoutContent.toLowerCase();

  // Check for multiple phases
  const phaseIndicators = ['warmup', 'warm-up', 'warm up', 'working', 'cooldown', 'cool-down', 'cool down', 'metcon', 'strength'];
  const phaseMatches = phaseIndicators.filter(indicator => content.includes(indicator)).length;

  // Check for complex structures
  const complexityIndicators = [
    /\d+\s*rounds/gi,     // Multiple rounds
    /\d+\s*sets/gi,       // Multiple sets
    /superset/gi,         // Supersets
    /circuit/gi,          // Circuits
    /emom/gi,             // EMOM
    /tabata/gi,           // Tabata
    /for\s+time/gi,       // For time
    /amrap/gi,            // AMRAP
    /\d+:\d+/g,           // Time notation
    /\d+\s*x\s*\d+/gi,    // Rep schemes like 5x5
  ];

  const complexMatches = complexityIndicators.filter(pattern => pattern.test(content)).length;

  // Enable thinking for complex workouts
  const isComplex = phaseMatches >= 2 || complexMatches >= 3 || workoutContent.length > 800;

  console.info("Workout complexity analysis:", {
    phaseMatches,
    complexMatches,
    contentLength: workoutContent.length,
    isComplex
  });

  return isComplex;
};

/**
 * Detects if a workout is likely to be complex and need optimization
 */
export const isComplexWorkout = (userMessage: string): boolean => {
  const complexityIndicators = [
    // Original indicators
    /warmup.*\d+.*\d+.*\d+/i, // Multiple warmup weights
    /\d+\s*sets.*\d+\s*reps/i, // Multiple sets mentioned
    /amrap.*\d+.*rounds/i, // AMRAP with multiple rounds
    /strength.*metcon/i, // Strength + metcon combination
    /\d+\s*rounds.*\d+\s*rounds/i, // Multiple round mentions
    /progression/i, // Progression workouts
    /then.*then/i, // Multiple phases (then X then Y)

    // Enhanced multi-phase detection
    /metcon.*strength|strength.*metcon/i, // Strength/metcon combos
    /warmup.*working.*cooldown/i, // Full workout phases
    /part\s*[12].*part\s*[12]/i, // Explicit part mentions
    /phase\s*[12].*phase\s*[12]/i, // Phase mentions

    // Complex rep schemes
    /\d+[-x]\d+[-x]\d+/i, // 21-15-9 patterns
    /\d+\s*sets.*\d+\s*reps.*\d+\s*(lbs?|kg|#)/i, // Sets+reps+weight
    /ladder|pyramid|wave/i, // Progressive schemes
    /ascending|descending/i, // Progressive patterns

    // Interval complexity
    /\d+\s*rounds.*\d+\s*minutes.*rest/i, // Timed intervals
    /emom.*\d+.*minutes/i, // EMOM duration
    /tabata|intervals?/i, // Interval formats
    /\d+\s*on\s*\d+\s*off/i, // Work/rest patterns

    // Movement complexity
    /superset|circuit|complex/i, // Complex formats
    /then|followed\s*by|after/i, // Sequential phases
    /(\w+\s+){6,}/i, // Dense descriptions (6+ consecutive words)
    /\d+\s*exercises?/i, // Multiple exercise mentions

    // Equipment/setup complexity
    /barbell.*dumbbell|dumbbell.*barbell/i, // Multiple equipment
    /\d+\s*(stations?|movements?)/i, // Multi-station workouts
    /rotate|switch/i, // Equipment rotation

    // Time domain complexity
    /\d+\s*minutes.*\d+\s*minutes/i, // Multiple time domains
    /sprint.*endurance|endurance.*sprint/i, // Mixed energy systems
  ];

  const matchCount = complexityIndicators.filter((pattern) =>
    pattern.test(userMessage)
  ).length;
  const messageLength = userMessage.length;
  const wordCount = userMessage.split(/\s+/).length;

  // Complex if multiple indicators OR very long message OR very detailed
  return matchCount >= 2 || messageLength > 500 || wordCount > 100;
};

/**
 * Validates workout structure for common issues and inconsistencies
 */
export const validateWorkoutStructure = (workoutData: any): {
  hasIssues: boolean;
  issues: string[];
  severity: 'minor' | 'major' | 'critical';
} => {
  const issues: string[] = [];
  let severity: 'minor' | 'major' | 'critical' = 'minor';

  // Check for basic structure
  if (!workoutData.rounds || !Array.isArray(workoutData.rounds)) {
    issues.push('Missing or invalid rounds array');
    severity = 'critical';
    return { hasIssues: true, issues, severity };
  }

  const rounds = workoutData.rounds;

  // 1. Round consistency checks
  const roundStructures = rounds.map((round: any, index: number) => {
    const structure = {
      hasRoundNumber: typeof round.round_number === 'number',
      hasPhase: typeof round.phase === 'string',
      hasExercises: Array.isArray(round.exercises),
      exerciseCount: Array.isArray(round.exercises) ? round.exercises.length : 0,
      fields: Object.keys(round || {}).sort()
    };

    if (!structure.hasRoundNumber) {
      issues.push(`Round ${index + 1} missing round_number`);
    }
    if (!structure.hasExercises) {
      issues.push(`Round ${index + 1} missing or invalid exercises array`);
      severity = 'major';
    }

    return structure;
  });

  // Check for inconsistent round structures
  const firstRoundFields = roundStructures[0]?.fields || [];
  const inconsistentRounds = roundStructures.filter((struct: any, index: number) =>
    JSON.stringify(struct.fields) !== JSON.stringify(firstRoundFields)
  );

  if (inconsistentRounds.length > 0) {
    issues.push(`Inconsistent round structures detected in ${inconsistentRounds.length} rounds`);
    if (severity === 'minor') severity = 'major';
  }

  // 2. Exercise object uniformity checks
  const allExercises = rounds.flatMap((round: any) => round.exercises || []);
  if (allExercises.length > 0) {
    const exerciseStructures = allExercises.map((exercise: any) =>
      Object.keys(exercise || {}).sort()
    );

    const firstExerciseFields = exerciseStructures[0] || [];
    const inconsistentExercises = exerciseStructures.filter((fields: string[]) =>
      JSON.stringify(fields) !== JSON.stringify(firstExerciseFields)
    );

    if (inconsistentExercises.length > 0 && allExercises.length > 1) {
      issues.push(`Inconsistent exercise structures across ${inconsistentExercises.length} exercises`);
      if (severity === 'minor') severity = 'major';
    }

    // Check for missing required exercise fields
    allExercises.forEach((exercise: any, index: number) => {
      if (!exercise.exercise_name || typeof exercise.exercise_name !== 'string') {
        issues.push(`Exercise ${index + 1} missing exercise_name`);
        severity = 'major';
      }
    });
  }

  // 3. Logical grouping checks (phase consistency)
  const phaseRounds = rounds.reduce((acc: any, round: any) => {
    const phase = round.phase || 'unknown';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(round);
    return acc;
  }, {});

  // Check for mixed time domains in same phase
  Object.entries(phaseRounds).forEach(([phase, phaseRounds]: [string, any]) => {
    if (phase === 'working' && phaseRounds.length > 1) {
      // Look for strength/metcon mixing in working rounds
      const hasHeavyStrength = phaseRounds.some((round: any) =>
        round.exercises?.some((ex: any) =>
          ex.weight?.value > 200 || // Heavy weights
          (ex.reps?.prescribed && ex.reps.prescribed <= 5) // Low rep ranges
        )
      );

      const hasMetcon = phaseRounds.some((round: any) =>
        round.exercises?.some((ex: any) =>
          ex.reps?.prescribed > 15 || // High rep ranges
          ['thruster', 'burpee', 'pull-up', 'push-up'].includes(ex.exercise_name?.toLowerCase())
        )
      );

      if (hasHeavyStrength && hasMetcon) {
        issues.push('Potential strength/metcon mixing detected in working rounds');
        if (severity === 'minor') severity = 'major';
      }
    }
  });

  // 4. Movement naming consistency
  const exerciseNames = allExercises.map((ex: any) => ex.exercise_name?.toLowerCase()).filter(Boolean);
  const nameVariations = exerciseNames.reduce((acc: any, name: string) => {
    const normalized = name.replace(/[^a-z]/g, ''); // Remove spaces, hyphens
    if (!acc[normalized]) acc[normalized] = new Set();
    acc[normalized].add(name);
    return acc;
  }, {});

  Object.entries(nameVariations).forEach(([normalized, variations]: [string, any]) => {
    if (variations.size > 1) {
      issues.push(`Inconsistent naming for ${normalized}: ${Array.from(variations).join(', ')}`);
    }
  });

  // 5. Critical structural issues
  if (workoutData.coach_notes && typeof workoutData.coach_notes !== 'object') {
    issues.push('coach_notes should be an object at root level');
    severity = 'major';
  }

  if (workoutData.discipline_specific?.coach_notes) {
    issues.push('coach_notes incorrectly nested in discipline_specific');
    severity = 'major';
  }

  if (workoutData.performance_metrics?.discipline_specific) {
    issues.push('discipline_specific incorrectly nested in performance_metrics');
    severity = 'major';
  }

  return {
    hasIssues: issues.length > 0,
    issues,
    severity
  };
};

/**
 * Builds a comprehensive workout extraction prompt using the Universal Workout Schema
 */
export const buildWorkoutExtractionPrompt = (
  userMessage: string,
  coachConfig: CoachConfig,
  criticalTrainingDirective?: { content: string; enabled: boolean },
  userTimezone?: string
): string => {
  const isComplex = isComplexWorkout(userMessage);

  // Build directive section if enabled
  const directiveSection = criticalTrainingDirective?.enabled && criticalTrainingDirective?.content
    ? `🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:

${criticalTrainingDirective.content}

This directive takes precedence over all other instructions except safety constraints. Apply this when interpreting and structuring the workout data.

---

`
    : '';

  // Build timezone context section
  const effectiveTimezone = userTimezone || 'America/Los_Angeles';
  const currentDateTime = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: effectiveTimezone,
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: effectiveTimezone,
    timeZoneName: "short",
  };
  const formattedDate = currentDateTime.toLocaleDateString("en-US", dateOptions);
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", timeOptions);

  const timezoneSection = `📅 TEMPORAL CONTEXT:
**Current Date**: ${formattedDate}
**Current Time**: ${formattedTime}
**User Timezone**: ${effectiveTimezone}

CRITICAL TEMPORAL AWARENESS FOR WORKOUT LOGGING:
- Use THIS date/time as your reference for interpreting relative time phrases
- "this morning" means earlier TODAY (${formattedDate}), not yesterday
- "yesterday" means the calendar day before today
- "earlier today" or "earlier" means sometime earlier on ${formattedDate}
- Consider the current time (${formattedTime}) when interpreting time references
- If user says "this morning" and it's now afternoon/evening, the workout was earlier TODAY
- Only mark a workout as "yesterday" if it was truly completed on the previous calendar day

---

`;

  return `
${directiveSection}${timezoneSection}${isComplex ? "COMPLEX WORKOUT DETECTED - APPLY AGGRESSIVE OPTIMIZATION!" : ""}

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

CRITICAL JSON STRUCTURE VALIDATION:
- Each opening brace { must have exactly ONE matching closing brace }
- Each opening bracket [ must have exactly ONE matching closing bracket ]
- Count your braces: total opening braces must equal total closing braces exactly
- Count your brackets: total opening brackets must equal total closing brackets exactly
- For complex nested structures with 20+ rounds, be extra careful with overall balance
- Multiple consecutive closing characters (like }]}) are VALID when closing nested structures
- Focus on total count balance, not consecutive characters

EXTRACTION REQUIREMENTS:
- Include ALL schema fields, use null for missing data
- Provide detailed extraction_notes explaining your reasoning
- Be conservative with confidence scores - better to underestimate than overestimate
- Focus on accuracy over completeness
- For complex multi-phase workouts, break into clear round structures
- EFFICIENCY: For workouts with >10 rounds, group similar warmup sets to stay within token limits
- JSON OPTIMIZATION: Use concise structures and avoid repetitive null fields where possible
- WORKOUT NAMING: Use user-provided names when mentioned, otherwise ALWAYS generate Latin-inspired names
  * If user provides a name ("I did Fran", "workout called XYZ"), use that exact name
  * MANDATORY: When no explicit name is provided, create a Latin/Roman-inspired name (e.g., "Fortis Vigor", "Gladiator Complex", "Infernus Maximus", "Tempestus Power", "Dominus Strength")
  * DO NOT use generic English descriptive names like "Power & Conditioning Complex" - always use Latin-inspired naming
  * Latin naming adds character and memorability to workouts - this is a key feature
${isComplex ? "- COMPLEX WORKOUT OPTIMIZATION: Consolidate warmup rounds, use minimal weight objects, prioritize working sets and metcon rounds" : ""}

You are an expert fitness data extraction AI that converts natural language workout descriptions into structured data following the Universal Workout Schema v2.0.

USER WORKOUT DESCRIPTION:
"${userMessage}"

COACH CONTEXT:
- Coach Name: ${coachConfig.coach_name}
- Primary Methodology: ${coachConfig.selected_methodology?.primary_methodology || "general"}
- Coach Specializations: ${coachConfig.technical_config?.specializations?.join(", ") || "general fitness"}
- Programming Focus: ${coachConfig.technical_config?.programming_focus?.join(", ") || "general"}
- Preferred Intensity: ${coachConfig.technical_config?.preferred_intensity || "moderate"}
- Equipment Available: ${coachConfig.technical_config?.equipment_available?.join(", ") || "standard gym"}

COMPLEX WORKOUT STRUCTURE EXAMPLES:

1. MULTI-PHASE WORKOUTS:
   Structure as separate round categories with clear time domain separation:
   - Warmup rounds: strength building sets (lighter weights, progressive)
   - Working rounds: main workout content (heaviest loads or metcon)
   - Cooldown rounds: accessory work (stretching, mobility)

   Example Structure:
   rounds: [
     {round_number: 1, phase: "warmup", exercises: [...]},
     {round_number: 2, phase: "warmup", exercises: [...]},
     {round_number: 3, phase: "working", exercises: [...]},
     {round_number: 4, phase: "working", exercises: [...]},
     {round_number: 5, phase: "cooldown", exercises: [...]}
   ]

2. INTERVAL WORKOUTS (EMOM/Tabata/Circuits):
   Each interval = separate round with consistent structure:
   - Round 1: EMOM minute 1 exercises
   - Round 2: EMOM minute 2 exercises
   - Use consistent exercise field patterns within all rounds
   - Mark intervals with phase: "working" and note timing in round metadata

3. SUPERSET/CIRCUIT STRUCTURE:
   Group related exercises in same round:
   - Round 1: [Exercise A, Exercise B] (performed together)
   - Round 2: [Exercise A, Exercise B] (repeat superset)
   - Keep paired movements together, use consistent naming

4. COMPLEX REP SCHEMES (21-15-9, Ladders, Pyramids):
   Each rep range = separate round:
   - Round 1: 21 reps of each movement
   - Round 2: 15 reps of each movement
   - Round 3: 9 reps of each movement
   - Maintain exercise order and structure across rounds

CRITICAL ROUND STRUCTURE RULES:

1. CONSISTENCY: All rounds in a workout must follow the same structure pattern
2. LOGICAL GROUPING: Group exercises that happen simultaneously or sequentially
3. TIME DOMAIN RESPECT: Don't mix strength work with metcon in same round unless explicitly stated
4. MOVEMENT PAIRING: Keep paired movements (supersets) in the same round
5. PROGRESSION TRACKING: Use consistent field names across rounds for same exercises
6. PHASE CLARITY: Use clear phase markers ("warmup", "working", "cooldown")

WRONG EXAMPLES:
- Mixing different exercise object structures within same workout
- Putting warmup and working sets in same round
- Inconsistent exercise naming across rounds ("pull-up" vs "pullup")

CORRECT EXAMPLES:
- Consistent exercise objects across all rounds
- Clear phase separation with logical round grouping
- Uniform field structures for all exercises

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
   - Max Effort Detection: "max pull-ups", "to failure", "max effort", "AMRAP" → prescribed: "max" (never use 999)
   - Score Extraction: Determine primary performance metric based on workout format:
     * For Time workouts: score = {value: total_time, type: "time", unit: "seconds"}
     * AMRAP workouts: score = {value: rounds_completed, type: "rounds"} or {value: total_reps, type: "reps"}
     * EMOM workouts: score = {value: weight_used, type: "weight", unit: "lbs/kg"} or {value: reps_maintained, type: "reps"}
     * Max effort: score = {value: max_achieved, type: "reps"}
     * Examples: "Fran in 8:57" → score: {value: 537, type: "time", unit: "seconds"}, "12 rounds + 5 reps" → score: {value: "12+5", type: "rounds"}

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

6.5. CRITICAL PARTNER WORKOUT INTERPRETATION:
   - PARTNER WORKOUTS: When users mention partner workouts, determine the work-sharing format
   - ALTERNATING STYLE ("I go, you rest" format):
     * User only performs approximately HALF the total volume mentioned
     * Example: "We did 10 rounds, alternating" → User completed ~5 rounds personally
     * Example: "Partner WOD: 20 rounds total, switching every round" → User did ~10 rounds
     * Example: "Did Murph with my daughter, alternating exercises" → User did ~50 pull-ups, ~100 push-ups, ~150 squats (half of prescribed)
   - SYNCHRONIZED STYLE ("we both do it together" format):
     * User performs the FULL volume mentioned alongside their partner
     * Example: "Partner workout: we both did 5 rounds each" → User completed 5 full rounds
     * Example: "We did Fran together, same time" → User did full 21-15-9 scheme
   - DETECTION KEYWORDS:
     * Alternating style: "alternating", "switching", "I go you rest", "taking turns", "partner style", "splitting the work"
     * Synchronized style: "together", "same time", "both did", "in sync", "parallel"
   - VOLUME CALCULATION RULES:
     * For alternating: rounds_completed = total_mentioned ÷ 2, reps = total_mentioned ÷ 2
     * For synchronized: rounds_completed = total_mentioned, reps = total_mentioned
     * When format is unclear, ask user or note in extraction_notes for clarification
   - PARTNER WORKOUT EXAMPLES:
     * "Did a partner WOD with my daughter, 20 rounds alternating" → rounds_completed: 10 (user's portion)
     * "Partner Murph switching every exercise" → each exercise count ÷ 2 for user
     * "We both crushed Fran at the same time" → full volume for user (synchronized)
     * "10 rounds total, I did 5, she did 5" → rounds_completed: 5 (user's explicit portion)

7. STANDARDIZATION:
   - Exercise names: Use standard terms (thruster not "front squat to press", pull-up not "chin-up")
   - Units: Be consistent (convert if needed, note original)
   - Times: CRITICAL - ALL time values MUST be in seconds (duration, total_time, round_times, rest_between_sets)
     * "8 minutes 57 seconds" → 537 seconds
     * "45 minute workout" → 2700 seconds
     * "1:30 rest" → 90 seconds
   - CrossFit Movement Standards: Use official CrossFit terminology (chest-to-bar pull-up, box jump, wall ball, etc.)

7.5. EQUIPMENT TERMINOLOGY INTERPRETATION:
   - "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement
   - Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells
   - "Single DB" means using one dumbbell for the movement
   - "Alternating" means switching between arms/sides but count total reps, not per side
   - "Each arm" or "per arm" means multiply by 2 (e.g., "10 reps each arm" = 20 total reps)
   - When in doubt about equipment terminology, count the TOTAL movement repetitions performed

7.6. CRITICAL: BILATERAL DUMBBELL WEIGHT CALCULATION:
   - WEIGHT NOTATION vs REP NOTATION are fundamentally different concepts
   - WEIGHT NOTATION ("each hand", "per hand", "both hands"):
     * "50# each hand" = 50 pounds PER dumbbell × 2 dumbbells = 100 pounds TOTAL LOAD
     * "30kg per hand" = 30kg PER dumbbell × 2 dumbbells = 60kg TOTAL LOAD
     * "both hands" with bilateral movements = calculate total load across both dumbbells
     * Record the TOTAL TRAINING LOAD, not per-dumbbell weight
   - REP NOTATION ("each arm", "per arm", "per side"):
     * "10 reps each arm" = 10 PER arm × 2 arms = 20 total reps
     * "15 lunges per side" = 15 PER side × 2 sides = 30 total reps
     * Record the TOTAL REPETITIONS performed
   - BILATERAL DUMBBELL MOVEMENTS requiring total load calculation:
     * Thrusters, overhead press, bench press, rows, deadlifts, curls, etc.
     * Any movement where TWO dumbbells are used simultaneously
   - UNILATERAL MOVEMENTS (keep per-dumbbell weight):
     * Single-arm rows, single-arm presses, alternating movements
     * Only use ONE dumbbell at a time
   - WEIGHT CALCULATION EXAMPLES:
     * "4 DB thrusters 50# each hand" → weight: {value: 100, unit: "lbs"} (50×2)
     * "DB bench press 30kg per hand" → weight: {value: 60, unit: "kg"} (30×2)
     * "Single-arm row 40# each arm" → weight: {value: 40, unit: "lbs"} (unilateral, no doubling)
     * "Alternating DB press 25kg" → weight: {value: 25, unit: "kg"} (alternating, no doubling)

8. CROSSFIT EXTRACTION EXAMPLES:
   - "Did Fran in 8:57 with 95lb thrusters" → workout_name: "Fran", total_time: 537, rx_status: "rx", score: {value: 537, type: "time", unit: "seconds"}
   - "Scaled Murph with 65lb thrusters" → workout_name: "Murph", rx_status: "scaled", scaled_weight: 65
   - "Today's workout was called Death by Burpees" → workout_name: "Death by Burpees" (preserve user name)
   - "I did squats then burpees and pull-ups" → workout_name: "Gladiator Complex" (Latin name for unnamed workout)
   - "Completed a strength and conditioning session" → workout_name: "Fortis Vigor" (Latin name for unnamed workout)
   - "Did landmine work then front squats and a metcon finisher" → workout_name: "Infernus Maximus" (Latin name for multi-phase workout)
   - "Then max strict pull-ups - I got 15" → reps: {prescribed: "max", completed: 15} (use "max" not 999)
   - "Finished with max push-ups to failure" → reps: {prescribed: "max", completed: [actual number]} (use "max" for max effort)
   - "20 minute AMRAP: 5 pull-ups, 10 push-ups, 15 squats - got 12 rounds" → workout_format: "amrap", rounds_completed: 12, score: {value: 12, type: "rounds"}
   - "AMRAP got 12 rounds plus 5 reps" → rounds_completed: 12, score: {value: "12+5", type: "rounds"}
   - "EMOM 10: 3 thrusters at 135" → workout_format: "emom", time_cap: 600, weight: 135, create 10 separate rounds
   - "30min EMOM completed 6 rounds" → 6 separate round objects in rounds array, NOT 1 template round
   - "Broke the 21 thrusters into 10-6-5" → broken_sets: [10, 6, 5]
   - "3 sets of squats at 185, then 5 rounds of burpees and pull-ups" → workout_format: "strength_then_metcon", rounds_completed: 8 (3 squat rounds + 5 metcon rounds)
   - "4 DB thrusters 50# each hand" → weight: {value: 100, unit: "lbs"} (bilateral: 50×2=100)
   - "DB power cleans 50# both hands" → weight: {value: 100, unit: "lbs"} (bilateral: 50×2=100)
   - "Single-arm DB rows 40# each arm" → weight: {value: 40, unit: "lbs"} (unilateral: no doubling)

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

   B.1. EMOM SPECIFIC ROUND STRUCTURE:
   - CRITICAL: EMOM workouts MUST create separate rounds for each COMPLETED ROUND, not each minute
   - "30min EMOM" with 6 rounds completed = 6 separate round objects (NOT 1 template round)
   - Each round represents one complete cycle through all exercises with incremented round_number: 1, 2, 3, 4, 5, 6
   - This enables tracking performance degradation, pacing, and round-by-round analysis
   - WRONG: 1 round with exercises, performance_data.rounds_completed: 6
   - CORRECT: 6 rounds array elements, each with same exercises, performance_data.rounds_completed: 6
   - Example: "30min EMOM, 5 exercises per round, completed 6 rounds" = create 6 round objects, NOT 30

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

${getSchemaWithContext('extraction')}
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

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertUndefinedToNull(item));
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
 * Validates and converts time values to ensure they are in seconds
 */
const validateTimeInSeconds = (timeValue: any, fieldName: string): number | null => {
  if (timeValue === null || timeValue === undefined) return null;

  const numValue = Number(timeValue);
  if (isNaN(numValue)) return null;

  // If value seems too small to be seconds (likely minutes), warn but don't auto-convert
  // Let the AI handle proper conversion based on context
  if (numValue > 0 && numValue < 10 && fieldName.includes('duration')) {
    console.warn(`⚠️ Suspicious ${fieldName} value: ${numValue} (too small for seconds, might be minutes)`);
  }

  return numValue;
};

/**
 * Validates time fields in workout data to ensure they are in seconds
 */
const validateWorkoutTimes = (workoutData: any): void => {
  // Validate main duration
  if (workoutData.duration) {
    workoutData.duration = validateTimeInSeconds(workoutData.duration, 'duration');
  }

  // Validate CrossFit performance data times
  if (workoutData.discipline_specific?.crossfit?.performance_data) {
    const perfData = workoutData.discipline_specific.crossfit.performance_data;

    if (perfData.total_time) {
      perfData.total_time = validateTimeInSeconds(perfData.total_time, 'total_time');
    }

    if (perfData.round_times && Array.isArray(perfData.round_times)) {
      perfData.round_times = perfData.round_times.map((time: any, index: number) =>
        validateTimeInSeconds(time, `round_times[${index}]`)
      ).filter((time: any) => time !== null);
    }
  }

  // Validate rest times in exercises
  if (workoutData.discipline_specific?.crossfit?.rounds) {
    workoutData.discipline_specific.crossfit.rounds.forEach((round: any, roundIndex: number) => {
      if (round.exercises && Array.isArray(round.exercises)) {
        round.exercises.forEach((exercise: any, exerciseIndex: number) => {
          if (exercise.reps?.rest_between_sets && Array.isArray(exercise.reps.rest_between_sets)) {
            exercise.reps.rest_between_sets = exercise.reps.rest_between_sets.map((rest: any, restIndex: number) =>
              validateTimeInSeconds(rest, `round[${roundIndex}].exercise[${exerciseIndex}].rest_between_sets[${restIndex}]`)
            ).filter((rest: any) => rest !== null);
          }
        });
      }
    });
  }
};

/**
 * Parses and validates the extracted workout data from Claude's response
 */
export const parseAndValidateWorkoutData = async (
  extractedData: string,
  userId: string
): Promise<UniversalWorkoutSchema> => {
  try {
    // Log the raw response for debugging
    console.info("Raw Claude response length:", extractedData.length);
    console.info(
      "Raw Claude response preview (first 500 chars):",
      extractedData.substring(0, 500)
    );
    console.info(
      "Raw Claude response end (last 500 chars):",
      extractedData.substring(Math.max(0, extractedData.length - 500))
    );

    // Store raw response in S3 for debugging large responses
    console.info("Storing Bedrock response in S3 for debugging...");
    storeDebugDataInS3(extractedData, {
      userId,
      type: "large-raw-response",
      length: extractedData.length,
      timestamp: new Date().toISOString(),
    }).catch((error) => {
      console.warn("Failed to store large response in S3:", error);
    });

    // Check if response starts and ends with proper JSON structure
    const trimmedData = extractedData.trim();
    if (!trimmedData.startsWith("{")) {
      console.error(
        "Response does not start with {. First 100 chars:",
        trimmedData.substring(0, 100)
      );
      throw new Error("Response does not start with valid JSON opening brace");
    }
    if (!trimmedData.endsWith("}")) {
      console.error(
        "Response does not end with }. Last 100 chars:",
        trimmedData.substring(Math.max(0, trimmedData.length - 100))
      );
      throw new Error("Response does not end with valid JSON closing brace");
    }

    // Parse the JSON response with fallback cleaning and fixing
    let workoutData;
    try {
      workoutData = JSON.parse(extractedData);
    } catch (parseError) {
      console.warn("JSON parsing failed, attempting to clean and fix response...");
      try {
        const cleanedResponse = cleanResponse(extractedData);
        const fixedResponse = fixMalformedJson(cleanedResponse);
        workoutData = JSON.parse(fixedResponse);
        console.info("Successfully parsed response after cleaning and fixing");
      } catch (fallbackError) {
        console.error("Failed to parse workout extraction response after all attempts:", {
          originalResponse: extractedData.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Parse failed'}`);
      }
    }

    // Validate time fields are in seconds
    validateWorkoutTimes(workoutData);

    // Set system-generated fields
    workoutData.workout_id = `ws_${userId}_${Date.now()}`;
    workoutData.user_id = userId;

    // Ensure required fields have defaults
    if (!workoutData.date) {
      workoutData.date = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD
    }

    if (!workoutData.discipline) {
      workoutData.discipline = "hybrid";
    }

    if (!workoutData.workout_type) {
      workoutData.workout_type = "hybrid";
    }

    // Ensure complete metadata structure according to Universal Workout Schema
    if (!workoutData.metadata) {
      workoutData.metadata = {};
    }

    // Set default values for all required metadata fields
    workoutData.metadata.logged_via = "conversation";
    workoutData.metadata.logging_time =
      workoutData.metadata.logging_time || null;
    workoutData.metadata.data_confidence =
      workoutData.metadata.data_confidence || 0.5;
    workoutData.metadata.ai_extracted = true;
    workoutData.metadata.user_verified = false;
    workoutData.metadata.version = "1.0";
    workoutData.metadata.schema_version = "2.0";
    workoutData.metadata.data_completeness =
      workoutData.metadata.data_completeness || 0.5;
    workoutData.metadata.extraction_method = "claude_conversation_analysis";
    workoutData.metadata.validation_flags =
      workoutData.metadata.validation_flags || [];
    workoutData.metadata.extraction_notes =
      workoutData.metadata.extraction_notes || null;

    // Convert all undefined values to null for consistent DynamoDB storage
    const cleanedWorkoutData = convertUndefinedToNull(workoutData);

    return cleanedWorkoutData as UniversalWorkoutSchema;
  } catch (error) {
    console.error("Error parsing workout data:", error);
    console.error("Raw extracted data length:", extractedData.length);

    // Store the problematic response in S3 for debugging
    try {
      const s3Location = await storeDebugDataInS3(extractedData, {
        userId,
        type: "json-parse-error",
        length: extractedData.length,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      console.error("Problematic response stored in S3:", s3Location);
    } catch (s3Error) {
      console.warn("Failed to store problematic response in S3:", s3Error);
    }

    // If it's a JSON parsing error, try to identify the problematic location
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      console.error("JSON Syntax Error Details:", error.message);

      // Try to find the position mentioned in the error
      const positionMatch = error.message.match(/position (\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const contextStart = Math.max(0, position - 200);
        const contextEnd = Math.min(extractedData.length, position + 200);

        console.error("Context around error position:", {
          position,
          contextStart,
          contextEnd,
          contextBefore: extractedData.substring(contextStart, position),
          contextAfter: extractedData.substring(position, contextEnd),
        });
      }

      // Try to validate JSON structure by checking for common issues
      const commonIssues = [
        { pattern: /,\s*}/, issue: "Trailing comma before closing brace" },
        { pattern: /,\s*]/, issue: "Trailing comma before closing bracket" },
        { pattern: /}\s*{/, issue: "Missing comma between objects" },
        { pattern: /]\s*\[/, issue: "Missing comma between arrays" },
        { pattern: /"\s*"/, issue: "Missing comma between strings" },
        {
          pattern: /\n\s*"[^"]*":\s*"[^"]*"\n\s*"/,
          issue: "Missing comma between object properties",
        },
      ];

      commonIssues.forEach(({ pattern, issue }) => {
        const matches = extractedData.match(pattern);
        if (matches) {
          console.error(`Potential JSON issue found: ${issue}`, matches[0]);
        }
      });
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown parsing error";
    throw new Error(`Failed to parse workout data: ${errorMessage}`);
  }
};

/**
 * Calculates confidence score based on the extracted data quality
 */
export const calculateConfidence = (
  workoutData: UniversalWorkoutSchema
): number => {
  let confidence = 0.5; // Base confidence

  // Higher confidence for explicit data
  if (workoutData.workout_name) confidence += 0.2;
  if (workoutData.discipline_specific?.crossfit?.performance_data?.total_time)
    confidence += 0.2;
  if (workoutData.performance_metrics?.perceived_exertion) confidence += 0.1;
  if (workoutData.subjective_feedback?.notes) confidence += 0.1;

  // Lower confidence for validation flags
  const validationFlags = workoutData.metadata.validation_flags || [];
  confidence -= validationFlags.length * 0.05;

  return Math.max(0.1, Math.min(1.0, confidence));
};

/**
 * Extracts the completed time from user message using AI
 */
export const extractCompletedAtTime = async (
  userMessage: string,
  messageTimestamp?: string,
  userTimezone: string = 'America/Los_Angeles'
): Promise<Date | null> => {
  const referenceTime = messageTimestamp || new Date().toISOString();
  const messageDate = new Date(referenceTime);

  // Calculate context information
  const timeSinceMessage = Math.round((Date.now() - messageDate.getTime()) / 1000);
  const userLocalTime = messageDate.toLocaleString('en-US', {
    hour12: false,
    timeZone: userTimezone
  });
  const messageDay = messageDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const timeExtractionPrompt = `
You are a time extraction expert. Extract when the workout was actually completed.

USER MESSAGE: "${userMessage}"
MESSAGE TYPED AT: ${referenceTime} (UTC)
USER'S LOCAL TIME WHEN TYPED: ${userLocalTime} (${userTimezone})
CURRENT SERVER TIME: ${new Date().toISOString()} (UTC)

CONTEXT CLUES:
- Time elapsed since message: ${timeSinceMessage} seconds
- Message typed on: ${messageDay}
- User's timezone: ${userTimezone}

CRITICAL REASONING RULES:
1. Use MESSAGE TYPED AT as your reference point for ALL relative time calculations
2. When user says "7pm ET" and typed message at 11:30pm ET same day → workout was 7pm TODAY
3. When user says "this morning" → calculate morning relative to the MESSAGE TYPED AT date
4. When user says "yesterday" → calculate yesterday relative to the MESSAGE TYPED AT date
5. For timezone abbreviations (ET, PT, CT, MT), convert properly to UTC
6. If workout time seems unrealistic (future time), double-check your date calculation

EXAMPLES:
- Message typed at 11:30pm local time, user says "did Fran at 7pm" → 7pm local time TODAY (same date)
- Message typed at 2am local time, user says "worked out this evening" → evening of PREVIOUS day
- Message typed at 9am local time, user says "this morning at 6am" → 6am local time TODAY

Return ONLY a JSON object with this format:
{
  "completedAt": "2025-01-XX[T]XX:XX:XX.XXXZ" or null,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation including your date/time logic"
}

Examples:
- "I just finished at 11:42 AM Pacific" → {"completedAt": "2025-01-14T19:42:00.000Z", "confidence": 0.95, "reasoning": "Explicit time with timezone, converted PST to UTC"}
- "I worked out this morning" → {"completedAt": "2025-01-14T17:00:00.000Z", "confidence": 0.8, "reasoning": "This morning interpreted as 9 AM local time"}
- "Did my workout yesterday afternoon" → {"completedAt": "2025-01-13T22:00:00.000Z", "confidence": 0.7, "reasoning": "Yesterday afternoon assumed as 2 PM local time"}
- "Should I do Fran today?" → {"completedAt": null, "confidence": 0.9, "reasoning": "Future planning question, not completed workout"}
- "What did I do last week?" → {"completedAt": null, "confidence": 0.9, "reasoning": "Inquiry about past, not logging new workout"}
`;

  try {
    console.info("Extracting workout completion time using Nova Micro:", {
      userMessage: userMessage.substring(0, 100),
      messageTimestamp: referenceTime,
      currentTime: new Date().toISOString(),
      timeSinceMessage: `${timeSinceMessage}s`,
    });

    const response = await callBedrockApi(
      timeExtractionPrompt,
      userMessage,
      MODEL_IDS.NOVA_MICRO
    );

    const result = JSON.parse(response.trim());

    console.info("AI time extraction result:", {
      userMessage: userMessage.substring(0, 100),
      extractedTime: result.completedAt,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });

    // Validate extracted time against message timestamp
    if (result.completedAt && messageTimestamp) {
      const extractedTime = new Date(result.completedAt);
      const messageTime = new Date(messageTimestamp);
      const timeDiff = extractedTime.getTime() - messageTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Flag suspicious results (workout time in future relative to message time)
      if (hoursDiff > 1) {
        console.warn("⚠️ Extracted workout time is in the future relative to message time:", {
          extractedTime: extractedTime.toISOString(),
          messageTime: messageTime.toISOString(),
          hoursDifference: hoursDiff.toFixed(2),
          reasoning: result.reasoning
        });
      }
    }

    return result.completedAt ? new Date(result.completedAt) : null;
  } catch (error) {
    console.error(
      "AI time extraction failed, using current time as default:",
      error
    );
    return new Date(); // Simple fallback to current time
  }
};

/**
 * Generate AI summary for workout context and UI display
 */
export const generateWorkoutSummary = async (
  workoutData: UniversalWorkoutSchema,
  originalMessage: string
): Promise<string> => {
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
    console.error("Error generating workout summary:", error);

    // Fallback to basic summary if AI fails
    const workoutName = workoutData.workout_name || "Workout";
    const discipline = workoutData.discipline || "";
    const duration = workoutData.duration ? `${Math.round(workoutData.duration / 60)}min` : "";

    let fallback = `Completed ${workoutName}`;
    if (discipline) fallback += ` (${discipline})`;
    if (duration) fallback += ` in ${duration}`;

    return fallback;
  }
};

/**
 * AI-powered classification of workout disciplines
 * Provides flexible classification for various discipline characteristics
 *
 * @param discipline - The workout discipline to classify
 * @param workoutData - Optional workout data for additional context
 * @returns Promise<object> - Classification result with multiple attributes
 */
export const classifyDiscipline = async (
  discipline: string,
  workoutData?: UniversalWorkoutSchema
): Promise<DisciplineClassification> => {
  if (!discipline || typeof discipline !== "string") {
    return {
      isQualitative: false,
      requiresPreciseMetrics: true,
      environment: "mixed" as const,
      primaryFocus: "mixed" as const,
      confidence: 0,
      reasoning: "Invalid discipline provided",
    };
  }

  const classificationPrompt = `
Analyze this workout discipline to provide comprehensive classification information.

DISCIPLINE: "${discipline}"
${
  workoutData
    ? `WORKOUT CONTEXT: ${JSON.stringify(
        {
          workout_name: workoutData.workout_name,
          workout_type: workoutData.workout_type,
          duration: workoutData.duration,
          location: workoutData.location,
        },
        null,
        2
      )}`
    : ""
}

Return ONLY a JSON response in this exact format:
{
  "isQualitative": boolean,
  "requiresPreciseMetrics": boolean,
  "environment": "indoor|outdoor|mixed",
  "primaryFocus": "strength|endurance|power|speed|agility|flexibility|balance|technique|coordination|mixed",
  "confidence": number,
  "reasoning": "brief explanation"
}

CLASSIFICATION CRITERIA:

QUALITATIVE DISCIPLINES (more forgiving of missing precise metrics):
- Focus on time, effort, technique, experience rather than exact numbers
- Often done in uncontrolled environments (outdoors, open water, trails)
- Performance may be hard to measure precisely but workout still has value
- Examples: swimming (especially open water), running (especially trails), cycling, yoga, martial arts, climbing, hiking, dance, pilates

QUANTITATIVE DISCIPLINES (require specific performance metrics):
- Focus on precise weights, reps, sets, distances, times
- Usually done in controlled environments with measurable equipment
- Performance is typically tracked with specific numbers for progression
- Examples: powerlifting, weightlifting, CrossFit, bodybuilding, track & field, rowing (machine)

PRIMARY FOCUS CATEGORIES:
- "strength": Building maximal force production (powerlifting, weightlifting, strength training)
- "endurance": Sustained activity over time (marathon running, cycling, swimming distance)
- "power": Explosive force/speed combination (Olympic lifting, jumping, throwing)
- "speed": Maximum velocity (sprinting, speed skating, racing)
- "agility": Quick direction changes (basketball, soccer, tennis, martial arts)
- "flexibility": Range of motion (yoga, stretching, gymnastics flexibility work)
- "balance": Stability and equilibrium (balance beam, slacklining, balance training)
- "technique": Skill refinement and form (martial arts kata, dance, gymnastics skills)
- "coordination": Multi-limb movement patterns (dance, complex skills, sport-specific drills)
- "mixed": Multiple components equally emphasized (CrossFit, general fitness, boot camp)

EDGE CASES:
- "hybrid" discipline = lean towards qualitative (mixed training)
- Indoor vs outdoor versions of same sport may differ (indoor rowing = quantitative, outdoor rowing = qualitative)
- Consider the workout context if provided
- Some disciplines can have different focuses depending on the specific workout (running can be endurance OR speed)

Return confidence 0.8+ for clear classifications, 0.5-0.7 for moderate cases, <0.5 for unclear.`;

  try {
    console.info("Classifying discipline as qualitative/quantitative:", {
      discipline,
      hasWorkoutContext: !!workoutData,
    });

    const response = await callBedrockApi(
      classificationPrompt,
      discipline,
      MODEL_IDS.NOVA_MICRO
    );
    const result = JSON.parse(response.trim());

    console.info("AI discipline classification result:", {
      discipline,
      isQualitative: result.isQualitative,
      requiresPreciseMetrics: result.requiresPreciseMetrics,
      environment: result.environment,
      primaryFocus: result.primaryFocus,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });

    // Return the full classification result
    return result;
  } catch (error) {
    console.error("AI discipline classification failed:", error);
    throw new Error(
      `Failed to classify discipline "${discipline}": ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};
