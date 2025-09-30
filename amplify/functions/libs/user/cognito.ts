/**
 * Cognito User Management Operations
 * Helper functions for synchronizing user data with AWS Cognito
 */

import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

/**
 * Profile updates that can be synced to Cognito
 */
export interface CognitoSyncableProfile {
  firstName?: string;
  lastName?: string;
  nickname?: string;
}

/**
 * Syncs user profile attributes to Cognito User Pool
 * This is a best-effort operation - logs errors but doesn't throw
 *
 * @param cognitoUsername - The Cognito username (sub claim from JWT)
 * @param profileUpdates - The profile fields to sync
 * @returns Object with success status and synced attributes
 */
export async function syncProfileToCognito(
  cognitoUsername: string,
  profileUpdates: CognitoSyncableProfile
): Promise<{ success: boolean; syncedAttributes: string[]; error?: string }> {
  try {
    const cognitoAttributes = [];

    // Map profile fields to Cognito attribute names
    if (profileUpdates.firstName !== undefined) {
      cognitoAttributes.push({
        Name: 'given_name',
        Value: String(profileUpdates.firstName || '')
      });
    }

    if (profileUpdates.lastName !== undefined) {
      cognitoAttributes.push({
        Name: 'family_name',
        Value: String(profileUpdates.lastName || '')
      });
    }

    if (profileUpdates.nickname !== undefined) {
      cognitoAttributes.push({
        Name: 'nickname',
        Value: String(profileUpdates.nickname || '')
      });
    }

    // If no attributes to sync, return early
    if (cognitoAttributes.length === 0) {
      return { success: true, syncedAttributes: [] };
    }

    // Update Cognito User Pool
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: cognitoUsername,
      UserAttributes: cognitoAttributes
    });

    await cognitoClient.send(command);

    const syncedAttributeNames = cognitoAttributes.map(a => a.Name);
    console.info('✅ Synced attributes to Cognito:', syncedAttributeNames);

    return {
      success: true,
      syncedAttributes: syncedAttributeNames
    };

  } catch (error) {
    // Log but don't throw - Cognito sync is best effort
    console.error('⚠️ Failed to sync attributes to Cognito (non-fatal):', error);

    return {
      success: false,
      syncedAttributes: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Extracts the Cognito username (sub) from an authenticated event
 *
 * @param event - The authenticated Lambda event with JWT context
 * @returns The Cognito username (sub claim)
 */
export function extractCognitoUsername(event: any): string {
  // Try to get from JWT claims first
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (sub) {
    return String(sub);
  }

  // Fallback to username from authenticated user
  if (event.user?.username) {
    return String(event.user.username);
  }

  throw new Error('Could not extract Cognito username from event');
}
