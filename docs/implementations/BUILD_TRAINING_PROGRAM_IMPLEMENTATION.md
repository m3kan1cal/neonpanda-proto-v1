# Build Training Program - Async Lambda Implementation

## Overview
Created `build-training-program` async Lambda handler following the **exact same pattern** as `build-workout`.

---

## Files Created

### 1. **Handler**: `amplify/functions/build-training-program/handler.ts`
**Purpose**: Async Lambda for AI-powered training program generation

**Pattern Alignment**:
| Aspect | `build-workout` | `build-training-program` | Match? |
|--------|----------------|-------------------------|--------|
| **Import Structure** | Uses `createOkResponse`, `createErrorResponse`, `storeDebugDataInS3` | ✅ Same | ✅ |
| **Event Interface** | `BuildWorkoutEvent` | `BuildTrainingProgramEvent` | ✅ |
| **Logging Start** | `🏋️ Starting workout extraction:` | `🏋️ Starting training program generation:` | ✅ |
| **Validation** | Validates `userId`, `coachId`, `conversationId`, `userMessage` | Validates `userId`, `coachId`, `conversationId`, `conversationMessages` | ✅ |
| **AI Processing** | Extraction + Normalization + Summary | Structure extraction + Normalization + Template generation | ✅ |
| **Storage** | DynamoDB + Pinecone | DynamoDB + S3 | ✅ Domain-specific |
| **Debug Data** | Stores in S3 via `storeDebugDataInS3` | ✅ Same | ✅ |
| **Success Response** | Returns workout details | Returns program details | ✅ |
| **Error Handling** | Consistent error logging and response | ✅ Same pattern | ✅ |

### 2. **Resource**: `amplify/functions/build-training-program/resource.ts`
**Purpose**: Lambda configuration

**Pattern Alignment**:
```typescript
// build-workout
export const buildWorkout = defineFunction({
  name: 'build-workout',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes
  memoryMB: 2048
});

// build-training-program
export const buildTrainingProgram = defineFunction({
  name: 'build-training-program',
  entry: './handler.ts',
  timeoutSeconds: 900, // 15 minutes (longer due to multi-phase generation)
  memoryMB: 2048
});
```
✅ **Identical pattern**, only timeout differs (training programs take longer)

### 3. **Event Interface**: `amplify/functions/libs/training-program/types.ts`
**Purpose**: Event structure for async invocation

**Pattern Alignment**:
```typescript
// BuildWorkoutEvent
export interface BuildWorkoutEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  userMessage: string;
  coachConfig: CoachConfig;
  completedAt?: string;
  isSlashCommand?: boolean;
  slashCommand?: string;
  messageTimestamp?: string;
  userTimezone?: string;
  criticalTrainingDirective?: { content: string; enabled: boolean };
}

// BuildTrainingProgramEvent
export interface BuildTrainingProgramEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  conversationMessages: any[]; // Full conversation for context
  coachConfig: any;
  userProfile?: any;
}
```
✅ **Same structure pattern**, fields differ based on domain needs

---

## Backend Integration (`amplify/backend.ts`)

### Imports
```typescript
import { buildWorkout } from "./functions/build-workout/resource";
import { buildTrainingProgram } from "./functions/build-training-program/resource"; // NEW
```

### defineBackend Registration
```typescript
const backend = defineBackend({
  // ... other functions
  buildWorkout,
  buildTrainingProgram, // NEW
});
```

### Permissions Granted

#### 1. **Bedrock AI Access** (for Claude API calls)
```typescript
[
  backend.buildWorkout.resources.lambda,
  backend.buildTrainingProgram.resources.lambda, // NEW
  // ... other functions
].forEach(func => {
  sharedPolicies.attachBedrockAccess(func.resources.lambda);
});
```

#### 2. **DynamoDB Read/Write**
```typescript
[
  backend.buildWorkout,
  backend.buildTrainingProgram, // NEW
  // ... other functions
].forEach(func => {
  sharedPolicies.attachDynamoDbReadWrite(func.resources.lambda);
});
```

#### 3. **S3 Apps Bucket Access**
```typescript
[
  backend.buildWorkout,
  backend.buildTrainingProgram, // NEW
  // ... other functions
].forEach(func => {
  sharedPolicies.attachS3AppsAccess(func.resources.lambda);
});
```

#### 4. **Lambda Invoke Permissions** (for async invocation)
```typescript
// Grant streamCoachConversation permission to invoke build-training-program
grantLambdaInvokePermissions(
  backend.streamCoachConversation.resources.lambda,
  [
    backend.buildWorkout.resources.lambda.functionArn,
    backend.buildTrainingProgram.resources.lambda.functionArn, // NEW
    backend.buildConversationSummary.resources.lambda.functionArn,
  ]
);
```

