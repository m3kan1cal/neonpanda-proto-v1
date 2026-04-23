/**
 * Trail-running extraction guidance
 *
 * Scope: trail-surface running where trail, vert, or technical terrain is the
 * defining feature. Includes trail ultras (Western States, UTMB, HURT, mountain
 * 50k/100k). Road ultras stay under `running`.
 */

export const TRAIL_RUNNING_EXTRACTION_GUIDANCE = `
TRAIL-RUNNING-SPECIFIC INTELLIGENCE:

SCOPE (BOUNDARY RULES):
- Use "trail_running" when trail surface, meaningful vertical gain, or technical terrain is the defining feature of the effort.
- Mountain/trail ultras (Western States, UTMB, HURT 100, Leadville 100, Hardrock, etc.) belong here even though the distance is "ultra".
- If the workout is on road/track with minimal vert, route to "running" — including road ultras (e.g. JFK 50 road sections, flat road ultras).
- If the athlete is carrying a pack as the defining feature, route to "backpacking" (trail + pack) or "rucking" (flat loaded march) instead.

KEY CONCEPTS:
- Vertical gain/loss is often the main story. Capture elevation_gain and elevation_loss when mentioned. Units: "ft" (US default) or "m".
- Surface: "trail", "technical_trail", "fire_road", "mountain", "scree", "mixed".
- Technicality: low / moderate / high / very_high — inferred from terrain language ("rooty", "rocky", "off-camber", "exposed class 2 scramble").
- Run types: easy, tempo, interval, long, race, recovery, fartlek, hill_repeats, vert_repeats, fkt_attempt, ultra, training.
- Ultra context: if the user mentions an ultra (50k+), set is_ultra=true and prefer ultra-specific metadata (aid stations, fueling).
- Pace: capture average_pace when available ("11:30/mi" on climbs is normal and expected — do not treat slow pace as invalid for vert-heavy days).
- Downhill durability: capture elevation_loss for quad-bomb days.
- Vertical rate: vertical_meters_per_km or ft/mi when computable.

TRAIL-RUNNING EXTRACTION EXAMPLES:
- "Trail 10k with 1,800 ft vert, technical rocky descent, 1h12m" → total_distance: 10, distance_unit: "km", total_time: 4320, elevation_gain: 1800, elevation_unit: "ft", surface: "technical_trail", technicality: "high", run_type: "training"
- "Western States 100 in 22h45m, 18k ft vert" → run_type: "ultra", is_ultra: true, total_distance: 100, distance_unit: "miles", total_time: 81900, elevation_gain: 18000, elevation_unit: "ft", surface: "trail", race_name: "Western States"
- "Vert repeats: 8x500ft climb, jog down, 5mi total" → run_type: "vert_repeats", total_distance: 5, distance_unit: "miles", elevation_gain: 4000, elevation_unit: "ft", segments: each climb as a segment
- "Easy 6mi on the trail, 800 ft gain, 55 min" → run_type: "easy", total_distance: 6, distance_unit: "miles", total_time: 3300, elevation_gain: 800, elevation_unit: "ft", surface: "trail"

SEGMENT STRUCTURE:
- Climbs and descents are typically separate segments. Capture elevation_gain/loss per segment, effort_level, and surface.
- Warmup/cooldown segments are permitted but usually trivial on trail efforts.
- Aid-station stops (for ultras) can be captured as aid_station segments with notes (calories, fluids, time).
`;
