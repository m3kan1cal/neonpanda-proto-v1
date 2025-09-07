# NeonPanda Database Schema - Where Smart Storage Meets Great Coaching

## Design Philosophy

### Core Principles
- **Conversation-First**: Schema built around natural conversations, not boring forms
- **Smart Storage Strategy**: DynamoDB for lightning-fast queries + S3 for cost-effective content storage
- **Single-Table Simplicity**: All data in one DynamoDB table, organized intelligently
- **Natural Language Focus**: Workouts and feedback captured through conversation, then AI extracts the structured data
- **Evolving Coaches**: Schema supports AI coaches that learn and get better over time

### Why We Store Things Where We Do

**DynamoDB Handles**:
- Lightning-fast queries for your app experience
- Structured data you access frequently
- Small, important data that needs to be instantly available
- Relationships and indexes for smart queries

**S3 Handles**:
- Full conversation transcripts and detailed workout logs
- Cost-effective storage for content you don't access daily
- Unlimited storage for your growing coaching relationship
- Batch processing for AI insights and improvements

**Why This Hybrid Approach Rocks**:
- **Speed**: Sub-second response times for everything you see
- **Cost Smart**: ~90% cheaper storage costs vs. putting everything in DynamoDB
- **Unlimited Growth**: Your conversations and workouts can grow forever
- **Smart Analytics**: Easy processing of your data for coaching insights

---

## Entity Schema Definitions

### User Profile
```json
{
  "pk": "user#${userId}",
  "sk": "profile",
  "entityType": "user",
  "gsi1pk": "email#${email}",
  "gsi1sk": "profile",
  "gsi2pk": "username#${username}",
  "gsi2sk": "profile",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "userId": "string",
    "email": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "displayName": "string",
    "nickname": "string",
    "avatar": {
      "url": "string",
      "s3Key": "string"
    },
    "preferences": {},
    "subscription": {},
    "demographics": {},
    "fitness": {},
    "metadata": {}
  }
}
```

**Key Details**:
- Primary user identity and profile information
- Username for public identification and @mentions
- Nickname for casual/friendly interactions with coaches
- Display name for UI presentation (defaults to firstName + lastName)
- Comprehensive preferences for personalization
- Subscription and billing integration

---

### Contact Form
```json
{
  "pk": "contactForm#${email}",
  "sk": "timestamp#${timestamp}",
  "entityType": "contactForm",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "subject": "string",
    "message": "string",
    "contactType": "string"
  }
}
```

**Key Details**:
- Groups your submissions by email address for duplicate detection
- Chronological ordering via timestamp sort key
- Simple form data storage for lead generation and support

---

### Coach Conversation
```json
{
  "pk": "user#${userId}",
  "sk": "coachConversation#${coachId}#${conversationId}",
  "entityType": "coachConversation",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "userId": "string",
    "coachId": "string",
    "conversationId": "string",
    "title": "string",
    "messages": [
      {
        "id": "string",
        "role": "user|assistant",
        "content": "string",
        "timestamp": "Date",
        "metadata": {
          "workoutDetected": "boolean",
          "extractionConfidence": "number"
        }
      }
    ],
    "metadata": {
      "createdAt": "Date",
      "lastActivity": "Date",
      "totalMessages": "number",
      "tags": ["array"],
      "isActive": "boolean"
    },
    "athleteProfile": {
      "summary": "string",        // AI-generated natural language profile of you as an athlete
      "lastUpdated": "Date",      // When your profile was last generated
      "version": "number",        // For tracking your profile evolution
      "confidence": "number",     // AI confidence in your profile accuracy (0-1)
      "sources": ["array"]        // Data sources used (e.g., "workouts", "conversations", "memories")
    }
  }
}
```

**Key Details**:
- Your full conversation stored in DynamoDB attributes (messages array)
- Coach-specific conversation organization
- Message-level metadata for workout detection and extraction tracking
- Active/inactive status for conversation management

---

