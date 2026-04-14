# CLAUDE.md

## Project Overview

NeonPanda is a full-stack AI fitness coaching SaaS platform. Users create personalized AI coaches, have real-time streaming conversations, log workouts via natural language, and design multi-phase training programs. Built on AWS Amplify Gen 2 with a tiered Bedrock AI system, semantic search via Pinecone, and a React 19 frontend.

## Stack

- **Backend**: TypeScript 5.9 (strict), AWS Amplify Gen 2, Lambda (89 functions), API Gateway v2, DynamoDB, S3, Bedrock, Cognito, Stripe
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, JavaScript/JSX (not TypeScript — deliberate choice)
- **AI**: Tiered Bedrock models — Sonnet 4.6 (planner/orchestration), Haiku 4.5 (executor/contextual), Nova Lite (utility classification), Pinecone (semantic search + reranking)
- **Node**: 22 (per amplify.yml)
- **Package Manager**: npm with `--legacy-peer-deps` (CDK compatibility)

## Quick Reference Commands

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Production build (outputs to dist/)
npm run lint             # ESLint on src/**/*.{js,jsx}
npm test                 # Vitest single run
npm run test:watch       # Vitest watch mode
npm run swagger:check    # Verify API routes match OpenAPI spec
npm run swagger:generate # Rebuild Swagger UI from openapi.yaml
npm run preview          # Preview production build locally
```

## Repository Structure

```
neonpanda-proto-v1/
├── amplify/                          # AWS Amplify Gen 2 backend (IaC + Lambda)
│   ├── backend.ts                    # Main backend definition (all function + resource imports)
│   ├── api/resource.ts               # HTTP API Gateway v2 (routes, domains, CORS, auth)
│   ├── auth/resource.ts              # Cognito user pool (email + Google OAuth)
│   ├── dynamodb/
│   │   ├── resource.ts               # DynamoDB table (3 GSIs, PITR, TTL, auto-scaling)
│   │   └── operations.ts             # Barrel export for all DynamoDB operations
│   ├── storage/resource.ts           # S3 bucket
│   ├── sns/resource.ts               # SNS error logging topic
│   ├── shared-policies.ts            # IAM policies for Lambda functions
│   ├── swagger/openapi.yaml          # OpenAPI 3.0 spec
│   └── functions/
│       ├── libs/                     # Shared backend libraries
│       │   ├── agents/               # ReAct agent architecture
│       │   │   ├── core/             # agent.ts, streaming-agent.ts
│       │   │   ├── conversation/     # Main coach chat agent
│       │   │   ├── coach-creator/    # Coach creation interview agent
│       │   │   ├── program-designer/ # Program design agent
│       │   │   ├── workout-logger/   # Workout parsing agent
│       │   │   ├── workout-editor/   # Workout editing agent
│       │   │   └── shared/           # Shared agent utilities
│       │   ├── api-helpers.ts        # Bedrock helpers, MODEL_IDS, Pinecone client
│       │   ├── s3-utils.ts           # Centralized S3 client and helpers
│       │   ├── id-utils.ts           # Entity ID generation
│       │   ├── object-utils.ts       # deepMerge, object utilities
│       │   ├── response-utils.ts     # createOkResponse, createErrorResponse
│       │   ├── security/             # prompt-sanitizer.ts (injection defense)
│       │   ├── analytics/            # date-utils.ts (timezone handling)
│       │   ├── coach-config/         # personality-utils.ts
│       │   ├── workout/              # types, extraction, normalization, summary
│       │   ├── program/              # types, extraction, normalization
│       │   └── memory/               # memory lifecycle processing
│       ├── stream-coach-conversation/    # Streaming Lambda (Function URL, SSE)
│       ├── stream-coach-creator-session/ # Streaming Lambda (Function URL, SSE)
│       ├── stream-program-designer-session/ # Streaming Lambda (Function URL, SSE)
│       ├── build-workout/            # Async Lambda (invoked by agent)
│       ├── build-program/            # Async Lambda (invoked by agent)
│       ├── build-coach-config/       # Async Lambda (invoked by agent)
│       ├── process-post-turn/        # Post-turn pipeline orchestrator
│       ├── build-weekly-analytics/   # Scheduled (EventBridge)
│       ├── build-monthly-analytics/  # Scheduled (EventBridge)
│       └── [60+ more CRUD/utility functions]
├── src/                              # React 19 frontend (JavaScript/JSX)
│   ├── App.jsx                       # Root component, React Router v7
│   ├── main.jsx                      # Entry point
│   ├── index.css                     # Tailwind v4 theme (@theme block)
│   ├── components/                   # Page-level and domain components
│   │   ├── coaches/                  # Coach management UI
│   │   ├── programs/                 # Program design UI
│   │   ├── workouts/                 # Workout logging UI
│   │   ├── analytics/                # Charts and reports
│   │   ├── shared-programs/          # Program sharing
│   │   ├── subscription/             # Stripe integration
│   │   └── [page components]         # LandingPage, Settings, etc.
│   ├── utils/
│   │   ├── agents/                   # Frontend agent classes (state management)
│   │   ├── apis/                     # API layer (authenticatedFetch + domain modules)
│   │   └── ui/uiPatterns.js          # Tailwind class string constants (design system)
│   ├── contexts/                     # React contexts
│   └── hooks/                        # Custom React hooks
├── test/                             # Integration tests (Lambda + DynamoDB + S3)
├── scripts/                          # Operational scripts (data cleanup, seeding, Swagger)
├── docs/                             # Strategy docs, schemas, methodology references
├── public/                           # Static assets, PWA icons, API docs output
├── amplify.yml                       # CI/CD pipeline (Node 22, test, swagger, build)
├── vite.config.js                    # Vite + React + Tailwind, manual code splitting
├── eslint.config.js                  # ESLint v9 flat config (warnings-first)
└── .prettierrc                       # Semicolons, double quotes, 80 chars, 2-space indent
```

## Code Style

- **Backend**: TypeScript (strict mode). **Frontend**: JavaScript/JSX (not TypeScript).
- **Naming**: camelCase for all identifiers except constants. Full descriptive names, no abbreviations (`queryPrograms()` not `queryTPs()`).
- **Entity IDs**: `${entityType}_${userId}_${timestamp}_${shortId}` via `generateEntityId()` in `libs/id-utils.ts`.
- **String literals**: Use constants (`CONVERSATION_MODES.PROGRAM_DESIGN` not `'build'`).
- **Formatting**: Prettier — semicolons, trailing commas, double quotes, 80 char width, 2-space indent, LF line endings.
- **Tone**: Professional, measured. No excessive enthusiasm or exclamation points.

## Architecture Patterns

### DynamoDB (Single-Table Design)

- Schema: `pk: user#userId`, `sk: entity_type#entityId`, three GSIs (`gsi1`, `gsi2`, `gsi3`)
- Always wrap operations with `withThroughputScaling()`
- Always use `ConditionExpression: "attribute_exists(pk)"` for updates/deletes
- Use `deepMerge()` from `libs/object-utils.ts` for partial updates
- All operations barrel-exported from `amplify/dynamodb/operations.ts`

