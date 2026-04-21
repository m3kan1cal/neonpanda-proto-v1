import { logger } from "../logger";
import { getUserTimezoneOrDefault } from "../analytics/date-utils";
import type { UserProfile } from "./types";

/**
 * Resolve a user's IANA timezone from their profile with a safe fallback.
 *
 * This is the canonical reader for user timezone. Previously several Lambdas
 * reached into `(userProfile as any).timezone`, but timezone is actually stored
 * under `preferences.timezone`. Using this helper keeps the read consistent.
 *
 * Behavior:
 * - Reads `userProfile.preferences.timezone`
 * - Validates the string against `Intl.supportedValuesOf("timeZone")` when
 *   available so a stored-but-invalid value does not crash `Intl.DateTimeFormat`
 * - Falls back to `America/Los_Angeles` when missing or invalid
 */
export const getUserTimezone = (
  userProfile?: Pick<UserProfile, "preferences"> | null,
): string => {
  const raw = userProfile?.preferences?.timezone;
  if (!raw) {
    return getUserTimezoneOrDefault(null);
  }

  if (!isValidIanaTimezone(raw)) {
    logger.warn("Invalid IANA timezone on user profile, falling back", {
      provided: raw,
    });
    return getUserTimezoneOrDefault(null);
  }

  return raw;
};

/**
 * Validate an IANA timezone string.
 *
 * Prefers `Intl.supportedValuesOf("timeZone")` when the runtime supports it
 * (Node 18+). Falls back to constructing a `DateTimeFormat` and catching the
 * RangeError that invalid zones throw.
 */
export const isValidIanaTimezone = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  try {
    // Intl.DateTimeFormat is the canonical check: it throws RangeError for
    // invalid zones. `Intl.supportedValuesOf` exists but doesn't always list
    // aliases like "UTC", so we prefer the DateTimeFormat probe.
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};