### Coach Conversation Summary
```json
{
  "pk": "user#${userId}",
  "sk": "conversation#${conversationId}#summary",
  "entityType": "conversationSummary",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "summaryId": "string",
    "userId": "string",
    "coachId": "string",
    "conversationId": "string",
    "summaryText": "string",
    "structuredData": {
      "narrative_summary": "string",
      "key_facts": {
      "current_goals": ["array"],        // Your current fitness goals
      "recent_progress": ["array"],      // Your recent achievements and progress
      "preferences": ["array"],          // Your training preferences
      "constraints": ["array"],          // Your limitations and considerations
      "schedule_context": ["array"]      // Your schedule and availability context
      },
      "emotional_state": "string",
      "action_items": ["array"],
      "last_updated": "Date"
    },
    "metadata": {
      "createdAt": "Date",
      "confidence": "number",
      "triggerReason": "string",
      "messageRange": {
        "startMessageId": "string",
        "endMessageId": "string",
        "totalMessages": "number"
      }
    }
  }
}
```

**Key Details**:
- AI-generated summaries of your conversation content
- Structured data extraction for coach optimization
- Message range tracking for summary context
- Confidence scoring for summary quality

---

### Coach Configuration
```json
{
  "pk": "user#${userId}",
  "sk": "coach#${coachId}",
  "entityType": "coachConfig",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "coach_id": "string",
    "coach_name": "string",
    "selected_personality": {
      "primary_template": "string",
      "selection_reasoning": "string"
    },
    "selected_methodology": {
      "primary_methodology": "string"
    },
    "technical_config": {
      "programming_focus": ["array"],
      "specializations": ["array"],
      "methodology": "string",
      "experience_level": "string",
      "goal_timeline": "string",
      "preferred_intensity": "string",
      "equipment_available": ["array"]
    },
    "metadata": {
      "created_date": "Date",
      "total_conversations": "number"
    }
  }
}
```

**Key Details**:
- Your coach-specific configuration for AI personality and methodology
- Technical configuration for your programming focus and specializations
- Metadata tracking for your coach usage and effectiveness
- Personality and methodology selection with reasoning

---

### Workout Session
```json
{
  "pk": "user#${userId}",
  "sk": "workout#${workoutId}",
  "entityType": "workout",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "workoutId": "string",
    "userId": "string",
    "coachIds": ["array"],
    "coachNames": ["array"],
    "conversationId": "string",
    "completedAt": "Date",
    "workoutData": {
      // Universal Workout Schema - See UNIVERSAL_WORKOUT_SCHEMA.md for complete structure of your workouts
      "workout_name": "string",
      "discipline": "string",
      "workout_type": "string",
      "duration": "number",
      "location": "string",
      "performance_metrics": {
        "intensity": "number",
        "perceived_exertion": "number",
        "heart_rate": {
          "avg": "number",
          "max": "number",
          "zones": {
            "zone_1": "number",
            "zone_2": "number",
            "zone_3": "number",
            "zone_4": "number",
            "zone_5": "number"
          }
        },
        "calories_burned": "number",
        "mood_pre": "number",
        "mood_post": "number",
        "energy_level_pre": "number",
        "energy_level_post": "number"
      },
      "discipline_specific": {
        // Your discipline-specific workout data structure
        // See UNIVERSAL_WORKOUT_SCHEMA.md for complete discipline schemas
      },
      "pr_achievements": ["array"],
      "subjective_feedback": {
        "enjoyment": "number",
        "difficulty": "number",
        "form_quality": "number",
        "motivation": "number",
        "confidence": "number",
        "mental_state": "string",
        "pacing_strategy": "string",
        "nutrition_pre_workout": "string",
        "hydration_level": "string",
        "sleep_quality_previous": "number",
        "stress_level": "number",
        "soreness_pre": {
          "overall": "number",
          "legs": "number",
          "arms": "number",
          "back": "number"
        },
        "soreness_post": {
          "overall": "number",
          "legs": "number",
          "arms": "number",
          "back": "number"
        },
        "notes": "string"
      },
      "coach_notes": {
        "programming_intent": "string",           // Why your coach programmed this workout
        "coaching_cues_given": ["array"],         // Cues your coach gave you during the workout
        "areas_for_improvement": ["array"],       // Areas your coach wants you to focus on
        "positive_observations": ["array"],       // Things your coach noticed you doing well
        "next_session_focus": "string",           // What your coach wants to work on next
        "adaptation_recommendations": ["array"],   // How your coach thinks the program should adapt
        "safety_flags": ["array"],                // Any safety concerns your coach noted
        "motivation_strategy": "string"           // How your coach plans to keep you motivated
      }
    },
    "extractionMetadata": {
      "confidence": "number",
      "extractedAt": "Date",
      "reviewedBy": "string",
      "reviewedAt": "Date"
    },
    "summary": "string"
  }
}
```

