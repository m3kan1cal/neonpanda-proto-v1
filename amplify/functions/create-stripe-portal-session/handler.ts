import Stripe from "stripe";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { getSubscription } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { getAppUrl } from "../libs/domain-utils";

/**
 * Create a Stripe Customer Portal session for subscription management
 * Stripe-specific endpoint - allows users to manage billing, update payment, cancel subscription
 *
 * Requires: Active subscription with stripeCustomerId
 * Returns: Portal session URL for redirect
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;

  console.info("Creating Stripe portal session for userId:", userId);

  try {
    // Get user's subscription to retrieve Stripe customer ID
    const subscription = await getSubscription(userId);

    if (!subscription || !subscription.stripeCustomerId) {
      console.warn("No active subscription found for portal session:", {
        userId,
        hasSubscription: !!subscription,
        hasCustomerId: !!subscription?.stripeCustomerId,
      });
      return createErrorResponse(404, "No active subscription found");
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${getAppUrl()}/settings?userId=${userId}`,
    });

    console.info("Stripe portal session created:", {
      userId,
      customerId: subscription.stripeCustomerId,
      portalSessionId: session.id,
    });

    return createOkResponse({ url: session.url });
  } catch (error) {
    console.error("Error creating Stripe portal session:", error);

    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      return createErrorResponse(400, `Stripe error: ${error.message}`);
    }

    return createErrorResponse(500, "Failed to create portal session");
  }
};

export const handler = withAuth(baseHandler);
