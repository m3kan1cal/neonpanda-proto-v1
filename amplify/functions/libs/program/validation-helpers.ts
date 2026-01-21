/**
 * Program Validation Helpers
 *
 * Validation utilities and constants for training program inputs.
 */

// Program duration constraints
export const MIN_PROGRAM_DURATION_DAYS = 1;
export const MAX_PROGRAM_DURATION_DAYS = 180; // 6 months max to avoid timeouts

// Training frequency constraints
export const MIN_TRAINING_FREQUENCY = 1; // At least 1 session

/**
 * Validation result for program inputs
 */
export interface ProgramInputValidationResult {
  isValid: boolean;
  error?: string;
  field?: string;
  providedValue?: any;
}

import { canParseDuration } from "./duration-parser";

/**
 * Validate program duration input type
 *
 * Checks if the provided value is either:
 * - A number
 * - A string containing at least one digit (e.g., "4 weeks", "30", "2 months")
 * - A string containing vague terms like "couple", "few", "several"
 *
 * Uses centralized parsing logic from duration-parser.ts
 *
 * @param durationValue - The duration value from todoList
 * @returns Validation result with error details if invalid
 */
export function validateProgramDurationInput(
  durationValue: any,
): ProgramInputValidationResult {
  if (durationValue === undefined) {
    return { isValid: true }; // Optional field
  }

  const isValidDuration = canParseDuration(durationValue);

  if (!isValidDuration) {
    return {
      isValid: false,
      error:
        "Invalid program duration - must be a number or string containing a number (e.g., '4 weeks', '30', 56)",
      field: "programDuration",
      providedValue: typeof durationValue,
    };
  }

  return { isValid: true };
}

/**
 * Validate training frequency input type
 *
 * Checks if the provided value is either:
 * - A number
 * - A string that can be parsed to a valid positive number
 *
 * @param frequencyValue - The frequency value from todoList
 * @returns Validation result with error details if invalid
 */
export function validateTrainingFrequencyInput(
  frequencyValue: any,
): ProgramInputValidationResult {
  if (frequencyValue === undefined) {
    return { isValid: true }; // Optional field
  }

  const parsedFrequency =
    typeof frequencyValue === "number"
      ? frequencyValue
      : parseInt(String(frequencyValue), 10);

  if (isNaN(parsedFrequency) || parsedFrequency < MIN_TRAINING_FREQUENCY) {
    return {
      isValid: false,
      error: "Invalid training frequency - must be a positive number",
      field: "trainingFrequency",
      providedValue: frequencyValue,
    };
  }

  return { isValid: true };
}

/**
 * Validate parsed program duration value
 *
 * Checks if the parsed duration is within acceptable bounds.
 * Used after parsing string inputs like "4 weeks" to numeric days.
 *
 * @param programDuration - Parsed program duration in days
 * @param rawValue - Original unparsed value for error messages
 * @throws Error if duration is invalid
 */
export function validateParsedProgramDuration(
  programDuration: number,
  rawValue: any,
): void {
  if (
    isNaN(programDuration) ||
    programDuration <= 0 ||
    programDuration > MAX_PROGRAM_DURATION_DAYS
  ) {
    throw new Error(
      `Invalid program duration: "${rawValue}". Must be a number between ${MIN_PROGRAM_DURATION_DAYS} and ${MAX_PROGRAM_DURATION_DAYS} days (6 months max).`,
    );
  }
}

/**
 * Validate parsed training frequency value
 *
 * Checks if the parsed frequency is a valid positive number.
 * Note: No upper bound since athletes can have multiple sessions per day.
 *
 * @param trainingFrequency - Parsed training frequency
 * @param rawValue - Original unparsed value for error messages
 * @throws Error if frequency is invalid
 */
export function validateParsedTrainingFrequency(
  trainingFrequency: number,
  rawValue: any,
): void {
  if (isNaN(trainingFrequency) || trainingFrequency < MIN_TRAINING_FREQUENCY) {
    throw new Error(
      `Invalid training frequency: "${rawValue}". Must be a positive number.`,
    );
  }
}
