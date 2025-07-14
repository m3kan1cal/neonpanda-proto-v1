# Custom Fitness AI Agents Platform - Database Schema Design

## Design Philosophy

### Core Principles
- **AI-First Architecture**: Schema designed around conversational interactions rather than traditional form-based data entry
- **Hybrid Storage Strategy**: DynamoDB for fast metadata queries + S3 for large content storage
- **Single-Table Design**: All entity types in one DynamoDB table, differentiated by entityType and structured keys
- **Conversation-Centric**: Workouts, feedback, and interactions captured through natural language, then AI-extracted into structured data
- **Coach Evolution**: Schema supports sophisticated AI coach configurations that learn and adapt over time

### Storage Strategy Rationale

**DynamoDB Usage**:
- Fast metadata queries for UI rendering
- Structured data requiring consistent access patterns
- Small, frequently accessed data
- Relationship references and indexes

**S3 Usage**:
- Full conversation transcripts and detailed content
- Cost-effective storage for large, infrequently accessed data
- Unlimited size capacity for growing conversations
- Batch processing and AI training data

**Benefits of Hybrid Approach**:
- **Performance**: Sub-second query times for UI operations
- **Cost Optimization**: ~90% storage cost reduction vs. pure DynamoDB
- **Scalability**: No limits on conversation length or workout detail
- **Analytics**: Easy batch processing of S3 content for insights

---

## Entity Schema Definitions

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
- Groups submissions by email address for duplicate detection
- Chronological ordering via timestamp sort key
- Simple form data storage for lead generation and support

---

### User Profile
```json
{
  "pk": "user#${user_id}",
  "sk": "profile",
  "entityType": "userProfile",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "userId": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "dateOfBirth": "1990-01-15",
    "gender": "male|female|other|prefer_not_to_say",
    "fitnessLevel": "beginner|intermediate|advanced",
    "goals": ["strength", "conditioning", "weight_loss", "competition"],
    "preferences": {
      "workoutTypes": ["crossfit", "powerlifting", "gymnastics"],
      "availableTime": 60,
      "equipment": ["barbell", "dumbbells", "pull_up_bar"],
      "trainingDays": ["monday", "tuesday", "thursday", "friday"]
    },
    "subscription": {
      "tier": "free|premium|pro",
      "status": "active|inactive|cancelled",
      "expiresAt": "2025-12-31T23:59:59Z"
    },
    "profilePictureUrl": "string",
    "timezone": "America/New_York",
    "isActive": true
  }
}
```

**Key Details**:
- Single profile per user with comprehensive fitness and preference data
- Subscription management for monetization
- Timezone handling for global users

---

### User Preferences
```json
{
  "pk": "user#${user_id}",
  "sk": "preferences",
  "entityType": "userPreferences",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "notification_settings": {
      "workout_reminders": true,
      "coach_messages": true,
      "progress_updates": true,
      "email_frequency": "daily|weekly|monthly",
      "push_notifications": true
    },
    "privacy_settings": {
      "data_sharing": "none|anonymized|full",
      "public_profile": false,
      "workout_sharing": "private|friends|public"
    },
    "ui_preferences": {
      "theme": "light|dark|auto",
      "language": "en|es|fr",
      "measurement_units": "imperial|metric",
      "default_coach": "coach_id_string"
    }
  }
}
```

**Key Details**:
- Separate entity for user preferences to avoid bloating profile
- Granular notification and privacy controls
- UI customization options

---

### Conversation History
```json
{
  "pk": "user#${user_id}",
  "sk": "conversationHistory#${timestamp}",
  "entityType": "conversationHistory",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "conversationId": "conv_12345",
    "coachId": "coach_67890",
    "s3Bucket": "coach-ai-conversations",
    "s3Key": "users/${user_id}/conversations/${conversation_id}.json",
    "messageCount": 12,
    "lastMessage": "Great job on that workout! How are you feeling?",
    "sentiment": "positive|neutral|negative",
    "duration": 15,
    "topics": ["workout_planning", "motivation", "form_feedback"],
    "conversationType": "coaching|check_in|problem_solving|goal_setting",
    "isArchived": false,
    "needsFollowUp": false
  }
}
```

