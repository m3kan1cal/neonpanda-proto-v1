import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

export const buildCoachConfig = defineFunction({
  name: 'build-coach-config',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 minutes - plenty of time for coach config generation
  memoryMB: 2048, // More memory for the heavy AI processing
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2',
    PINECONE_API_KEY: 'pcsk_sbPRi_146xBPjEKWvCwdAg74aTTEsFTijZ34kqvBZJhmeYZPb1qqogXpdrEahRX4xk6vL'
  }
});
