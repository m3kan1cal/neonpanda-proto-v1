# Training Programs V1 Implementation Plan

## Overview

Training Programs allows users to create structured, multi-week training programs through conversational sessions with their AI coaches. This transforms the platform from individual workout generation to comprehensive training partnerships with long-term progression and coaching relationships.

## Database Schema

### Core Entities

**Program Creator Sessions:**
```
PK: user#{userId}
SK: programCreatorSession#{sessionId}

GSI1:
PK: coach#{coachId}
SK: user#{userId}#programCreatorSession#{sessionId}

GSI2:
PK: sessionState#{state}
SK: updatedAt#{timestamp}

Attributes: {
  sessionId: string,
  userId: string,
  coachId: string,
  messages: Message[],
  configStatus: {
    goalsSet: boolean,
    structureDefined: boolean,
    movementPreferencesSet: boolean,
    timelineDefined: boolean,
    finalized: boolean
  },
  programInProgress: Partial<Program>,
  sessionState: 'active' | 'completed' | 'abandoned',
  createdAt: Date,
  updatedAt: Date
}
```

**Training Programs:**
```
PK: user#{userId}
SK: program#{programId}

GSI1:
PK: coach#{coachId}
SK: user#{userId}#program#{programId}

GSI2:
PK: programStatus#{status}
SK: updatedAt#{timestamp}

Attributes: {
  programId: string,
  userId: string,
  coachId: string,

  programDefinition: {
    name: string,
    totalDuration: number, // weeks
    currentWeek: number,
    phases: ProgramPhase[],
    goals: {
      primary: string,
      secondary: string[],
      successMetrics: string[]
    }
  },

  methodology: {
    progressionStrategy: string,
    intensityPattern: string,
    volumeDistribution: string,
    deloadStrategy: string,
    adaptationRules: AdaptationRule[]
  },

  workoutHistory: ProgramWorkout[],
  checkIns: ProgramCheckIn[],
  adaptations: ProgramAdaptation[],

  creationSession: {
    sessionId: string,
    createdFromSessionId: string
  },

  status: 'active' | 'completed' | 'paused' | 'modified',
  createdAt: Date,
  updatedAt: Date
}
```

**Supporting Interfaces:**
```typescript
interface ProgramPhase {
  phaseNumber: number,
  name: string, // "Base Building", "Intensification", etc.
  weekRange: [number, number], // [1, 4]
  focus: string,
  intensityRange: [number, number], // [70, 85] (% of 1RM)
  volumeCharacteristics: string
}

interface ProgramWorkout {
  workoutId: string,
  weekNumber: number,
  dayNumber: number,
  programContext: {
    phaseGoals: string[],
    progressionNotes: string,
    previousWorkoutFeedback?: string
  }
}

interface ProgramCheckIn {
  checkInId: string,
  weekNumber: number,
  feedback: string,
  rating: number, // 1-5
  coachResponse?: string,
  adaptationsNeeded: string[],
  timestamp: Date
}
```

## API Endpoints

### Program Creation
```
POST   /users/{userId}/coaches/{coachId}/program-creator-sessions
POST   /users/{userId}/coaches/{coachId}/program-creator-sessions/{sessionId}/send-message
GET    /users/{userId}/coaches/{coachId}/program-creator-sessions
GET    /users/{userId}/coaches/{coachId}/program-creator-sessions/{sessionId}
GET    /users/{userId}/coaches/{coachId}/program-creator-sessions/{sessionId}/config-status
```

### Program Management
```
GET    /users/{userId}/coaches/{coachId}/programs/{programId}
GET    /users/{userId}/coaches/{coachId}/programs
POST   /users/{userId}/coaches/{coachId}/programs/{programId}/check-in
GET    /users/{userId}/coaches/{coachId}/programs/{programId}/context
```

## Implementation Phases

### Phase 1: Program Creation Foundation (Weeks 1-2)

**Backend Development:**
- [ ] DynamoDB table schema implementation with GSIs
- [ ] Program Creator Session entity CRUD operations
- [ ] Training Program entity CRUD operations
- [ ] Program creation session API endpoints
- [ ] Message handling for program creation conversations

**Coach Enhancement:**
- [ ] Enhanced memory retrieval for program creation context
- [ ] Program-specific conversation prompts and flows
- [ ] Goal setting and validation logic
- [ ] Challenge integration with response analysis
- [ ] Program finalization and storage logic
- [ ] **Streaming response implementation** (converseStream vs converse)
- [ ] **Enhanced CoachConversations.jsx** for real-time streaming
- [ ] **Performance improvements** for both regular and program creation conversations

