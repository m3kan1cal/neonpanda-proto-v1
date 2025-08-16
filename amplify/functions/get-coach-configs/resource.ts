import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getCoachConfigs = defineFunction({
  name: 'get-coach-configs',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
