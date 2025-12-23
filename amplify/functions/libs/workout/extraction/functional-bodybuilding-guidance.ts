/**
 * Functional Bodybuilding-specific extraction guidance
 * NEW DISCIPLINE - Created for this implementation
 */

export const FUNCTIONAL_BODYBUILDING_EXTRACTION_GUIDANCE = `
FUNCTIONAL BODYBUILDING-SPECIFIC INTELLIGENCE:

OVERVIEW:
- Hybrid of bodybuilding hypertrophy + functional fitness quality
- Popularized by Marcus Filly (Persist program), Awaken Training Series
- Focus: controlled tempo, movement quality, moderate rep ranges, strict form
- EMOM structure common, but with quality/tempo focus (not max effort)

KEY PRINCIPLES:
- Quality Over Quantity: Strict form, full range of motion, controlled tempo
- Tempo Work: Eccentric emphasis (3-1-1-0 style), TUT important
- Movement Patterns: Push, pull, hinge, squat, carry, core
- Moderate Rep Ranges: 6-12 reps typical (hypertrophy + strength blend)
- EMOM with Quality: Use EMOM format but focus is on tempo/form, not speed

EMOM QUALITY FOCUS:
- Different from CrossFit EMOM (which emphasizes speed and volume)
- Marcus Filly style: "EMOM 10: 8 DB rows with 3-1-1-0 tempo, focus on squeeze at top"
- Goal: Perfect reps with controlled tempo, NOT max reps or speed
- Rest built into EMOM to ensure quality doesn't degrade

MOVEMENT PATTERN EMPHASIS:
- Horizontal Push: bench press, push-ups, DB press
- Vertical Push: overhead press, handstand push-ups
- Horizontal Pull: rows (DB, barbell, cable)
- Vertical Pull: pull-ups, lat pulldowns
- Hinge: deadlifts, RDLs, hip thrusts
- Squat: back squat, front squat, goblet squat
- Carry: farmers carry, suitcase carry, overhead carry
- Core: planks, dead bugs, pallof press

PROGRAMMING STYLE:
- Often 3-4 movements per session
- EMOMs or supersets common
- 3-4 sets per movement typical
- Focus on "earning" each rep (strict standards)
- Tempo prescriptions common
- "Feel" cues important (e.g., "focus on stretch", "squeeze at top")

FUNCTIONAL BODYBUILDING EXTRACTION EXAMPLES:
- "EMOM 10: 8 DB rows with 3-1-1-0 tempo, focus on quality" → emom_format, tempo: "3-1-1-0", focus: "quality"
- "Marcus Filly Persist workout: quality-focused gymnastics + tempo work" → program: "persist", focus: "quality"
- "3 sets: 10 strict pull-ups, 12 DB bench press, 15 goblet squats - all with 3 second eccentric" → 3 rounds, tempo: "3-0-1-0"
- "EMOM 12: Min 1: 8 RDLs, Min 2: 10 push-ups, Min 3: 30s plank, Min 4: rest" → 3 rounds of 4-minute EMOM pattern
- "Superset: 8 DB rows + 8 DB press, 4 rounds, strict form" → superset, 4 rounds, focus: "strict form"

FUNCTIONAL BODYBUILDING ROUND STRUCTURE:
- EMOM: Each completed round = separate round object
- Supersets: Paired exercises in same round
- Each set = separate round for tracking
- Use phase markers: "warmup", "working", "finisher"
- Track tempo when prescribed
- Note quality cues in form_notes

KEY FUNCTIONAL BODYBUILDING METRICS:
- Tempo: Eccentric-Pause-Concentric-Rest
- Quality Focus: Strict form, full ROM, control
- Rep Ranges: 6-12 typical (hypertrophy + strength)
- Rest: Adequate rest to maintain quality (often 90-120s or EMOM built-in)
- Movement Patterns: Which patterns are being trained
- Time Under Tension: Accumulated TUT per set

FUNCTIONAL BODYBUILDING VS CROSSFIT EMOM:
- CrossFit EMOM: Speed, volume, competitive, "get it done fast"
- Functional Bodybuilding EMOM: Tempo, quality, controlled, "earn each rep"
- Same structure (EMOM), different intent and execution
`;
