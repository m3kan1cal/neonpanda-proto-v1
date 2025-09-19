import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";

export const createCoachConfigFromTemplate = defineFunction({
  name: "create-coach-config-from-template",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024,
});
