import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const buildConversationTitle = defineFunction({
  name: "build-conversation-title",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 60,
  memoryMB: 512,
  resourceGroupName: "jobs",
});
