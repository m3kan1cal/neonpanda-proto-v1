/**
 * Rucking extraction guidance
 *
 * Scope: structured loaded-march training. Pace / distance / load is the main
 * story. Typically flatter and repeatable. If the defining feature is trail,
 * vert, or backcountry context, use `backpacking` instead.
 */

export const RUCKING_EXTRACTION_GUIDANCE = `
RUCKING-SPECIFIC INTELLIGENCE:

SCOPE (BOUNDARY RULES):
- Use "rucking" for structured loaded-march training where pace, distance, and load are the story. Usually on road, track, treadmill, or flat trail.
- If the defining context is trail + backcountry + vert (loaded hike up a mountain, multi-day trip), route to "backpacking" instead.
- If there is no pack (or the pack is incidental), it is probably "running" or "trail_running".

KEY CONCEPTS:
- Pack weight is primary. Capture pack_weight and pack_weight_unit ("lbs" / "kg"). Default unit: "lbs".
- Ruck type: endurance, speed, interval, event, recovery, training, test.
- Event context: "GoRuck Tough", "Heavy", "Star Course" — capture as event_name.
- Pace: standard minutes/mile or minutes/km. A sub-15:00/mi ruck under weight is "speed". 15-17:00 is "endurance".
- Cadence: steps per minute when mentioned (rucking-specific optional metric).
- Surface: "road", "trail", "track", "treadmill", "mixed".
- Elevation: capture elevation_gain when meaningful but keep it as a secondary axis — if vert is the main story, it is probably backpacking.

RUCKING EXTRACTION EXAMPLES:
- "5 mile ruck with 45 lb pack in 1:10, road" → ruck_type: "endurance", total_distance: 5, distance_unit: "miles", total_time: 4200, average_pace: "14:00", pack_weight: 45, pack_weight_unit: "lbs", surface: "road"
- "Speed ruck: 3 mi at 12:30/mi with 30 lb vest" → ruck_type: "speed", total_distance: 3, distance_unit: "miles", average_pace: "12:30", pack_weight: 30
- "GoRuck Tough finisher: 12 hr, 20 mi, 30 lb pack" → ruck_type: "event", event_name: "GoRuck Tough", total_distance: 20, total_time: 43200, pack_weight: 30
- "Ruck intervals: 6x800m at 10:00/mi with 45 lb" → ruck_type: "interval", segments: each 800m as a segment, pack_weight: 45

SEGMENT STRUCTURE:
- For interval / speed rucks, record each working interval as a segment with distance, duration_min, pace, pack_weight_lb, and optional cadence.
- For continuous endurance rucks, a single main record is typically enough.
- Recovery/rest between intervals can be omitted or captured as a recovery segment with notes.
`;