### S3

- Use centralized client from `libs/s3-utils.ts` (never create new S3 client instances)
- Key patterns: `programs/{userId}/{programId}_*.json`, `sharedPrograms/{creatorUserId}/{sharedProgramId}_*.json`, `user-uploads/{userId}/...`
- Workouts are DynamoDB-first (no S3)

### AI / Bedrock

- Tiered models in `MODEL_IDS` within `libs/api-helpers.ts`: planner (Sonnet), executor/contextual (Haiku), utility (Nova)
- Use `callBedrockApi()` / `callBedrockApiStream()` from `libs/api-helpers.ts`
- Never `JSON.parse()` AI output directly — always use `parseJsonWithFallbacks()`
- Always normalize AI-generated data (workouts, programs) with domain normalization utilities
- Use `buildCoachPersonalityPrompt()` from `libs/coach-config/personality-utils.ts`
- Sanitize user input with `sanitizeUserContent()` / `wrapUserContent()` from `libs/security/prompt-sanitizer.ts`
- Guardrails applied via Bedrock Converse API (lazy-loaded guardrail ID/version)

### Backend Agent Architecture

ReAct-style agents in `amplify/functions/libs/agents/`:

- **`core/agent.ts`**: Non-streaming `Agent` class with tool loop
- **`core/streaming-agent.ts`**: `StreamingConversationAgent<TContext>` — SSE output base class
- **Domain agents**: Each has `agent.ts`, `tools.ts`, `prompts.ts`, `helpers.ts`
- Conversation agent uses Haiku by default, upgrades to Sonnet for long threads (>40 messages) or image input
- Agents invoke async Lambdas for heavy work (`build-workout`, `build-program`, etc.)

### Lambda Function Types

| Type | Pattern | Examples |
|------|---------|---------|
| Streaming (Function URLs) | SSE response-stream mode | `stream-coach-conversation`, `stream-coach-creator-session`, `stream-program-designer-session` |
| Async (fire-and-forget) | Invoked via `invokeAsyncLambda` | `build-workout`, `build-program`, `build-coach-config`, `process-post-turn` |
| Scheduled (EventBridge) | Cron/rate triggers | `build-weekly-analytics`, `build-monthly-analytics`, `notify-inactive-users` |
| Sync (API Gateway) | Standard request/response | All CRUD operations |

### Post-Turn Pipeline

After each streaming conversation turn, `process-post-turn` orchestrates async follow-up: conversation summary generation, living profile updates, memory lifecycle dispatch. Keeps streaming response fast.

### Frontend Patterns

