import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildWorkoutAnalysis = defineFunction({
  name: "build-workout-analysis",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 60, // Lightweight single Bedrock call
  memoryMB: 512, // Minimal memory for AI processing
  resourceGroupName: "jobs",
});
