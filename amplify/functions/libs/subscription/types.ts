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
  createdAt: number;
  updatedAt: number;
  entityType: "subscription";
}

export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: number;
  stripeCustomerId?: string;
}
