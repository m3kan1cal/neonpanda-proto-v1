import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getConversationsCount = defineFunction({
  name: 'get-conversations-count',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'CoachForge-ProtoApi-AllItems-V2'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});