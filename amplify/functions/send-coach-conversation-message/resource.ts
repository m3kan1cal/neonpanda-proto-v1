import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const sendCoachConversationMessage = defineFunction({
  name: 'send-coach-conversation-message',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'CoachForge-ProtoApi-AllItems-V2',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'pcsk_replace_me',
    BUILD_WORKOUT_FUNCTION_NAME: 'build-workout'
  },
  timeoutSeconds: 300,
  memoryMB: 2048
});
