import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const runMemoryLifecycle = defineFunction({
  name: "run-memory-lifecycle",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes — batch processing all users
  memoryMB: 2048,
});
