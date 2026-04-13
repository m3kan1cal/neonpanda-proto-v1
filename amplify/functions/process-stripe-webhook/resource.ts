import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const processStripeWebhook = defineFunction({
  name: "process-stripe-webhook",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30,
  memoryMB: 1024, // Increased from 512: webhook latency matters for Stripe reliability
});
