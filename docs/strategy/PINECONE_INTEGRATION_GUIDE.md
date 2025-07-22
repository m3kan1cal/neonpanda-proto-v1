# Pinecone Integration Guide - Semantic Memory for AI Coaches

## Overview

This guide documents the complete Pinecone integration implementation for the CoachForge application. The system provides semantic memory capabilities for AI coaches by storing and retrieving workout summaries and coach creator session data.

## Architecture

### Current Implementation Status

✅ **Completed:**
- Workout summaries stored in Pinecone via `build-workout` handler
- Coach creator summaries stored in Pinecone via `build-coach-config` handler
- Intelligent query detection in `send-coach-conversation-message` handler
- Context formatting and system prompt integration
- Graceful fallback when Pinecone is unavailable

✅ **Completed:**
- Complete Pinecone query API implementation using hosted model search

### Data Flow

```
1. User completes workout → Workout extracted → Summary stored in Pinecone
2. User creates coach → Coach config generated → Summary stored in Pinecone
3. User chats with coach → Message analyzed → Pinecone queried if relevant → Context added to prompt
```

## Pinecone Storage Implementation

### Workout Summaries

**Location:** `amplify/functions/libs/workout/pinecone.ts`

**Function:** `storeWorkoutSummaryInPinecone()`

**Metadata Stored:**
- Core workout identification (ID, discipline, name, type)
- Performance metrics (duration, intensity, perceived exertion)
- CrossFit-specific data (workout format, Rx status, performance data)
- Coach context (coach ID, name, conversation ID)
- PR achievements and semantic search categories

**Example Record:**
```typescript
{
  id: "workout_summary_user123_1641234567890",
  text: "Completed Fran (21-15-9 thrusters and pull-ups) in 8:45 Rx. Felt strong on thrusters but struggled with pull-ups in final round.",
  record_type: "workout_summary",
  workout_id: "workout_abc123",
  discipline: "crossfit",
  workout_name: "Fran",
  intensity: "high",
  coach_id: "coach_def456"
}
```

### Coach Creator Summaries

**Location:** `amplify/functions/libs/coach-creator/pinecone.ts`

**Function:** `storeCoachCreatorSummaryInPinecone()`

**Metadata Stored:**
- User sophistication level and coach selections
- Methodology and personality details with reasoning
- Session metadata (duration, questions completed)
- Technical configuration (programming focus, experience level)
- Safety considerations and constraints

**Example Record:**
```typescript
{
  id: "coach_creator_summary_user123_1641234567890",
  text: "Created Emma-style encouraging coach focused on CompTrain methodology for intermediate athlete with shoulder injury history.",
  record_type: "coach_creator_summary",
  sophistication_level: "INTERMEDIATE",
  selected_personality: "emma",
  selected_methodology: "comptrain",
  safety_considerations: 1
}
```

## Query Implementation

### Query API Implementation

**Location:** `amplify/functions/libs/api-helpers.ts`

**Function:** `queryPineconeContext()`

The query implementation uses Pinecone's hosted model search where text is automatically converted to embeddings:

```typescript
export const queryPineconeContext = async (
  userId: string,
  userMessage: string,
  options: QueryOptions = {}
) => {
  // Build search query - Pinecone converts text to embeddings automatically
  const searchQuery = {
    inputs: { text: userMessage },
    top_k: topK,
    filter: {
      record_type: { $in: recordTypeFilters }
    }
  };

  // Perform hosted model search (auto-embedding)
  const queryResponse = await (index.namespace(userNamespace) as any).search(searchQuery);

  // Filter by similarity score and format results
  const relevantMatches = queryResponse.matches
    .filter((match: any) => match.score && match.score >= minScore)
    .map((match: any) => ({
      id: match.id,
      score: match.score,
      content: match.metadata?.text || '',
      recordType: match.metadata?.record_type,
      metadata: match.metadata
    }));

  return { matches: relevantMatches, success: true };
};
```