**Key Features:**
- Start program creation conversation with coach
- Send messages back and forth during program design
- Track creation progress via config status
- Store completed programs for future reference

**Acceptance Criteria:**
- [ ] Users can initiate program creation with any coach
- [ ] Conversation flows feel natural and build comprehensive programs
- [ ] Config status accurately tracks creation progress
- [ ] Programs are properly stored and retrievable
- [ ] **Streaming responses start appearing within 1-2 seconds**
- [ ] **Both regular and program creation conversations use streaming**
- [ ] **Response performance improved by 70%+ (perceived latency)**

### Phase 2: Program-Aware Workout Generation (Weeks 3-4)

**Backend Development:**
- [ ] Enhanced workout generation context with program data
- [ ] Program context retrieval for workout generation
- [ ] Program workout history tracking
- [ ] Coach memory integration for program progression

**Workout Generation Enhancement:**
- [ ] Program-aware workout prompt templates
- [ ] Week/phase context integration
- [ ] Previous workout feedback incorporation
- [ ] Progressive overload within program structure

**Key Features:**
- Workouts reference current program week and phase
- Coach discusses program progression during workout creation
- Workouts build logically within program structure
- Workout history linked to program timeline

**Acceptance Criteria:**
- [ ] Generated workouts reference program context appropriately
- [ ] Coach explains how workouts fit program progression
- [ ] Workout difficulty and focus align with program phases
- [ ] Program workout history is properly tracked

### Phase 3: Check-in System (Week 5)

**Backend Development:**
- [ ] Program check-in API endpoint
- [ ] Check-in data storage and retrieval
- [ ] Coach response to check-ins
- [ ] Program adaptation based on feedback

**Check-in Features:**
- [ ] Post-workout feedback collection (rating + notes)
- [ ] Weekly check-in reminders
- [ ] Coach analysis of check-in patterns
- [ ] Program modifications based on user feedback

**Integration Points:**
- [ ] Natural check-ins during workout conversations
- [ ] Email/notification system for check-in reminders
- [ ] Check-in history accessible to coach for context

**Acceptance Criteria:**
- [ ] Users can submit program feedback easily
- [ ] Coaches reference check-in history in conversations
- [ ] Check-in patterns inform program adaptations
- [ ] Regular check-in reminders are sent appropriately

### Phase 4: Program Dashboard (Week 6)

**Frontend Development:**
- [ ] Program overview dashboard component
- [ ] Program progress visualization
- [ ] Program structure display
- [ ] Check-in history interface
- [ ] Active program workout integration

**Dashboard Features:**
- [ ] Current program status and progress
- [ ] Next workout preview with program context
- [ ] Program phase timeline visualization
- [ ] Achievement tracking against program goals
- [ ] Quick access to program check-ins

**Integration with Training Grounds:**
- [ ] Program workouts displayed alongside individual workouts
- [ ] Program context shown in workout cards
- [ ] Easy navigation between program and individual training

**Acceptance Criteria:**
- [ ] Users can see program progress at a glance
- [ ] Program structure and timeline are clear
- [ ] Check-in history is easily accessible
- [ ] Dashboard integrates seamlessly with existing UI

## Technical Implementation Details

### Streaming Response Implementation (Week 1 Priority)

**Current Performance Issues:**
- 5-15 second wait times for coach responses
- Poor user engagement during response generation
- Uses non-streaming `bedrock.converse()` API

