import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildCoachConfig = defineFunction({
  name: "build-coach-config",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900,
  memoryMB: 2048,
});
