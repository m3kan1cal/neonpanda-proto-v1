import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";

export const getCoachTemplate = defineFunction({
  name: "get-coach-template",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024,
});