**Enhanced Streaming Backend:**
```typescript
// POST /users/{userId}/coaches/{coachId}/conversations/{sessionId}/send-message
// POST /users/{userId}/coaches/{coachId}/program-creator-sessions/{sessionId}/send-message

export async function streamCoachResponse(req: Request, res: Response) {
  const { message, userId, coachId, sessionId } = req.body;

  // Set up streaming response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  try {
    // Get conversation context + memory
    const context = await buildConversationContext(userId, coachId, sessionId);

    // Stream response from Bedrock
    const stream = await bedrock.converseStream({
      modelId: 'claude-3-sonnet',
      messages: context.messages,
      system: context.systemPrompt
    });

    let fullResponse = '';

    for await (const chunk of stream.stream) {
      if (chunk.contentBlockDelta) {
        const deltaText = chunk.contentBlockDelta.delta.text;
        fullResponse += deltaText;

        // Send chunk to frontend
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          content: deltaText
        })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      fullMessage: fullResponse
    })}\n\n`);

    // Store complete message
    await storeCoachMessage(sessionId, fullResponse);

  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
  } finally {
    res.end();
  }
}
```

**Enhanced CoachConversations.jsx:**
```jsx
function CoachConversations({ userId, coachId, conversationType, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (userMessage) => {
    // Add user message immediately
    const newUserMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    // Start streaming coach response
    setIsStreaming(true);
    setStreamingMessage('');

    const endpoint = conversationType === 'program-creation'
      ? `/users/${userId}/coaches/${coachId}/program-creator-sessions/${sessionId}/send-message`
      : `/users/${userId}/coaches/${coachId}/conversations/${sessionId}/send-message`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'chunk') {
              setStreamingMessage(prev => prev + data.content);
            } else if (data.type === 'complete') {
              // Add complete message to conversation
              const coachMessage = { role: 'assistant', content: data.fullMessage };
              setMessages(prev => [...prev, coachMessage]);
              setStreamingMessage('');
              setIsStreaming(false);
            }
          }
        }
      }
    } catch (error) {
      setIsStreaming(false);
      // Handle error
    }
  };

  // Different API endpoints based on conversation type
  const configStatus = conversationType === 'program-creation'
    ? useConfigStatus(sessionId)
    : null;

  return (
    <div className="conversation-container">
      {/* Program creation progress indicator */}
      {conversationType === 'program-creation' && (
        <ProgramCreatorProgress configStatus={configStatus} />
      )}

      <div className="messages">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {/* Show streaming message */}
        {isStreaming && (
          <MessageBubble
            message={{ role: 'assistant', content: streamingMessage }}
            isStreaming={true}
          />
        )}
      </div>

      <MessageInput
        onSendMessage={sendMessage}
        disabled={isStreaming}
      />

      {/* Program creation specific footer */}
      {conversationType === 'program-creation' && configStatus?.finalized && (
        <ProgramFinalizationButton onFinalize={handleFinalize} />
      )}
    </div>
  );
}
```

**Performance Improvements:**
- **Before**: 5-15 second wait, then full response appears
- **After**: Response starts in ~1-2 seconds, streams in real-time
- **Program Creation**: Long program explanations stream naturally, feeling like active design
- **User Engagement**: Users stay engaged watching response build
- **Error Handling**: Graceful handling of partial responses and connection issues

### Enhanced Memory Integration

**Program Creation Context Queries:**
```typescript
const programContext = await queryPinecone({
  query: "user training goals, program preferences, past challenges, workout feedback",
  userId: userId,
  coachId: coachId,
  limit: 15
});
```

**Coach Learning Through Conversation Analysis:**
```typescript
// Analyze user response to challenges
const responseAnalysis = analyzeResponse(userResponse, {
  sentiment: true,
  receptivity: true,
  engagement: true
});

// Store effective challenge patterns
await storeChallengeOutcome({
  challengeType: "volume_excess",
  userResponse: responseAnalysis,
  effectiveness: calculateEffectiveness(responseAnalysis)
});
```

### Workout Generation Enhancement

**Program-Aware Context:**
```typescript
interface EnhancedWorkoutContext {
  // Existing context...

