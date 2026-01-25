/**
 * Circuit Training-specific extraction guidance
 *
 * Covers F45, Orange Theory, Barry's Bootcamp, HIIT circuits,
 * boot camps, and community circuit classes.
 */

export const CIRCUIT_TRAINING_EXTRACTION_GUIDANCE = `
CIRCUIT TRAINING-SPECIFIC INTELLIGENCE:

OVERVIEW:
- Station-based workouts with timed intervals (work/rest cycles)
- Popular formats: F45, Orange Theory, Barry's Bootcamp, boot camps, community classes
- Focus: Move through stations, complete prescribed work, rotate to next station
- Group class format with fixed timing (30s work/15s rest, 40s work/20s rest, etc.)

KEY PRINCIPLES:
- Station-Based Structure: Numbered stations with specific exercises
- Timed Intervals: Work/rest periods (e.g., 30s on/30s off, 40s work/20s rest)
- Multiple Rounds: Complete full circuit multiple times
- Variety: Different movements at each station (strength, cardio, core mix)
- Fixed Timing: Class structure dictates work/rest, not individual pace

CIRCUIT FORMATS:
- stations: Standard station rotation (most common)
- amrap: As many rounds as possible within time cap
- emom: Every minute on the minute format
- tabata: 20s work / 10s rest intervals
- rounds: Complete all stations as one round, repeat
- custom: Mixed or unique class format

CLASS STYLES:
- f45: F45 Training classes (high intensity, 45 min)
- orange_theory: Orange Theory Fitness classes (heart rate based)
- barrys: Barry's Bootcamp classes (treadmill + floor)
- community_class: Local gym circuit classes, boot camps
- custom: Other branded or custom formats

STATION EXTRACTION:
- Number stations sequentially (1, 2, 3...)
- Capture exercise_name for each station
- Extract work_time and rest_time if mentioned (in seconds)
- Note any weights, reps, or equipment used
- Include station_name if provided (e.g., "cardio station", "strength station")

CIRCUIT TRAINING EXTRACTION EXAMPLES:
- "F45 class today: 3 rounds through 6 stations, 30s work/15s rest" → circuit_format: "stations", total_rounds: 3, work_interval: 30, rest_interval: 15, class_style: "f45"
- "Station 1: KB swings, Station 2: box jumps, Station 3: push-ups" → stations array with station_number 1,2,3 and exercise_names
- "Boot camp: 4 rounds of 8 exercises, 40s work 20s rest" → circuit_format: "rounds", total_rounds: 4, work_interval: 40, rest_interval: 20, class_style: "community_class"
- "Orange Theory 2G class, treadmill + floor work" → class_style: "orange_theory", class_name: "Orange Theory 2G"
- "Community circuit: KB swings 30s, rest 30s, box jumps 30s, rest 30s..." → Extract each station with work_time: 30, rest_time: 30
- "Tabata style: 8 rounds, 20s on/10s off" → circuit_format: "tabata", work_interval: 20, rest_interval: 10

CIRCUIT TRAINING STATION STRUCTURE:
- Each station = one entry in stations array
- station_number: Sequential (1, 2, 3...)
- exercise_name: REQUIRED for each station
- work_time: Duration in seconds (per station or global)
- rest_time: Rest duration in seconds (per station or global)
- reps: Only if rep-based instead of time-based
- weight: If weights used at station
- equipment: KB, DB, barbell, box, bands, etc.

GLOBAL VS PER-STATION TIMING:
- work_interval/rest_interval: Default timing for all stations
- station.work_time/rest_time: Override for specific station
- If all stations use same timing, set global; if varied, set per-station

KEY CIRCUIT TRAINING METRICS:
- Circuit Format: How the circuit is structured
- Total Rounds: Number of times through the circuit
- Work/Rest Intervals: Timing for work and rest periods
- Station Count: Number of stations in circuit
- Class Style: Type of circuit class (F45, OT, Barry's, etc.)
- Total Time: Overall workout duration
- Rounds Completed: Actual rounds finished (for performance tracking)

CIRCUIT TRAINING VS CROSSFIT:
- Circuit Training: Station-based, timed intervals, group class format, work/rest primary metric
- CrossFit: Round-based, rep schemes, benchmark WODs, RX/scaled terminology
- "F45" or "boot camp" → circuit_training
- "WOD" or "CrossFit class" → crossfit
`;
