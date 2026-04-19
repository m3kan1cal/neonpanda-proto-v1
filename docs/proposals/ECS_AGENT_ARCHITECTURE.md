# ECS Agent Architecture Proposal

## Executive Summary

Migrate NeonPanda's agent workloads (streaming conversation agents and async builder agents) from Lambda to lightweight ECS Fargate containers, while keeping CRUD and scheduled Lambda functions unchanged. A single Docker image runs all agent types, configured via YAML files that determine behavior at runtime. Two ECS services — an **Agent Gateway** (streaming, behind ALB) and an **Agent Worker** (async, SQS-driven) — replace the current Lambda Function URLs and async Lambda invocations.

## What Moves, What Stays

### Moves to ECS

**Streaming agents (→ Agent Gateway Service):**

- `stream-coach-conversation`
- `stream-coach-creator-session`
- `stream-program-designer-session`

**Async builders (→ Agent Worker Service):**

- `build-workout`, `build-program`, `build-coach-config`
- `build-workout-analysis`, `build-exercise`
- `build-conversation-summary`, `build-living-profile`
- `process-post-turn`
- `dispatch-memory-lifecycle`, `process-memory-lifecycle`

### Stays on Lambda

- All ~60 CRUD functions (API Gateway v2)
- Scheduled functions (`build-weekly-analytics`, `build-monthly-analytics`, `notify-inactive-users`)
- API Gateway v2 with Cognito authorizer for CRUD routes

## Architecture Overview

```
                         Client (React 19)
                              │
                 ┌────────────┴────────────┐
                 │                         │
          API Gateway v2              Application
          (CRUD routes)              Load Balancer
                 │                         │
          ┌──────┴──────┐          ┌───────┴───────┐
          │  Lambda x60 │          │  ECS Fargate   │
          │  (CRUD)     │          │  Cluster       │
          │             │          │                │
          │  Lambda x3  │          │  ┌───────────┐ │
          │  (scheduled)│          │  │  Agent    │ │
          └─────────────┘          │  │  Gateway  │ │
                                   │  │  Service  │ │
                                   │  └─────┬─────┘ │
                                   │        │ SQS   │
                                   │  ┌─────▼─────┐ │
                                   │  │  Agent    │ │
                                   │  │  Worker   │ │
                                   │  │  Service  │ │
                                   │  └───────────┘ │
                                   └────────────────┘
```

## Recommendation: Services, Not Ephemeral Tasks

Two long-running ECS services rather than ephemeral per-request tasks, for these reasons:

1. **Streaming agents must be services** — ALB needs a running target to route to. You can't spin up a container per SSE request and have the client wait 30-60 seconds for it to start.

2. **Async builders benefit from services too** — ECS RunTask (ephemeral) has 30-60 second cold start per invocation. Current async Lambdas start in <1 second. An always-running worker service eliminates this regression entirely.

3. **SQS decoupling** — The Agent Gateway pushes work onto an SQS queue (replacing `invokeAsyncLambda`). The Agent Worker polls and processes. This gives guaranteed delivery, built-in retry with backoff, dead-letter queues, and zero cold starts.

4. **Low concurrency needs** — Reserved concurrency today is 5 for conversation, 2-3 for others. Two small Fargate services (0.5 vCPU / 1GB each) handle this easily with auto-scaling for spikes.

## The Generic Agent Container

One Docker image. Two YAML configs. Two ECS task definitions.

### Bootstrap Flow

```
Container starts
  → Reads AGENT_CONFIG env var (path to YAML)
  → Parses YAML config
  → If mode == "service": starts Fastify HTTP server, registers routes
  → If mode == "worker": starts SQS consumer, registers handlers
```

### Recommended Server Framework

**Fastify** for the HTTP server in the Agent Gateway:

- Native TypeScript support
- Excellent streaming support (access to raw Node.js response for SSE)
- Faster than Express, well-maintained
- The existing `StreamingConversationAgent.converseStream()` AsyncGenerator maps directly to Fastify's raw response streaming — minimal code change

### Container Structure

