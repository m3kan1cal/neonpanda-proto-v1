import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildCoachConfig = defineFunction({
  name: "build-coach-config",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900,
  // 1024 MB. Workload is Bedrock-bound; aligned with build-program / build-workout.
  memoryMB: 1024,
  resourceGroupName: "jobs",
});
