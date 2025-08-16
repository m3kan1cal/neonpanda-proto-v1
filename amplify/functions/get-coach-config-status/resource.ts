import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getCoachConfigStatus = defineFunction({
  name: 'get-coach-config-status',
  entry: './handler.ts',
  timeoutSeconds: 30, // Quick status check
  memoryMB: 1024 // Minimal memory needed for status check
});
