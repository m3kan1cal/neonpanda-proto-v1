import { defineFunction } from '@aws-amplify/backend';

export const updateCoachConversation = defineFunction({
  name: 'update-coach-conversation',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});