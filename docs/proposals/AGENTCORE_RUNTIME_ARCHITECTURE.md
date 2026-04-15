# AgentCore Runtime Architecture Proposal

## Executive Summary

Migrate NeonPanda's agent workloads (streaming conversation agents and async builder
agents) from Lambda to Amazon Bedrock AgentCore Runtime, while keeping all CRUD and
scheduled Lambda functions unchanged. Two AgentCore Runtime registrations — an
**Agent Gateway** (streaming) and an **Agent Worker** (async) — share a single Docker
image and route internally by payload field. AgentCore manages all infrastructure:
scaling, session isolation, networking, and Cognito auth integration.

This is an alternative to the ECS-based proposal in `ECS_AGENT_ARCHITECTURE.md`. The
key difference: AgentCore eliminates the VPC, ALB, ECS cluster, NAT Gateway, and
custom JWT middleware that the ECS approach requires the developer to own.

## What Moves, What Stays

### Moves to AgentCore Runtime

**Agent Gateway (streaming agents):**

- `stream-coach-conversation`
- `stream-coach-creator-session`
- `stream-program-designer-session`

**Agent Worker (async builders):**

- `build-workout`, `build-program`, `build-coach-config`
- `build-workout-analysis`, `build-exercise`
- `build-conversation-summary`, `build-living-profile`
- `process-post-turn`
- `dispatch-memory-lifecycle`, `process-memory-lifecycle`

### Stays on Lambda

- All ~60 CRUD functions (API Gateway v2)
- Scheduled functions (`build-weekly-analytics`, `build-monthly-analytics`,
  `notify-inactive-users`)

## Architecture Overview

```
                       Client (React 19)
                             │
              ┌──────────────┴──────────────┐
              │                             │
       API Gateway v2               AgentCore Runtime
       (CRUD routes)                        │
              │                    ┌────────┴────────┐
       ┌──────┴──────┐             │                 │
       │  Lambda x60 │    Agent Gateway        Agent Worker
       │  (CRUD)     │    (3 streaming         (10 async
       │             │     agents, SSE)         builders)
       │  Lambda x3  │             │                 │
       │  (scheduled)│             └────────┬────────┘
       └─────────────┘                      │
                                     Single Docker image
                                     ARM64, ECR
```

## Two Runtimes, One Image

One Docker image, two AgentCore Runtime registrations. Each runtime passes an
`AGENT_MODE` environment variable; the container routes to the right handler.

### Container Structure

```
ecs/
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── bootstrap.ts          # Entry: read AGENT_MODE, start server or worker
    ├── server.ts             # HTTP server on port 0.0.0.0:8080
    ├── registry.ts           # Map of agent name → handler function
    ├── handlers/
    │   ├── streaming/
    │   │   ├── conversation.ts
    │   │   ├── coach-creator.ts
    │   │   └── program-designer.ts
    │   └── builders/
    │       ├── build-workout.ts
    │       ├── build-program.ts
    │       ├── build-coach-config.ts
    │       ├── build-workout-analysis.ts
    │       ├── build-exercise.ts
    │       ├── build-conversation-summary.ts
    │       ├── build-living-profile.ts
    │       ├── process-post-turn.ts
    │       ├── dispatch-memory-lifecycle.ts
    │       └── process-memory-lifecycle.ts
    └── shared/
        └── queue.ts          # invokeAgentRuntime helper (replaces invokeAsyncLambda)
```

Shared libraries from `amplify/functions/libs/` are copied into the image at build
time. TypeScript path aliases map `@libs/*` so existing imports require no changes.

### HTTP Protocol Contract