### Conversation Summaries
```json
{
  "pk": "user#${user_id}",
  "sk": "conversation#${conversation_id}#summary",
  "entityType": "conversationSummary",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "conversationId": "conv_12345",
    "summary_data": {
      "narrative_summary": "User has been consistently working on Olympic lifts with focus on technique improvement. Shows strong motivation but tends to rush through warm-ups. Responded well to cue about 'patience in the setup' and achieved PR in clean & jerk. Dealing with some shoulder tightness from desk work.",
      "key_facts": {
        "current_goals": ["Olympic lift technique", "shoulder mobility", "consistency"],
        "recent_progress": ["Clean & jerk PR: 185lb", "Improved front rack position"],
        "preferences": ["Morning workouts", "Detailed technique feedback", "Progressive loading"],
        "constraints": ["Desk job affecting posture", "Limited evening availability"],
        "schedule_context": ["Prefers 6am sessions", "Travels frequently for work"]
      },
      "emotional_state": "Motivated but sometimes impatient, responds well to encouragement and specific technical cues",
      "action_items": ["Daily shoulder mobility routine", "Focus on setup patience", "Track warm-up consistency"],
      "last_updated": "2025-06-20T15:30:00Z",
      "conversation_id": "conv_12345"
    }
  }
}
```

**Key Details**:
- Full conversation stored in S3, metadata in DynamoDB
- AI-extracted topics and sentiment for analytics
- Conversation type classification for coach optimization
- Follow-up flags for coach attention management

---

### Coach Configuration
```json
{
  "pk": "user#${user_id}",
  "sk": "coach#${coach_id}",
  "entityType": "coachConfig",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "coachName": "string",
    "coachType": "fitness|nutrition|mindset|general",
    "technical_config": {
      "methodology": "comptrain_strength|mayhem_conditioning|prvn_hybrid",
      "programming_focus": ["strength", "conditioning", "olympic_lifting"],
      "experience_level": "beginner|intermediate|advanced",
      "training_frequency": 5,
      "specializations": ["powerlifting", "gymnastics", "endurance"],
      "injury_considerations": ["knee_surgery", "shoulder_impingement"],
      "goal_timeline": "3_months|6_months|1_year|ongoing",
      "preferred_intensity": "low|moderate|high",
      "equipment_available": ["barbell", "dumbbells", "rings"],
      "time_constraints": {
        "session_length": 60,
        "available_days": ["monday", "tuesday", "thursday", "friday"]
      }
    },
    "generated_prompts": {
      "personality_prompt": "You communicate with a direct but encouraging style...",
      "motivation_prompt": "When users struggle, you remind them of progress...",
      "methodology_prompt": "Your programming emphasizes progressive overload...",
      "communication_style": "You respond with 2-3 sentences most of the time..."
    },
    "metadata": {
      "version": "1.2",
      "user_satisfaction": 4.2,
      "total_conversations": 127,
      "last_updated": "2025-06-20T15:30:00Z",
      "adaptation_history": [
        {
          "date": "2025-06-15T10:00:00Z",
          "change": "increased_motivation_focus",
          "trigger": "low_engagement_detected",
          "result": "improved_response_rate"
        }
      ]
    },
    "isActive": true,
    "isPrimary": true,
    "customInstructions": "Focus on Olympic lifting technique and competition prep"
  }
}
```

**Key Details**:
- Sophisticated coach configuration matching technical architecture
- Separation of technical config and generated prompts
- Adaptation history tracking for evolutionary learning
- Version control for coach improvements

---

