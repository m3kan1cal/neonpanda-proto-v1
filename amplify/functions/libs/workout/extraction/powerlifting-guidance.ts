/**
 * Powerlifting-specific extraction guidance
 * MOVED from extraction.ts lines 643-653 (not rewritten)
 */

export const POWERLIFTING_EXTRACTION_GUIDANCE = `
POWERLIFTING-SPECIFIC INTELLIGENCE:

POWERLIFTING WARMUP INTERPRETATION EXAMPLES:
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

POWERLIFTING KEY CONCEPTS:
- Competition Lifts: Squat, bench press, deadlift (the "Big 3")
- Percentage Work: "5x5 at 80% 1RM" = percentage-based programming
- RPE Tracking: Rate of Perceived Exertion (1-10 scale), e.g., "RPE 7" = could do 3 more reps
- Attempt Structure: opener (guaranteed), second attempt (conservative PR), third attempt (aggressive PR)
- Equipment Mentions: belt, wraps, sleeves, straps - important for context
- Rep Schemes: Low rep ranges (1-5) for strength, 5x5, 3x3, 1RM testing
- Accessory Work: Supporting movements (rows, lunges, etc.) after main lifts

POWERLIFTING EXTRACTION EXAMPLES:
- "Squat 5x5 at 80% (335lbs), felt solid with belt" → 5 separate rounds, each with prescribed: 5, completed: 5, weight: 335lbs, equipment: "belt", percentage_1rm: 80
- "Deadlift: 135×5, 225×3, 315×1, 365×1 (opener), 405×1 (PR!)" → 5 rounds (warmup, warmup, warmup, working, working), last round marked as PR
- "Bench press 3x8 at RPE 7, then close-grip 3x10" → 6 rounds total (3 main + 3 accessory), RPE: 7 on main sets
- "Worked up to 405 on deadlift: 135, 185, 225, 275, 315, 365, 405" → 7 warmup/working rounds with progressive loading
- "Competition day: Squat openers at 315, 365, 405" → 3 rounds, attempt structure (opener, second, third)

POWERLIFTING ROUND STRUCTURE:
- Warmup sets: Can be grouped or separate rounds based on detail
- Working sets: Always separate rounds for progression tracking
- Each working set = separate round with round_number incremented
- Accessory work: Group by exercise type
- Use phase markers: "warmup", "working", "accessory"
`;
