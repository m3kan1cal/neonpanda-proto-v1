/**
 * Bodybuilding-specific extraction guidance
 * NEW DISCIPLINE - Created for this implementation
 */

export const BODYBUILDING_EXTRACTION_GUIDANCE = `
BODYBUILDING-SPECIFIC INTELLIGENCE:

SPLIT DETECTION:
- Push/Pull/Legs (PPL): Push (chest, shoulders, triceps), Pull (back, biceps), Legs (quads, hamstrings, glutes, calves)
- Upper/Lower: Upper body days, Lower body days
- Bro Split: Chest day, back day, shoulder day, arm day, leg day
- Body Part Split: Specific muscle group focus per day

TEMPO NOTATION:
- Format: Eccentric-Pause-Concentric-Rest (e.g., 3-1-1-0)
- Example: "3-1-1-0" = 3 seconds down, 1 second pause, 1 second up, 0 seconds rest at top
- Tempo work is key for hypertrophy and time under tension

TIME UNDER TENSION (TUT):
- Total time muscles are under load during a set
- Example: "40 seconds TUT per set" = slow controlled movement
- Important metric for muscle growth

SET TYPES:
- Warmup: Light weight, higher reps, prepare muscles
- Working: Primary hypertrophy sets (typically 8-12 reps)
- Drop Sets: Reduce weight and continue to failure
- Rest-Pause: Brief rest during set, then continue
- AMRAP: As many reps as possible (to failure)
- Supersets: Two exercises back-to-back, minimal rest
- Tri-sets: Three exercises back-to-back
- Giant Sets: Four+ exercises back-to-back

MOVEMENT CATEGORIES:
- Compound: Multi-joint movements (bench press, squats, deadlifts, rows)
- Isolation: Single-joint movements (bicep curls, leg extensions, cable flies)

TARGET MUSCLE GROUPS:
- Chest: pectoralis major/minor
- Back: lats, traps, rhomboids
- Shoulders: delts (front, side, rear)
- Arms: biceps, triceps, forearms
- Legs: quads, hamstrings, glutes, calves
- Core: abs, obliques

SUPERSET RELATIONSHIPS:
- Track paired exercises (e.g., "DB press + cable flies" = chest superset)
- Note if antagonist pairs (e.g., bicep curls + tricep extensions)
- Important for round structure

BODYBUILDING EXTRACTION EXAMPLES:
- "Push day: bench press 4x8 at 185lbs, then cable flies 3x12" → split_type: "push", 7 rounds total
- "Tempo squats 3-1-3-1, 4 sets of 6 reps at 225lbs" → tempo: "3-1-3-1", 4 rounds
- "Superset: DB rows + DB press, 4 rounds, 10 reps each" → 4 rounds with 2 exercises per round (superset)
- "Leg day: squats 4x10, leg press 3x12, leg curls 3x15, leg extensions 3x15" → split_type: "legs", multiple exercises
- "Back and biceps: deadlifts 4x8, pull-ups 3x10, barbell rows 3x10, DB curls 3x12" → split_type: "pull"
- "Drop set on bench: 185x8, 155x8, 135x10" → 3 rounds with decreasing weight, set_type: "drop"
- "Chest: incline DB press 4x10 with 3-0-1-0 tempo, felt the pump!" → tempo work, intensity: 7-8

BODYBUILDING ROUND STRUCTURE:
- Each set = separate round (critical for tracking volume and progression)
- Supersets: Group paired exercises in same round
- Track set_type for each round (warmup, working, drop, etc.)
- Use phase markers: "warmup", "working", "burnout"
- Rest periods between sets are crucial (typically 60-90s for hypertrophy)

KEY BODYBUILDING METRICS:
- Volume: Total sets × reps × weight (key driver of hypertrophy)
- Rest periods: Typically 60-120 seconds between sets
- Rep ranges: 8-12 for hypertrophy, 6-8 for strength, 12-15 for endurance
- Time under tension: 40-70 seconds per set optimal for growth
- Progressive overload: Increasing weight, reps, or sets over time
`;