- **State management**: Agent pattern in `src/utils/agents/` — plain JS classes with `this.state`, updated via `_updateState`, React subscribes via `onStateChange` callback
- **API calls**: `authenticatedFetch` wraps `fetch` with Cognito JWT headers. Domain modules in `src/utils/apis/`.
- **Routing**: React Router v7 (`react-router-dom`) with `BrowserRouter` in `App.jsx`
- **Styling**: Tailwind CSS v4, theme defined in `src/index.css` via `@theme` block. Reusable class constants in `src/utils/ui/uiPatterns.js`.
- **Async in useEffect**: Always pass `AbortSignal` to fetch calls for cleanup (React StrictMode). See `docs/strategy/REACT_PATTERNS.md`.

## Critical Rules

### Timezone Handling

Always use `getUserTimezoneOrDefault()` from `libs/analytics/date-utils.ts` (defaults to `America/Los_Angeles`). Never use server UTC for user-facing dates.

### Pinecone Integration

- Store AI-generated summaries for all major entities (workouts, programs, memories)
- Pattern: generate summary -> store in Pinecone with rich metadata
- Reranking via `pinecone-rerank-v0` for result quality
- Per-user namespaces

### Adding/Modifying API Endpoints

1. Create or update handler in `amplify/functions/<function-name>/handler.ts`
2. Update route in `amplify/api/resource.ts` if needed
3. Update `amplify/swagger/openapi.yaml` — add path, schemas, parameters; mark public endpoints with `security: []`
4. Run `npm run swagger:check` to verify routes match, then `npm run swagger:generate`

### Adding a New Lambda Function

1. Create `amplify/functions/<function-name>/resource.ts` and `handler.ts`
2. Import and wire up in `amplify/backend.ts`
3. Add route in `amplify/api/resource.ts` if API-facing
4. Add IAM policies in `amplify/shared-policies.ts` if needed

## Testing

- **Framework**: Vitest 4.1 (`npm test` for single run, `npm run test:watch` for watch mode)
- **Unit tests**: Co-located as `*.test.ts` in `amplify/functions/libs/` — cover build handlers, agent helpers, utilities
- **Integration tests**: In `test/integration/` — invoke Lambda, check CloudWatch logs, validate DynamoDB/S3
- **CI**: `npm test` runs in `amplify.yml` build phase before frontend build

## CI/CD Pipeline (amplify.yml)

1. **Pre-build**: Node 22, npm install, `npx ampx pipeline-deploy` (backend infrastructure)
2. **Build**: Run tests, generate Swagger docs, `vite build`
3. **Artifacts**: `dist/` directory
4. **Security headers**: X-Frame-Options: DENY, X-XSS-Protection enabled
5. **Redirects**: Trailing slash removal, `/api-docs` -> Swagger UI, SPA fallback

## Operational Scripts

```bash
npm run seed-coach-templates       # Populate coach templates
npm run upsert-methodologies       # Sync methodologies to Pinecone
node scripts/inspect-pinecone-namespace.js   # Pinecone namespace stats
node scripts/delete-user-dynamodb.js         # Full user account deletion
node scripts/cleanup-test-workouts.js        # Delete test workout data
node scripts/fetch-incident-logs.js          # Fetch CloudWatch logs for analysis
```

## Key Reference Files

| File | Purpose |
|------|---------|
| `amplify/functions/libs/api-helpers.ts` | Bedrock helpers, MODEL_IDS, Pinecone client |
| `amplify/functions/libs/agents/core/streaming-agent.ts` | Streaming agent base class |
| `amplify/functions/stream-coach-conversation/handler.ts` | Streaming Lambda URL pattern |
| `amplify/dynamodb/operations.ts` | DynamoDB operations barrel export |
| `amplify/functions/libs/coach-config/personality-utils.ts` | Coach personality prompts |
| `amplify/functions/libs/security/prompt-sanitizer.ts` | Prompt injection defense |
| `amplify/swagger/openapi.yaml` | OpenAPI 3.0 API specification |
| `src/utils/ui/uiPatterns.js` | UI design system (Tailwind class constants) |
| `src/utils/apis/apiConfig.js` | Frontend API configuration and auth |
| `docs/strategy/REACT_PATTERNS.md` | React patterns (AbortController, loading states) |

## Documentation

Extensive docs in `docs/`:

- **`strategy/`**: `TECHNICAL_ARCHITECTURE.md`, `CODE_ORGANIZATION.md`, `REACT_PATTERNS.md`, `DB_DESIGN.md`, `PINECONE_STRATEGY.md`, `USER_MEMORY_STRATEGY.md`, `STRUCTURED_OUTPUTS_STRATEGY.md`, `LLM_JSON_SURVIVAL_GUIDE.md`
- **`schemas/`**: `UNIVERSAL_WORKOUT_SCHEMA.md`, `UNIVERSAL_ANALYTICS_SCHEMA.md`, `TRAINING_PROGRAM_SCHEMA.md`
- **`implementations/`**: Feature implementation plans (contextual chat, voice messaging, program sharing, etc.)
- **`methodologies/`**: 50+ training methodology references (5-3-1, conjugate, HIIT, zone 2, etc.)
- **`templates/`**: Coach personality templates (JSON)
