import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

export const buildCoachConfig = defineFunction({
  name: 'build-coach-config',
  entry: './handler.ts',
  timeoutSeconds: 900,
  memoryMB: 2048
});
