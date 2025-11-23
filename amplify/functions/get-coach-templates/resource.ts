import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const getCoachTemplates = defineFunction({
  name: 'get-coach-templates',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30,
  memoryMB: 1024
});
