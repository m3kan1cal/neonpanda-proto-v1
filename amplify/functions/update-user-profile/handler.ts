import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { updateUserProfile, getUserProfile } from '../../dynamodb/operations';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { syncProfileToCognito, extractCognitoUsername } from '../libs/user/cognito';
import { validateCriticalTrainingDirective, normalizeCriticalTrainingDirective } from '../libs/user/validation';

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  console.info('Updating user profile for userId:', userId);

  // Parse and validate request body
  let updates;
  try {
    updates = JSON.parse(event.body || '{}');
  } catch (error) {
    return createErrorResponse(400, 'Invalid JSON in request body');
  }

  // Validate: prevent email/username changes (immutable GSI keys)
  if (updates.email || updates.username) {
    return createErrorResponse(400, 'Email and username cannot be changed');
  }

  // Validate: prevent userId changes
  if (updates.userId) {
    return createErrorResponse(400, 'User ID cannot be changed');
  }

  // Validate and normalize criticalTrainingDirective if provided
  if (updates.criticalTrainingDirective) {
    const validationResult = validateCriticalTrainingDirective(updates.criticalTrainingDirective);

    if (!validationResult.isValid) {
      return createErrorResponse(400, validationResult.error!);
    }

    // Normalize with timestamps
    updates.criticalTrainingDirective = normalizeCriticalTrainingDirective(updates.criticalTrainingDirective);
  }

  // Validate email notification preferences if provided
  if (updates.preferences?.emailNotifications) {
    const { emailNotifications } = updates.preferences;
    const validKeys = ['coachCheckIns', 'weeklyReports', 'monthlyReports', 'programUpdates', 'featureAnnouncements'];
    const providedKeys = Object.keys(emailNotifications);

    // Check for invalid keys
    const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return createErrorResponse(400, `Invalid email notification preference keys: ${invalidKeys.join(', ')}`);
    }

    // Check that all values are booleans
    for (const [key, value] of Object.entries(emailNotifications)) {
      if (typeof value !== 'boolean') {
        return createErrorResponse(400, `Email notification preference '${key}' must be a boolean`);
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
      nickname: updates.nickname
    });

    return createOkResponse({
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return createErrorResponse(500, 'Failed to update user profile');
  }
};

export const handler = withAuth(baseHandler);
