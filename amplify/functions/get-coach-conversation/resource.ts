import { defineFunction } from '@aws-amplify/backend';

export const getCoachConversation = defineFunction({
  name: 'get-coach-conversation',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});
