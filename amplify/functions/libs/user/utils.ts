/**
 * User Profile Utility Functions
 */

import { UserProfile } from "./types";

/**
 * Extracts user name from user profile with fallback logic
 * Priority: displayName > firstName > nickname > undefined
 *
 * @param userProfile - The user profile object (may be undefined)
 * @returns The best available user name, or undefined if none available
 */
export function extractUserName(
  userProfile?: UserProfile | null,
): string | undefined {
  if (!userProfile) return undefined;

  if (userProfile.displayName && userProfile.displayName.trim()) {
    return userProfile.displayName.trim();
  }

  if (userProfile.firstName && userProfile.firstName.trim()) {
    return userProfile.firstName.trim();
  }

  if (userProfile.nickname && userProfile.nickname.trim()) {
    return userProfile.nickname.trim();
  }

  return undefined;
}
