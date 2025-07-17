import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

export const buildCoachConfig = defineFunction({
  name: 'build-coach-config',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'CoachForge-ProtoApi-AllItems-V2',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'pcsk_replace_me'
  },
  timeoutSeconds: 900,
  memoryMB: 2048
});