  programContext?: {
    programId: string,
    currentWeek: number,
    currentPhase: ProgramPhase,
    recentProgressions: Exercise[],
    upcomingMilestones: Milestone[],
    userFeedbackHistory: CheckIn[]
  }
}
```

**Coach Prompt Enhancement:**
```typescript
const workoutPrompt = `
You are generating Week ${programContext.currentWeek}, Day ${programContext.currentDay}
of the user's "${programContext.name}" program.

Current Phase: ${programContext.currentPhase.name}
Phase Goals: ${programContext.currentPhase.goals}
Recent User Feedback: ${programContext.recentCheckIns}
Previous Workout Performance: ${programContext.lastWorkoutNotes}

Generate today's workout keeping the program progression in mind...
`;
```

### Cross-Discipline Coach Guidance

```typescript
// During program creation
if (coach.primaryDiscipline !== inferredProgramDiscipline) {
  const softGuidanceMessage = `
    I should mention - my expertise is really in ${coach.primaryDiscipline}.
    I'm happy to create a ${inferredProgramDiscipline} program for you, but you
    might get more specialized programming from a coach designed for that discipline.
    Want to continue with me or create a specialized coach?
  `;
}
```

## Frontend Components

### Program Creation Interface
- **ProgramCreatorChat**: Conversation interface for program creation
- **CreationProgress**: Visual progress indicator for program creation steps
- **CoachSelector**: Interface for selecting appropriate coach for program type

### Program Dashboard
- **ProgramOverview**: Current program status, progress, and next steps
- **ProgramStructure**: Visual timeline of program phases and progression
- **CheckInInterface**: Simple form for submitting program feedback
- **ProgramWorkoutHistory**: Program-specific workout history view

### Integration Components
- **TrainingGroundsProgramSection**: Program workouts in existing training interface
- **ProgramContextWorkoutCard**: Enhanced workout cards showing program context
- **ProgramNotifications**: Check-in reminders and program milestone alerts

## Success Metrics

### User Engagement
- [ ] Program creation completion rate (target: >80%)
- [ ] Program adherence rate (% of planned workouts completed) (target: >70%)
- [ ] Check-in response rate (target: >60% weekly)
- [ ] Program completion rate (target: >50%)

### Coach Effectiveness
- [ ] Challenge receptivity rate (positive user responses to coach challenges)
- [ ] Program goal achievement rate (users achieving stated program goals)
- [ ] Cross-program learning (coaches getting better at challenging specific users)

### Platform Metrics
- [ ] Time spent in program creation sessions
- [ ] User retention during program periods vs. individual workouts
- [ ] Premium conversion rate (programs as value driver)
- [ ] User satisfaction scores for program vs. individual workout experiences

## Risk Mitigation

### Complexity Management
- **Risk**: Program creation conversations become too complex or overwhelming
- **Mitigation**: Start with simple program structures, iterate based on user feedback
- **Success Criteria**: Average program creation session completed in <20 minutes

### Coach Quality Consistency
- **Risk**: Program quality varies significantly between coaches or over time
- **Mitigation**: Comprehensive coach testing with program creation scenarios
- **Success Criteria**: Program satisfaction scores consistent across coach types

### User Abandonment
- **Risk**: Users start programs but don't complete them
- **Mitigation**: Regular check-ins, program modifications, clear progress visualization
- **Success Criteria**: <30% program abandonment rate

### Performance Concerns
- **Risk**: Complex queries slow down program-aware workout generation
- **Mitigation**: Efficient DynamoDB queries, caching of program context
- **Success Criteria**: Program workout generation <3 seconds response time

## Future Enhancements (Post-V1)

### Advanced Features
- [ ] Program templates and sharing
- [ ] Multi-coach collaborative programs
- [ ] Integration with biometric data (sleep, HRV, recovery)
- [ ] Computer vision form analysis integration
- [ ] Voice-based check-ins and coaching

### Business Model Extensions
- [ ] Premium program libraries
- [ ] Coach certification programs
- [ ] B2B sales to gyms and trainers
- [ ] Program analytics and insights dashboard

### Platform Expansion
- [ ] Nutrition program integration
- [ ] Mindfulness/recovery program tracks
- [ ] Competition preparation specialized programs
- [ ] Injury rehabilitation program pathways

## Implementation Timeline

**Week 1-2**: Phase 1 (Program Creation Foundation)
**Week 3-4**: Phase 2 (Program-Aware Workout Generation)
**Week 5**: Phase 3 (Check-in System)
**Week 6**: Phase 4 (Program Dashboard)
**Week 7**: Integration testing and bug fixes
**Week 8**: User testing and feedback incorporation

**Total Estimated Timeline: 8 weeks for full V1 implementation**

## Next Steps

1. **Immediate**: Implement DynamoDB schema and basic CRUD operations
2. **Week 1**: Build program creation session API endpoints
3. **Week 1**: Enhance coach conversation system for program creation:
   - Implement streaming responses using `converseStream` API
   - Update CoachConversations.jsx for real-time streaming support
   - Add program creation conversation flows and UI enhancements
   - Integrate enhanced memory retrieval for program context
4. **Week 2**: Implement program creation conversation flows and finalization
5. **Week 3**: Begin program-aware workout generation enhancement

This implementation plan provides a comprehensive roadmap for building Training Programs V1 while leveraging existing platform strengths and maintaining focus on the core user experience of creating meaningful coaching relationships through structured training programs.