```
ecs/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── bootstrap.ts              # Entry point: read YAML, start service or worker
│   ├── config/
│   │   ├── loader.ts             # YAML config parser
│   │   └── types.ts              # Config type definitions
│   ├── service/
│   │   ├── server.ts             # Fastify server setup
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT verification (ported from withStreamingAuth)
│   │   │   └── logging.ts        # Request/response logging
│   │   └── routes/
│   │       ├── health.ts         # Health check endpoint
│   │       ├── conversation.ts   # SSE streaming route
│   │       ├── coach-creator.ts  # SSE streaming route
│   │       └── program-designer.ts # SSE streaming route
│   ├── worker/
│   │   ├── consumer.ts           # SQS polling loop
│   │   └── handlers/
│   │       ├── build-workout.ts  # Ported from Lambda handler
│   │       ├── build-program.ts
│   │       ├── build-coach-config.ts
│   │       ├── process-post-turn.ts
│   │       └── ...               # Remaining builder handlers
│   └── shared/
│       └── queue.ts              # SQS send helper (replaces invokeAsyncLambda)
└── configs/
    ├── gateway.yaml              # Streaming agent service config
    └── worker.yaml               # Builder agent worker config
```

### Shared Libraries

The existing `amplify/functions/libs/` (agents, api-helpers, security, etc.) is the core of the agent logic. The Dockerfile copies it into the image alongside the ECS-specific code:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
COPY ecs/src/ ./src/
COPY amplify/functions/libs/ ./libs/
RUN npm ci && npx tsc

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY ecs/configs/ ./configs/

