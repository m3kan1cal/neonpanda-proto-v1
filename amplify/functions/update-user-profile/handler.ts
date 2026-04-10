import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  updateUserProfile,
  getUserProfile,
  getUserProfileByUsername,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import {
  syncProfileToCognito,
  extractCognitoUsername,
} from "../libs/user/cognito";
import {
  validateCriticalTrainingDirective,
  normalizeCriticalTrainingDirective,
} from "../libs/user/validation";
import { logger } from "../libs/logger";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  logger.info("Updating user profile for userId:", userId);

  // Parse and validate request body
  let updates;
  try {
    updates = JSON.parse(event.body || "{}");
  } catch (error) {
    return createErrorResponse(400, "Invalid JSON in request body");
  }

  // Validate: prevent email changes (email is an immutable GSI key)
  if (updates.email) {
    return createErrorResponse(400, "Email cannot be changed");
  }

  // Validate: prevent userId changes
  if (updates.userId) {
    return createErrorResponse(400, "User ID cannot be changed");
  }

  // Validate username changes if provided
  if (updates.username !== undefined && updates.username !== null) {
    const newUsername = updates.username.trim();

    if (newUsername.length < 3 || newUsername.length > 20) {
      return createErrorResponse(
        400,
        "Username must be between 3 and 20 characters",
      );
    }
    if (!USERNAME_REGEX.test(newUsername)) {
      return createErrorResponse(
        400,
        "Username can only contain letters, numbers, hyphens, and underscores",
      );
    }

    // Check availability — skip if unchanged
    const currentProfile = await getUserProfile(userId);
    if (currentProfile?.username !== newUsername) {
      const existingUser = await getUserProfileByUsername(newUsername);
      if (existingUser && existingUser.userId !== userId) {
        return createErrorResponse(409, "Username is already taken");
      }
    }

    // Normalise: write trimmed value back
    updates.username = newUsername;
  }

  // Validate and normalize criticalTrainingDirective if provided
  if (updates.criticalTrainingDirective) {
    const validationResult = validateCriticalTrainingDirective(
      updates.criticalTrainingDirective,
    );

    if (!validationResult.isValid) {
      return createErrorResponse(400, validationResult.error!);
    }

    // Normalize with timestamps
    updates.criticalTrainingDirective = normalizeCriticalTrainingDirective(
      updates.criticalTrainingDirective,
    );
  }

  // Validate email notification preferences if provided
  if (updates.preferences?.emailNotifications) {
    const { emailNotifications } = updates.preferences;
    const validKeys = [
      "coachCheckIns",
      "weeklyReports",
      "monthlyReports",
      "programUpdates",
      "featureAnnouncements",
    ];
    const providedKeys = Object.keys(emailNotifications);

    // Check for invalid keys
    const invalidKeys = providedKeys.filter((key) => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return createErrorResponse(
        400,
        `Invalid email notification preference keys: ${invalidKeys.join(", ")}`,
      );
    }

    // Check that all values are booleans
    for (const [key, value] of Object.entries(emailNotifications)) {
      if (typeof value !== "boolean") {
        return createErrorResponse(
          400,
          `Email notification preference '${key}' must be a boolean`,
        );
      }
    }
  }

  try {
    // 1. Update DynamoDB (primary source of truth)
    const updatedProfile = await updateUserProfile(userId, updates);

    // 2. Get the full profile with metadata to include timestamps
    const fullProfile = await getUserProfile(userId);

    // 3. Sync to Cognito (secondary, best effort) - only for fields that exist in Cognito
    const cognitoUsername = extractCognitoUsername(event);
    await syncProfileToCognito(cognitoUsername, {
      firstName: updates.firstName,
      lastName: updates.lastName,
      nickname: updates.nickname,
      username: updates.username,
    });

    return createOkResponse({
      profile: updatedProfile,
    });
  } catch (error) {
    logger.error("Error updating user profile:", error);
    return createErrorResponse(500, "Failed to update user profile");
  }
};

export const handler = withAuth(baseHandler);
