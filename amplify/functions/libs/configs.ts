import 'dotenv/config';

/**
 * Node.js runtime version for all Lambda functions.
 * Should match the nodeVersion in amplify.yml.
 */
export const NODEJS_RUNTIME = 22;

export const config = {
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'NeonPanda-ProtoApi-AllItems-V2',
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC',
  GOOGLE_CHAT_ERRORS_WEBHOOK_URL: process.env.GOOGLE_CHAT_ERRORS_WEBHOOK_URL || 'https://chat.googleapis.com/v1/spaces/AAQAtmMUvmg/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=7QyC7ESY_Efd3P9Z_ROb8tPKihDZmDsFwGKVX5vBOtc'
};
