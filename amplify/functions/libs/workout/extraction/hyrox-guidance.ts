/**
 * Hyrox-specific extraction guidance
 * NEW DISCIPLINE - Created for this implementation
 */

export const HYROX_EXTRACTION_GUIDANCE = `
HYROX-SPECIFIC INTELLIGENCE:

RACE STRUCTURE:
- Standard Hyrox format: 8 stations + 9 runs (1km each)
- Total race distance: 9km running + 8 functional fitness stations
- Stations are always in the same order (standardized)

8 HYROX STATIONS (in order):
1. SkiErg: 1000m on SkiErg machine
2. Sled Push: 50m sled push (weight varies by division)
3. Sled Pull: 50m sled pull (weight varies by division)
4. Burpee Broad Jumps: 80m of burpee broad jumps
5. Rowing: 1000m on rowing machine
6. Farmers Carry: 200m farmers carry (weight varies by division)
7. Sandbag Lunges: 100m sandbag lunges (weight varies by division)
8. Wall Balls: 100 wall ball shots (weight varies by division)

HYROX DIVISIONS:
- Open: Standard weights, recreational athletes
- Pro: Heavier weights, competitive athletes
- Doubles: Teams of 2, alternating stations
- Relay: Teams of 4, each member completes 2 stations
- Mixed Doubles: Male/female pairs

DIVISION WEIGHTS (examples):
- Open Men: Sled 102kg, Farmers 2x16kg, Sandbag 20kg, Wall Ball 6kg
- Open Women: Sled 78kg, Farmers 2x12kg, Sandbag 10kg, Wall Ball 4kg
- Pro Men: Sled 152kg, Farmers 2x24kg, Sandbag 30kg, Wall Ball 10kg
- Pro Women: Sled 103kg, Farmers 2x16kg, Sandbag 20kg, Wall Ball 6kg

HYROX EXTRACTION EXAMPLES:
- "Completed Hyrox race in 1:32:45, open division" → total_time: 5565s, division: "open", race_type: "full_race"
- "Hyrox simulation: 8 stations + 9 runs, finished in 1:34:22" → total_time: 5662s, race_type: "simulation"
- "Hyrox training: 4 stations + 4 runs, focusing on sled push" → race_type: "training", stations_completed: 4
- "SkiErg 1000m in 3:45, Sled Push 50m in 1:20, Sled Pull 50m in 1:35" → 3 separate station rounds with times
- "Hyrox doubles with my partner, finished in 1:28:10" → division: "doubles", total_time: 5290s

HYROX ROUND STRUCTURE:
- Each station = separate round
- Each run segment = separate round
- Alternating pattern: Run 1km → Station 1 → Run 1km → Station 2 → etc.
- Track split times for each station and run when available
- Total rounds = 17 for full race (9 runs + 8 stations)

KEY HYROX METRICS:
- Total Time: Overall race completion time
- Station Split Times: Time for each of the 8 stations
- Run Split Times: Time for each of the 9x 1km runs
- Transition Times: Time between stations (if tracked)
- Division: Open, Pro, Doubles, Relay, Mixed
- Race Type: full_race, simulation, training

HYROX TRAINING PATTERNS:
- Single Station Training: "Did 3 rounds of sled push practice"
- Multi-Station: "Practiced stations 1-4 today"
- Run + Station: "1km run + SkiErg, repeated 3 times"
- Race Simulation: Full 8 stations + 9 runs
`;
