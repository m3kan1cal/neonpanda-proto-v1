import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getCoachCreatorSessions = defineFunction({
  name: 'get-coach-creator-sessions',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
