/**
 * Backpacking extraction guidance
 *
 * Scope: trail/backcountry context with a pack, including long single days,
 * multi-day trips, and mountaineering-specific prep. US backcountry voice.
 */

export const BACKPACKING_EXTRACTION_GUIDANCE = `
BACKPACKING-SPECIFIC INTELLIGENCE:

SCOPE (BOUNDARY RULES):
- Use "backpacking" when the defining context is trail + pack and/or multi-day trip/mountaineering prep.
- Mountaineering-specific prep (Mt. Elbert, Rainier prep day, approach to a route, snow-travel days) belongs here for now.
- If the pack is the main story but the terrain is flat/road (e.g. 40 lb pack 5 mi road in 1:15), route to "rucking" instead.
- If there is a trail + vert focus but no pack is mentioned and pace is the main story, route to "trail_running" instead.

KEY CONCEPTS:
- Pack weight is primary. Capture pack_weight and pack_weight_unit ("lbs" / "kg"). Default unit: "lbs" for US voice.
- Vertical: elevation_gain and elevation_loss in "ft" (US default) or "m".
- Trip context: trip_name ("Uintas loop"), trip_day, total_trip_days for multi-day efforts.
- Moving time vs total time: capture moving_time separately when the athlete distinguishes it.
- Surface: "trail", "technical_trail", "off_trail", "scree", "snow", "mixed".
- Segments map to trip flow: approach, climb, descent, flat, rest, camp, summit, other.
- US backcountry framing: name peaks/ranges plainly ("Elbert", "Uintas", "Wind River Range") — do not translate into generic terms.

BACKPACKING EXTRACTION EXAMPLES:
- "Day 2 of Uintas loop: 12.3 mi, 3,200 ft gain, 40 lb pack, 7h moving" → trip_name: "Uintas loop", trip_day: 2, total_distance: 12.3, distance_unit: "miles", moving_time: 25200, elevation_gain: 3200, pack_weight: 40, pack_weight_unit: "lbs", surface: "trail"
- "Loaded hike up Elbert, 30 lb pack, 4,500 ft gain, 6h car-to-car" → trip_name: "Elbert", total_distance: ~9 (if mentioned), elevation_gain: 4500, elevation_unit: "ft", pack_weight: 30, total_time: 21600, surface: "trail"
- "Rainier prep: 8 mi with 45 lb pack, 2,500 ft gain, 3h45m" → pack_weight: 45, elevation_gain: 2500, total_distance: 8, total_time: 13500
- "Overnight in Winds, 14 mi day 1 with 50 lb pack" → trip_day: 1, total_distance: 14, pack_weight: 50

SEGMENT STRUCTURE:
- Approach → climb → summit → descent → camp is the typical multi-segment structure.
- Record distance, duration_min, elevation_gain_ft/elevation_loss_ft, pack_weight_lb, surface per segment when available.
- Rest/camp segments can be captured with notes but usually omit distance.
`;