ENV AGENT_CONFIG=/app/configs/gateway.yaml
CMD ["node", "dist/bootstrap.js"]
```

TypeScript path aliases in `tsconfig.json` map `@libs/*` to the shared libs, so existing imports work with minimal changes.

## YAML Configuration

### Gateway Config (Streaming Agents)

```yaml
mode: service
name: neonpanda-agent-gateway

server:
  port: 8080
  healthCheck:
    path: /health
    interval: 30
  requestTimeout: 900  # 15 min max for streaming connections

auth:
  type: jwt
  issuer: ${COGNITO_ISSUER_URL}
  jwksUri: ${COGNITO_JWKS_URI}

agents:
  - name: conversation
    type: streaming
    route: /users/:userId/coaches/:coachId/conversations/:conversationId/stream
    method: POST
    module: agents/conversation
    config:
      maxIterations: 15
      defaultModel: haiku
      modelUpgrade:
        conditions: ["messageCount > 40", "hasImages"]
        model: sonnet

  - name: coach-creator
    type: streaming
    route: /users/:userId/coach-creator-sessions/:sessionId/stream
    method: PUT
    module: agents/coach-creator
    config:
      maxIterations: 15
      defaultModel: haiku

  - name: program-designer
    type: streaming
    route: /users/:userId/program-designer-sessions/:sessionId/stream
    method: POST
    module: agents/program-designer
    config:
      maxIterations: 15
      defaultModel: haiku
```

### Worker Config (Async Builders)

```yaml
mode: worker
name: neonpanda-agent-worker

queue:
  url: ${SQS_QUEUE_URL}
  maxConcurrency: 5
  visibilityTimeout: 900
  deadLetterQueue:
    url: ${SQS_DLQ_URL}
    maxReceiveCount: 2

agents:
  - name: build-workout
    type: task
    module: builders/build-workout

  - name: build-program
    type: task
    module: builders/build-program

  - name: build-coach-config
    type: task
    module: builders/build-coach-config

  - name: build-workout-analysis
    type: task
    module: builders/build-workout-analysis

  - name: build-exercise
    type: task
    module: builders/build-exercise

  - name: build-conversation-summary
    type: task
    module: builders/build-conversation-summary

  - name: build-living-profile
    type: task
    module: builders/build-living-profile

  - name: process-post-turn
    type: task
    module: builders/process-post-turn

  - name: dispatch-memory-lifecycle
    type: task
    module: builders/dispatch-memory-lifecycle

  - name: process-memory-lifecycle
    type: task
    module: builders/process-memory-lifecycle
```

### How YAML Drives Behavior

The YAML does not duplicate agent logic. It tells the container:

- **What mode to run in** — HTTP server or SQS consumer
- **What agents are available** — which modules to load
- **How to route to them** — URL patterns or SQS message types
- **Operational config** — timeouts, concurrency, model defaults

The actual agent logic (tools, prompts, ReAct loops, model selection nuance) stays in TypeScript. The YAML is the deployment descriptor, not the agent definition.

## SSE Streaming Pattern (Agent Gateway)

The existing `StreamingConversationAgent` already yields SSE-formatted strings. The Fastify route handler is a thin wrapper:

```typescript
app.post(
  "/users/:userId/coaches/:coachId/conversations/:conversationId/stream",
  async (request, reply) => {
    const { userId, coachId, conversationId } = request.params;
    const user = await verifyJwt(request.headers.authorization);

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    // Same data loading as current Lambda handler
    const [profile, conversation, config, ...rest] = await Promise.all([
      getUserProfile(userId),
      getCoachConversation(userId, coachId, conversationId),
      getCoachConfig(userId, coachId),
      // ... same parallel reads
    ]);

    // Same agent creation — class is unchanged
    const agent = new StreamingConversationAgent({
      existingMessages: cachedMessages,
      tools: conversationAgentTools,
      context: agentContext,
      staticPrompt,
      dynamicPrompt,
    });

    reply.raw.write(formatStartEvent());
    reply.raw.write(formatMetadataEvent(metadata));

    // Pipe the existing AsyncGenerator directly
    const generator = agent.converseStream(userMessage, imageS3Keys);
    let result = await generator.next();
    while (!result.done) {
      reply.raw.write(result.value); // Already SSE-formatted
      result = await generator.next();
    }

    const agentResult = result.value;

    // Save messages, enqueue post-turn work
    await saveMessages(userId, coachId, conversationId, userMsg, aiMsg);
    await enqueueWork("process-post-turn", {
      userId,
      coachId,
      conversationId /* ... */,
    });

    reply.raw.write(formatCompleteEvent({ /* ... */ }));
    reply.raw.end();
  }
);
```

The key insight: `StreamingConversationAgent`, `Agent`, and all the tool/prompt modules require **zero changes**. Only the handler wrapper changes — from Lambda's `streamifyResponse` + `pipeline` to Fastify's raw response.

## Async Work Pattern (Replacing invokeAsyncLambda)

Current pattern:

```typescript
await invokeAsyncLambda("process-post-turn", payload);
// → Lambda InvocationType.Event (fire-and-forget)
```

New pattern:

```typescript
await enqueueWork("process-post-turn", payload);
// → SQS SendMessage (fire-and-forget)
```

```typescript
// shared/queue.ts
export const enqueueWork = async (
  agentName: string,
  payload: Record<string, unknown>
): Promise<void> => {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ agent: agentName, payload }),
    })
  );
};
```

The Agent Worker's SQS consumer receives the message, looks up the agent name in its YAML config, loads the corresponding module, and calls its handler — same as the current Lambda handler but without the Lambda event wrapper.

### Why SQS Over Direct HTTP

| Concern              | Direct HTTP to Worker                   | SQS                               |
| -------------------- | --------------------------------------- | ---------------------------------- |
| Guaranteed delivery  | No (worker could be restarting)         | Yes                                |
| Retry on failure     | You build it                            | Built-in with backoff              |
| Dead letter queue    | You build it                            | Native                             |
| Backpressure         | You build it                            | Visibility timeout + concurrency   |
| Observability        | Custom metrics                          | CloudWatch queue metrics           |
| Coupling             | Gateway depends on Worker availability  | Fully decoupled                    |

## Infrastructure: Separate CDK Stack

Since ECS isn't part of Amplify Gen 2's resource model, this lives in a separate CDK stack.

```
infra/
├── bin/
│   └── app.ts                    # CDK app entry point
├── lib/
│   ├── ecs-stack.ts              # Main ECS stack
│   ├── networking.ts             # VPC, subnets, security groups
│   ├── cluster.ts                # ECS cluster, capacity
│   ├── services.ts               # Task definitions, services
│   ├── load-balancer.ts          # ALB, target groups, listeners
│   ├── queue.ts                  # SQS queue + DLQ
│   └── ecr.ts                    # ECR repository
├── cdk.json
└── tsconfig.json
```

### Key Resources

**VPC**: New VPC with public + private subnets (or reuse default). Services run in private subnets; ALB in public.

**ECS Cluster**: Fargate-only (no EC2 management overhead).

**ECR Repository**: Single repo, single image, tagged per deploy.

**ALB**: Public-facing, HTTPS (ACM cert for `agents.neonpanda.ai` or similar subdomain). Path-based routing to the Gateway service.

**SQS**: Standard queue (not FIFO — ordering isn't required for builders). DLQ with `maxReceiveCount: 2`.

**Task Definitions**:

| Task Definition   | Image                       | Config Override              | CPU      | Memory |
| ----------------- | --------------------------- | ---------------------------- | -------- | ------ |
| `agent-gateway`   | `neonpanda-agents:latest`   | `AGENT_CONFIG=gateway.yaml`  | 0.5 vCPU | 1 GB   |
| `agent-worker`    | `neonpanda-agents:latest`   | `AGENT_CONFIG=worker.yaml`   | 0.5 vCPU | 1 GB   |

**ECS Services**:

| Service              | Task Def        | Min | Max | Scaling Metric              |
| -------------------- | --------------- | --- | --- | --------------------------- |
| `agent-gateway-svc`  | `agent-gateway` | 1   | 5   | ALB request count / CPU     |
| `agent-worker-svc`   | `agent-worker`  | 1   | 3   | SQS queue depth             |

**IAM**: Task execution role (ECR pull, CloudWatch Logs) + task role (DynamoDB, S3, Bedrock, SQS, Cognito — same permissions as current Lambda roles).

### Cross-Stack References

The ECS stack needs values from the Amplify stack:

- DynamoDB table name/ARN
- S3 bucket name/ARN
- Cognito User Pool ID, JWKS URI
- Bedrock guardrail ID
- SQS queue URL (created in ECS stack, but Lambda CRUD functions may need it if they ever enqueue work)

These flow via SSM Parameter Store or CloudFormation exports.

## Migration Strategy

### Phase 1: Foundation (Week 1-2)

- Create the CDK stack with VPC, ECS cluster, ALB, ECR, SQS
- Build the generic container bootstrap (`bootstrap.ts`, config loader, health check)
- Set up CI/CD pipeline for Docker build + ECR push
- Deploy with a simple health-check-only service to validate infrastructure

### Phase 2: First Streaming Agent (Week 2-3)

- Port `stream-coach-conversation` handler to a Fastify route
- The `StreamingConversationAgent` class and all tools/prompts remain unchanged
- Port `withStreamingAuth` JWT verification to Fastify middleware
- Deploy behind ALB, test end-to-end with a feature flag in the frontend
- Run both Lambda and ECS in parallel — frontend togglable

### Phase 3: Remaining Streaming Agents (Week 3-4)

- Port `stream-coach-creator-session` and `stream-program-designer-session`
- Same pattern — only the handler wrapper changes
- Validate all three streaming agents on ECS

### Phase 4: Async Workers (Week 4-5)

- Implement SQS consumer in the worker service
- Port builder handlers one by one (they're simpler — no SSE)
- Replace `invokeAsyncLambda` calls with `enqueueWork` in the Gateway service
- Validate the full pipeline: stream → SQS → worker → DynamoDB/S3

### Phase 5: Cutover and Cleanup (Week 5-6)

- Update frontend to point to ALB endpoints permanently
- Remove Lambda Function URLs from `backend.ts`
- Remove async builder Lambda definitions from `backend.ts`
- Clean up IAM policies, reserved concurrency settings
- Update `CLAUDE.md` and architecture docs

## Frontend Changes

Minimal. Update the streaming endpoint URLs:

```javascript
// Before (Function URLs)
const STREAM_CONVERSATION_URL = outputs.streamCoachConversationFunctionUrl;

