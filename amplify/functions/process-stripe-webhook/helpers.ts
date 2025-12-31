import Stripe from "stripe";
import { publishStripeAlertNotification } from "../libs/sns-helpers";
import type { SubscriptionTier } from "../libs/subscription/types";

/**
 * Extract userId from subscription metadata
 */
export function getUserIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  return subscription.metadata?.userId || null;
}

/**
 * Check if subscription is canceled (handles both legacy and modern API)
 */
export function isSubscriptionCanceled(
  subscription: Stripe.Subscription,
): boolean {
  return subscription.cancel_at_period_end || subscription.cancel_at !== null;
}

/**
 * Build subscription data object for DynamoDB
 */
export function buildSubscriptionData(
  subscription: Stripe.Subscription,
  userId: string,
  tier: SubscriptionTier,
) {
  const isCanceled = isSubscriptionCanceled(subscription);

  return {
    userId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    stripePriceId: subscription.items.data[0].price.id,
    tier,
    status: subscription.status as any,
    currentPeriodStart: (subscription.items.data[0] as any)
      .current_period_start,
    currentPeriodEnd: (subscription.items.data[0] as any).current_period_end,
    cancelAtPeriodEnd: isCanceled,
    canceledAt: subscription.canceled_at || undefined,
    metadata: {
      foundingMember: tier === "electric",
      priceLocked: tier === "electric",
    },
  };
}

/**
 * Check if subscription cancellation is NEW (not already canceled)
 */
export function isNewCancellation(
  stripeEvent: Stripe.Event,
  subscription: Stripe.Subscription,
): boolean {
  if (!isSubscriptionCanceled(subscription)) {
    return false;
  }

  const previousAttributes = (stripeEvent.data as any).previous_attributes;
  const wasPreviouslyCanceled =
    previousAttributes?.cancel_at_period_end === true ||
    previousAttributes?.cancel_at !== undefined;

  return !wasPreviouslyCanceled;
}

/**
 * Retrieve subscription and send alert (for payment events)
 */
export async function retrieveSubscriptionAndAlert(
  stripe: Stripe,
  subscriptionId: string,
  alertType: "payment_succeeded" | "payment_failed",
  invoice: Stripe.Invoice,
  amount?: number,
): Promise<void> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = getUserIdFromSubscription(subscription);

    if (!userId) {
      console.warn(`No userId in subscription metadata for ${alertType}`);
      return;
    }

    await publishStripeAlertNotification({
      eventType: alertType,
      userId,
      customerEmail: invoice.customer_email || undefined,
      subscriptionId,
      invoiceId: invoice.id,
      amount: amount ?? invoice.amount_paid,
      ...(alertType === "payment_failed" && {
        attemptCount: invoice.attempt_count,
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `Failed to retrieve subscription for ${alertType} alert:`,
      error,
    );
  }
}
