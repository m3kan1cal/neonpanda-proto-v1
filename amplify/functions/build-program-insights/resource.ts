import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildProgramInsights = defineFunction({
  name: "build-program-insights",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 90, // Single Bedrock call + parallel DynamoDB fetches
  memoryMB: 512,
  resourceGroupName: "jobs",
});
