import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

export const updateCoachCreatorSession = defineFunction({
  name: 'update-coach-creator-session',
  entry: './handler.ts',
  timeoutSeconds: 60, // Set timeout to 60 seconds for Bedrock calls
  memoryMB: 512, // Increase memory for better performance
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2',
    PINECONE_API_KEY: 'pcsk_sbPRi_146xBPjEKWvCwdAg74aTTEsFTijZ34kqvBZJhmeYZPb1qqogXpdrEahRX4xk6vL'
  }
});
