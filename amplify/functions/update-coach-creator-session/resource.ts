import { defineFunction } from '@aws-amplify/backend';

export const updateCoachCreatorSession = defineFunction({
  name: 'update-coach-creator-session',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2',
    // This placeholder gets overridden in backend.ts with the actual Lambda function name
    BUILD_COACH_CONFIG_FUNCTION_NAME: 'build-coach-config'
  }
});

