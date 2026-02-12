import { authenticatedFetch } from "./apiConfig";
import { logger } from "../logger";

/**
 * Subscription tier types
 */
export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  ELECTRIC: "electric",
};

/**
 * Get the current user's subscription status
 * Provider-agnostic - returns normalized subscription data
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Subscription status object
 */
export async function getSubscriptionStatus(userId) {
  const response = await authenticatedFetch(`/users/${userId}/subscription`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch subscription status");
  }

  const data = await response.json();

  // Normalize the response to ensure tier defaults to "free"
  return {
    hasSubscription: data.hasSubscription || false,
    tier: data.tier || SUBSCRIPTION_TIERS.FREE,
    status: data.status || null,
    currentPeriodEnd: data.currentPeriodEnd || null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
    canceledAt: data.canceledAt || null,
    stripeCustomerId: data.stripeCustomerId || null,
  };
}

/**
 * Create a Stripe Customer Portal session for subscription management
 * Stripe-specific - allows users to manage their subscription
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Object containing portal session URL
 */
export async function createStripePortalSession(userId) {
  const response = await authenticatedFetch(
    `/users/${userId}/stripe/portal-session`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Handle specific error cases
    if (response.status === 404) {
      throw new Error("No active subscription found");
    }

    throw new Error(errorData.message || "Failed to create portal session");
  }

  return response.json();
}

/**
 * Get the Stripe Payment Link URL with user metadata
 * @param {string} userId - The user's ID
 * @param {string} email - The user's email
 * @returns {string} - The payment link URL with metadata
 */
export function getElectricPandaPaymentLink(userId, email) {
  const baseUrl = import.meta.env.VITE_ELECTRIC_PANDA_PAYMENT_LINK;

  if (!baseUrl) {
    logger.error("VITE_ELECTRIC_PANDA_PAYMENT_LINK is not configured");
    return null;
  }

  // Build URL with metadata
  // Note: client_reference_id is the reliable way to pass userId for Payment Links
  // metadata[userId] may not work with all Payment Link configurations
  const url = new URL(baseUrl);
  url.searchParams.set("prefilled_email", email);
  url.searchParams.set("client_reference_id", userId);

  return url.toString();
}

/**
 * Get subscription tier display information
 * @param {string} tier - The subscription tier
 * @returns {Object} - Display name, price, and features
 */
export function getTierDisplayInfo(tier) {
  switch (tier) {
    case SUBSCRIPTION_TIERS.ELECTRIC:
      return {
        name: "ElectricPanda",
        displayName: "ElectricPanda",
        price: "$20/month",
        priceValue: 20,
        isFoundingMember: true,
        features: [
          "All EarlyPanda features",
          "Founding member pricing locked forever",
          "Priority feature access",
          "Direct feedback channel",
        ],
      };
    case SUBSCRIPTION_TIERS.FREE:
    default:
      return {
        name: "EarlyPanda",
        displayName: "EarlyPanda",
        price: "Free",
        priceValue: 0,
        isFoundingMember: false,
        features: [
          "Full access to all current features",
          "Unlimited AI coaching conversations",
          "Unlimited workout logging",
          "Program design and tracking",
        ],
      };
  }
}

/**
 * Check if user has premium (paid) subscription
 * @param {string} tier - The subscription tier
 * @returns {boolean} - Whether user has premium access
 */
export function isPremiumTier(tier) {
  return tier === SUBSCRIPTION_TIERS.ELECTRIC;
}

/**
 * Polling utility with exponential backoff for subscription status
 * Used after Stripe checkout to wait for webhook processing
 * @param {string} userId - The user's ID
 * @param {Object} options - Polling options
 * @returns {Promise<Object>} - Final subscription status
 */
export async function pollSubscriptionStatus(userId, options = {}) {
  const {
    maxAttempts = 8,
    initialDelay = 500,
    maxDelay = 8000,
    expectedTier = SUBSCRIPTION_TIERS.ELECTRIC,
    onProgress = null,
  } = options;

  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxAttempts) {
    attempt++;

    if (onProgress) {
      onProgress({ attempt, maxAttempts, delay });
    }

    try {
      const status = await getSubscriptionStatus(userId);

      // Check if subscription matches expected tier
      if (status.tier === expectedTier && status.hasSubscription) {
        return { success: true, subscription: status };
      }
    } catch (error) {
      logger.warn(`Subscription polling attempt ${attempt} failed:`, error);
    }

    // Wait before next attempt (unless this was the last attempt)
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      // Exponential backoff with cap
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  // Max attempts reached without finding expected subscription
  // Return current status (defaults to free)
  const finalStatus = await getSubscriptionStatus(userId).catch(() => ({
    hasSubscription: false,
    tier: SUBSCRIPTION_TIERS.FREE,
  }));

  return { success: false, subscription: finalStatus };
}
