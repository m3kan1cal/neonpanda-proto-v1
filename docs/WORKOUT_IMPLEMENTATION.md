# Workout Logging Implementation Guide
## Natural Language Workout Logging in Coach Conversations

### Version 1.0 | Implementation Reference

---

## Overview

This document outlines the implementation approach for natural language workout logging within coach conversations. Users can describe completed workouts in natural language during coach conversations, and the system will detect, extract, and store structured workout data using the Universal Workout Schema.

---

## Architecture Decisions

### Data Relationship Model
**Selected Approach**: Workouts belong to Users but track coach context

**Benefits**:
- User owns all their data
- Can switch coaches without losing workout history
- Maintains coaching context for analytics and personality
- Supports multiple coaches per user (future)
- Natural fit with conversation-based logging

### Entity Separation
- **Workout Template**: Prescribed workouts (future feature)
- **Workout**: Completed workouts (current implementation)

---

## Simplified Implementation Approach

### Initial Workout Structure

```typescript
interface Workout {
  workoutId: string;
  userId: string;

  // Coach context (simple single coach for now)
  coachIds: [string]; // Array with one element for future flexibility
  coachNames: [string]; // Array with one element for future flexibility

  conversationId: string;
  completedAt: Date; // When workout was actually completed
  workoutData: UniversalWorkoutSchema;

  extractionMetadata: {
    confidence: number;
    extractedAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
  };
}
```

### DynamoDB Structure

```
// Workouts (completed workouts)
PK: user#{userId}
SK: workout#{workoutId}
GSI1PK: coach#{coachId}  // For any coach in the coachIds array
GSI1SK: user#{userId}#{completedAt}
```

---

## Implementation Flow

### 1. Detection in Coach Conversation

```typescript
// In send-coach-conversation-message/handler.ts
const isWorkoutLogging = detectWorkoutLogging(userResponse);

if (isWorkoutLogging) {
  // Quick extraction for immediate coach response
  const basicWorkoutInfo = await quickWorkoutExtraction(userResponse);

  // Coach acknowledges with personality
  const acknowledgment = await generateWorkoutAcknowledgment(
    coachConfig,
    basicWorkoutInfo,
    userResponse
  );

  // Start async full extraction
  await triggerAsyncWorkoutExtraction({
    userId,
    coachId,
    conversationId,
    userMessage: userResponse,
    coachConfig
  });

  return acknowledgment;
}
```

### 2. Workout Detection Logic

```typescript
const detectWorkoutLogging = (message: string) => {
  const workoutIndicators = [
    /did\s+\w+\s+today/i,
    /just\s+finished/i,
    /completed\s+\w+/i,
    /my\s+time\s+was/i,
    /\d+:\d+/, // Time format
    /\d+\s*(lbs?|kg|pounds?|kilos?)/i, // Weight format
    /(fran|murph|helen|diane|grace)/i, // CrossFit benchmarks
    /pr\s+today/i,
    /new\s+personal\s+best/i,
    /workout\s+complete/i,
    /finished\s+the\s+workout/i
  ];

  return workoutIndicators.some(pattern => pattern.test(message));
};
```

### 3. Coach Acknowledgment Generation

```typescript
const generateWorkoutAcknowledgment = async (
  coachConfig: CoachConfig,
  basicInfo: any,
  userMessage: string
) => {
  const prompt = `
  ${coachConfig.personality_prompt}

  The user just logged a workout: "${userMessage}"

  Basic extracted info: ${JSON.stringify(basicInfo)}

  Acknowledge this workout completion in your coaching style. Be encouraging and specific about what they accomplished. Keep it brief but personal.

  After acknowledging, you can ask 1-2 follow-up questions if key details are missing (time, weight, how it felt, etc.).
  `;

  return await callBedrockApi(prompt, userMessage);
};
```

### 4. Async Full Extraction

