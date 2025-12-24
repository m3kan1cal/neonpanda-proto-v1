import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildWorkout = defineFunction({
  name: "build-workout",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 420, // 7 minutes for agent workflow with tools (handles complex workouts)
  memoryMB: 2048, // More memory for AI processing and agent loop
});
