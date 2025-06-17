import { defineFunction } from '@aws-amplify/backend';

export const helloWorld = defineFunction({
  name: 'hello-world',
  entry: './handler.ts'
});