**Key Details**:
- Your full workout data stored using Universal Workout Schema (see UNIVERSAL_WORKOUT_SCHEMA.md)
- AI extraction metadata for quality tracking
- Your coach integration for programming and feedback
- Comprehensive performance and subjective metrics about your training

---

### Coach Creator Session
```json
{
  "pk": "user#${userId}",
  "sk": "coachCreatorSession#${sessionId}",
  "entityType": "coachCreatorSession",
  "createdAt": "2025-06-22T15:30:00Z",
  "updatedAt": "2025-06-22T15:30:00Z",
  "ttl": 1703209200,
  "attributes": {
    "sessionId": "coach_creator_user123_1703123456789",
    "userId": "user123",
    "sophisticationLevel": "BEGINNER|INTERMEDIATE|ADVANCED|UNKNOWN",
    "currentQuestion": 4,
    "totalQuestions": 18,
    "questionsAnswered": 3,
    "responses": {
      "1": "I want to improve my Olympic lifts and get stronger overall",
      "2": "I've been doing CrossFit for about 2 years",
      "3": "I can train 4 days per week consistently"
    },
    "detectedSignals": ["olympic lifts", "crossfit", "2 years"],
    "s3Bucket": "coach-ai-conversations",
    "s3Key": "users/${user_id}/coach_creator_sessions/${session_id}.json",
    "questionHistoryCount": 3,
    "lastQuestionTopic": "training_frequency",
    "nextQuestionTopic": "injury_limitations",
    "isComplete": false,
    "startedAt": "2025-06-22T10:30:00Z",
    "lastActivity": "2025-06-22T10:45:00Z",
    "completedAt": null,
    "estimatedDuration": 15,
    "sessionProgress": 0.17,
    "generatedCoachId": null,
    "creationType": "initial|modification|recreation",
    "sessionVersion": "1.0",
    "abandonedAt": null,
    "resumeCount": 0
  }
}
```

**Key Details**:
- Groups all your coach creator session data under your partition key
- Session ID provides unique identification within your coach creator sessions
- Core session metadata stored in DynamoDB for fast queries
- Your full conversation history and detailed responses stored in S3 for cost efficiency
- Progress tracking enables session resumption and analytics
- Sophistication detection history supports adaptive questioning improvements
- TTL for automatic cleanup (7 days for incomplete, 30 days for complete sessions)

---

### User Memory
```json
{
  "pk": "user#${userId}",
  "sk": "userMemory#${memoryId}",
  "entityType": "userMemory",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "attributes": {
    "memoryId": "user_memory_1703123456789_abc123def",
    "userId": "user123",
    "coachId": "coach456",
    "content": "I prefer morning workouts and like compound movements",
    "memoryType": "preference",
    "metadata": {
      "createdAt": "2025-01-15T10:30:00Z",
      "lastUsed": "2025-01-12T14:20:00Z",
      "usageCount": 3,
      "source": "explicit_request",
      "importance": "high",
      "tags": ["scheduling", "exercise_preference"]
    }
  }
}
```

**Key Details**:
- Stores your requested memories for persistent coaching context
- AI-driven detection using Bedrock Nova Micro for memory request classification
- Memory types: preference, goal, constraint, instruction, context
- Coach-specific or global memories (optional coachId)
- Usage tracking for prioritization and analytics
- Natural language interface: you say "remember that I..."
- Integrated into your coach conversation prompts for personalized responses
- Conservative 70% confidence threshold prevents false positives

---

## S3 File Organization Strategy - How We Organize Your Data

