import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const getCoachConfigsCount = defineFunction({
  name: 'get-coach-configs-count',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME
});
