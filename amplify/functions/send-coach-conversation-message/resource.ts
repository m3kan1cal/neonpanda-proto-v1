import { defineFunction } from '@aws-amplify/backend';

export const sendCoachConversationMessage = defineFunction({
  name: 'send-coach-conversation-message',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});
