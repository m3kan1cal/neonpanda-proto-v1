import 'dotenv/config';
import { defineFunction } from "@aws-amplify/backend";

export const skipWorkoutTemplate = defineFunction({
  name: "skip-workout-template",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024
});
