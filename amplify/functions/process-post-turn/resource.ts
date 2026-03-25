import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const processPostTurn = defineFunction({
  name: "process-post-turn",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 120, // 2 minutes — analyze_complexity + extractProspectiveMemories run in parallel, plus DynamoDB/Pinecone writes
  memoryMB: 1024,
});
