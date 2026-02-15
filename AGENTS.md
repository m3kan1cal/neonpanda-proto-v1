# Project Instructions

## General

Please respond in a professional, measured tone without excessive enthusiasm or exclamation points. Use clear, direct language.

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
- **Async in useEffect**: Always pass `AbortSignal` to fetch calls to properly cancel requests on unmount (React Strict Mode). See `docs/strategy/REACT_PATTERNS.md` for the full pattern.
- Reference implementation: `src/components/shared-programs/ShareProgramModal.jsx`

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

## API Documentation (Swagger/OpenAPI)

### Overview

All API endpoints are documented in an OpenAPI 3.0 spec at `amplify/swagger/openapi.yaml`. A Swagger UI page is generated from this spec and served at `/api-docs` when deployed.

### When adding or modifying API endpoints

1. Update the handler code in `amplify/functions/<function-name>/handler.ts`
2. Update the route in `amplify/api/resource.ts` if needed
3. Update the OpenAPI spec in `amplify/swagger/openapi.yaml` to match:
   - Add the new path under the `paths:` section
   - Include request body schemas, response schemas, query/path parameters
   - Mark public endpoints with `security: []`
   - Use existing `$ref` components from `components/schemas/` and `components/parameters/` where possible
4. Run `npm run swagger:check` to verify all routes in `resource.ts` are documented in the spec
5. Run `npm run swagger:generate` to regenerate the Swagger UI HTML

### Spec structure

- `amplify/swagger/openapi.yaml` - Source of truth for API documentation
- `scripts/generate-swagger.js` - Generates self-contained Swagger UI HTML from the YAML spec
- `public/api-docs/index.html` - Generated output (do not edit directly; regenerated on each build)

### NPM scripts

- `npm run swagger:generate` - Generate Swagger UI HTML from the spec
- `npm run swagger:validate` - Validate spec structure only
- `npm run swagger:check` - Cross-reference spec paths against `amplify/api/resource.ts`

### Build pipeline

The `amplify.yml` pipeline runs `npm run swagger:generate` before `npm run build` on every deployment, so docs are always current.

## Key Reference Files

- `amplify/swagger/openapi.yaml` - OpenAPI 3.0 spec (API documentation source of truth)
- `amplify/functions/libs/api-helpers.ts` - Bedrock, Pinecone patterns
- `amplify/dynamodb/operations.ts` - DynamoDB operations
- `amplify/functions/build-workout/handler.ts` - Async Lambda pattern
- `amplify/functions/stream-coach-conversation/handler.ts` - Streaming Lambda URL pattern
- `amplify/functions/libs/coach-config/personality-utils.ts` - Coach personality
- `src/utils/ui/uiPatterns.js` - UI styling patterns
- `docs/strategy/REACT_PATTERNS.md` - React patterns (AbortController, loading states)
- `src/components/shared-programs/ShareProgramModal.jsx` - AbortController reference implementation
