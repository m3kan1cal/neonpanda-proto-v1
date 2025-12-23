/**
 * Base extraction guidance applicable to ALL workout disciplines
 * This file contains universal extraction requirements that apply regardless of discipline
 */

import type { CoachConfig } from "../../coach-creator/types";

export const BASE_EXTRACTION_GUIDANCE = `
EXTRACTION REQUIREMENTS:
- Use the Universal Workout Schema v2.0 structure provided via tool schema
- Provide detailed extraction_notes explaining your reasoning
- Be conservative with confidence scores - better to underestimate than overestimate
- Focus on accuracy over completeness
- For complex multi-phase workouts, break into clear round structures
- EFFICIENCY: For workouts with >10 rounds, group similar warmup sets to stay within token limits
- Use concise structures for nested objects (only include relevant weight fields, consolidate similar rounds)
- WORKOUT NAMING: Use user-provided names when mentioned, otherwise ALWAYS generate Latin-inspired names
  * If user provides a name ("I did Fran", "workout called XYZ"), use that exact name
  * MANDATORY: When no explicit name is provided, create a Latin/Roman-inspired name (e.g., "Fortis Vigor", "Gladiator Complex", "Infernus Maximus", "Tempestus Power", "Dominus Strength")
  * DO NOT use generic English descriptive names like "Power & Conditioning Complex" - always use Latin-inspired naming
  * Latin naming adds character and memorability to workouts - this is a key feature
- DURATION INTERPRETATION RULES (CRITICAL):
  * duration = WORKOUT WORK TIME ONLY (actual workout duration in seconds)
  * session_duration = TOTAL GYM TIME (optional, only if user specifies warm-up/cool-down time)
  * For AMRAPs: duration MUST equal time_cap (e.g., 10-min AMRAP → duration = 600, time_cap = 600)
  * For timed workouts: duration = actual work time completed
  * For untimed workouts: duration = estimated/measured workout duration
  * MULTI-PHASE WORKOUTS (strength + conditioning, multiple components):
    - SUM all component durations for total work time
    - If component durations not explicit, estimate based on rounds/sets/typical timing
    - Strength work: estimate ~3-5 min per working set with rest
    - Accessory work: estimate ~1-2 min per round
    - Metcon/AMRAP: use explicit time cap
  * EXAMPLES:
    - User: "10min AMRAP, 7am-7:30am" → duration: 600, session_duration: 1800, time_cap: 600
    - User: "Fran in 8:57" → duration: 537, session_duration: null
    - User: "30min at gym, did 20min EMOM" → duration: 1200, session_duration: 1800
    - User: "Back squat 5x5, then 12min AMRAP, 7-8am" → duration: ~2400 (estimated 20min + 12min explicit), session_duration: 3600, time_cap: 720

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
   - Estimate intensity/RPE from language: "crushed it" = 8-9, "easy day" = 4-5, "moderate" = 5-6
   - **PERFORMANCE METRICS DEFAULTS**: When intensity or RPE cannot be inferred from the message:
     * Set performance_metrics.intensity = 5 (moderate, on 1-10 scale)
     * Set performance_metrics.perceived_exertion = 5 (moderate, on 1-10 scale)
     * Set per-set RPE = 5 for individual exercises when not specified
     * Only leave these fields null if the user explicitly indicates unknown intensity
     * Default assumption: Most logged workouts are moderate intensity unless stated otherwise

3. CONFIDENCE SCORING:
   - 0.9+: Explicit data provided ("my time was 8:57")
   - 0.7-0.9: Strong contextual inference ("crushed Fran today" → likely good time)
   - 0.5-0.7: Moderate inference from patterns
   - <0.5: Low confidence guess

4. VALIDATION FLAGS: Include flags for:
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

5. STANDARDIZATION:
   - Exercise names: Use standard terms (thruster not "front squat to press", pull-up not "chin-up")
   - Units: Be consistent (convert if needed, note original)
   - Times: CRITICAL - ALL time values MUST be in seconds (duration, total_time, round_times, rest_between_sets)
     * "8 minutes 57 seconds" → 537 seconds
     * "45 minute workout" → 2700 seconds
     * "1:30 rest" → 90 seconds

6. EQUIPMENT TERMINOLOGY INTERPRETATION:
   - "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement
   - Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells
   - "Single DB" means using one dumbbell for the movement
   - "Alternating" means switching between arms/sides but count total reps, not per side
   - "Each arm" or "per arm" means multiply by 2 (e.g., "10 reps each arm" = 20 total reps)
   - When in doubt about equipment terminology, count the TOTAL movement repetitions performed

7. CRITICAL: BILATERAL DUMBBELL WEIGHT CALCULATION:
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

8. CRITICAL PARTNER WORKOUT INTERPRETATION:
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

9. COMPLEX WORKOUT STRUCTURE EXAMPLES:

   1. MULTI-PHASE WORKOUTS:
      Structure as separate round categories with clear time domain separation:
      - Warmup rounds: strength building sets (lighter weights, progressive)
      - Working rounds: main workout content (heaviest loads or metcon)
      - Cooldown rounds: accessory work (stretching, mobility)

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

10. CRITICAL ROUND STRUCTURE RULES:
    - CONSISTENCY: All rounds in a workout must follow the same structure pattern
    - LOGICAL GROUPING: Group exercises that happen simultaneously or sequentially
    - TIME DOMAIN RESPECT: Don't mix strength work with metcon in same round unless explicitly stated
    - MOVEMENT PAIRING: Keep paired movements (supersets) in the same round
    - PROGRESSION TRACKING: Use consistent field names across rounds for same exercises
    - PHASE CLARITY: Use clear phase markers ("warmup", "working", "cooldown")
`;

/**
 * Build base prompt section with coach context and temporal awareness
 */
export function buildBasePrompt(
  userMessage: string,
  coachConfig: CoachConfig,
  userTimezone?: string,
  criticalTrainingDirective?: { content: string; enabled: boolean },
): string {
  // Build directive section if enabled
  const directiveSection =
    criticalTrainingDirective?.enabled && criticalTrainingDirective?.content
      ? `🚨 CRITICAL TRAINING DIRECTIVE - ABSOLUTE PRIORITY:

${criticalTrainingDirective.content}

This directive takes precedence over all other instructions except safety constraints. Apply this when interpreting and structuring the workout data.

---

`
      : "";

  // Build timezone context section
  const effectiveTimezone = userTimezone || "America/Los_Angeles";
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
  const formattedDate = currentDateTime.toLocaleDateString(
    "en-US",
    dateOptions,
  );
  const formattedTime = currentDateTime.toLocaleTimeString(
    "en-US",
    timeOptions,
  );

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
- For date fields (YYYY-MM-DD format), use the current date as reference and calculate accordingly (user is likely not talking about last year)

---

`;

  const coachContext = `
COACH CONTEXT:
- Coach Name: ${coachConfig.coach_name}
- Primary Methodology: ${coachConfig.selected_methodology?.primary_methodology || "general"}
- Coach Specializations: ${coachConfig.technical_config?.specializations?.join(", ") || "general fitness"}
- Programming Focus: ${coachConfig.technical_config?.programming_focus?.join(", ") || "general"}
- Preferred Intensity: ${coachConfig.technical_config?.preferred_intensity || "moderate"}
- Equipment Available: ${coachConfig.technical_config?.equipment_available?.join(", ") || "standard gym"}

USER WORKOUT DESCRIPTION:
"${userMessage}"
`;

  return `${directiveSection}${timezoneSection}${coachContext}

${BASE_EXTRACTION_GUIDANCE}`;
}
