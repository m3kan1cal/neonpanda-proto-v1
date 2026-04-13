import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const getSubscriptionStatus = defineFunction({
  name: "get-subscription-status",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30,
  memoryMB: 1024, // Increased from 512: user-facing, faster cold starts with more CPU
});
