import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getCoachCreatorSession = defineFunction({
  name: 'get-coach-creator-session',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
