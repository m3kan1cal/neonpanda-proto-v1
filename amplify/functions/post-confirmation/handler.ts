import { nanoid } from "nanoid";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type {
  PostConfirmationTriggerEvent,
  PostConfirmationTriggerHandler,
} from "aws-lambda";
import {
  saveUserProfile,
  getUserProfileByEmail,
  getUserProfileByUsername,
} from "../../dynamodb/operations";
import type { UserProfile } from "../libs/user/types";
import {
  publishUserRegistrationNotification,
  type UserRegistrationData,
} from "../libs/sns-helpers";
import { logger } from "../libs/logger";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

/**
 * Detects whether this confirmation event originated from a federated provider (e.g. Google).
 * Federated users have an `identities` attribute (JSON array) or a provider-prefixed username.
 */
function detectFederatedUser(event: PostConfirmationTriggerEvent): boolean {
  const identities = event.request.userAttributes.identities;
  if (identities) {
    try {
      const parsed = JSON.parse(identities);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      // ignore parse errors
    }
  }
  // Federated usernames carry the provider prefix (e.g. "google_123456789")
  return event.userName?.toLowerCase().startsWith("google_") ?? false;
}

/**
 * Generates a unique username derived from the user's email prefix.
 * Applies up to 5 collision retries with a short random suffix, then
 * falls back to an 8-char suffix to guarantee uniqueness.
 * Capped at 11 chars base to ensure max total length is 20 chars (11 + _ + 8).
 */
async function generateUniqueUsername(email: string): Promise<string> {
  const baseUsername = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 11);

  const existing = await getUserProfileByUsername(baseUsername);
  if (!existing) return baseUsername;

  for (let i = 0; i < 5; i++) {
    const candidate = `${baseUsername}_${nanoid(4)}`;
    const check = await getUserProfileByUsername(candidate);
    if (!check) return candidate;
  }

  // Final fallback: verify even the 8-char suffix doesn't collide
  const finalCandidate = `${baseUsername}_${nanoid(8)}`;
  const finalCheck = await getUserProfileByUsername(finalCandidate);
  if (!finalCheck) return finalCandidate;

  // Fallback with full 8-char suffix to stay within 20-char limit
  return `${baseUsername}_${nanoid(8)}`;
}

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent,
) => {
  logger.info("Post-confirmation trigger:", JSON.stringify(event, null, 2));

  try {
    const userAttributes = event.request.userAttributes;
    const email = userAttributes.email;
    const givenName = userAttributes.given_name || "";
    const familyName = userAttributes.family_name || "";
    const isFederated = detectFederatedUser(event);

    // For federated users, attributeMapping sets preferred_username to the Google email.
    // Generate a real username from the email prefix instead.
    let preferredUsername: string;
    if (isFederated) {
      preferredUsername = await generateUniqueUsername(email);
      logger.info(
        `Federated user detected. Generated username: ${preferredUsername}`,
      );
    } else {
      preferredUsername = userAttributes.preferred_username || event.userName;
    }

    // Check if a user profile already exists with this email (account linking)
    logger.info(`Checking for existing user profile with email: ${email}`);
    const existingProfile = await getUserProfileByEmail(email);

    if (existingProfile) {
      logger.warn(`⚠️ User profile already exists for email: ${email}`, {
        existingUserId: existingProfile.userId,
        existingUsername: existingProfile.username,
        cognitoUsername: event.userName,
        isFederated,
      });

      const existingCustomUserId = existingProfile.userId;
      logger.info(
        `Linking existing profile ${existingCustomUserId} to Cognito user: ${event.userName}`,
      );

      // Always set custom:user_id; for federated users also override preferred_username
      // with the existing username (not the raw email from attributeMapping)
      const cognitoAttributes: { Name: string; Value: string }[] = [
        { Name: "custom:user_id", Value: existingCustomUserId },
      ];

      if (isFederated) {
        cognitoAttributes.push({
          Name: "preferred_username",
          Value: existingProfile.username,
        });
      }

      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: event.userPoolId,
          Username: event.userName,
          UserAttributes: cognitoAttributes,
        }),
      );

      logger.info(
        `Successfully linked existing profile ${existingCustomUserId} to Cognito user: ${event.userName}`,
      );

      try {
        const registrationData: UserRegistrationData = {
          userId: existingCustomUserId,
          username: existingProfile.username,
          email: email,
          firstName: givenName,
          lastName: familyName,
          displayName:
            existingProfile.displayName ||
            `${givenName} ${familyName}`.trim() ||
            existingProfile.username,
          timestamp: new Date().toISOString(),
          isNewProfile: false,
        };
        await publishUserRegistrationNotification(registrationData);
      } catch (snsError) {
        logger.error(
          "Failed to send SNS notification for existing user:",
          snsError,
        );
      }

      return event;
    }

    // New user — generate custom userId
    const customUserId = nanoid(21);
    logger.info(
      `Generating new custom userId: ${customUserId} for user: ${event.userName}`,
    );

    // Set custom:user_id; for federated users also set the generated preferred_username
    // to replace the email value that attributeMapping wrote
    const cognitoAttributes: { Name: string; Value: string }[] = [
      { Name: "custom:user_id", Value: customUserId },
    ];

    if (isFederated) {
      cognitoAttributes.push({
        Name: "preferred_username",
        Value: preferredUsername,
      });
    }

    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        UserAttributes: cognitoAttributes,
      }),
    );

    logger.info(
      `Successfully set custom userId: ${customUserId} (isFederated: ${isFederated})`,
    );

    const userProfile: UserProfile = {
      athleteProfile: {
        confidence: 0,
        updatedAt: new Date(),
        sources: [],
        summary: "",
        version: 1,
      },
      avatar: {
        s3Key: "",
        url: "",
      },
      demographics: {},
      displayName: `${givenName} ${familyName}`.trim() || preferredUsername,
      email: email,
      firstName: givenName,
      fitness: {},
      lastName: familyName,
      metadata: {
        isActive: true,
      },
      nickname: givenName || preferredUsername,
      preferences: {
        timezone: "America/Los_Angeles",
      },
      subscription: {},
      userId: customUserId,
      username: preferredUsername,
      criticalTrainingDirective: {
        content: "",
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    await saveUserProfile(userProfile);
    logger.info(`Successfully created user profile for: ${customUserId}`);

    try {
      const registrationData: UserRegistrationData = {
        userId: customUserId,
        username: preferredUsername,
        email: email,
        firstName: givenName,
        lastName: familyName,
        displayName: userProfile.displayName,
        timestamp: new Date().toISOString(),
        isNewProfile: true,
      };
      await publishUserRegistrationNotification(registrationData);
    } catch (snsError) {
      logger.error("Failed to send SNS notification for new user:", snsError);
    }

    return event;
  } catch (error) {
    logger.error("Failed in post-confirmation:", error);
    logger.error("Continuing with registration despite error");
    return event;
  }
};
