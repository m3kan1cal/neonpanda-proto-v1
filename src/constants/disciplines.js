/**
 * Single source of truth for the 14 supported training disciplines on the
 * frontend. Mirrors `SUPPORTED_DISCIPLINES` in
 * `amplify/functions/libs/exercise/types.ts`.
 *
 * Marketing pages, docs components, and UI maps should derive counts and
 * display names from this file instead of hardcoding lists (that drift is
 * what introduced the 8/9/10/11 inconsistency we are cleaning up here).
 *
 * If the backend `ExerciseDiscipline` union grows, add the new id here in
 * the same slot and update any per-id helpers (heat-map abbreviations,
 * share-card metrics, badge color tokens) in the same PR.
 */

export const DISCIPLINES = [
  { id: "crossfit", label: "CrossFit", color: "pink", abbr: "CF" },
  { id: "powerlifting", label: "Powerlifting", color: "purple", abbr: "PL" },
  { id: "bodybuilding", label: "Bodybuilding", color: "cyan", abbr: "BB" },
  {
    id: "olympic_weightlifting",
    label: "Olympic Weightlifting",
    color: "purple",
    abbr: "OL",
  },
  {
    id: "functional_bodybuilding",
    label: "Functional Bodybuilding",
    color: "cyan",
    abbr: "FB",
  },
  { id: "calisthenics", label: "Calisthenics", color: "pink", abbr: "CL" },
  { id: "running", label: "Running", color: "pink", abbr: "RN" },
  { id: "trail_running", label: "Trail Running", color: "pink", abbr: "TR" },
  { id: "cycling", label: "Cycling", color: "cyan", abbr: "CY" },
  { id: "hyrox", label: "Hyrox", color: "purple", abbr: "HY" },
  {
    id: "circuit_training",
    label: "Circuit Training",
    color: "cyan",
    abbr: "CT",
  },
  { id: "hybrid", label: "Hybrid", color: "purple", abbr: "HB" },
  { id: "backpacking", label: "Backpacking", color: "cyan", abbr: "BP" },
  { id: "rucking", label: "Rucking", color: "purple", abbr: "RK" },
];

export const DISCIPLINE_COUNT = DISCIPLINES.length;

export const DISCIPLINE_IDS = DISCIPLINES.map((d) => d.id);

export const DISCIPLINE_DISPLAY_NAMES = Object.fromEntries(
  DISCIPLINES.map((d) => [d.id, d.label]),
);

export const DISCIPLINE_COLORS = Object.fromEntries(
  DISCIPLINES.map((d) => [d.id, d.color]),
);

export const DISCIPLINE_ABBR = Object.fromEntries(
  DISCIPLINES.map((d) => [d.id, d.abbr]),
);

export const isSupportedDiscipline = (id) => DISCIPLINE_IDS.includes(id);

export const getDisciplineLabel = (id) => DISCIPLINE_DISPLAY_NAMES[id] || id;
