import 'dotenv/config';

export const config = {
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'NeonPanda-ProtoApi-AllItems-V2',
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'pcsk_4tHp6N_MUauyYPRhqQjDZ9qyrWwe4nD7gRXuPz66SnbtkbAUQdUqkCfmcmzbAJfhYKSsyC'
};
