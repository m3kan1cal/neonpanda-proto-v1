
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';


export const sendCoachConversationMessage = defineFunction({
  name: 'send-coach-conversation-message',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300,
  memoryMB: 2048
});
