import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import Stripe from "stripe";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  saveSubscription,
  updateSubscription,
  getSubscription,
  deleteSubscription,
} from "../../dynamodb/operations";
import { mapStripePriceToTier } from "../libs/subscription/stripe-helpers";
import { publishStripeAlertNotification } from "../libs/sns-helpers";
import {
  getUserIdFromSubscription,
  buildSubscriptionData,
  isNewCancellation,
  retrieveSubscriptionAndAlert,
} from "./helpers";

/**
 * Process Stripe webhook events
 * Public endpoint - validates via Stripe signature (NO Cognito auth)
 *
 * IMPORTANT: This Lambda must be invoked via its Function URL (not API Gateway).
 * API Gateway HTTP API may modify JSON bodies, breaking Stripe's signature verification.
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

  // Identify request source: Function URL vs API Gateway
  const domainName = event.requestContext?.domainName || "unknown";
  const isFunctionUrl = domainName.includes(".lambda-url.");

  // Warn if request is coming through API Gateway instead of Function URL
  if (!isFunctionUrl) {
    console.warn(
      "Webhook received via API Gateway, NOT Function URL. " +
        "API Gateway may modify the JSON body, breaking Stripe signature verification. " +
        "Update the webhook URL in Stripe to use the Lambda Function URL instead.",
    );
  }

  // Trim webhook secret defensively (guards against invisible whitespace from copy-paste)
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

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
    // We use a Function URL to ensure we receive the exact raw body from Stripe
    let stripeEvent: Stripe.Event;
    try {
      // Function URLs may base64 encode the body depending on content-type.
      // constructEvent handles both Buffer and string.
      let rawBody: string | Buffer = event.body;

      if (event.isBase64Encoded) {
        rawBody = Buffer.from(event.body, "base64");
      }

      stripeEvent = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
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
        const userId = getUserIdFromSubscription(subscription);

        if (!userId) {
          // Expected for Payment Links: subscription.created fires before checkout.session.completed
          // The checkout handler will update metadata, triggering subscription.updated with userId
          return createOkResponse({ received: true });
        }

        const tier = mapStripePriceToTier(subscription.items.data[0].price.id);
        const subscriptionData = buildSubscriptionData(
          subscription,
          userId,
          tier,
        );

        // For Payment Links: customer.subscription.created fires first without userId,
        // then customer.subscription.updated fires after checkout with userId.
        // So .updated might be creating the record for the first time.
        let isNewSubscription = false;
        if (stripeEvent.type === "customer.subscription.created") {
          await saveSubscription(subscriptionData);
          isNewSubscription = true;
        } else {
          // Check if subscription exists to determine save vs update
          const existingSubscription = await getSubscription(userId);
          if (existingSubscription) {
            await updateSubscription(subscriptionData);
          } else {
            // First time seeing this subscription with userId (Payment Link flow)
            await saveSubscription(subscriptionData);
            isNewSubscription = true;
          }
        }

        // Send SNS alert for new subscription (both direct checkout and Payment Link flows)
        if (isNewSubscription) {
          await publishStripeAlertNotification({
            eventType: "subscription_created",
            userId,
            customerEmail: (subscription.customer as any)?.email || undefined,
            subscriptionId: subscription.id,
            amount: subscription.items.data[0]?.plan?.amount || 2000,
            timestamp: new Date().toISOString(),
          });
        }

        // Send SNS alert for NEW cancellations only
        if (
          stripeEvent.type === "customer.subscription.updated" &&
          isNewCancellation(stripeEvent, subscription)
        ) {
          await publishStripeAlertNotification({
            eventType: "subscription_canceled",
            userId,
            customerEmail: (subscription.customer as any)?.email || undefined,
            subscriptionId: subscription.id,
            timestamp: new Date().toISOString(),
          });
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
        const userId = getUserIdFromSubscription(subscription);

        if (!userId) {
          console.warn("Cannot delete subscription - no userId in metadata:", {
            subscriptionId: subscription.id,
          });
          break;
        }

        await deleteSubscription(userId);

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
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | null;
        const isRecurring = invoice.billing_reason === "subscription_cycle";

        if (isRecurring && subscriptionId) {
          await retrieveSubscriptionAndAlert(
            stripe,
            subscriptionId,
            "payment_succeeded",
            invoice,
          );
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
        const subscriptionId = (invoice as any).subscription as string | null;

        if (subscriptionId) {
          await retrieveSubscriptionAndAlert(
            stripe,
            subscriptionId,
            "payment_failed",
            invoice,
            invoice.amount_due,
          );
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
