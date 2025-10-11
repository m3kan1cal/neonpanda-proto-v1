import { defineFunction } from "@aws-amplify/backend";

export const updateCoachConfig = defineFunction({
  name: "update-coach-config",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024,
});