```
neonpanda-athlete-data/
├── athletes/
│   └── ${athlete_id}/
│       ├── conversations/
│       │   ├── ${conversation_id}.json          // Your conversation transcripts
│       │   └── ${conversation_id}_metadata.json // Conversation metadata
│       ├── workouts/
│       │   └── ${workout_date}/
│       │       └── ${session_id}.json          // Your detailed workout logs
│       ├── coach_creator_sessions/
│       │   └── ${session_id}.json              // Your coach creation journey
│       └── exports/
│           └── ${export_date}_full_history.json // Your complete data exports
├── coaches/
│   └── ${coach_id}/
│       ├── performance_reports/
│       │   └── ${period}_analytics.json        // Coach performance analytics
│       └── training_data/
│           └── ${date}_conversation_patterns.json // Coaching pattern analysis
└── platform/
    ├── methodology_content/
    │   ├── comptrain/                          // CompTrain methodology content
    │   ├── mayhem/                             // Mayhem methodology content
    │   └── prvn/                               // PRVN methodology content
    └── training_data/
        ├── successful_adaptations.json         // What works across the Panda Pack
        └── athlete_pattern_analysis.json       // Anonymous pattern insights
```

### Your Coach Creator Session S3 File Content Example
```json
{
  "sessionMetadata": {
    "sessionId": "coach_creator_user123_1703123456789",
    "userId": "user123",
    "startedAt": "2025-06-22T10:30:00Z",
    "completedAt": "2025-06-22T11:15:00Z",
    "totalDuration": 2700,
    "finalSophisticationLevel": "INTERMEDIATE"
  },
  "questionHistory": [
    {
      "questionId": 1,
      "topic": "goal_discovery",
      "questionText": "What brings you here? Tell me about your main fitness goals.",
      "userResponse": "I want to improve my Olympic lifts and get stronger overall",
      "aiResponse": "That's a great goal! Olympic lifting requires both technical skill and strength. Since you mentioned Olympic lifts specifically, it sounds like you have some experience with CrossFit or weightlifting. How long have you been training?",
      "detectedSophistication": "INTERMEDIATE",
      "sophisticationSignals": ["olympic lifts", "specific movements"],
      "timestamp": "2025-06-22T10:32:00Z",
      "responseTime": 45,
      "characterCount": 67
    },
    {
      "questionId": 2,
      "topic": "experience_assessment",
      "questionText": "What's your CrossFit experience? How long have you been training?",
      "userResponse": "I've been doing CrossFit for about 2 years, pretty consistently",
      "aiResponse": "Two years of consistent CrossFit gives you a solid foundation! You've likely developed good movement patterns and understand the basics. What specific areas do you feel strongest in, and where do you think you need the most work?",
      "detectedSophistication": "INTERMEDIATE",
      "sophisticationSignals": ["2 years", "crossfit", "consistently"],
      "timestamp": "2025-06-22T10:35:00Z",
      "responseTime": 32,
      "characterCount": 56
    }
  ],
  "allResponses": {
    "1": "I want to improve my Olympic lifts and get stronger overall",
    "2": "I've been doing CrossFit for about 2 years, pretty consistently",
    "3": "I can train 4 days per week consistently",
    "4": "I had some shoulder issues last year but they're mostly better now",
    "5": "I train at a well-equipped CrossFit gym with all the standard equipment"
  },
  "sophisticationEvolution": [
    {
      "questionId": 1,
      "detectedLevel": "INTERMEDIATE",
      "confidence": 0.75,
      "signals": ["olympic lifts"]
    },
    {
      "questionId": 2,
      "detectedLevel": "INTERMEDIATE",
      "confidence": 0.85,
      "signals": ["2 years", "crossfit", "consistently"]
    }
  ],
  "finalGeneratedCoach": {
    "coachId": "user123_coach_main",
    "personalityTemplate": "marcus",
    "methodologyTemplate": "comptrain_strength",
    "generationTimestamp": "2025-06-22T11:15:00Z"
  }
}
```

**File Structure Benefits**:
- **Your Data Isolation**: Easy data export and privacy compliance
- **Coach Analytics**: Performance tracking and improvement insights
- **Platform Intelligence**: Cross-athlete learning and methodology optimization
- **Backup Strategy**: Hierarchical organization for efficient backup/restore

---

## Query Patterns & Access Patterns - How We Find Your Data Fast

### Primary Query Patterns

**Your Profile Management**:
```javascript
// Get your profile
Query: pk="user#${userId}" AND sk="profile"

// Get your profile by email (requires GSI or scan - see below)
GSI Query: gsi1pk="email#${email}" AND gsi1sk="profile"

// Get your profile by username (requires GSI)
GSI Query: gsi2pk="username#${username}" AND gsi2sk="profile"

// Update your profile
UpdateItem: pk="user#${userId}" AND sk="profile"
UpdateExpression: SET attributes.preferences.timezone = :tz, updatedAt = :now
```

