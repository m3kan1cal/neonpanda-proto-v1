import { SubscriptionTier } from "./types";
import { logger } from "../logger";

export function mapStripePriceToTier(priceId: string): SubscriptionTier {
  const electricPriceId = process.env.ELECTRICPANDA_PRICE_ID;
  const earlyPriceId = process.env.EARLYPANDA_PRICE_ID;

  if (priceId === electricPriceId) {
    return "electric";
  }

  if (priceId === earlyPriceId) {
    return "free";
  }

  // Default to free if price ID not recognized
  logger.warn(`Unknown price ID: ${priceId}, defaulting to free`);
  return "free";
}

export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case "electric":
      return "ElectricPanda";
    case "free":
      return "EarlyPanda";
    default:
      return "Free";
  }
}

export function getTierPrice(tier: SubscriptionTier): string {
  switch (tier) {
    case "electric":
      return "$20/month";
    case "free":
      return "Free";
    default:
      return "Free";
  }
}