```typescript
// New Lambda: extract-workout/handler.ts
export const handler = async (event: any) => {
  const { userId, coachId, conversationId, userMessage, coachConfig } = event;

  // Full extraction using Universal Workout Schema
  const extractionPrompt = buildWorkoutExtractionPrompt(userMessage, coachConfig);
  const extractedData = await callBedrockApi(extractionPrompt, userMessage);

  // Parse and structure
  const workoutData = parseAndValidateWorkoutData(extractedData);

  // Create workout
  const workout = {
    workoutId: `ws_${userId}_${Date.now()}`,
    userId,
    coachIds: [coachId],
    coachNames: [coachConfig.name],
    conversationId,
    completedAt: extractCompletedAtTime(userMessage) || new Date(),
    workoutData,
    extractionMetadata: {
      confidence: calculateConfidence(workoutData),
      extractedAt: new Date()
    }
  };

  // Save to DynamoDB
  await saveWorkout(workout);

  // For future: This is where you'd add to Pinecone for semantic search
  // await addWorkoutToPinecone(userId, workout);

  return { success: true, workoutId: workout.workoutId };
};
```

### 5. Lambda Invocation Pattern

```typescript
// In send-coach-conversation-message/handler.ts
const triggerAsyncWorkoutExtraction = async (extractionData: any) => {
  const lambdaClient = new LambdaClient({});

  const command = new InvokeCommand({
    FunctionName: 'extract-workout',
    InvocationType: 'Event', // Async invocation
    Payload: JSON.stringify(extractionData)
  });

  await lambdaClient.send(command);
};
```

---

## Database Schema Implementation

### DynamoDB Operations

Add to `amplify/dynamodb/operations.ts`:

```typescript
export async function saveWorkout(workout: Workout): Promise<void> {
  const item = createDynamoDBItem<Workout>(
    'workout',
    `user#${workout.userId}`,
    `workout#${workout.workoutId}`,
    workout,
    new Date().toISOString()
  );

  await saveToDynamoDB(item);
}

export async function getWorkout(
  userId: string,
  workoutId: string
): Promise<DynamoDBItem<Workout> | null> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }

  try {
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        pk: `user#${userId}`,
        sk: `workout#${workoutId}`
      }
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return null;
    }

    return deserializeFromDynamoDB(result.Item) as DynamoDBItem<Workout>;
  } catch (error) {
    console.error('Error loading workout:', error);
    throw error;
  }
}

export async function getRecentWorkouts(
  userId: string,
  limit: number = 10
): Promise<DynamoDBItem<Workout>[]> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }

  try {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `user#${userId}`,
        ':sk': 'workout#'
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    });

    const result = await docClient.send(command);

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map(item =>
      deserializeFromDynamoDB(item) as DynamoDBItem<Workout>
    );
  } catch (error) {
    console.error('Error loading recent workouts:', error);
    throw error;
  }
}

export async function getWorkoutsByCoach(
  userId: string,
  coachId: string,
  limit: number = 20
): Promise<DynamoDBItem<Workout>[]> {
  // Implementation for coach-specific workouts
  // Will need to filter by coachIds array containing the coachId
  // May require a scan operation or additional GSI structure
}
```

### TypeScript Types

Add to `amplify/functions/libs/coach-creator/types.ts`:

```typescript
export interface Workout {
  workoutId: string;
  userId: string;
  coachIds: string[];
  coachNames: string[];
  conversationId: string;
  completedAt: Date;
  workoutData: UniversalWorkoutSchema;
  extractionMetadata: {
    confidence: number;
    extractedAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
  };
}

// Reference to Universal Workout Schema
export interface UniversalWorkoutSchema {
  // This will be defined based on the UNIVERSAL_WORKOUT_SCHEMA.md
  // For now, use a flexible structure
  workout_id: string;
  user_id: string;
  date: string;
  discipline: string;
  methodology?: string;
  workout_name?: string;
  workout_type: string;
  duration?: number;
  location?: string;
  performance_metrics?: any;
  discipline_specific?: any;
  pr_achievements?: any[];
  subjective_feedback?: any;
  coach_notes?: any;
  metadata?: any;
}
```

---

## Lambda Functions to Create

### 1. Extract Workout Function

```
amplify/functions/extract-workout/
├── handler.ts
├── resource.ts
└── extraction-helpers.ts
```

### 2. Get Workouts Function

```
amplify/functions/get-workouts/
├── handler.ts
└── resource.ts
```

### 3. Update Workout Function

```
amplify/functions/update-workout/
├── handler.ts
└── resource.ts
```

---

## API Routes to Add

Add to `amplify/api/routes.ts`:

```typescript
// Get workouts for user
httpApi.addRoutes({
  path: '/users/{userId}/workouts',
  methods: [apigatewayv2.HttpMethod.GET],
  integration: integrations.getWorkouts
});

