import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const buildWorkout = defineFunction({
  name: 'build-workout',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'CoachForge-ProtoApi-AllItems-V2',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'pcsk_replace_me'
  },
  timeoutSeconds: 300, // 5 minutes for AI extraction
  memoryMB: 2048 // More memory for AI processing
});
