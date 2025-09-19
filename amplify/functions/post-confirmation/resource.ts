import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
  resourceGroupName: 'auth',  // Assign to auth stack to avoid circular dependency
  environment: {
    // Conditional table name based on environment
    // TODO: Let's figure out a better way to do this in the future.
    DYNAMODB_TABLE_NAME: (() => {
      // Check if we're in sandbox mode
      const isSandbox = process.env.AMPLIFY_ENVIRONMENT === 'sandbox' || !process.env.AMPLIFY_BRANCH;
      const branch = process.env.AMPLIFY_BRANCH || 'sandbox';

      if (branch === 'main' && !isSandbox) {
        return 'CoachForge-ProtoApi-AllItems-V2';  // Production table
      } else {
        return `CoachForge-ProtoApi-AllItems-V2-Dev`;  // Branch/sandbox-specific table
      }
    })(),
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || ''
  }
});
