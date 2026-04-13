import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const createStripePortalSession = defineFunction({
  name: "create-stripe-portal-session",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30,
  memoryMB: 1024, // Increased from 512: user-facing, faster cold starts with more CPU
});
