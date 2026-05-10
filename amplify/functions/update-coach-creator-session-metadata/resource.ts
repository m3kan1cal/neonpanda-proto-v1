import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const updateCoachCreatorSessionMetadata = defineFunction({
  name: "update-coach-creator-session-metadata",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 15,
  memoryMB: 512,
});
