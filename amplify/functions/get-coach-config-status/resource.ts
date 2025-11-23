import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const getCoachConfigStatus = defineFunction({
  name: 'get-coach-config-status',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30, // Quick status check
  memoryMB: 1024 // Minimal memory needed for status check
});