### Workout History
```json
{
  "pk": "user#${user_id}",
  "sk": "workoutHistory#${workout_date}#${session_id}",
  "entityType": "workoutHistory",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "workoutDate": "2025-06-20",
    "conversationId": "conv_12345",
    "s3Bucket": "coach-ai-conversations",
    "s3Key": "users/${user_id}/workouts/${workout_date}/${session_id}.json",
    "extracted_data": {
      "workoutName": "Fran",
      "workoutType": "metcon|strength|skill|endurance",
      "duration": 45,
      "intensity": "low|moderate|high",
      "perceivedExertion": 8,
      "exercises": ["thruster", "pull_up", "burpee"],
      "achievements": ["PR", "first_time_rx", "improved_form"],
      "concerns": ["shoulder_pain", "felt_tired"],
      "environment": "gym|home|outdoor",
      "weather_conditions": "hot|cold|humid|ideal"
    },
    "coachId": "coach_67890",
    "isCompleted": true,
    "needsFollowUp": false,
    "userFeedback": {
      "satisfaction": 4,
      "difficulty": "too_easy|just_right|too_hard",
      "enjoyment": 5,
      "notes": "Felt great today, shoulders are getting stronger"
    }
  }
}
```

**Key Details**:
- Conversational workout logging with AI extraction
- Detailed workout stored in S3, metadata in DynamoDB
- AI-extracted structured data for analytics and programming
- User feedback integration for coach adaptation

---

### Coach Performance Tracking
```json
{
  "pk": "coach#${coach_id}",
  "sk": "performance#${date_period}",
  "entityType": "coachPerformance",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "period": "2025-06-01_2025-06-30",
    "user_count": 15,
    "conversation_count": 342,
    "user_satisfaction_avg": 4.3,
    "user_retention_rate": 0.87,
    "successful_adaptations": 23,
    "workout_completion_rate": 0.92,
    "user_goal_achievement": 0.74,
    "response_time_avg": 1.8,
    "engagement_metrics": {
      "messages_per_session": 8.5,
      "session_duration_avg": 12.3,
      "user_initiated_sessions": 0.65
    },
    "improvement_areas": ["motivation_strategies", "exercise_variety"],
    "top_performing_features": ["workout_planning", "progress_tracking"]
  }
}
```

**Key Details**:
- Cross-user performance analytics for coach optimization
- Identifies successful patterns and improvement opportunities
- Supports platform-wide coach enhancement strategies

---

### Coach Creator Session
```json
{
  "pk": "user#${user_id}",
  "sk": "coachCreatorSession#${session_id}",
  "entityType": "coachCreatorSession",
  "createdAt": "2025-06-22T15:30:00Z",
  "updatedAt": "2025-06-22T15:30:00Z",
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
- Groups all coach creator session data under user partition key
- Session ID provides unique identification within user's coach creator sessions
- Core session metadata stored in DynamoDB for fast queries
- Full conversation history and detailed responses stored in S3 for cost efficiency
- Progress tracking enables session resumption and analytics
- Sophistication detection history supports adaptive questioning improvements

---

## S3 File Organization Strategy

```
coach-ai-conversations/
├── users/
│   └── ${user_id}/
│       ├── conversations/
│       │   ├── ${conversation_id}.json
│       │   └── ${conversation_id}_metadata.json
│       ├── workouts/
│       │   └── ${workout_date}/
│       │       └── ${session_id}.json
│       ├── coach_creator_sessions/
│       │   └── ${session_id}.json
│       └── exports/
│           └── ${export_date}_full_history.json
├── coaches/
│   └── ${coach_id}/
│       ├── performance_reports/
│       │   └── ${period}_analytics.json
│       └── training_data/
│           └── ${date}_conversation_patterns.json
└── platform/
    ├── methodology_content/
    │   ├── comptrain/
    │   ├── mayhem/
    │   └── prvn/
    └── training_data/
        ├── successful_adaptations.json
        └── user_pattern_analysis.json