// Get specific workout
httpApi.addRoutes({
  path: '/users/{userId}/workouts/{workoutId}',
  methods: [apigatewayv2.HttpMethod.GET],
  integration: integrations.getWorkout
});

// Update workout
httpApi.addRoutes({
  path: '/users/{userId}/workouts/{workoutId}',
  methods: [apigatewayv2.HttpMethod.PUT],
  integration: integrations.updateWorkout
});
```

---

## Next Steps for Implementation

### Phase 1: Core Detection and Extraction
1. COMPLETED **Add workout detection patterns** to `send-coach-conversation-message/handler.ts`
2. COMPLETED **Create the async extraction Lambda** function (`extract-workout`)
3. COMPLETED **Add Workout types** to existing types file
4. COMPLETED **Update DynamoDB operations** with workout methods
5. COMPLETED **Build the workout extraction prompt** using Universal Workout Schema
6. COMPLETED **Validate usage of the universal schema** in how we've implemented in the build prompt
7. COMPLETED **Turn on the extraction** so that we're actually trying to extract and create workout sessions

### Phase 2: Basic UI Integration
8. COMPLETED **Add slash/ method** for explicitly logging workouts in chat
9. COMPLETED **Add workout API routes** to the API Gateway
10. COMPLETED **Add workout Lambda** handlers to the backend and integrations
11. COMPLETED **Create frontend workout API calls** in `src/utils/apis/`
12. COMPLETED **Update coach conversation agent** to handle workout logging responses
13. COMPLETED **Add workout display** in workout UI, possibly separate UI similar to CoachConversation
14. COMPLETED **Show recent workouts** display in the training grounds and maybe in the coach conversation

### Phase 3: Advanced Features
15. IN FUTURE **Implement workout editing** UI and make human friendly view
16. COMPLETED **Add confidence score display** for extracted data
17. COMPLETED **Create workout history view** for users
18. **Add workout context** to coach system prompts

Maybe analyze weekly workouts and provide insights for a week-ending report?
Maybe summarize workouts and put in Pinecone for semantic searching to have memory of workouts for future?
Maybe summarize weekly coach conversations, workouts, coaching feedback and put in Pinecone so coach has memory of previous week workouts?
Allow deleting workouts?

### Phase 4: Testing and Refinement
19. **Test with simple workout logging** ("I did Fran in 8:57")
20. **Test with complex workout descriptions** (custom workouts, scaling)
21. **Refine extraction accuracy** based on user feedback
22. **Add error handling** for failed extractions

---

## Implementation Notes

### Coach Personality Integration
- Workout acknowledgment must match the coach's personality
- Use existing `coachConfig.personality_prompt` in acknowledgment generation
- Include recent workout context in future coach conversations

### User Experience Flow
1. User describes workout in coach conversation
2. Coach immediately acknowledges with personality-matched response
3. Coach asks follow-up questions for missing key details
4. Async extraction happens in background
5. Full workout data available in workout history
6. User can edit/review extracted data by clicking on workout

### Future Enhancements
- Multiple coach support (expand coachIds array)
- Prescribed workout comparison
- Weekly workout summaries for Pinecone indexing
- Coach notifications and analytics
- Workout sharing between coaches
- Advanced workout templates and prescription system

---

## Testing Strategy

### Unit Tests
- Workout detection patterns
- Data extraction accuracy
- DynamoDB operations
- API response formats

### Integration Tests
- End-to-end conversation flow
- Async extraction pipeline
- Coach personality integration
- Error handling scenarios

### User Acceptance Tests
- Natural language workout descriptions
- Coach response quality
- Data accuracy verification
- Edit/review workflow

---

*Implementation Guide v1.0 | Created: January 2025*