**Your Coach Conversation Management**:
```javascript
// Get your specific conversation
Query: pk="user#${userId}" AND sk="coachConversation#${coachId}#${conversationId}"

// Get all your conversations with a specific coach (summaries only)
Query: pk="user#${userId}" AND sk begins_with "coachConversation#${coachId}#"
FilterExpression: entityType = "coachConversation"

// Get all your conversations with full messages
Query: pk="user#${userId}" AND sk begins_with "coachConversation#${coachId}#"
FilterExpression: entityType = "coachConversation"
```

**Your Coach Configuration**:
```javascript
// Get your specific coach config
Query: pk="user#${userId}" AND sk="coach#${coachId}"

// Get all your coach configs
Query: pk="user#${userId}" AND sk begins_with "coach#"
FilterExpression: entityType = "coachConfig"
```

**Your Workout History**:
```javascript
// Get your specific workout
Query: pk="user#${userId}" AND sk="workout#${workoutId}"

// Get all your workouts
Query: pk="user#${userId}" AND sk begins_with "workout#"
FilterExpression: entityType = "workout"

// Get your workouts with filtering and pagination
Query: pk="user#${userId}" AND sk begins_with "workout#"
FilterExpression: entityType = "workout"
// Additional filtering by date, discipline, coach, confidence
// Sorting by completedAt, confidence, workoutName
// Pagination with limit and offset
```

**Your Coach Creator Sessions**:
```javascript
// Get your specific session
Query: pk="user#${userId}" AND sk="coachCreatorSession#${sessionId}"

// Get your recent coach creator sessions
Query: pk="user#${userId}" AND sk begins_with "coachCreatorSession"
OrderBy: sk DESC
Limit: 10

// Get your incomplete sessions (for cleanup/analytics)
Query: pk="user#${userId}" AND sk begins_with "coachCreatorSession"
FilterExpression: isComplete = false

// Get your sessions by completion status
Query: pk="user#${userId}" AND sk begins_with "coachCreatorSession"
FilterExpression: isComplete = true

// Get your sessions by sophistication level
Query: pk="user#${userId}" AND sk begins_with "coachCreatorSession"
FilterExpression: sophisticationLevel = "INTERMEDIATE"

// Get your abandoned sessions
Query: pk="user#${userId}" AND sk begins_with "coachCreatorSession"
FilterExpression: abandonedAt <> null
```

**Conversation Summaries**:
```javascript
// Get specific conversation summary
Query: pk="user#${userId}" AND sk="conversation#${conversationId}#summary"

// Get all conversation summaries for user
Query: pk="user#${userId}" AND sk begins_with "conversation#"
FilterExpression: entityType = "conversationSummary"

// Get summaries by coach
Query: pk="user#${userId}" AND sk begins_with "conversation#"
FilterExpression: entityType = "conversationSummary" AND coachId = "${coachId}"
```

**User Memories**:
```javascript
// Get specific user memory
Query: pk="user#${userId}" AND sk="userMemory#${memoryId}"

// Get all memories for user
Query: pk="user#${userId}" AND sk begins_with "userMemory#"
FilterExpression: entityType = "userMemory"

// Get memories by coach (includes global memories)
Query: pk="user#${userId}" AND sk begins_with "userMemory#"
FilterExpression: entityType = "userMemory" AND (coachId = "${coachId}" OR attribute_not_exists(coachId))

// Get memories by type and importance
Query: pk="user#${userId}" AND sk begins_with "userMemory#"
FilterExpression: entityType = "userMemory" AND memoryType = "preference" AND importance = "high"

// Get memories with usage statistics (sorted by importance, usage, date)
Query: pk="user#${userId}" AND sk begins_with "userMemory#"
FilterExpression: entityType = "userMemory"
// Post-processing sorting: importance (high>medium>low), usageCount (desc), createdAt (desc)
```

### Global Secondary Indexes (GSI)

**GSI-1: Email Lookup Index**
- **Partition Key**: gsi1pk (format: `email#${email}`)
- **Sort Key**: gsi1sk (format: `profile`)
- **Use Cases**: User lookup by email address, authentication flows, password reset

