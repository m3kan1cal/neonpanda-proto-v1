import "dotenv/config";
import { defineFunction } from "@aws-amplify/backend";
import { NODEJS_RUNTIME } from '../libs/configs';

export const streamCoachCreatorSession = defineFunction({
  name: "stream-coach-creator-session",
  entry: "./handler.ts",
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300, // 5 minutes - consistent with update-coach-creator-session
  memoryMB: 2048, // Sufficient for AI calls and context gathering
  // Lambda Function URL configuration will be handled in backend.ts
  // This function will be configured with RESPONSE_STREAM invoke mode for SSE streaming
  environment: {
    // Environment variables will be set in backend.ts to match other functions
  },
});

