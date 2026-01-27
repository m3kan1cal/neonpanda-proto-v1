/**
 * Types for the explain-term feature
 *
 * Allows users to click on badges (equipment, exercises, focus areas)
 * and get AI-generated explanations.
 */

/** Valid term types that can be explained */
export type ExplainTermType = "equipment" | "exercise" | "focus_area";

/** Request body for explain-term endpoint */
export interface ExplainTermRequest {
  term: string;
  termType: ExplainTermType;
}

/** Response from explain-term endpoint */
export interface ExplainTermResponse {
  term: string;
  termType: ExplainTermType;
  explanation: string;
  generatedAt: string; // ISO timestamp
}

/** Display labels for term types (used in UI and prompts) */
export const TERM_TYPE_LABELS: Record<ExplainTermType, string> = {
  equipment: "Equipment",
  exercise: "Exercise",
  focus_area: "Focus Area",
};

/** Valid term types array for validation */
export const VALID_TERM_TYPES: ExplainTermType[] = [
  "equipment",
  "exercise",
  "focus_area",
];
