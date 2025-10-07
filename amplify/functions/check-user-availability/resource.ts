import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const checkUserAvailability = defineFunction({
  name: 'check-user-availability',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
