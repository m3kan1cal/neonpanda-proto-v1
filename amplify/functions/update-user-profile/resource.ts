import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const updateUserProfile = defineFunction({
  name: 'update-user-profile',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