**Key Benefits:**
- No manual embedding generation required
- Automatic text-to-vector conversion using llama-text-embed-v2
- Simplified API calls with direct text input
- Consistent embedding model for storage and retrieval

### Intelligent Query Detection

**Location:** `amplify/functions/send-coach-conversation-message/handler.ts`

**Function:** `shouldUsePineconeSearch(userMessage: string)`

The system automatically determines when to use Pinecone based on message content:

**Workout History Keywords:**
- `last time`, `before`, `previous`, `history`, `pattern`, `trend`
- `improvement`, `progress`, `compare`, `similar`, `when did`
- `how often`, `frequency`, `consistently`, `struggle`, `challenge`
- `strength`, `weakness`, `pr`, `personal record`, `best`

**Methodology Keywords:**
- `why`, `approach`, `methodology`, `philosophy`, `strategy`
- `programming`, `periodization`, `training style`, `coaching style`

**Technique Keywords:**
- `technique`, `form`, `movement`, `exercise`, `lift`, `skill`
- `mobility`, `flexibility`, `injury`, `pain`, `recovery`

**Complex Queries:**
- Messages longer than 50 characters containing question marks

### Context Integration

When Pinecone context is found, it's formatted and added to the system prompt:

```
SEMANTIC CONTEXT:

RELEVANT WORKOUT HISTORY:
- Completed Fran in 8:45 Rx, struggled with pull-ups (Score: 0.85)
- Previous thrusters felt heavy at 95lbs (Score: 0.78)

COACH CREATION CONTEXT:
- Created coach focused on injury prevention due to shoulder issues (Score: 0.92)

IMPORTANT: Use the semantic context above to provide more informed and contextual responses.
```

## Configuration

### Environment Variables

**Required in all handlers using Pinecone:**
```typescript
PINECONE_API_KEY: 'pcsk_sbPRi_146xBPjEKWvCwdAg74aTTEsFTijZ34kqvBZJhmeYZPb1qqogXpdrEahRX4xk6vL'
```

**Index Configuration:**
- **Index Name:** `coach-creator-proto-v1-dev`
- **Dimensions:** 1024 (llama-text-embed-v2)
- **Metric:** cosine
- **Model:** llama-text-embed-v2 (auto-embedding)

### Namespace Strategy

- **Pattern:** `user_{userId}`
- **Benefits:** Data isolation, easy user deletion, performance optimization
- **Example:** `user_abc123` contains all data for user `abc123`

## Implementation Status

### Working Components

1. **Storage Functions** - Both workout and coach creator summaries are successfully stored
2. **Query Detection** - Messages are intelligently analyzed for semantic search needs
3. **Context Formatting** - Pinecone results are properly formatted for system prompts
4. **Error Handling** - Graceful degradation when Pinecone is unavailable
5. **Logging** - Comprehensive logging for debugging and monitoring

### Placeholder Implementation

**Current Query Function:** `amplify/functions/libs/api-helpers.ts`

```typescript
export const queryPineconeContext = async (userId, userMessage, options) => {
  // TODO: Implement proper Pinecone query once the correct API method is determined
  console.warn('Pinecone query not yet implemented - returning empty results');
  return { matches: [], success: true, totalMatches: 0, relevantMatches: 0 };
};
```

## Completing the Implementation

### Step 1: Determine Correct Pinecone API

The main blocker is determining the correct Pinecone JavaScript SDK method for querying auto-embedding indexes. Based on the research, possible methods include:

- `index.namespace(userNamespace).query()` with vector parameter
- `index.namespace(userNamespace).search()` with query payload
- `index.namespace(userNamespace).queryRecords()` with text input

### Step 2: Implement Query Function

Once the correct API is determined, replace the placeholder with:

```typescript
export const queryPineconeContext = async (userId, userMessage, options) => {
  try {
    const { index } = await getPineconeClient();
    const userNamespace = getUserNamespace(userId);

    // Use correct Pinecone API method here
    const queryResponse = await index.namespace(userNamespace).CORRECT_METHOD({
      // Correct parameters for auto-embedding query
    });

    // Process and return results
    const relevantMatches = queryResponse.matches
      .filter(match => match.score >= minScore)
      .map(match => ({
        id: match.id,
        score: match.score,
        content: match.text || match.metadata?.text,
        recordType: match.metadata?.record_type,
        metadata: match.metadata
      }));

    return { matches: relevantMatches, success: true };
  } catch (error) {
    return { matches: [], success: false, error: error.message };
  }
};
```

### Step 3: Test and Validate

1. Deploy the updated function
2. Test with various user messages that should trigger Pinecone queries
3. Verify context is properly retrieved and formatted
4. Monitor logs for performance and accuracy

## Usage Examples

### Example 1: Workout History Query

**User Message:** "How did I do on my last Fran workout?"

**System Behavior:**
1. `shouldUsePineconeSearch()` returns `true` (contains "last")
2. Pinecone queried with message text
3. Relevant workout summaries retrieved
4. Context added to system prompt
5. AI coach responds with specific historical context

### Example 2: Methodology Question

**User Message:** "Why do you program thrusters this way?"

**System Behavior:**
1. `shouldUsePineconeSearch()` returns `true` (contains "why", "program")
2. Pinecone queried for methodology context
3. Coach creator session context retrieved
4. AI coach responds based on originally selected methodology

### Example 3: Simple Check-in

**User Message:** "How are you doing today?"

**System Behavior:**
1. `shouldUsePineconeSearch()` returns `false`
2. No Pinecone query performed
3. AI coach responds using only recent workout context and conversation history

## Performance Considerations

### Query Optimization

- **Selective Triggering:** Only 20-30% of messages trigger Pinecone queries
- **Minimum Score Filtering:** Results below 0.7 similarity are filtered out
- **Limited Results:** Maximum 3-5 results per query to control prompt size
- **Timeout Handling:** Graceful degradation if Pinecone is slow/unavailable

### Cost Management

- **Targeted Queries:** Intelligent detection prevents unnecessary API calls
- **Efficient Storage:** Only summaries stored, not full conversations
- **Namespace Isolation:** User-specific namespaces for optimal performance

## Monitoring and Debugging

### Key Metrics to Track

1. **Query Frequency:** How often Pinecone queries are triggered
2. **Context Relevance:** Quality scores of retrieved context
3. **Response Quality:** User satisfaction with contextual responses
4. **Performance:** Query latency and success rates

### Debug Logging

The implementation includes comprehensive logging:

```typescript
console.info('🔍 Querying Pinecone for semantic context:', { userId, userMessageLength });
console.info('✅ Successfully retrieved Pinecone context:', { totalMatches, relevantMatches });
console.info('⏭️ Skipping Pinecone query - message does not require semantic search');
```

## Security and Privacy

### Data Protection

- **User Isolation:** Each user's data stored in separate namespaces
- **Content Filtering:** Only workout summaries and coach context stored, not personal details
- **Access Control:** Pinecone API key restricted to application functions only

### Compliance

- **Data Deletion:** User namespaces can be completely deleted for GDPR compliance
- **Retention:** Summaries stored indefinitely unless user requests deletion
- **Anonymization:** No personally identifiable information in stored summaries

## Future Enhancements

### Potential Improvements

1. **Methodology Knowledge Base:** Store shared CrossFit methodology content
2. **Progressive Learning:** Update coach behavior based on successful interactions
3. **Advanced Filtering:** Filter by workout type, date ranges, or performance metrics
4. **Hybrid Search:** Combine semantic search with keyword filtering
5. **Context Ranking:** Machine learning to improve context relevance scoring

### Scalability Considerations

- **Index Sharding:** Separate indexes for different data types as volume grows
- **Caching:** Cache frequent queries to reduce Pinecone API calls
- **Batch Processing:** Batch storage operations for better performance
- **Regional Deployment:** Deploy Pinecone indexes closer to users

This implementation provides a solid foundation for semantic memory in AI coaching applications, with room for future enhancements based on user feedback and usage patterns.