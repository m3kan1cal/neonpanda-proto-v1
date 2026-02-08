/**
 * Types for the generate-greeting feature
 *
 * Provides AI-generated contextual greetings for the Training Grounds
 * dashboard, personalized from the coach's perspective using their
 * personality, coaching style, and catchphrases.
 */

/** Valid time-of-day values */
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

/** Request body for generate-greeting endpoint */
export interface GenerateGreetingRequest {
  timeOfDay: TimeOfDay;
  activeProgramCount: number;
  todaysWorkoutCount: number;
  lastWorkoutDate?: string; // ISO date or null
  todaysWorkoutNames?: string[]; // e.g. ["Upper Body Push", "Accessory Work"]
}

/** Response from generate-greeting endpoint */
export interface GenerateGreetingResponse {
  greeting: string;
  generatedAt: string; // ISO timestamp
}

/** Valid time-of-day values array for validation */
export const VALID_TIMES_OF_DAY: TimeOfDay[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
];
