/**
 * Build Living Profile Lambda
 *
 * Triggered asynchronously after conversation summary generation.
 * Loads conversation summary + user memories + existing profile,
 * calls Sonnet to synthesize/update the Living Profile, and saves to DynamoDB.
 *
 * Pipeline:
 *   summary completes → invokeAsyncLambda("build-living-profile") → this handler
 */

import {
  getUserProfile,
  updateUserProfile,
  getCoachConversationSummary,
} from "../../dynamodb/operations";
import { queryMemories } from "../../dynamodb/memory";
import { generateLivingProfile } from "../libs/user/living-profile";
import { logger } from "../libs/logger";
import { getUserTimezone } from "../libs/user/timezone";

export interface BuildLivingProfileEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  totalConversations: number;
  coachName: string;
}

export const handler = async (event: BuildLivingProfileEvent) => {
  try {
    logger.info("🧠 Starting living profile generation:", {
      userId: event.userId,
      coachId: event.coachId,
      conversationId: event.conversationId,
      totalConversations: event.totalConversations,
    });

    // Load data in parallel
    const [userProfile, conversationSummary, userMemories] = await Promise.all([
      getUserProfile(event.userId),
      getCoachConversationSummary(event.userId, event.conversationId),
      queryMemories(event.userId, event.coachId, { limit: 50 }),
    ]);

    if (!conversationSummary) {
      logger.warn(
        "No conversation summary found, skipping living profile update",
      );
      return { statusCode: 200, body: "No summary available" };
    }

    // Extract summary text
    const summaryText =
      typeof conversationSummary === "string"
        ? conversationSummary
        : conversationSummary.narrative;

    // Generate or update the living profile
    const livingProfile = await generateLivingProfile({
      existingProfile: userProfile?.livingProfile,
      conversationSummary: summaryText,
      conversationId: event.conversationId,
      userMemories,
      totalConversations: event.totalConversations,
      coachName: event.coachName,
      userTimezone: getUserTimezone(userProfile),
    });

    // Save the updated living profile to the user profile
    await updateUserProfile(event.userId, {
      livingProfile,
    });

    logger.info("✅ Living profile updated successfully:", {
      userId: event.userId,
      version: livingProfile.metadata.version,
      confidence: livingProfile.metadata.confidence,
      patternCount: livingProfile.observedPatterns.patterns.length,
      highlightCount: livingProfile.highlightReel.length,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        version: livingProfile.metadata.version,
        confidence: livingProfile.metadata.confidence,
      }),
    };
  } catch (error) {
    logger.error("❌ Living profile generation failed:", error);
    // Don't throw — this is a fire-and-forget operation
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
