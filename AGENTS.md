# Project Instructions

## General

Please respond in a professional, measured tone without excessive enthusiasm or exclamation points. Use clear, direct language.

## Stack

- **Backend**: AWS Amplify Gen 2, Lambda (TypeScript), API Gateway v2, DynamoDB, S3, Bedrock, Stripe
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, JavaScript/JSX (not TypeScript)
- **AI**: Tiered Bedrock models (Sonnet for planning, Haiku for execution/contextual, Nova for utility), Pinecone for semantic search and reranking

## Code Style

- Use TypeScript for all backend code; frontend is JavaScript/JSX
- Use camelCase for all identifiers except constants (e.g., `convertUtcToUserDate` not `convertUTCToUserDate`, `itemWithGsi` not `itemWithGSI`)
- Use full descriptive names, avoid abbreviations (e.g., `queryPrograms()` not `queryTPs()`)
- Use full entity names consistently (e.g., `Program`, `ProgramPhase`, `isProgramActive()`)
- Entity IDs follow pattern: `${entityType}_${userId}_${timestamp}_${shortId}` via `generateEntityId()` in `libs/id-utils.ts`
- Use constants for string literals (e.g., `CONVERSATION_MODES.PROGRAM_DESIGN` not `'build'`, `MESSAGE_TYPES.TEXT_WITH_IMAGES` not `'text_with_images'`)

## Architecture

### DynamoDB

- Single-table design with `pk: user#userId`, `sk: entity_type#entityId`, three GSIs (`gsi1`, `gsi2`, `gsi3`)
- Always use `withThroughputScaling()` wrapper for all operations
- Always use `ConditionExpression: "attribute_exists(pk)"` for updates/deletes
- Use `deepMerge()` from `libs/object-utils.ts` for partial updates
- All operations barrel-exported from `amplify/dynamodb/operations.ts`

### S3

- Use centralized utilities from `libs/s3-utils.ts` (never create new S3 client instances)
- Key patterns: `programs/{userId}/{programId}_${timestamp}.json`, `sharedPrograms/{creatorUserId}/{sharedProgramId}_${timestamp}.json`, `user-uploads/{userId}/...`
- Workouts are DynamoDB-first (no S3 key pattern)

### AI & Bedrock

- Tiered model strategy defined in `MODEL_IDS` within `libs/api-helpers.ts`: planner (Sonnet), executor/contextual (Haiku), utility (Nova)
- Use `callBedrockApi()` / `callBedrockApiStream()` helpers from `libs/api-helpers.ts`
- Always use `parseJsonWithFallbacks()` for AI-generated JSON (never `JSON.parse()` directly)
- Always normalize AI-generated complex data (workouts, programs) using domain normalization utilities
- Use `buildCoachPersonalityPrompt()` from `libs/coach-config/personality-utils.ts` for consistent personality
- Use `sanitizeUserContent()` / `wrapUserContent()` from `libs/security/prompt-sanitizer.ts` for prompt injection safety
- Bedrock Guardrails applied via Converse API (lazy-loaded guardrail ID/version)

### Backend Agents

The AI coaching system uses a ReAct-style agent architecture in `amplify/functions/libs/agents/`:

- **`core/agent.ts`**: Non-streaming `Agent` class with tool loop via `callBedrockApiForAgent`
- **`core/streaming-agent.ts`**: `StreamingConversationAgent<TContext>` — main streaming agent with SSE output
- **Domain agents**: `conversation/` (main coach chat), `coach-creator/`, `program-designer/`, `workout-logger/`, `workout-editor/`
- Each agent has `agent.ts`, `tools.ts`, `prompts.ts`, and `helpers.ts`
- Conversation agent uses Haiku by default, upgrades to Sonnet for long threads (>40 messages) or image input
- Agents invoke async Lambdas for heavy work (e.g., `build-workout`, `build-program`)

### Lambda Functions

- **Streaming (Function URLs)**: `stream-coach-conversation`, `stream-coach-creator-session`, `stream-program-designer-session` — response-stream mode with SSE
- **Async (invoked via `invokeAsyncLambda`)**: `build-workout`, `build-program`, `build-coach-config`, `build-exercise`, `build-workout-analysis`, `build-conversation-summary`, `build-living-profile`, `process-post-turn`, `dispatch-memory-lifecycle`, `process-memory-lifecycle`
- **Scheduled (EventBridge)**: `build-weekly-analytics`, `build-monthly-analytics`, `notify-inactive-users`, `warmup-platform`, `sync-log-subscriptions`
- **Sync (API Gateway)**: CRUD operations for all entities
- Use typed event interfaces for async lambdas
- Use `createOkResponse()` and `createErrorResponse()` helpers

