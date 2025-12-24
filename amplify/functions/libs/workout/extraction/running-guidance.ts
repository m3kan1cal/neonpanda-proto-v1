/**
 * Running-specific extraction guidance
 * MOVED from extraction.ts line 506 (minimal existing guidance, preserved as-is)
 */

export const RUNNING_EXTRACTION_GUIDANCE = `
RUNNING-SPECIFIC INTELLIGENCE:

DISCIPLINE DETECTION:
- Distance, pace, splits, cardio terminology, route descriptions
- Common formats: easy runs, tempo runs, intervals, long runs, race pace work

KEY CONCEPTS:
- Distance: 5k, 10k, half marathon (13.1mi/21.1km), marathon (26.2mi/42.2km)
- Pace Work: minutes per mile or per kilometer (e.g., "7:30/mile pace")
- Splits: Time for each mile/km segment
- Run Types: easy, tempo, speed work, long run, recovery run
- Training Terminology: negative splits, fartlek, progression runs

RUNNING EXTRACTION EXAMPLES:
- "10k tempo run: 7:30/mile pace, splits: 7:28, 7:32, 7:29..." → distance: 10000m, pace: "7:30/mile", discipline: "running"
- "Easy 5 mile run, felt good" → distance: 8047m (5 miles), intensity: ~4-5, discipline: "running"
- "Marathon training: 20 mile long run, 8:45 average pace" → distance: 32187m, pace: "8:45/mile"
- "Speed work: 8x400m intervals at 1:30 each with 90s rest" → 8 rounds of 400m intervals, time per interval: 90s, rest: 90s
- "Half marathon race: finished in 1:32:45" → distance: 21097m, total_time: 5565s, race: true

RUNNING ROUND STRUCTURE:
- For continuous runs: Single round with total distance and pace
- For intervals: Multiple rounds, one per interval
- Track splits when provided (array of times per mile/km)
`;
