import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const generateUploadUrls = defineFunction({
  name: 'generate-upload-urls',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
});

