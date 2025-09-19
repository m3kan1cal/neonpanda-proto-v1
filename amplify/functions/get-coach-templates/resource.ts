import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getCoachTemplates = defineFunction({
  name: 'get-coach-templates',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
