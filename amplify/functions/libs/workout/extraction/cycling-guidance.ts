/**
 * Cycling-specific extraction guidance
 */

export const CYCLING_EXTRACTION_GUIDANCE = `
CYCLING-SPECIFIC INTELLIGENCE:

DISCIPLINE DETECTION:
|- Speed (mph/km/h), distance (km/miles), power (watts, FTP%, TSS, NP, IF), cadence (rpm)
|- Platform indicators: Zwift, TrainerRoad, Wahoo SYSTM, Rouvy → ride_type: virtual or indoor_trainer
|- Race/event formats: criterium (crit), gran fondo, sportive, century ride (100 miles), time trial (TT)
|- Common formats: endurance rides, tempo, intervals by power zone, threshold work, group rides, solo efforts

KEY CONCEPTS:
|- Distance: Standard cycling distances — 20km, 40km, 60km, 100km, century (100 miles = 160.9km), gran fondo
|- Speed: mph or km/h; average speed over the full ride (e.g., "avg 30 km/h", "18 mph average")
|- Power: Watts are primary intensity metric for cyclists
  - FTP (Functional Threshold Power): athlete's 1-hour max sustained power
  - NP (Normalized Power): intensity-weighted average watts (accounts for surges)
  - IF (Intensity Factor): NP ÷ FTP (0.65=easy endurance, 0.75=tempo, 0.85=threshold, 1.0=FTP effort, 1.05+=race)
  - TSS (Training Stress Score): total training load; ~50=recovery ride, ~100=solid training day, ~150+=hard
  - Sweet spot: 88–94% FTP — high training stimulus, below threshold
  - Power zones (Coggan): Z1 <55%, Z2 56-75%, Z3 76-90%, Z4 91-105%, Z5 106-120%, Z6 121-150%, Z7 >150% FTP
|- Cadence: Pedaling revolutions per minute; typical road: 85–100 rpm, mountain: 70–85 rpm
|- FTP%: "Did 3x10 at 95% FTP" → interval at 0.95 × FTP watts

RIDE TYPE MAPPING:
|- "Easy spin", "recovery ride", "active recovery" → recovery
|- "Z2 ride", "aerobic base", "long slow distance", "endurance ride" → endurance
|- "Tempo ride", "sweetspot" → tempo
|- "Threshold intervals", "FTP intervals", "4x8 at FTP", "lactate threshold" → interval
|- "VO2max intervals", "5x5 at 120% FTP", "short hard intervals" → interval
|- "Sprint intervals", "neuromuscular", "30/30s" → interval
|- "Group ride", "club ride", "chain gang" → group_ride
|- "Zwift", "virtual race", "Rouvy" → virtual
|- "TrainerRoad", "Trainer", "turbo", "smart trainer", "indoor" without app mention → indoor_trainer
|- "Race", "criterium", "crit", "road race" → race or criterium
|- "Time trial", "TT", "10-mile TT" → time_trial
|- "Gran fondo", "sportive" → gran_fondo

CYCLING EXTRACTION EXAMPLES:
|- "60km road ride, avg 32 km/h, NP 210w, TSS 85, HR 148 avg" → total_distance: 60, distance_unit: km, total_time: 6750s, normalized_power: 210, training_stress_score: 85, average_heart_rate: 148
|- "2hr endurance ride at 25mph, 180w avg, 88 rpm" → total_time: 7200s, average_speed: "25 mph", average_power: 180, average_cadence: 88, ride_type: endurance
|- "Zwift race, 45 mins, 280w avg, 310w NP, IF 0.92" → ride_type: virtual, total_time: 2700s, average_power: 280, normalized_power: 310, intensity_factor: 0.92
|- "4x8min threshold intervals at FTP (280w), 3min rest" → ride_type: interval, 4 segments of type interval, average_power: 280 per segment, time: 480s each
|- "Century ride: 100 miles, 6h20m, 195w NP, TSS 340" → total_distance: 100, distance_unit: miles, total_time: 22800s, normalized_power: 195, training_stress_score: 340
|- "Morning group ride, 45km, hilly, 2200ft climbing" → ride_type: group_ride, total_distance: 45, elevation_gain: 2200
|- "TrainerRoad Sweet Spot Base: 90min, 0.78 IF, TSS 92" → ride_type: indoor_trainer, total_time: 5400s, intensity_factor: 0.78, training_stress_score: 92

CYCLING SEGMENT STRUCTURE:
|- For continuous rides: single segment with total distance, time, and speed
|- For interval workouts: one segment per interval plus warmup/cooldown segments
|- For climbs: separate segment per notable climb with grade_percent and elevation_change
|- Track power per segment when provided

UNIT CONVERSIONS:
|- 1 mile = 1.60934 km
|- Century ride = 100 miles = 160.934 km
|- Speed: if "avg 30 km/h" for 60km → total_time = 60/30 × 3600 = 7200s
`;
