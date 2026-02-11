/**
 * Workout display constants for PR types, labels, and unit systems.
 * Shared across frontend components that display workout/PR data.
 */

// ---------------------------------------------------------------------------
// PR Type Labels
// ---------------------------------------------------------------------------

/**
 * Human-readable labels for PR type identifiers.
 */
export const PR_TYPE_LABELS = {
  "1rm": "1RM",
  volume_pr: "Volume",
  distance_pr: "Distance",
  pace_pr: "Pace",
  workout_time: "Time",
};

// ---------------------------------------------------------------------------
// PR Type Units (by unit system)
// ---------------------------------------------------------------------------

/**
 * Unit suffixes for each PR type, keyed by unit system.
 * Default unit system is "imperial".
 */
export const PR_TYPE_UNITS = {
  imperial: {
    "1rm": "lbs",
    volume_pr: "lbs",
    distance_pr: "mi",
    pace_pr: "min/mi",
    workout_time: "min",
  },
  metric: {
    "1rm": "kg",
    volume_pr: "kg",
    distance_pr: "km",
    pace_pr: "min/km",
    workout_time: "min",
  },
};

// ---------------------------------------------------------------------------
// Unit System Constants
// ---------------------------------------------------------------------------

export const UNIT_SYSTEMS = {
  IMPERIAL: "imperial",
  METRIC: "metric",
};

export const DEFAULT_UNIT_SYSTEM = UNIT_SYSTEMS.IMPERIAL;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a user-friendly label for a PR type.
 */
export function getPrTypeLabel(prType) {
  if (!prType) return "PR";
  return PR_TYPE_LABELS[prType] || prType.replace(/_/g, " ").toUpperCase();
}

/**
 * Returns the appropriate unit for a PR.
 * Priority: storedUnit (from data) > PR_TYPE_UNITS lookup > empty string.
 * The storedUnit parameter enables using the unit captured during workout
 * extraction, falling back to the inferred unit for older PR data.
 */
export function getPrUnit(
  prType,
  unitSystem = DEFAULT_UNIT_SYSTEM,
  storedUnit = null,
) {
  if (storedUnit) return storedUnit;
  if (!prType) return "";
  const units = PR_TYPE_UNITS[unitSystem] || PR_TYPE_UNITS.imperial;
  return units[prType] || "";
}
