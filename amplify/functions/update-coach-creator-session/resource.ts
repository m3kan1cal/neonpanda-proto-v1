import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const updateCoachCreatorSession = defineFunction({
  name: 'update-coach-creator-session',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});