AgentCore Runtime requires the container to expose port 8080 with three endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/invocations` | POST | Primary agent interaction — JSON or SSE response |
| `/ping` | GET | Health check — returns `{"status": "Healthy"}` |
| `/ws` | GET | Optional WebSocket (not used in this proposal) |

The `bootstrap.ts` entry point is the entire routing layer:

```typescript
// bootstrap.ts
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "Healthy" }));
    return;
  }

  if (req.method === "POST" && req.url === "/invocations") {
    const body = await readBody(req);
    const { agent, payload } = JSON.parse(body);
    const handler = registry[agent];
    await handler(payload, res); // handler sets Content-Type and streams or returns JSON
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(8080, "0.0.0.0");
```

No Fastify, no Express, no YAML config loader. The registry is a plain TypeScript
object mapping agent name strings to handler functions.

### Dockerfile

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

ENV AGENT_MODE=gateway
CMD ["node", "dist/bootstrap.js"]
```

Built with `docker buildx build --platform linux/arm64` (see ARM64 note below).

## SSE Streaming Pattern (Agent Gateway)

The existing `StreamingConversationAgent` already yields SSE-formatted strings. The
handler writes them directly to the raw HTTP response:

```typescript
// handlers/streaming/conversation.ts
export const conversationHandler = async (
  payload: ConversationPayload,
  res: http.ServerResponse
): Promise<void> => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });

  // Same parallel data loading as current Lambda handler
  const [profile, conversation, config] = await Promise.all([
    getUserProfile(payload.userId),
    getCoachConversation(payload.userId, payload.coachId, payload.conversationId),
    getCoachConfig(payload.userId, payload.coachId),
  ]);

  // Same agent construction — class unchanged
  const agent = new StreamingConversationAgent({ ... });

  res.write(formatStartEvent());

  const generator = agent.converseStream(userMessage, imageS3Keys);
  let result = await generator.next();
  while (!result.done) {
    res.write(result.value); // Already SSE-formatted
    result = await generator.next();
  }

  res.write(formatCompleteEvent({ ... }));
  res.end();
};
```

Auth is handled by AgentCore's built-in Cognito OAuth 2.0 integration — the custom
`withStreamingAuth` JWT middleware is eliminated entirely.

## Async Work Pattern (Replacing invokeAsyncLambda)

Current pattern:

```typescript
await invokeAsyncLambda("process-post-turn", payload);
// → Lambda InvocationType.Event (fire-and-forget)
```

New pattern:

```typescript
invokeAgentRuntime(WORKER_RUNTIME_ARN, "process-post-turn", payload);
// → InvokeAgentRuntime, not awaited (fire-and-forget)
```

```typescript
// shared/queue.ts
export const invokeAgentRuntime = (
  runtimeArn: string,
  agent: string,
  payload: Record<string, unknown>
): void => {
  // Not awaited — fire-and-forget
  bedrockAgentCoreClient
    .send(
      new InvokeAgentRuntimeCommand({
        agentRuntimeArn: runtimeArn,
        runtimeSessionId: `${agent}-${Date.now()}`,
        requestPayload: JSON.stringify({ agent, payload }),
      })
    )
    .catch((err) => console.error(`invokeAgentRuntime ${agent} failed:`, err));
};
```

Each async builder invocation is a new session (new `runtimeSessionId`), runs to
completion, and exits. No SQS queue, no DLQ, no visibility timeout management, no
at-least-once delivery idempotency concern.

## Infrastructure

AgentCore Runtime manages: container orchestration, scaling, session isolation
(dedicated microVM per session), networking, and auth. Developer-owned resources:

- **ECR repository** — single repo, single image, tagged per deploy
- **Two AgentCore Runtime registrations** — `neonpanda-agent-gateway` and
  `neonpanda-agent-worker`
- **IAM task role** — DynamoDB, S3, Bedrock, Cognito (same permissions as current
  Lambda roles)
- **Cognito OAuth 2.0 config** — discovery URL pointed at existing Cognito User Pool

No VPC, no NAT Gateway, no ALB, no ECS cluster, no separate CDK stack.

## Open Questions — Researched

### ARM64 on Apple Silicon

**Answer: No cross-compilation needed for local builds. One flag for CI.**

Apple Silicon Macs natively produce ARM64 images. For explicit targeting and CI
consistency, use:

```bash
docker buildx build --platform linux/arm64 -t neonpanda-agents:latest .
```

On M-series Macs this builds natively (fast). In CI (x86 CodeBuild runner), this
cross-compiles via QEMU — slower but functional. AWS recommends using CodeBuild ARM64
runners for production builds to avoid QEMU overhead.

Reference: [AWS re:Post — Getting started on AgentCore without the starter toolkit using Finch on macOS Apple Silicon](https://repost.aws/articles/ARYsSnCYmdScKOdC3WHujl9w/getting-started-on-agentcore-without-the-starter-toolkit-using-finch-on-macos-apple-silicon)

---

### Pricing vs. Always-On Fargate

**Answer: AgentCore is cheaper at low-to-moderate utilization; Fargate wins above ~45%
active utilization.**

AgentCore Runtime pricing is consumption-based, billed per second of active CPU use:

| Metric | AgentCore Runtime | Fargate (us-east-1) |
|--------|-------------------|---------------------|
| vCPU-hour | ~$0.0895 | $0.04048 |
| GB-hour | ~$0.00945 | $0.004445 |
| Billing model | Active CPU only (I/O wait is free) | Always-on, 24/7 |
| Minimum billing | 1 second, 128 MB | Task lifetime |

AgentCore rate is ~2.2x higher per vCPU-hour than Fargate, but you only pay when
actively processing — idle sessions cost nothing. Two always-on Fargate services at
0.5 vCPU / 1 GB each run ~$35/month regardless of traffic.

**Break-even estimate (two services, 0.5 vCPU / 1 GB):**

At ~45% active utilization (~325 active hours/month), AgentCore and Fargate cost
roughly the same. Below that, AgentCore is cheaper. Above that, Fargate wins.

For a fitness coaching app with bursty, human-paced conversation traffic, utilization
is almost certainly well below 45% — making AgentCore the more cost-efficient choice.

Reference: [Amazon Bedrock AgentCore Pricing](https://aws.amazon.com/bedrock/agentcore/pricing/)

---

### Session Inactivity Timeout — Per-Session or Global?

**Answer: Configured at the runtime level, applies identically to every session
within that runtime.**

Lifecycle settings are defined via `CreateAgentRuntime` (or `UpdateAgentRuntime`) and
govern all sessions spawned from that runtime:

| Setting | Default | Range | Notes |
|---------|---------|-------|-------|
| `idleRuntimeSessionTimeout` | 900s (15 min) | 60s–28800s | Time before idle microVM is terminated |
| `maxLifetime` | 28800s (8 hours) | 60s–28800s | Hard cap per session |

**Implication for NeonPanda:** The default 15-minute idle timeout is fine for
streaming conversations (turns complete in seconds). For the async worker, set
`idleRuntimeSessionTimeout` to 60s — builder sessions complete quickly and should
not linger. Configure per runtime at deployment time.

```typescript
lifecycleConfiguration: {
  idleRuntimeSessionTimeout: 60,   // agent-worker: exit fast after completion
  maxLifetime: 3600,               // 1 hour hard cap
}
```

Reference: [Configure Amazon Bedrock AgentCore lifecycle settings](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-lifecycle-settings.html)

## Migration Strategy

### Phase 1: Container Foundation (Week 1)

- Build the Docker image with bootstrap, registry, and `/ping` + `/invocations`
  endpoints
- Register `neonpanda-agent-gateway` AgentCore Runtime
- Deploy with a no-op handler that returns a test SSE event
- Validate: ARM64 build, ECR push, health check passing, AgentCore routing working

### Phase 2: First Streaming Agent (Week 1-2)

- Port `stream-coach-conversation` handler — only event parsing changes (no Lambda
  event wrapper); `StreamingConversationAgent` and all tools/prompts unchanged
- Wire Cognito OAuth 2.0 in AgentCore auth config
- Add frontend feature flag to route one user to the AgentCore endpoint
- Validate: full conversation turn, SSE format, auth, cold start latency on first
  message

### Phase 3: Remaining Streaming Agents (Week 2-3)

- Port `stream-coach-creator-session` and `stream-program-designer-session`
- Same pattern — only the handler wrapper changes
- Validate all three on AgentCore

### Phase 4: Async Worker (Week 3-4)

- Register `neonpanda-agent-worker` AgentCore Runtime
- Port builder handlers (simpler — no SSE, just DynamoDB/S3 writes)
- Replace `invokeAsyncLambda` calls with `invokeAgentRuntime` (unawaited)
- Set `idleRuntimeSessionTimeout: 60` on the worker runtime
- Validate full pipeline: stream → invokeAgentRuntime → worker → DynamoDB/S3

### Phase 5: Cutover and Cleanup (Week 4-5)

- Remove frontend feature flags, point all users to AgentCore endpoints
- Remove Lambda Function URL definitions from `amplify/backend.ts`
- Remove async builder Lambda definitions from `amplify/backend.ts`
- Update `CLAUDE.md` and architecture docs

## Frontend Changes

Minimal. Update the streaming endpoint URLs:

```javascript
// Before (Lambda Function URLs)
const STREAM_CONVERSATION_URL = outputs.streamCoachConversationFunctionUrl;

// After (AgentCore Runtime ARN — invoked via SDK, not direct URL)
// OR: wrap in a thin Lambda that calls InvokeAgentRuntime and proxies SSE
```

**Note:** AgentCore Runtime is invoked via the AWS SDK (`InvokeAgentRuntime`), not
a direct HTTPS URL. The frontend cannot call it directly. Two options:

1. **Thin proxy Lambda** — lightweight Lambda per streaming route that calls
   `InvokeAgentRuntime` and pipes the SSE response back through API Gateway. Minimal
   code; keeps the frontend SSE consumer unchanged.
2. **Direct SDK from frontend** — use the Bedrock AgentCore SDK in the browser with
   Cognito credentials. Eliminates the proxy Lambda but requires frontend SDK changes.

Option 1 is recommended for minimal frontend disruption. The proxy Lambda has no
agent logic — it's purely a pass-through and stays well within Lambda limits.

## Trade-offs vs. ECS Proposal

### What AgentCore Adds Over ECS

- No VPC, NAT Gateway, or private subnet configuration
- No ALB idle timeout issue (was a critical gap in the ECS proposal)
- No ECS cluster, task definitions, or capacity management
- No custom JWT middleware (Cognito auth handled by AgentCore)
- No separate CDK stack
- Consumption-based pricing — cheaper at NeonPanda's expected utilization

### What AgentCore Costs Over ECS

- **Service maturity** — newer surface area, less community debugging knowledge
- **Invocation model** — requires a thin proxy Lambda for frontend SSE (ECS + ALB
  is directly addressable)
- **Rate** — ~2.2x higher per vCPU-hour than Fargate (offset by consumption billing)
- **Less control** — session lifecycle and microVM behavior are managed by AWS

### What Doesn't Change (Either Approach)

- `StreamingConversationAgent`, `Agent` base classes — unchanged
- All agent tools, prompts, helpers — unchanged
- DynamoDB operations, S3 utils, Bedrock helpers — unchanged
- CRUD Lambda functions — unchanged
- Cognito auth flow — unchanged (just moves from middleware to AgentCore config)
