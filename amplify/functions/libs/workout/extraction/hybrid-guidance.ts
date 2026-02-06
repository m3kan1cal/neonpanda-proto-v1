/**
 * Hybrid-specific extraction guidance
 * For mixed-modality workouts that don't fit a single discipline
 */

export const HYBRID_EXTRACTION_GUIDANCE = `
HYBRID-SPECIFIC INTELLIGENCE:

The hybrid discipline is designed for mixed-modality workouts that combine multiple distinct training styles
in one session without clearly belonging to a single discipline. This includes:
- Personal training sessions
- Open gym mixed work
- General fitness sessions
- Workouts with multiple unrelated sections (warmup + strength + cardio + mobility)
- Low-confidence classifications from other disciplines

PHASE-BASED STRUCTURE (PREFERRED):
- Use the "phases" array when the workout has distinct sections
- Common phase types: warmup, mobility, strength, conditioning, circuit, skill, cardio, cooldown, accessory, working
- Each phase should contain its own exercises array
- Preserve the user's phase naming if provided (e.g., "Circuit A", "Deadlift Work", "Warmup")

PHASE IDENTIFICATION:
- Look for section dividers: "then", "next", "after that", "finished with", "started with"
- Numbered sections: "1)", "Part A:", "Round 1:", etc.
- Natural breaks in activity types: warmup → main work → finisher
- Equipment changes or movement pattern shifts

FLAT EXERCISE LIST (FALLBACK):
- Use the root "exercises" array only when the workout has no distinct phases
- Appropriate for: quick workouts, single-focus sessions, or truly unstructured training

EXTRACTION EXAMPLES:

Phase-based workouts:
- "Warmup: 10 min bike, dynamic stretching. Then deadlifts 5x3. Finished with 15 min AMRAP of KB swings and burpees"
  → 3 phases: warmup (bike, stretching), strength (deadlifts), conditioning (AMRAP)

- "Started with mobility work, did some squats and bench, then ran 2 miles"
  → 3 phases: mobility, working (squats, bench), cardio (running)

- "Personal training session: cardio warmup, upper body strength circuit, core work, flexibility"
  → 4 phases matching the described sections

Flat exercise list (no phases):
- "Did some random stuff: push-ups, air squats, a few pull-ups"
  → Single exercises array without phases

WEIGHT HANDLING:
- Preserve weight information when provided: {"value": 135, "unit": "lbs"}
- For bodyweight exercises, omit the weight object or set to null
- Support both lbs and kg units

NOTES AND CONTEXT:
- Use phase notes for timing, rounds, or special instructions
- Use exercise notes for form cues, tempo, or set-specific details
- Preserve any RPE or effort level information

HYBRID WORKOUT NAMING:
- If user provides a name, preserve it exactly
- If no name provided, derive from primary focus or use descriptive name
- Examples: "Mixed Training Session", "Open Gym", "Personal Training", "General Fitness"

CRITICAL EXTRACTION RULES:
1. Default to phases structure when workout has any distinct sections
2. Preserve all exercise details even if sparse (some sets may only have reps, no weight)
3. Don't force exercises into phase_types that don't fit - use "working" or "other" as fallback
4. Movement patterns are optional for hybrid - only include if clearly identifiable
`;
