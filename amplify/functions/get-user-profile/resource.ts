import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getUserProfile = defineFunction({
  name: 'get-user-profile',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