**GSI-2: Username Lookup Index**
- **Partition Key**: gsi2pk (format: `username#${username}`)
- **Sort Key**: gsi2sk (format: `profile`)
- **Use Cases**: User lookup by username, public profile access, @mentions

**GSI-3: EntityType Index**
- **Partition Key**: entityType
- **Sort Key**: pk
- **Use Cases**: Query all records of specific type across users, admin queries, analytics

### Index Configuration

All GSIs are configured with:
- **Projection Type**: ALL (all attributes projected)
- **Read Capacity**: 5 (with auto-scaling up to 100)
- **Write Capacity**: 5 (with auto-scaling up to 50)
- **Auto-scaling**: Target 70% utilization

---

## Coach Creator Session Hybrid Storage Benefits

### DynamoDB Advantages
- **Fast Metadata Queries**: Session progress, completion status, user sophistication
- **Session Management**: Resume detection, progress tracking, analytics
- **Cost Effective**: Only stores essential data for UI and business logic

### S3 Advantages
- **Full Conversation Storage**: Complete question/answer history for analysis
- **Cost Optimization**: ~90% storage cost reduction vs. pure DynamoDB
- **Unlimited Size**: No limits on conversation length or response detail
- **Analytics Ready**: Easy batch processing for AI training and insights

### Implementation Strategy
- **UI Operations**: Query DynamoDB for session list, progress, status
- **Session Resumption**: Load metadata from DynamoDB, full history from S3 if needed
- **Coach Generation**: Access complete responses from S3 for comprehensive analysis
- **Analytics**: Process S3 files in batch for user behavior insights and model improvements

---

## Implementation Recommendations

### 1. Data Lifecycle Management
- **TTL Strategy**: Archive conversations older than 2 years to Glacier
- **Hot/Cold Storage**: Recent data in DynamoDB, historical in S3
- **Backup Schedule**: Daily incremental, weekly full backup

### 2. Performance Optimizations
- **Caching Layer**: Redis for frequently accessed coach configs and user profiles
- **Batch Operations**: Use BatchGetItem and BatchWriteItem for multi-item operations
- **Parallel Processing**: Concurrent DynamoDB queries and S3 operations
- **Connection Pooling**: Reuse database connections across Lambda invocations

### 3. Cost Optimization
- **On-Demand vs Provisioned**: Start with on-demand, migrate to provisioned at scale
- **S3 Intelligent Tiering**: Automatic cost optimization for varying access patterns
- **DynamoDB Auto Scaling**: Automatic capacity adjustment based on demand
- **Compression**: Gzip compression for S3 conversation storage

### 4. Security & Privacy
- **Encryption**: Server-side encryption for all S3 objects
- **Access Control**: IAM roles with least privilege principle
- **Data Retention**: Automatic deletion based on user preferences and legal requirements
- **Audit Logging**: CloudTrail for all database operations

### 5. Data Validation
- **Schema Validation**: JSON Schema validation before writes
- **Data Consistency**: Eventual consistency handling in application logic
- **Error Handling**: Graceful degradation when S3 content unavailable
- **Data Integrity**: Checksums for S3 objects, referential integrity checks

### 6. Your Coach Creator Session TTL and Cleanup Strategy

#### DynamoDB TTL
```json
{
  "ttl": 1703209200
}
```
- **7-day TTL** for your incomplete sessions
- **30-day TTL** for your completed sessions (for your reference)
- **Automatic cleanup** prevents storage bloat

#### S3 Lifecycle Management
- **Standard storage** for first 30 days
- **Infrequent Access** after 30 days
- **Archive to Glacier** after 90 days
- **Delete** after 2 years (compliance permitting)

---

## Migration Strategy - Rolling Out Your Data Architecture

### Phase 1: Core Tables (Week 1)
- Athlete profiles and preferences
- Basic coach configurations
- Simple conversation logging

### Phase 2: Advanced Features (Week 2-3)
- S3 integration for conversation storage
- Sophisticated coach configurations
- Workout history with AI extraction

### Phase 3: Analytics & Optimization (Week 4+)
- Coach performance tracking
- Cross-athlete pattern analysis
- Advanced query optimization

This schema design provides a robust foundation for NeonPanda's AI-first fitness coaching platform while maintaining performance, cost-effectiveness, and scalability for future growth of the Panda Pack.
