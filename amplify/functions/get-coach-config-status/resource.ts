import { defineFunction } from '@aws-amplify/backend';

export const getCoachConfigStatus = defineFunction({
  name: 'get-coach-config-status',
  entry: './handler.ts',
  timeoutSeconds: 30, // Quick status check
  memoryMB: 1024, // Minimal memory needed for status check
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  }
});
