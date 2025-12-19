import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from "../libs/configs";

export const streamProgramDesign = defineFunction({
  name: "stream-program-design",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300, // Same as stream-coach-conversation for consistency
  memoryMB: 2048, // Same as stream-coach-conversation for consistency
  // Lambda Function URL configuration will be handled in backend.ts
  // This function will be configured with RESPONSE_STREAM invoke mode for SSE streaming
  environment: {
    // Environment variables will be set in backend.ts to match other functions
  },
});
