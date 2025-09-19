import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const deleteCoachCreatorSession = defineFunction({
  name: 'delete-coach-creator-session',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
