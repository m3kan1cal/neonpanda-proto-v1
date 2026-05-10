import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildWorkout = defineFunction({
  name: "build-workout",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 420, // 7 minutes for agent workflow with tools (handles complex workouts)
  // 1024 MB. Workload is Bedrock-bound (agent loop + tool calls), not CPU-bound.
  // Aligned with build-program / build-coach-config; observed peak memory across
  // tests is well under 1024.
  memoryMB: 1024,
  resourceGroupName: "jobs",
});
