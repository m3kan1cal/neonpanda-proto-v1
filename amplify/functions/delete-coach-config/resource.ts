import 'dotenv/config';
import { defineFunction } from "@aws-amplify/backend";

export const deleteCoachConfig = defineFunction({
  name: "delete-coach-config",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024,
});