#### 5. **Environment Variable** (for function name reference)
```typescript
backend.streamCoachConversation.addEnvironment(
  "BUILD_TRAINING_PROGRAM_FUNCTION_NAME",
  backend.buildTrainingProgram.resources.lambda.functionName
);
```

---

## Calling Pattern (`stream-coach-conversation/handler.ts`)

### Before (Synchronous - BLOCKING):
```typescript
// ❌ OLD: Synchronous generation (blocks streaming for 10-30 seconds!)
const generatedProgram = await generateTrainingProgramFromConversation(
  conversationMessages,
  userId,
  coachId,
  conversationId
);
```

### After (Asynchronous - NON-BLOCKING):
```typescript
// ✅ NEW: Async invocation (immediate return, generation in background)
const buildTrainingProgramPayload: BuildTrainingProgramEvent = {
  userId,
  coachId,
  conversationId,
  conversationMessages: conversation.attributes.messages,
  coachConfig: coachConfig.attributes,
  userProfile: userProfile?.attributes,
};

await invokeAsyncLambda(
  process.env.BUILD_TRAINING_PROGRAM_FUNCTION_NAME!,
  buildTrainingProgramPayload,
  `training program generation for user ${userId}`
);
```

---

## Pattern Comparison: Workout vs Training Program

### Workflow Comparison

#### **Workout Flow**:
```
User message → Workout detected → Async invoke build-workout
                                ↓
                         Streaming continues immediately
                                ↓
                    build-workout extracts + normalizes + saves
```

#### **Training Program Flow**:
```
Build mode → [GENERATE_PROGRAM] trigger → Async invoke build-training-program
                                        ↓
                                Streaming continues immediately
                                        ↓
                        build-training-program extracts + normalizes + generates templates + saves
```

### Response Messages

#### **Workout** (during streaming):
```
"🏋️ I've detected a workout to log. Processing in the background..."
```

#### **Training Program** (during streaming):
```
"🎯 Generating your training program...
I'm working on creating your detailed training program with daily workout templates.
This will take a minute..."

✅ Training Program Generation Started!
Your personalized training program is being created in the background.
You'll be notified when it's ready (usually within 1-2 minutes).
```

---

## Key Benefits

### 1. **Non-Blocking UX**
- ✅ User gets immediate response
- ✅ Streaming continues smoothly
- ✅ No timeout issues

### 2. **Consistent Architecture**
- ✅ Same pattern as workouts
- ✅ Same pattern as analytics (weekly/monthly)
- ✅ Predictable behavior

### 3. **Scalability**
- ✅ Each generation has its own Lambda timeout (15 min)
- ✅ No impact on conversation responsiveness
- ✅ Can retry failed generations independently

### 4. **Separation of Concerns**
- ✅ **Conversation handler**: Manages streaming, user interaction
- ✅ **Build handler**: Focused on AI generation, normalization, storage
- ✅ Clear boundaries and responsibilities

---

## Testing Checklist

### Before Deployment:
- [x] ✅ Handler created with same pattern as build-workout
- [x] ✅ Resource file created with appropriate timeout
- [x] ✅ Event interface added to types
- [x] ✅ Backend registration complete
- [x] ✅ All permissions granted (Bedrock, DynamoDB, S3, Lambda invoke)
- [x] ✅ Environment variable added
- [x] ✅ stream-coach-conversation updated to async invocation
- [x] ✅ No linter errors

### After Deployment:
- [ ] Test Build mode conversation with [GENERATE_PROGRAM] trigger
- [ ] Verify program appears in DynamoDB
- [ ] Verify S3 details stored correctly
- [ ] Check CloudWatch logs for both handlers
- [ ] Confirm non-blocking behavior (stream continues immediately)

---

## Summary

✅ **Successfully implemented `build-training-program` following the exact same pattern as `build-workout`:**

1. **Same handler structure** (validation, AI processing, storage, error handling)
2. **Same resource configuration** (defineFunction with timeout/memory)
3. **Same backend integration** (permissions, environment vars, invoke grants)
4. **Same async invocation pattern** (invokeAsyncLambda from streaming handler)
5. **Consistent logging and debugging** (storeDebugDataInS3)

**Key Difference**: Training programs take longer (15 min vs 5 min timeout) due to multi-phase generation, but the **architecture and patterns are identical**! 🎯


