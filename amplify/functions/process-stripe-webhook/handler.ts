import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import Stripe from "stripe";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  saveSubscription,
  deleteSubscription,
} from "../../dynamodb/operations";
import { mapStripePriceToTier } from "../libs/subscription/stripe-helpers";
import { publishStripeAlertNotification } from "../libs/sns-helpers";

/**
 * Process Stripe webhook events
 * Public endpoint - validates via Stripe signature (NO Cognito auth)
 *
 * Handles subscription lifecycle events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - checkout.session.completed (for Payment Link userId extraction)
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover" as Stripe.LatestApiVersion,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.info("Stripe webhook received");

  try {
    // Validate request has required fields
    if (!event.body) {
      console.error("Missing request body");
      return createErrorResponse(400, "Missing request body");
    }

    const signature = event.headers["stripe-signature"];
    if (!signature) {
      console.error("Missing stripe-signature header");
      return createErrorResponse(400, "Missing stripe-signature header");
    }

    // Verify webhook signature
    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return createErrorResponse(400, "Invalid signature");
    }

    console.info("Webhook event verified:", {
      type: stripeEvent.type,
      id: stripeEvent.id,
    });

    // Log full event payload for debugging
    console.info("📋 FULL Stripe Event:", JSON.stringify(stripeEvent, null, 2));

    // Handle different event types
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        // Payment Link checkout completed - extract userId from client_reference_id
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;

        if (!userId) {
          console.warn("No client_reference_id in checkout session:", {
            sessionId: session.id,
          });
          // Don't fail - the subscription.created event will handle this if metadata is set
          break;
        }

        console.info("Checkout session completed:", {
          sessionId: session.id,
          userId,
          customerId: session.customer,
          subscriptionId: session.subscription,
        });

        // If there's a subscription, update its metadata with userId
        if (session.subscription && session.customer) {
          try {
            await stripe.subscriptions.update(session.subscription as string, {
              metadata: { userId },
            });
            console.info("Updated subscription metadata with userId:", {
              subscriptionId: session.subscription,
              userId,
            });
          } catch (updateError) {
            console.error(
              "Failed to update subscription metadata:",
              updateError,
            );
            // Don't fail the webhook - subscription will still work
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          // Expected for Payment Links: subscription.created fires before checkout.session.completed
          // The checkout handler will update metadata, triggering subscription.updated with userId
          return createOkResponse({ received: true });
        }

        const tier = mapStripePriceToTier(subscription.items.data[0].price.id);

        // Handle both cancellation methods:
        // 1. cancel_at_period_end (legacy API)
        // 2. cancel_at (modern Customer Portal - sets timestamp instead of boolean)
        const isCanceledAtPeriodEnd =
          subscription.cancel_at_period_end || subscription.cancel_at !== null;

        await saveSubscription({
          userId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0].price.id,
          tier,
          status: subscription.status as any,
          currentPeriodStart: subscription.items.data[0].current_period_start,
          currentPeriodEnd: subscription.items.data[0].current_period_end,
          cancelAtPeriodEnd: isCanceledAtPeriodEnd,
          canceledAt: subscription.canceled_at || undefined,
          metadata: {
            foundingMember: tier === "electric",
            priceLocked: tier === "electric",
          },
        });

        // Send SNS alert for new subscription
        if (stripeEvent.type === "customer.subscription.created") {
          await publishStripeAlertNotification({
            eventType: "subscription_created",
            userId,
            customerEmail: (subscription.customer as any)?.email || undefined,
            subscriptionId: subscription.id,
            amount: subscription.items.data[0]?.plan?.amount || 2000,
            timestamp: new Date().toISOString(),
          });
        }

        // Check if subscription was canceled (for subscription.updated event)
        if (
          stripeEvent.type === "customer.subscription.updated" &&
          isCanceledAtPeriodEnd
        ) {
          // Only alert if this is a NEW cancellation (check previous_attributes)
          const previousAttributes = (stripeEvent.data as any)
            .previous_attributes;
          const wasPreviouslyCanceled =
            previousAttributes?.cancel_at_period_end === true ||
            previousAttributes?.cancel_at !== undefined;

          if (!wasPreviouslyCanceled) {
            await publishStripeAlertNotification({
              eventType: "subscription_canceled",
              userId,
              customerEmail: (subscription.customer as any)?.email || undefined,
              subscriptionId: subscription.id,
              timestamp: new Date().toISOString(),
            });
          }
        }

        console.info(`Subscription ${stripeEvent.type.split(".")[2]}:`, {
          subscriptionId: subscription.id,
          userId,
          tier,
          status: subscription.status,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await deleteSubscription(userId);

          // Send SNS alert for deleted subscription
          await publishStripeAlertNotification({
            eventType: "subscription_deleted",
            userId,
            subscriptionId: subscription.id,
            timestamp: new Date().toISOString(),
          });

          console.info("Subscription deleted:", {
            subscriptionId: subscription.id,
            userId,
          });
        } else {
          console.warn("Cannot delete subscription - no userId in metadata:", {
            subscriptionId: subscription.id,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        // Get subscription ID from invoice (may be string or expandable object)
        const subscriptionId = (invoice as any).subscription as string | null;

        // Check if this is a recurring payment (not first payment)
        const isRecurring = invoice.billing_reason === "subscription_cycle";

        if (isRecurring && subscriptionId) {
          // Get subscription to extract userId from metadata
          try {
            const subscription =
              await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.userId;

            if (userId) {
              await publishStripeAlertNotification({
                eventType: "payment_succeeded",
                userId,
                customerEmail: invoice.customer_email || undefined,
                subscriptionId,
                invoiceId: invoice.id,
                amount: invoice.amount_paid,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error(
              "Failed to retrieve subscription for payment success alert:",
              error,
            );
          }
        }

        console.info("Invoice payment succeeded:", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amountPaid: invoice.amount_paid,
          isRecurring,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        // Get subscription ID from invoice (may be string or expandable object)
        const subscriptionId = (invoice as any).subscription as string | null;

        // Get subscription to extract userId from metadata
        if (subscriptionId) {
          try {
            const subscription =
              await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.userId;

            if (userId) {
              await publishStripeAlertNotification({
                eventType: "payment_failed",
                userId,
                customerEmail: invoice.customer_email || undefined,
                subscriptionId,
                invoiceId: invoice.id,
                amount: invoice.amount_due,
                attemptCount: invoice.attempt_count,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error(
              "Failed to retrieve subscription for payment failure alert:",
              error,
            );
          }
        }

        console.warn("Invoice payment failed:", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count,
        });
        break;
      }

      default:
        console.info(`Unhandled event type: ${stripeEvent.type}`);
    }

    return createOkResponse({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return createErrorResponse(500, "Webhook processing failed");
  }
};
