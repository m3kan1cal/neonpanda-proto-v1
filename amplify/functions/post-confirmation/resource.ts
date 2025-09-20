import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
  resourceGroupName: 'auth',  // Assign to auth stack to avoid circular dependency
  environment: {
    // Manual table name to avoid circular dependency (auth stack can't reference contactForm stack)
    DYNAMODB_BASE_TABLE_NAME: 'NeonPanda-ProtoApi-AllItems-V2',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
    // Note: BRANCH_NAME will be set dynamically in backend.ts since we need the computed branchName
  }
});
