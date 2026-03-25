import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildLivingProfile = defineFunction({
  name: "build-living-profile",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300, // 5 minutes — Sonnet call + DynamoDB reads/writes
  memoryMB: 1024,
});
