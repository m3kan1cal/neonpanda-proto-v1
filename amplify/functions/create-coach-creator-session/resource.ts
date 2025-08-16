import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const createCoachCreatorSession = defineFunction({
  name: 'create-coach-creator-session',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
