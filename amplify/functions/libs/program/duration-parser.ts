/**
 * Duration Parsing Utilities
 *
 * Centralized logic for parsing program duration strings into days.
 * Handles numeric strings, vague terms, and time unit conversions.
 */

/**
 * Vague duration terms that can be interpreted as numbers
 * Used when users say "couple of weeks" instead of "2 weeks"
 */
export const VAGUE_DURATION_TERMS = [
  "couple",
  "few",
  "several",
  "some",
  "fortnight", // British English for 2 weeks
] as const;

/**
 * Extract a numeric value from a duration string
 * Handles both explicit numbers and vague terms
 *
 * @param durationStr - Duration string (e.g., "2 weeks", "couple of weeks")
 * @returns Extracted number or default fallback (8)
 *
 * @example
 * extractNumericValue("2 weeks") → 2
 * extractNumericValue("couple of weeks") → 2
 * extractNumericValue("few months") → 3
 * extractNumericValue("no number here") → 8 (fallback)
 */
export function extractNumericValue(durationStr: string): number {
  const lowerValue = durationStr.toLowerCase();

  // First, try to find explicit digits
  const numMatch = durationStr.match(/\d+/);
  if (numMatch) {
    return parseInt(numMatch[0], 10);
  }

  // Check for vague terms (BEFORE checking for "a/an" to avoid false matches)
  if (lowerValue.includes("couple") || lowerValue.includes("a couple")) {
    console.info("📅 Interpreted 'couple' as 2");
    return 2;
  }

  if (lowerValue.includes("few") || lowerValue.includes("a few")) {
    console.info("📅 Interpreted 'few' as 3");
    return 3;
  }

  if (lowerValue.includes("several") || lowerValue.includes("some")) {
    console.info("📅 Interpreted 'several/some' as 4");
    return 4;
  }

  // Check for standalone "a" or "an" (e.g., "a week", "an month")
  // This must come AFTER vague term checks to avoid matching "a couple", "a few", etc.
  if (/\b(a|an)\s+(week|month|day)/.test(lowerValue)) {
    console.info("📅 Interpreted 'a/an' as 1");
    return 1;
  }

  // Default fallback
  console.info("📅 No number found, defaulting to 8");
  return 8;
}

/**
 * Parse a duration string into days
 * Supports weeks, months, and days
 *
 * @param durationValue - Duration value (string or number)
 * @param defaultDays - Default value if parsing fails (default: 56)
 * @returns Duration in days
 *
 * @example
 * parseProgramDuration("2 weeks") → 14
 * parseProgramDuration("couple of weeks") → 14
 * parseProgramDuration("3 months") → 90
 * parseProgramDuration("30") → 30
 * parseProgramDuration(14) → 14
 */
export function parseProgramDuration(
  durationValue: string | number | undefined,
  defaultDays: number = 56,
): number {
  // Handle undefined/null
  if (durationValue === undefined || durationValue === null) {
    return defaultDays;
  }

  // Handle numeric input directly
  if (typeof durationValue === "number") {
    return durationValue;
  }

  // Type guard: must be a string at this point
  if (typeof durationValue !== "string") {
    console.warn("⚠️ Invalid duration type (expected string or number):", {
      type: typeof durationValue,
      value: durationValue,
      default: defaultDays,
    });
    return defaultDays;
  }

  // Parse string input
  const lowerValue = durationValue.toLowerCase();

  // Special case: "fortnight" = 2 weeks = 14 days
  if (/\bfortnight/.test(lowerValue)) {
    console.info("📅 Interpreted 'fortnight' as 14 days");
    return 14;
  }

  const extractedNum = extractNumericValue(durationValue);

  // Convert based on time unit (using word boundaries to avoid false matches)
  // \b ensures we match "week" but not "weekend", "biweekly", etc.
  if (/\bweeks?\b/.test(lowerValue)) {
    const days = extractedNum * 7;
    console.info("📅 Converted weeks to days:", {
      input: durationValue,
      weeks: extractedNum,
      days,
    });
    return days;
  }

  if (/\bmonths?\b/.test(lowerValue)) {
    const days = extractedNum * 30; // Approximate
    console.info("📅 Converted months to days:", {
      input: durationValue,
      months: extractedNum,
      days,
    });
    return days;
  }

  if (/\bdays?\b/.test(lowerValue)) {
    const days = extractedNum;
    console.info("📅 Using days directly from extracted value:", {
      input: durationValue,
      days,
    });
    return days;
  }

  // Assume days if no unit specified but we can parse a number
  const days = parseInt(durationValue, 10);
  if (!isNaN(days)) {
    console.info("📅 Using days directly from parseInt:", {
      input: durationValue,
      days,
    });
    return days;
  }

  // Final fallback
  console.warn("⚠️ Could not parse duration, using default:", {
    input: durationValue,
    default: defaultDays,
  });
  return defaultDays;
}

/**
 * Check if a duration string can be parsed
 * Used for validation before attempting to parse
 *
 * @param durationValue - Duration value to validate
 * @returns true if parseable, false otherwise
 */
export function canParseDuration(durationValue: any): boolean {
  if (durationValue === undefined || durationValue === null) {
    return true; // Optional field
  }

  // Numbers are always valid
  if (typeof durationValue === "number") {
    return true;
  }

  // Must be a string for further checks
  if (typeof durationValue !== "string") {
    return false;
  }

  const lowerValue = durationValue.toLowerCase();

  // Check for explicit digits
  if (/\d/.test(durationValue)) {
    return true;
  }

  // Check for vague terms we can interpret
  if (VAGUE_DURATION_TERMS.some((term) => lowerValue.includes(term))) {
    return true;
  }

  // Check for "a/an" + time unit pattern (e.g., "a week", "an month")
  if (/\b(a|an)\s+(week|month|day)/.test(lowerValue)) {
    return true;
  }

  return false;
}
