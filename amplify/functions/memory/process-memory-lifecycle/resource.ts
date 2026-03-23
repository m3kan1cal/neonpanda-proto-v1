import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../../libs/configs";

export const processMemoryLifecycle = defineFunction({
  name: "process-memory-lifecycle",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300, // 5 minutes per user — handles all memory operations for one user
  memoryMB: 1024,
});
