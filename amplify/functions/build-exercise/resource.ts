import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildExercise = defineFunction({
  name: "build-exercise",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 120, // 2 minutes for extraction and normalization
  memoryMB: 1024, // 1GB for AI processing
});
