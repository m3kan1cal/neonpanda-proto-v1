# Project Instructions

## Stack

- **Backend**: AWS Amplify Gen 2, Lambda (TypeScript), API Gateway v2, DynamoDB, S3, Bedrock (Claude Sonnet 4.5)
- **Frontend**: React 18, Vite, Tailwind CSS, Agent-based state management
- **AI**: Pinecone for semantic search, Claude for coaching and generation

## Code Style

- Use TypeScript for all backend code
- Use camelCase for all identifiers except constants (e.g., `convertUtcToUserDate` not `convertUTCToUserDate`, `itemWithGsi` not `itemWithGSI`)
- Use full descriptive names, avoid abbreviations (e.g., `queryPrograms()` not `queryTPs()`)
- Use full entity names consistently (e.g., `Program`, `ProgramPhase`, `isProgramActive()` not `Program`, `ProgramPhase`, `isProgramActive()`)
- Entity IDs follow pattern: `${entityType}_${userId}_${timestamp}_${shortId}` (user-scoped, not coach-scoped)
- Use constants for string literals (e.g., `CONVERSATION_MODES.PROGRAM_DESIGN` not `'build'`, `MESSAGE_TYPES.TEXT_WITH_IMAGES` not `'text_with_images'`)

## Architecture

### DynamoDB
- Single-table design with partition key `pk: user#userId` and sort key `sk: entity_type#entityId`
- Always use `withThroughputScaling()` wrapper for all operations
- Always use `ConditionExpression: "attribute_exists(pk)"` for updates/deletes
- Use `deepMerge()` utility for partial updates

### S3
- Use centralized utilities from `libs/s3-utils.ts` (never create new S3 client instances)
- Key structure: `programs/{userId}/{programId}/details.json`, `workouts/{userId}/{workoutId}.json`

### AI & Bedrock
- Use `callBedrockApi()` helper from `libs/api-helpers.ts`
- Always use `parseJsonWithFallbacks()` for AI-generated JSON (never `JSON.parse()` directly)
- Always normalize AI-generated complex data (workouts, training programs) using AI normalization utilities
- Use `buildCoachPersonalityPrompt()` from `libs/coach-config/personality-utils.ts` for consistent personality integration

### Lambda Functions
- Async handlers (invoked via `invokeAsyncLambda`): `build-workout`, `build-program`, `build-conversation-summary`
- Sync handlers (API Gateway): `stream-coach-conversation`, CRUD operations
- Use typed event interfaces for async lambdas
- Use `createOkResponse()` and `createErrorResponse()` helpers

### Frontend
- Use Agent pattern for state management (in `src/utils/agents/`)
- Use `uiPatterns.js` for consistent styling
- Store mode in message metadata for historical accuracy

## Critical Patterns

### Timezone Handling
- Always use `getUserTimezoneOrDefault()` (defaults to `America/Los_Angeles`)
- Never use server UTC time for user-facing dates

### Pinecone Integration
- Store AI-generated summaries for all major entities (workouts, training programs, memories)
- Use pattern: generate summary → store in Pinecone with rich metadata

### Streaming Contextual Updates
- Use AI-generated contextual updates (Nova Micro) via `generateContextualUpdate()` for ephemeral UX feedback
- Brief, coach-like progress updates (e.g., "Firing up the program generator...")
- AI naturally responds in conversation history - no structured message appending
- Add new update types to `libs/coach-conversation/contextual-updates.ts`

### File Organization
- Domain logic in `amplify/functions/libs/[entity]/` (types, extraction, normalization, summary, pinecone)
- All DynamoDB operations in `amplify/dynamodb/operations.ts`
- Centralized utilities in `amplify/functions/libs/` (api-helpers, s3-utils, date-utils, response-utils)

## Key Reference Files

- `amplify/functions/libs/api-helpers.ts` - Bedrock, Pinecone patterns
- `amplify/dynamodb/operations.ts` - DynamoDB operations
- `amplify/functions/build-workout/handler.ts` - Async Lambda pattern
- `amplify/functions/stream-coach-conversation/handler.ts` - Streaming Lambda URL pattern
- `amplify/functions/libs/coach-config/personality-utils.ts` - Coach personality
- `src/utils/ui/uiPatterns.js` - UI styling patterns
