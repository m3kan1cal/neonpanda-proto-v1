import { defineFunction } from '@aws-amplify/backend';

export const generateDownloadUrls = defineFunction({
  name: 'generate-download-urls',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
});

