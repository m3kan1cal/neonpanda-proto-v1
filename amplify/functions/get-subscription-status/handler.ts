import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getSubscription } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { SubscriptionStatusResponse } from "../libs/subscription/types";

/**
 * Get subscription status for a user
 * Provider-agnostic endpoint - returns subscription status without Stripe-specific details
 *
 * Default behavior: No subscription record = Free tier access (EarlyPanda)
 * This ensures users get immediate access after signup without waiting for DB records
 */
const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;

  console.info("Getting subscription status for userId:", userId);

  try {
    const subscription = await getSubscription(userId);

    // No subscription record = Free tier access
    // This is the default state for all users
    if (!subscription) {
      const response: SubscriptionStatusResponse = {
        hasSubscription: false,
        tier: "free",
      };

      console.info("No subscription found, returning free tier:", {
        userId,
        tier: "free",
      });

      return createOkResponse(response);
    }

    // Subscription exists - return full status
    // Note: stripeCustomerId intentionally excluded - only needed server-side
    const response: SubscriptionStatusResponse = {
      hasSubscription: true,
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
    };

    console.info("Subscription found:", {
      userId,
      tier: subscription.tier,
      status: subscription.status,
    });

    return createOkResponse(response);
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return createErrorResponse(500, "Failed to get subscription status");
  }
};

export const handler = withAuth(baseHandler);
