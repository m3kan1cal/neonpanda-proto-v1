import { defineFunction } from '@aws-amplify/backend';

export const sendCoachConversationMessage = defineFunction({
  name: 'send-coach-conversation-message',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2',
    // This placeholder gets overridden in backend.ts with the actual Lambda function name
    BUILD_WORKOUT_FUNCTION_NAME: 'build-workout',
    PINECONE_API_KEY: 'pcsk_sbPRi_146xBPjEKWvCwdAg74aTTEsFTijZ34kqvBZJhmeYZPb1qqogXpdrEahRX4xk6vL'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});
