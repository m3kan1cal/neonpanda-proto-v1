export type SubscriptionTier = "free" | "electric";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "incomplete"
  | "trialing";

export interface Subscription {
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  metadata: {
    foundingMember: boolean;
    priceLocked: boolean;
  };
  entityType: "subscription";
  // Note: createdAt/updatedAt stored at DynamoDB item root level, not in attributes
  // Added back when retrieved via getSubscription()
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: number;
  // stripeCustomerId intentionally excluded - only needed server-side
}