### Post-Turn Pipeline

After each streaming conversation turn, `process-post-turn` orchestrates follow-up work: conversation summary generation, living profile updates, memory lifecycle dispatching. This keeps the streaming response fast while deferring heavy processing.

### Frontend

- JavaScript/JSX (not TypeScript); ESLint configured for `*.{js,jsx}`
- Tailwind CSS v4 — theme defined in `src/index.css` via `@theme` block (no separate `tailwind.config.js`)
- Agent pattern for state management in `src/utils/agents/` — plain JS classes holding `this.state`, updated via `_updateState`, React subscribes via `onStateChange` callback
- UI design system in `src/utils/ui/uiPatterns.js` — Tailwind class string constants for buttons, forms, containers, etc.
- API layer in `src/utils/apis/` — `authenticatedFetch` wraps `fetch` with Cognito auth headers, domain modules per entity
- React Router v7 (`react-router-dom`) with `BrowserRouter` in `src/App.jsx`
- **Async in useEffect**: Always pass `AbortSignal` to fetch calls to cancel on unmount (React StrictMode). See `docs/strategy/REACT_PATTERNS.md`.

## Critical Patterns

### Timezone Handling

- Always use `getUserTimezoneOrDefault()` from `libs/analytics/date-utils.ts` (defaults to `America/Los_Angeles`)
- Never use server UTC time for user-facing dates

### Pinecone Integration

- Store AI-generated summaries for all major entities (workouts, programs, memories)
- Pattern: generate summary → store in Pinecone with rich metadata
- Reranking via `pinecone-rerank-v0` for result quality

### Memory & Living Profile

- Memory CRUD under `amplify/functions/memory/`; lifecycle processing via `dispatch-memory-lifecycle` → `process-memory-lifecycle`
- Living profile built asynchronously from conversation summaries via `build-living-profile`
- Both feed into coach conversation context for personalized responses

### File Organization

- Domain logic in `amplify/functions/libs/[entity]/` (types, extraction, normalization, summary, pinecone)
- Backend agents in `amplify/functions/libs/agents/[agent-name]/` (agent, tools, prompts, helpers)
- DynamoDB operations barrel in `amplify/dynamodb/operations.ts`
- Centralized utilities in `amplify/functions/libs/` (api-helpers, s3-utils, date-utils, response-utils, id-utils, object-utils)
- Frontend APIs in `src/utils/apis/`, agents in `src/utils/agents/`, UI patterns in `src/utils/ui/`

### Testing

- Vitest for all tests (`npm test` / `npm run test:watch`)
- Test files co-located with source as `*.test.ts` (primarily backend/libs coverage)

## API Documentation (Swagger/OpenAPI)

All endpoints documented in `amplify/swagger/openapi.yaml` (OpenAPI 3.0), served at `/api-docs` via generated Swagger UI.

When adding or modifying endpoints:

1. Update handler in `amplify/functions/<function-name>/handler.ts`
2. Update route in `amplify/api/resource.ts` if needed
3. Update `amplify/swagger/openapi.yaml` — add path, schemas, parameters; mark public endpoints with `security: []`
4. Run `npm run swagger:check` to verify routes match, then `npm run swagger:generate` to rebuild UI

The `amplify.yml` pipeline runs `swagger:generate` before `build` on every deployment.

## Key Reference Files

- `amplify/functions/libs/api-helpers.ts` - Bedrock helpers, model IDs, Pinecone client
- `amplify/functions/libs/agents/core/streaming-agent.ts` - Streaming agent base class
- `amplify/functions/stream-coach-conversation/handler.ts` - Streaming Lambda URL pattern
- `amplify/dynamodb/operations.ts` - DynamoDB operations barrel
- `amplify/functions/libs/coach-config/personality-utils.ts` - Coach personality prompts
- `amplify/functions/libs/security/prompt-sanitizer.ts` - Prompt injection safety
- `src/utils/ui/uiPatterns.js` - UI design system (Tailwind class constants)
- `src/utils/apis/apiConfig.js` - Frontend API configuration and auth
- `docs/strategy/REACT_PATTERNS.md` - React patterns (AbortController, loading states)