```

### Coach Creator Session S3 File Content Example
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
- **User Data Isolation**: Easy data export and privacy compliance
- **Coach Analytics**: Performance tracking and improvement insights
- **Platform Intelligence**: Cross-user learning and methodology optimization
- **Backup Strategy**: Hierarchical organization for efficient backup/restore

---

## Query Patterns & Access Patterns

### Primary Query Patterns

**User Profile & Preferences**:
```javascript
// Get user profile
Query: pk="user#${user_id}" AND sk="profile"

// Get user preferences
Query: pk="user#${user_id}" AND sk="preferences"
```

**Conversation Management**:
```javascript
// Recent conversations
Query: pk="user#${user_id}" AND sk begins_with "conversationHistory"
OrderBy: sk DESC
Limit: 20

// Conversations needing follow-up
Query: pk="user#${user_id}" AND sk begins_with "conversationHistory"
FilterExpression: needsFollowUp = true
```

**Coach Operations**:
```javascript
// User's active coaches
Query: pk="user#${user_id}" AND sk begins_with "coach"
FilterExpression: isActive = true

// Primary coach
Query: pk="user#${user_id}" AND sk begins_with "coach"
FilterExpression: isPrimary = true
```

**Workout History**:
```javascript
// Recent workouts
Query: pk="user#${user_id}" AND sk begins_with "workoutHistory"
OrderBy: sk DESC
Limit: 10

// Workouts by date range
Query: pk="user#${user_id}" AND sk between "workoutHistory#2025-06-01" and "workoutHistory#2025-06-30"

// Incomplete workouts
Query: pk="user#${user_id}" AND sk begins_with "workoutHistory"
FilterExpression: isCompleted = false
```

**Coach Creator Sessions**:
```javascript
// Get recent coach creator sessions
Query: pk="user#${user_id}" AND sk begins_with "coachCreatorSession"
OrderBy: sk DESC
Limit: 10

// Get specific session
Query: pk="user#${user_id}" AND sk="coachCreatorSession#${session_id}"

// Get incomplete sessions (for cleanup/analytics)
Query: pk="user#${user_id}" AND sk begins_with "coachCreatorSession"
FilterExpression: isComplete = false

// Sessions by completion status
Query: pk="user#${user_id}" AND sk begins_with "coachCreatorSession"
FilterExpression: isComplete = true

// Sessions by sophistication level
Query: pk="user#${user_id}" AND sk begins_with "coachCreatorSession"
FilterExpression: sophisticationLevel = "INTERMEDIATE"

// Abandoned sessions
Query: pk="user#${user_id}" AND sk begins_with "coachCreatorSession"
FilterExpression: abandonedAt <> null
```

### Global Secondary Indexes (GSI)

**GSI-1: Generic Index**
- **Partition Key**: gsi1pk
- **Sort Key**: gsi1sk
- **Use Cases**: Flexible queries based on application-specific access patterns

**GSI-2: Generic Index**
- **Partition Key**: gsi2pk
- **Sort Key**: gsi2sk
- **Use Cases**: Additional flexible queries for different access patterns

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

### 6. Coach Creator Session TTL and Cleanup Strategy

#### DynamoDB TTL
```json
{
  "ttl": 1703209200
}
```
- **7-day TTL** for incomplete sessions
- **30-day TTL** for completed sessions (for user reference)
- **Automatic cleanup** prevents storage bloat

#### S3 Lifecycle Management
- **Standard storage** for first 30 days
- **Infrequent Access** after 30 days
- **Archive to Glacier** after 90 days
- **Delete** after 2 years (compliance permitting)

---

## Migration Strategy

### Phase 1: Core Tables (Week 1)
- User profiles and preferences
- Basic coach configurations
- Simple conversation logging

### Phase 2: Advanced Features (Week 2-3)
- S3 integration for conversation storage
- Sophisticated coach configurations
- Workout history with AI extraction

### Phase 3: Analytics & Optimization (Week 4+)
- Coach performance tracking
- Cross-user pattern analysis
- Advanced query optimization

This schema design provides a robust foundation for the AI-first fitness coaching platform while maintaining performance, cost-effectiveness, and scalability for future growth.
