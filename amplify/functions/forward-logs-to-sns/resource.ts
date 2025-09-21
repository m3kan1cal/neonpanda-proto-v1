import 'dotenv/config';
import { defineFunction } from "@aws-amplify/backend";

export const forwardLogsToSns = defineFunction({
  name: "forward-logs-to-sns",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024
});
