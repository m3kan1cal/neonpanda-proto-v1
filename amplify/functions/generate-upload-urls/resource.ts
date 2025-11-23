import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const generateUploadUrls = defineFunction({
  name: 'generate-upload-urls',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30,
  memoryMB: 1024,
});