// After (ALB)
const STREAM_CONVERSATION_URL = "https://agents.neonpanda.ai";
// Routes stay the same:
// /users/{userId}/coaches/{coachId}/conversations/{conversationId}/stream
```

The SSE event format (`start`, `metadata`, `chunk`, `contextual`, `complete`) remains identical. The frontend SSE consumer code doesn't change at all.

## Trade-offs

### What You Gain

- **No timeout ceiling** — Lambda caps at 15 minutes. ECS tasks can run indefinitely.
- **No cold starts on streaming** — Service is always warm. Current Function URLs have cold start on first invocation.
- **Simpler streaming model** — Native HTTP server with raw response streaming instead of Lambda's `streamifyResponse` + `pipeline` workaround.
- **Better resource control** — Choose exact CPU/memory. Scale horizontally with ALB.
- **Future-proof** — WebSocket support, long-running multi-agent orchestration, persistent connections all become trivial.
- **Single deployable artifact** — One Docker image for all agent workloads. YAML-driven configuration.

### What You Pay

- **Always-on cost** — Two Fargate services running 24/7 (minimum 1 task each). At 0.5 vCPU / 1GB, this is ~$30/month per service. Cost was noted as not a concern.
- **Deployment complexity** — Docker build + ECR push + ECS service update vs. Lambda's simpler zip deploy. Mitigated by CI/CD automation.
- **Separate CDK stack** — Two IaC stacks to manage instead of one. Clean separation, but more moving parts.
- **VPC management** — Lambda functions run without VPC concerns. ECS services need VPC, subnets, security groups. One-time setup.
- **Image size discipline** — Container images should stay lean. Node 22 Alpine + libs is likely ~200MB. Fargate pulls from ECR quickly.

### What Doesn't Change

- `StreamingConversationAgent`, `Agent` base classes — unchanged
- All agent tools, prompts, helpers — unchanged
- DynamoDB operations, S3 utils, Bedrock helpers — unchanged
- Frontend SSE consumer — unchanged
- CRUD Lambda functions — unchanged
- Cognito auth flow — unchanged (JWT verification just moves from Lambda middleware to Fastify middleware)
