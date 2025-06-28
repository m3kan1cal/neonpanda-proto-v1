# Simplified Pinecone Strategy - Semantic Search Layer

## Keep Your Existing Namespace Structure
```typescript
const namespaces = {
  // Shared content (methodology knowledge base)
  'methodology': 'CrossFit/fitness methodology content',
  'safety': 'Safety guidelines and validation rules',

  // User-specific (semantic search for conversations)
  'user_{userId}': 'Conversation topics and context for semantic search'
};
```

## Role Clarity: DynamoDB vs S3 vs Pinecone

### DynamoDB Handles:
- ✅ Recent conversation metadata (last 10 conversations)
- ✅ Workout history with structured data
- ✅ User profiles and coach configurations
- ✅ UI queries ("show me my workouts this week")

### S3 Handles:
- ✅ Full conversation transcripts
- ✅ Detailed workout logs
- ✅ Large methodology documents

### Pinecone Handles:
- 🎯 **Semantic search only** - "find similar conversations/topics"
- 🎯 **Context retrieval** - "what methodology applies to this question?"
- 🎯 **Pattern matching** - "when did coach handle similar situations?"

## What Goes in Pinecone (Keep It Simple)

### Methodology Namespace
```typescript
// Curated methodology content for RAG
const methodologyContent = {
  id: 'comptrain_progressive_overload',
  content: 'Progressive overload in CompTrain programming emphasizes consistent weekly increases rather than daily max efforts...',
  metadata: {
    source: 'comptrain',
    topics: ['progressive_overload', 'programming'],
    discipline: 'crossfit',
    level: 'intermediate'
  }
};
```

### User Conversation Context
```typescript
// Just conversation topics/summaries, not full conversations
const conversationContext = {
  id: 'user123_conv_045_summary',
  content: 'User struggled with overhead squat depth, coach recommended ankle mobility work and goblet squat progression',
  metadata: {
    conversation_id: 'conv_045', // Links back to DynamoDB record
    date: '2025-06-20',
    topics: ['overhead_squat', 'mobility', 'progression'],
    outcome: 'mobility_prescription',
    s3_key: 'users/123/conversations/conv_045.json' // Link to full conversation
  }
};
```

## Simple RAG Implementation

### Basic Context Retrieval
```typescript
const getCoachContext = async (userId: string, userMessage: string) => {
  // 1. Get relevant methodology (shared knowledge)
  const methodology = await index.namespace('methodology').query({
    vector: [], // Auto-generated from userMessage
    topK: 3,
    includeMetadata: true
  });

  // 2. Get similar past conversations (personal history)
  const userNamespace = `user_${userId}`;
  const history = await index.namespace(userNamespace).query({
    vector: [], // Auto-generated from userMessage
    topK: 2,
    includeMetadata: true
  });

  // 3. Get recent context from DynamoDB (structured data)
  const recentWorkouts = await getRecentWorkouts(userId, 5);
  const userProfile = await getUserProfile(userId);

  return {
    methodology: methodology.matches.map(m => m.metadata.content),
    history: history.matches.map(m => m.metadata.content),
    recentWorkouts,
    userProfile
  };
};
```

## Data Flow Example

### When User Sends Message to Their Coach

**Context Already Available:**
- ✅ Coach Agent already has `coachConfig` (personality, methodology, etc.)
- ✅ Coach Agent already has `userProfile` (goals, preferences, injury history)
- ✅ Conversation is happening within established coach-user relationship

### Implementation
```typescript
const handleCoachMessage = async (coachContext: CoachContext, userMessage: string) => {
  // Coach context already contains:
  // - coachConfig (personality, methodology, specializations)
  // - userProfile (goals, fitness level, preferences)
  // - conversationHistory (recent messages from DynamoDB)

  // Only need to get semantic context from Pinecone
  const semanticContext = await getSemanticContext(coachContext.userId, userMessage);

  // Generate coach response with all available context
  const response = await generateCoachResponse({
    userMessage,
    coachConfig: coachContext.coachConfig,
    userProfile: coachContext.userProfile,
    recentHistory: coachContext.conversationHistory,
    semanticContext // Methodology + similar past conversations
  });

  // Store conversation (as planned)
  await storeConversation(coachContext.userId, userMessage, response);

  // Store summary in Pinecone for future semantic search
  await storePineconeContext(coachContext.userId, {
    content: `User asked: ${userMessage}. Coach provided: ${response.slice(0, 200)}...`,
    metadata: {
      topics: extractTopics(userMessage, response),
      outcome: classifyOutcome(response)
    }
  });

  return response;
};

// Simplified Pinecone role - just semantic context retrieval
const getSemanticContext = async (userId: string, userMessage: string) => {
  const [methodology, history] = await Promise.all([
    // Relevant methodology knowledge
    index.namespace('methodology').query({
      vector: [], // Auto-generated from userMessage
      topK: 3,
      includeMetadata: true
    }),

    // Similar past conversations
    index.namespace(`user_${userId}`).query({
      vector: [], // Auto-generated from userMessage
      topK: 2,
      includeMetadata: true
    })
  ]);

  return {
    methodology: methodology.matches.map(m => m.metadata.content),
    similarConversations: history.matches.map(m => m.metadata.content)
  };
};
```
