import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getCoachConfig = defineFunction({
  name: 'get-coach-config',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
