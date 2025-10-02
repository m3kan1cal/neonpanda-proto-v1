import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getUploadUrls = defineFunction({
  name: 'get-upload-urls',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});

