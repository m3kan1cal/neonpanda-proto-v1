/**
 * CrossFit-specific extraction guidance
 * MOVED from extraction.ts lines 509-633 (not rewritten)
 */

export const CROSSFIT_EXTRACTION_GUIDANCE = `
CROSSFIT-SPECIFIC INTELLIGENCE:

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

CROSSFIT MOVEMENT STANDARDS:
- Use official CrossFit terminology (chest-to-bar pull-up, box jump, wall ball, etc.)
- thruster (not "front squat to press")
- pull-up (not "chin-up")
- Standard CrossFit movements: thruster, burpee, box jump, wall ball, toes-to-bar, handstand push-up, etc.

CROSSFIT EXTRACTION EXAMPLES:
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

CRITICAL: DESCENDING REP SCHEMES (21-15-9) ARE MULTIPLE ROUNDS:
- Fran (21-15-9) = 3 SEPARATE ROUNDS, not one round with "21-15-9" rep scheme
- Round 1: 21 thrusters + 21 pull-ups (prescribed: 21, completed: 21 for each exercise)
- Round 2: 15 thrusters + 15 pull-ups (prescribed: 15, completed: 15 for each exercise)
- Round 3: 9 thrusters + 9 pull-ups (prescribed: 9, completed: 9 for each exercise)
- Same applies to other descending schemes: 15-12-9, 10-8-6, etc.
- DO NOT create a single round with rep_scheme "21-15-9"
- DO create 3 separate rounds with different prescribed rep counts

EMOM SPECIFIC ROUND STRUCTURE:
- CRITICAL: EMOM workouts MUST create separate rounds for each COMPLETED ROUND, not each minute
- "30min EMOM" with 6 rounds completed = 6 separate round objects (NOT 1 template round)
- Each round represents one complete cycle through all exercises with incremented round_number: 1, 2, 3, 4, 5, 6
- This enables tracking performance degradation, pacing, and round-by-round analysis
- WRONG: 1 round with exercises, performance_data.rounds_completed: 6
- CORRECT: 6 rounds array elements, each with same exercises, performance_data.rounds_completed: 6
- Example: "30min EMOM, 5 exercises per round, completed 6 rounds" = create 6 round objects, NOT 30

OPTIMIZATION EXAMPLES FOR COMPLEX CROSSFIT WORKOUTS:
- BEFORE: 4 separate warmup rounds (135×3, 185×3, 225×3, 245×3)
- AFTER: 1 consolidated round with form_notes: "Warmup progression: 135×3, 185×3, 225×3, 245×3"
- BEFORE: Full weight objects with all null fields for bodyweight exercises
- AFTER: Minimal weight object: {"value": null, "unit": "lbs"}
- BEFORE: Detailed form_notes for every similar AMRAP round
- AFTER: Brief notes on first round, null for subsequent identical rounds
`;
