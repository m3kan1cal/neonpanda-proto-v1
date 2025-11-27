# Training Program Implementation Plan
## Strategic Architecture & Business Logic Guide

### Version 1.0 | NeonPanda Custom Fitness AI Platform
### Target Completion: 2 Weeks from Start

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Context](#strategic-context)
3. [Architecture Overview](#architecture-overview)
4. [Data Model Design](#data-model-design)
5. [Core Feature Specifications](#core-feature-specifications)
6. [Business Logic Rules](#business-logic-rules)
7. [User Experience Flows](#user-experience-flows)
8. [Integration Points](#integration-points)
9. [Success Metrics & Instrumentation](#success-metrics--instrumentation)
10. [Implementation Phases](#implementation-phases)
11. [Risk Mitigation](#risk-mitigation)
12. [Post-MVP Roadmap](#post-mvp-roadmap)

---

## Executive Summary

### Vision
Transform NeonPanda from a conversational fitness platform into an intelligent training program system where AI coaches create, adapt, and manage personalized multi-week training programs that feel like working with a real coach.

### Key Differentiators
- **Coach-Driven Programming**: Each AI coach creates programs based on their unique personality, methodology, and specialization
- **Conversation-First**: Program creation happens through natural dialogue, not forms
- **Adaptive Intelligence**: Programs adjust based on user performance, feedback, and life circumstances
- **Calendar Accountability**: Real schedules with pause/resume capabilities for real-world flexibility

### Success Criteria
- **Program Adherence**: 70%+ of scheduled workouts completed by active users
- **Daily Engagement**: Users check their program 5+ days per week
- **User Retention**: Users with active programs have 2x retention vs. non-program users
- **Feedback Sentiment**: 80%+ positive feedback on program workouts

### Timeline
**2-week sprint** focusing on MVP core features, with post-MVP enhancements planned for weeks 3-6.

---

## Strategic Context

### Why Training Programs Matter

**Current State (Conversational Coaching)**:
- Users ask: "What should I do today?"
- Coach generates one-off workouts
- No long-term planning or progression
- Limited accountability beyond single sessions

**Future State (Intelligent Programming)**:
- Users follow structured multi-week plans
- Coach creates coherent training blocks with phases
- Built-in progression and adaptation
- Calendar-based accountability drives habit formation

### Target User Profile
- **Primary**: CrossFit enthusiasts willing to pay $25/month
- **Characteristics**:
  - Goal-oriented (competition prep, skill development, general fitness)
  - Equipment-constrained (home gym or specific facility)
  - Time-constrained (30-90 min training windows)
  - Event-driven (Spartan races, local competitions, testing weeks)
  - Seeking accountability and structure

### Competitive Positioning
- **vs. Static PDF Programs**: Dynamic adaptation based on real performance
- **vs. Generic App Programs**: Personality-driven coaching with conversational flexibility
- **vs. Human Coaches**: Available 24/7, affordable, still maintains coaching relationship feel

---

## Architecture Overview

### System Components

```
User (Authenticated via Cognito)
├── Multiple Coaches (AI personalities with unique methodologies)
│   ├── Conversations (chat history, context)
│   └── Training Programs (structured plans) ← NEW
├── Workouts (logged exercises, reference coachId)
├── Memories (preferences, context, reference coachId)
└── Reports (weekly analytics, reference coachId)
```

### Technology Stack
- **Backend**: AWS Amplify Gen 2, Lambda (TypeScript), API Gateway V2
- **Database**: DynamoDB (single-table design) + S3 (detailed program data)
- **AI**: AWS Bedrock (Claude Sonnet 4.5 for generation, Haiku for operations)
- **Frontend**: React (component-level state + Agent pattern)
- **Auth**: Cognito with JWT authorizers

### Data Hierarchy

**Programs are Coach-Specific**:
- Each program belongs to a specific coach
- Different coaches create different programs for the same user
- Coach personality/methodology influences program structure and content

**Programs Reference User Data**:
- Access user's workout history
- Read user's memories and preferences
- Consider user's conversation context
- Respect user's equipment constraints

---

## Data Model Design

### Entity Structure

#### Training Program Entity
```
DynamoDB Pattern:
pk: "user#{userId}#coach#{coachId}"
sk: "program#{programId}"
entityType: "program"

Core Attributes:
- programId (unique identifier)
- userId (owner)
- coachId (creator)
- programName (e.g., "8-Week Competition Prep")
- programDescription (overview and goals)
- status ("active", "paused", "completed", "archived")
- createdAt (timestamp)
- updatedAt (timestamp)
- startDate (calendar date - YYYY-MM-DD)
- endDate (calculated based on duration)
- totalDays (program length)
- currentDay (user's progress, 1-indexed)
- pausedAt (timestamp when paused, null if active)
- pausedDuration (total days paused, for date shifting)

Program Metadata:
- equipmentConstraints (extracted from creation conversation)
  - Example: ["barbell", "dumbbells to 50lbs", "pull-up bar", "rower"]
- trainingGoals (user objectives)
  - Example: ["improve snatch technique", "increase pull-up capacity", "prepare for Spartan race"]
- trainingFrequency (days per week)
  - Example: 5 (Mon-Fri training, Sat-Sun rest)
- programPhases (array of phase objects)

Program Analytics:
- totalWorkouts (scheduled)
- completedWorkouts (finished count)
- skippedWorkouts (missed count)
- adherenceRate (completedWorkouts / totalWorkouts)
- lastActivityDate (last workout interaction)

S3 Storage Reference:
- s3DetailKey (path to full program JSON in S3)
  - Contains all daily workouts, detailed phase descriptions, adaptation history
```

#### Program Phase Structure
```
Phase Object (stored in program attributes):
- phaseId (unique within program)
- phaseName (e.g., "Phase 1: Foundation Building")
- phaseDescription (goals and focus)
- startDay (1-indexed day number)
- endDay (1-indexed day number)
- durationDays (calculated)
- focusAreas (array of training priorities)
  - Example: ["strength development", "movement quality", "engine building"]
```

#### Daily Workout Structure
```
Stored in S3 (detailed program JSON):
- workoutId (unique identifier)
- dayNumber (1-indexed position in program)
- scheduledDate (calculated from startDate + dayNumber - pausedDuration)
- phaseId (which phase this workout belongs to)
- workoutName (e.g., "Heavy Back Squat + Metcon")
- workoutDescription (full workout details)
- estimatedDuration (minutes)
- requiredEquipment (subset of program equipment)
- movements (array of exercise objects, using existing workout schema)
- coachingNotes (cues, focus points, scaling suggestions)
- status ("pending", "completed", "skipped", "regenerated")
- completedAt (timestamp when logged)
- userFeedback (rating, comments)
- adaptationHistory (if regenerated, why and what changed)
```

#### Adaptation Tracking
```
Stored with program in DynamoDB:
- adaptationLog (array of adaptation events)
  - timestamp
  - trigger (e.g., "consistent_scaling", "missed_workouts", "user_feedback")
  - description (what was observed)
  - action (what changed in programming)
  - affectedDays (which future workouts adjusted)

Examples:
- "User consistently scales thrusters to 75lbs (prescribed 95lbs). Adjusting future thruster weights to 75-85lbs range."
- "User missed 3 consecutive workouts. Reducing volume for next 2 sessions to ease back in."
- "User reported 'way too easy' on last 2 metcons. Increasing time domain and intensity for next week."
```

### Query Patterns

**Get User's Programs by Coach**:
```
Query: pk="user#{userId}#coach#{coachId}" AND sk begins_with "program#"
Use Case: Display all programs from specific coach
Filter: status = "active" (for active program view)
```

**Get All User's Programs (Across Coaches)**:
```
GSI: gsi1pk="user#{userId}", gsi1sk="program#{programId}"
Use Case: Management screen showing all programs
Sort: startDate descending (newest first)
```

**Get Active Program for Today's Workout**:
```
Query: pk="user#{userId}#coach#{coachId}" AND sk begins_with "program#"
Filter: status = "active"
Client-side: Calculate today's workout from currentDay
```

**Program Analytics Dashboard**:
```
Aggregate metrics from program entity:
- adherenceRate
- completedWorkouts / totalWorkouts
- Current streak (consecutive completed days)
- Phase progress (currentDay within phase bounds)
```

---

## Core Feature Specifications

### 1. Program Creation (Conversation-Driven)

#### Initiation Methods
1. **Coach Proactive Suggestion**:
   - Coach detects user might benefit from structured program
   - Example: "You've been training consistently for 3 weeks. Want me to build you a structured 4-week program to hit that muscle-up goal?"

2. **Manual User Request**:
   - User asks directly: "Can you create a training program for me?"
   - Or uses quick action: "Create Program" button in FloatingMenu or Training Grounds

3. **Management Screen Trigger**:
   - User navigates to Programs management page
   - Clicks "New Program" button

#### Creation Conversation Flow

**Step 1: Goal Discovery**
- Coach asks: "What are you training for? Any specific goals or events?"
- User provides context (competition, skill goal, general fitness, event prep)
- Coach extracts: training objectives, timeline constraints, priority focuses

**Step 2: Equipment Assessment**
- Coach asks: "What equipment do you have access to?"
- User describes naturally: "I have a barbell, dumbbells up to 50lbs, pull-up bar, and a rower"
- Coach extracts: equipment list with specifics (weight ranges, equipment types)
- Coach notes limitations: "Got it - no rig, so we'll focus on pull-up bar gymnastics and floor work"

**Step 3: Schedule & Duration**
- Coach asks: "How many days per week can you train? And how long do you want this program?"
- User responds: "5 days a week, I have 3 weeks until my Spartan race"
- Coach calculates: 21 days total, 5 training days + 2 rest days per week
- Coach suggests program structure: "Perfect - I'll build you a 21-day program with 3 phases: foundation, build, taper"

**Step 4: Program Generation**
- Coach uses Claude Sonnet 4.5 to generate complete program
- Incorporates coach personality (aggressive vs conservative, volume vs intensity focus)
- Applies coach specialization (CrossFit methodology, powerlifting principles, etc.)
- Respects equipment constraints and training frequency
- Creates phases with distinct focuses
- Generates daily workouts with progression logic

**Step 5: Confirmation & Start**
- Coach presents program overview:
  - Duration and phases
  - Training frequency
  - Key focus areas
  - Sample workouts from each phase
- User confirms or requests adjustments
- Program activates with startDate = today (or user-specified date)

#### AI Prompt Structure for Program Generation

**Input Context for Claude**:
- Coach personality and methodology (from coach config)
- User goals and timeline
- Equipment constraints
- Training frequency (days per week)
- User's workout history (for baseline fitness assessment)
- User's memories (preferences, injuries, dislikes)
- Conversation context (additional details mentioned)

**Output Requirements**:
- Structured program with phases
- Daily workouts following universal workout schema
- Progressive overload logic
- Deload/recovery weeks if applicable
- Coaching notes for each workout
- Scaling suggestions pre-built into workouts

**Coach Personality Influence Examples**:
- **Aggressive CrossFit Coach**: High volume, frequent skill work, competitive benchmarks, 6-day weeks
- **Conservative Strength Coach**: Lower frequency, higher intensity, built-in deloads, progressive overload focus
- **General Fitness Coach**: Balanced approach, more scaling options, emphasis on sustainability

---

### 2. Calendar-Based Scheduling

#### Start Date Logic
- Program has fixed startDate (YYYY-MM-DD format)
- Day 1 of program = startDate
- Day 2 = startDate + 1 day
- Day N = startDate + (N-1) days

#### Today's Workout Calculation
```
Logic:
1. Get current date
2. Calculate daysSinceStart = currentDate - program.startDate
3. Account for pauses: effectiveDays = daysSinceStart - pausedDuration
4. currentDay = effectiveDays + 1 (1-indexed)
5. Fetch workout for currentDay from S3 program data
```

#### Scheduled Date Display
- Each workout shows: "Scheduled for: Monday, June 5, 2025"
- Users see full calendar view of program
- Future workouts display in calendar grid
- Past workouts show completion status (✓ completed, ⊘ skipped, ⏸ paused)

---

### 3. Pause/Resume Functionality

#### Pause Behavior
**When user pauses**:
1. Set program.status = "paused"
2. Record program.pausedAt = current timestamp
3. Display paused state in UI with resume option
4. All future workout dates remain unchanged (no immediate recalculation)

**What users see**:
- "Program Paused on June 10, 2025"
- "Resume Program" button
- Message: "Your program is on hold. When you resume, all future workouts will shift forward."

#### Resume Behavior
**When user resumes**:
1. Calculate pauseDuration = resumeDate - pausedAt (in days)
2. Add pauseDuration to program.pausedDuration (cumulative)
3. Set program.pausedAt = null
4. Set program.status = "active"
5. Recalculate all future workout scheduledDates:
   - newDate = originalScheduledDate + totalPausedDuration

**Effect on schedule**:
- Past completed workouts: dates unchanged
- Past skipped workouts: dates unchanged
- Future workouts: all shift forward by pauseDuration
- currentDay pointer: unchanged (maintains progress position)

**Example**:
- Program starts June 1
- User completes Days 1-5 (June 1-5)
- User pauses on June 6 for vacation
- User resumes on June 11 (5 days paused)
- Day 6 (originally June 6) → now June 11
- Day 7 (originally June 7) → now June 12
- All subsequent days shift +5 days

---

### 4. Workout Completion & Status Tracking

#### Status Options
- **Pending**: Scheduled, not yet completed (default state)
- **Completed**: User logged this workout
- **Skipped**: User explicitly marked as skipped or missed
- **Regenerated**: User requested modification, new version created

#### Completion Flow
**Option A: User completes workout during conversation**
1. User: "I just did today's workout - Fran in 8:57"
2. Coach extracts workout data, creates workout log
3. Coach updates program: mark currentDay as completed
4. Coach advances: currentDay++
5. Coach responds: "Great work! Fran in 8:57 is solid. Tomorrow is rest day, then we're back to heavy squats on Day 7."

**Option B: User marks complete without logging details**
1. User clicks "Mark Complete" on today's workout
2. Program updates: status = "completed", completedAt = timestamp
3. Program advances: currentDay++
4. No detailed workout log created (just completion tracked)

**Option C: User skips workout**
1. User clicks "Skip Workout" or doesn't complete by end of day
2. Program updates: status = "skipped"
3. Program advances: currentDay++ (continues to next day)
4. Adaptation trigger activated if pattern emerges

#### Auto-Skip Logic (Optional Enhancement)
- If workout status = "pending" and scheduledDate + 1 day < currentDate
- Automatically mark as "skipped"
- Log skipped workout for adaptation tracking
- Do NOT auto-advance currentDay (user explicitly advances)

---

### 5. Workout Regeneration via Conversation

#### Trigger Examples
- "Tomorrow's workout looks too long, can you make it 45 minutes?"
- "I don't have a rower today, can you swap that part?"
- "That looks too hard, can you scale it down?"
- "I want more Olympic lifting, less metcons this week"

#### Regeneration Process
1. **Detection**: Coach recognizes request to modify specific workout
2. **Identification**: Determine which workout (tomorrow, Day 12, next Monday)
3. **Constraint Extraction**: What needs to change (duration, equipment, difficulty)
4. **Regeneration**: Claude generates new workout version
   - Maintains phase goals and progression intent
   - Applies user's constraints
   - Preserves program coherence
5. **Update Storage**: Replace workout in S3 program data
6. **Mark History**: Add to adaptationLog with reason and changes
7. **Confirmation**: "I've updated Day 5 for you - here's the new workout..."

#### Regeneration Limits (Business Logic)
- **Unlimited regeneration**: Users can modify as needed (coach flexibility)
- **Coherence check**: If user regenerates 50% of workouts, coach suggests full program rebuild
- **Adaptation tracking**: All regenerations logged for future programming improvements

---

### 6. Adaptation Intelligence

#### Trigger 1: Consistent Scaling Pattern

**Detection Logic**:
- User scales same movement 3+ times in a row
- Example: Prescribed 95lb thrusters, user logs 75lbs each time

**Adaptation Action**:
- Adjust future prescriptions for that movement
- Lower intensity or provide scaling as default
- Coach explains in workout notes: "Based on your recent sessions, I've adjusted thruster weights to 75-85lbs"

**Implementation**:
- Monitor workout logs for movement patterns
- Compare prescribed vs. actual weights/reps/modifications
- Update future workouts in program when pattern detected

#### Trigger 2: Missed Workouts

**Detection Logic**:
- User skips 2+ consecutive workouts
- OR skips 3+ workouts in a 7-day period

**Adaptation Action**:
- Reduce volume/intensity for next 1-2 sessions (ease back in)
- Extend program duration if user requests (shift timeline)
- Coach check-in: "I noticed you've missed a few days - everything okay? I've adjusted next week to ease you back in."

**Implementation**:
- Track skipped workout count and patterns
- When threshold hit, regenerate next 2-3 workouts with reduced load
- Log adaptation event with reasoning

#### Trigger 3: User Feedback

**Detection Methods**:
- Direct feedback: User rates workout (thumbs up/down, 1-5 stars)
- Conversational feedback: "That was way too easy" or "That destroyed me"
- Effort/RPE indicators: User reports perceived exertion

**Adaptation Action**:
- **Too Easy**: Increase intensity, volume, or complexity in next phase
- **Too Hard**: Scale back, add more rest, reduce volume
- **Just Right**: Maintain current trajectory

**Implementation**:
- Capture feedback after workout completion
- Sentiment analysis on conversational feedback
- Adjust programming for next phase or next week based on cumulative feedback

#### Adaptation Communication
- Coach proactively explains adjustments: "I noticed X, so I've adjusted Y"
- User can see adaptation history: "View Program Changes" section
- Transparency builds trust: show reasoning, not just changes

---

### 7. Program Phases & Structure

#### Phase Definition
Each program has 2-5 phases depending on duration:
- **Short programs (2-3 weeks)**: 2 phases (build, peak)
- **Medium programs (4-8 weeks)**: 3 phases (foundation, build, peak)
- **Long programs (12+ weeks)**: 4-5 phases (base, build, intensify, peak, taper)

#### Phase Characteristics
- **Phase Name**: Descriptive (e.g., "Phase 1: Strength Foundation")
- **Phase Goals**: Clear objectives (e.g., "Build base strength, improve movement quality")
- **Duration**: Specific day ranges (e.g., Days 1-10)
- **Focus Areas**: Training priorities for this phase
- **Progression Logic**: How intensity/volume changes within phase

#### Phase Transitions
- Coach announces phase changes: "Great job completing Phase 1! Starting Phase 2 tomorrow - we're ramping up intensity."
- Visual indicators in UI: Progress bar showing phase completion
- Phase summaries: "Phase 1 Recap: You completed 9/10 workouts, hit 2 PRs, and improved your double-under consistency"

#### Phase-Based Adaptation
- Adaptations consider phase context
- Can't skip phases (maintain program integrity)
- Can extend phases if user needs more time
- Can adjust phase intensity based on performance

---

## Business Logic Rules

### Program Status State Machine

```
States: "active", "paused", "completed", "archived"

Transitions:
- Created → active (on program start)
- active → paused (user pauses)
- paused → active (user resumes)
- active → completed (all workouts finished)
- completed → archived (user archives)
- Any state → archived (user archives manually)

Business Rules:
- Only ONE active program per coach per user
- User can have active programs with different coaches simultaneously
- Completed programs remain viewable indefinitely
- Archived programs hidden from main view but recoverable
```

### Workout Scheduling Rules

1. **One workout per day**: Programs don't schedule multiple workouts on same day
2. **Rest days**: Explicitly scheduled or implied by training frequency
3. **No retroactive scheduling**: Can't schedule workouts in the past
4. **Flexible start dates**: Program can start today, tomorrow, or future date
5. **No forced progression**: User controls when they move to next workout (via completion)

### Completion & Advancement Rules

1. **Manual advancement only**: User must mark complete/skip to advance (no auto-advance)
2. **Skip doesn't block progression**: Skipping Day 5 allows moving to Day 6
3. **No partial workouts**: Workout is either completed or skipped (binary state)
4. **Retroactive completion**: User can mark past skipped workouts as completed (for accuracy)

### Adaptation Boundaries

1. **Maintain phase integrity**: Adaptations can't skip entire phases
2. **Preserve program structure**: Can't change program duration mid-program (only pause/extend)
3. **Equipment constraints locked**: Can't add equipment mid-program (user can regenerate workouts with substitutions)
4. **Frequency changes**: User can request fewer training days (rest days added), not more (program coherence)

### Coach-Program Relationship Rules

1. **Coach ownership**: Program belongs to creating coach, other coaches can't modify
2. **Cross-coach visibility**: User can show Program A (Coach A) to Coach B for feedback
3. **Coach philosophy preserved**: Regenerations maintain original coach's style/methodology
4. **Coach learning**: Program performance feeds back into coach's memory system

---

## User Experience Flows

### Conversation Mode System: Chat vs. Build

#### Mode Toggle Interface
Users interact with their coach through two distinct modes, selectable via a toggle in the chat input:

**Mode Options**:
- 💬 **Chat** - General conversation, questions, workout logging, advice
- 🏗️ **Build** - Structured program creation through guided conversation

**UI Implementation**:
- Toggle location: Adjacent to message input (segmented control or icon toggle)
- Visual differentiation:
  - Chat mode: Default styling
  - Build mode: Highlighted border (cyan accent), "Building Program..." indicator
- Input placeholder changes based on mode:
  - Chat: "Ask your coach anything..."
  - Build: "Let's build your training program. What are your goals?"

**Backend Architecture**:
- **Same Lambda endpoint**: `stream-coach-conversation` handles both modes
- **Mode parameter**: Request includes `mode: 'chat' | 'build'`
- **Prompt branching**: System prompt adjusts based on mode
- **Shared context**: Same conversation history, seamless transitions

**Request Structure**:
```json
{
  "userId": "user123",
  "coachId": "coach456",
  "conversationId": "conv789",
  "message": "I want to train 5 days a week",
  "mode": "build"
}
```

**System Prompt Selection Logic**:

**Build Mode Prompt**:
```
PROGRAM BUILDING MODE ACTIVE

Your goal: Create a comprehensive training program through conversation.

Required Information to Collect:
1. Training goals (competition prep, skill development, general fitness, event)
2. Timeline/duration (event date, preferred program length in weeks/days)
3. Equipment constraints (available equipment with specifics)
4. Training frequency (days per week, typical session duration)
5. Experience level and current fitness baseline

Conversation Guidelines:
- Ask ONE focused question at a time
- Listen for details and nuances in user responses
- Confirm understanding before moving forward
- Natural, coach-like dialogue (not interrogation)
- When you have all required information, generate structured program

Program Generation Output:
When ready to create program, output structured data as a JSON code block:

```json
{
  "programName": "...",
  "programDescription": "...",
  "totalDays": ...,
  "trainingFrequency": ...,
  "startDate": "...",
  "equipmentConstraints": [...],
  "trainingGoals": [...],
  "phases": [...],
  "dailyWorkouts": [...]
}
```
```

**Chat Mode Prompt**:
```
CHAT MODE ACTIVE

You are in general coaching conversation mode. You can:
- Answer training and fitness questions
- Log and discuss workouts
- Provide motivation and encouragement
- Explain programming concepts
- Reference and discuss active training programs
- Offer technique advice

If user expresses interest in creating a structured program, suggest:
"Want to switch to Build mode? I can create a complete training program for you."

DO NOT attempt to create full programs in Chat mode.
```

**Program Detection & Storage**:
After streaming completes, backend checks response for JSON code block:
```typescript
// Match JSON code block
const jsonBlockMatch = fullResponse.match(/```json\n(.*?)\n```/s);

if (jsonBlockMatch && mode === 'build') {
  const programData = JSON.parse(jsonBlockMatch[1]);
  await createProgram(userId, coachId, programData);

  return {
    ...streamedResponse,
    programCreated: true,
    programId: newProgramId,
    suggestModeSwitch: 'chat' // Frontend prompts to switch back
  };
}
```

**Mode Behavior**:
- Default mode: `'chat'`
- Mode persists during conversation (survives page refresh)
- Messages tagged with current mode for analytics
- Seamless mid-conversation transitions
- After program creation, prompt user: "Program created! Switch back to Chat mode?"

**Why Single Lambda with Mode?**
- ✅ Shared conversation history and context
- ✅ Natural transitions between modes
- ✅ No code duplication (streaming, auth, error handling)
- ✅ Coach maintains personality across modes
- ✅ Simpler architecture and testing
- ✅ Easy to add more modes later (Analyze, Review, etc.)

---

### Flow 1: First-Time Program Creation

**Entry Point**: User switches to Build mode via toggle OR coach suggests in Chat mode

**Conversation**:
1. Coach: "I'd love to build you a training program! What are you working towards?"
2. User: "I want to get my first bar muscle-up in the next 6 weeks"
3. Coach: "Great goal! What equipment do you have available?"
4. User: "Just a pull-up bar and some resistance bands at home"
5. Coach: "Perfect. How many days per week can you train?"
6. User: "4 days - Monday, Wednesday, Friday, Saturday"
7. Coach: "Excellent. I'll create a 6-week program with 3 phases:
   - Phase 1 (Weeks 1-2): Build pulling strength and consistency
   - Phase 2 (Weeks 3-4): Develop explosive pull and transition mechanics
   - Phase 3 (Weeks 5-6): Put it together with muscle-up progressions

   We'll train 4 days/week with built-in recovery. Ready to start Monday?"
8. User: "Yes, let's do it!"
9. Coach: *generates program* "Your 'Bar Muscle-Up Mastery' program is ready! You'll start Monday with Phase 1, Day 1. Want to see this week's workouts?"

**Outcome**: Program created, user can view full program or start Monday

---

### Flow 2: Daily Workout Interaction

**Entry Point**: User opens app, views Training Grounds or talks to coach

**Option A: View Today's Workout**
1. User sees: "Today's Workout - Day 5 of Bar Muscle-Up Mastery"
2. Workout displays with full details (movements, sets, reps, coaching notes)
3. User completes workout offline
4. User returns, clicks "Mark Complete" or logs workout details via conversation
5. System updates: Day 5 marked complete, advances to Day 6
6. User sees: "Nice work! Tomorrow is a rest day. See you Friday for Day 6."

**Option B: Workout Mid-Stream Conversation**
1. User (during workout): "Hey, I don't have bands today, can I substitute?"
2. Coach: "Absolutely - swap the banded pull-aparts for scapular pull-ups. That'll hit the same muscles."
3. User: "Thanks! Just finished - 20 minutes total, felt great"
4. Coach: *extracts workout log, marks Day 5 complete*
5. Coach: "Awesome! You're crushing Phase 1. Tomorrow is rest, then back to it Friday."

---

### Flow 3: Pausing for Life Events

**Entry Point**: User needs to pause (vacation, injury, busy period)

1. User: "I'm going on vacation next week, need to pause my program"
2. Coach: "No problem! I'll pause your program. When you get back, just let me know and we'll resume - all your future workouts will shift to account for the break."
3. System: Sets status = "paused", records pausedAt timestamp
4. **During pause**: User sees "Program Paused" badge, no daily workout prompts
5. **User returns**: "I'm back, let's resume!"
6. Coach: "Welcome back! Resuming your program now. You were on Day 12, and we'll pick up right where you left off."
7. System: Calculates pause duration, shifts all future workout dates
8. Coach: "Day 12 is now scheduled for today. Let's ease back in!"

---

### Flow 4: Modifying a Workout

**Entry Point**: User sees tomorrow's workout, wants changes

1. User: "Tomorrow's workout has a 30-minute AMRAP but I only have 20 minutes. Can you shorten it?"
2. Coach: "Absolutely! Let me adjust Day 8 to fit your schedule."
3. System: Regenerates Day 8 workout with 20-minute time cap
4. Coach: "Updated! Day 8 is now a 20-minute AMRAP with adjusted volume so you still hit the intended stimulus. Here's the new workout..."
5. User reviews: "Perfect, thanks!"
6. System: Logs regeneration in adaptationHistory

---

### Flow 5: Completing a Program

**Entry Point**: User finishes final workout

1. User completes Day 42 (final workout)
2. System: Marks Day 42 complete, currentDay = 42, program.completedWorkouts = program.totalWorkouts
3. Coach: "Congratulations! You just completed your 'Competition Prep 2025' program! Here's your summary:
   - 42 workouts scheduled, 39 completed (93% adherence)
   - 8 new PRs achieved
   - Progressed through all 3 phases
   - Ready to test next week!"
4. System: Sets status = "completed"
5. Coach: "Want to build your next program, or take some time with open training?"
6. User: "Let's do open training for 2 weeks, then build a new program"

---

## Integration Points

### 1. Coach Conversation System

**Bidirectional Integration**:
- Programs created via conversation (coach suggests → user confirms)
- Program modifications happen in conversation (regenerate workouts, adjustments)
- Coach references program context: "Since you're in Week 2 of your strength program..."
- Coach provides program updates: "Today's workout from your program is..."

**Context Sharing**:
- Coach has access to current program state (phase, day, upcoming workouts)
- Coach can answer questions about program: "Why did you program this today?"
- Coach can preview future workouts: "Next week you'll see more Olympic lifting"

---

### 2. Workout Logging System

**Data Flow**:
- User logs workout → Check if it's from active program → Mark program day complete
- Program completion creates workout log (existing schema)
- Workout logs feed adaptation system (scaling patterns, performance trends)

**Integration Logic**:
- If workout has programId reference → Link to program day
- Extract actual vs. prescribed data for adaptation triggers
- Completed workouts advance program currentDay pointer

---

### 3. Memory System

**Program Influences Memory**:
- Equipment constraints stored as memory: "User has barbell, dumbbells to 50lbs, pull-up bar"
- Training preferences learned: "User prefers morning workouts, 45-60 min sessions"
- Progress memories created: "User achieved first bar muscle-up on Day 38 of program"

**Memory Influences Programs**:
- Coach reads memories before program creation (preferences, injuries, dislikes)
- Memories adjust programming: "User has shoulder sensitivity - avoid overhead volume"
- Ongoing learning: Program performance creates new memories

---

### 4. Analytics/Reporting System

**Program Data Feeds Reports**:
- Weekly reports include: "This week you completed Days 8-12 of your strength program (5/5 workouts, 100% adherence)"
- Monthly trends: "Since starting your program 3 weeks ago, your squat volume increased 25%"
- Progress tracking: "You're 60% through Phase 2 of your competition prep"

**Future Integration** (Post-MVP):
- Week-over-week program comparisons
- Phase performance analysis
- Cross-program analytics (compare Program A vs Program B results)

---

### 5. FloatingMenuManager Integration

**New Program Menu Section**:
- Add "Programs" icon to FloatingMenuManager (alongside Conversations, Workouts, Reports)
- Quick actions:
  - View active program
  - See today's workout
  - Create new program
  - Manage programs

**Recent Programs Display**:
- Show active program status: "Day 5 of 28 - Bar Muscle-Up Mastery"
- Quick nav to today's workout
- Completion percentage progress bar

---

### 6. Image Upload Integration

**Program + Form Checks**:
- User uploads form video during program: "Here's my snatch from Day 3"
- Coach references in future programming: "Based on your Day 3 video, I'm adding tempo work to Day 7"
- Images linked to program days: "View form checks from this phase"

**Integration Architecture**:
- Images stored with workoutId reference (existing system)
- Workouts have programId reference (links image to program context)
- Coach accesses images when generating/adapting program workouts

---

## Success Metrics & Instrumentation

### Primary Metrics (Track Daily)

#### 1. Program Adherence Rate
**Definition**: (Completed Workouts / Total Scheduled Workouts) × 100

**Tracking**:
- Calculate per program: program.completedWorkouts / program.totalWorkouts
- Aggregate across all active programs
- Segment by coach, program duration, user demographics

**Target**: 70%+ adherence for active programs

**Implementation**:
- Update completedWorkouts counter on each workout completion
- Log skipped workouts (don't count as completed)
- Real-time calculation, stored in program entity

---

#### 2. Daily Engagement Rate
**Definition**: % of users with active programs who interact with program daily

**Interaction Types**:
- View today's workout
- Mark workout complete/skip
- Ask coach about program
- Modify/regenerate workout
- Check program progress

**Tracking**:
- Log lastActivityDate on program entity (updated on any interaction)
- Count unique users with activity in last 24 hours
- Segment by time of day, day of week

**Target**: 80%+ of users with active programs engage 5+ days/week

**Implementation**:
- Event logging on all program-related actions
- Daily aggregation job calculates engagement metrics
- Dashboard shows 7-day rolling engagement rate

---

#### 3. User Retention (Program vs. Non-Program)
**Definition**: % of users still active after 30/60/90 days

**Segments**:
- Users with active programs
- Users without programs (conversation-only)
- Users who completed programs
- Users who abandoned programs

**Hypothesis**: Users with programs have 2x retention

**Tracking**:
- Track user creation date + program start date
- Measure activity (any app interaction) at 30/60/90-day marks
- Compare retention curves between segments

**Target**:
- 30-day retention: 75% (program users) vs. 40% (non-program)
- 60-day retention: 60% (program users) vs. 25% (non-program)

**Implementation**:
- Retention cohorts calculated weekly
- Flag users by program participation status
- Automated reports comparing segments

---

#### 4. Workout Feedback Sentiment
**Definition**: % positive feedback on completed workouts

**Feedback Collection**:
- Optional thumbs up/down after workout completion
- Conversational feedback sentiment analysis ("loved it", "too hard", "perfect")
- 1-5 star rating (optional, post-MVP)

**Tracking**:
- Store feedback with workout completion record
- Aggregate by program, phase, coach, workout type
- Track feedback trends over time

**Target**: 80%+ positive feedback

**Implementation**:
- Feedback UI after marking workout complete
- Sentiment analysis on conversational feedback (Claude API)
- Store in workout completion record, aggregate weekly

---

### Secondary Metrics (Track Weekly)

#### 5. Program Completion Rate
**Definition**: % of started programs that reach 100% completion

**Tracking**:
- Programs with status = "completed"
- Compare to total programs created
- Segment by program duration (longer programs have lower completion)

**Target**: 50%+ completion rate for 4-week programs, 30%+ for 8+ week programs

---

#### 6. Adaptation Trigger Frequency
**Definition**: How often adaptation system activates

**Triggers to Track**:
- Consistent scaling adjustments
- Missed workout volume reductions
- User feedback modifications

**Purpose**: Understand if adaptation system is working (too frequent = problems, too rare = not adaptive enough)

**Target**: 15-25% of programs trigger at least one adaptation event

---

#### 7. Regeneration Request Rate
**Definition**: % of workouts that get regenerated before completion

**Tracking**:
- Count regeneration events per program
- Identify which workouts get regenerated most (difficulty, equipment issues)
- Coach-level analysis (does coach X have higher regeneration requests?)

**Target**: <10% regeneration rate (programs should be good out of the box)

**Purpose**: Quality signal - high regeneration = poor initial programming

---

### Instrumentation Strategy

#### Event Logging Structure
```
Event Types:
- program_created
- program_started
- program_paused
- program_resumed
- program_completed
- workout_viewed
- workout_completed
- workout_skipped
- workout_regenerated
- adaptation_triggered
- feedback_submitted

Event Payload:
- timestamp
- userId
- coachId
- programId
- dayNumber (if applicable)
- eventDetails (specific to event type)
```

#### CloudWatch Logs Integration
- All program events sent to CloudWatch Logs
- Custom metrics for dashboard visualization
- Alerts on anomalies (sudden drop in adherence, spike in skips)

#### Weekly Automated Reports
- Email digest to founder:
  - Active programs count
  - Adherence rates
  - Completion rates
  - Top-performing coaches (by adherence)
  - User feedback highlights

---

## Implementation Phases

### Week 1: Core Infrastructure (Days 1-7)

#### Backend Foundation (Days 1-3)

**Conversation Mode System** (Day 1):
- Modify `stream-coach-conversation` Lambda to accept `mode` parameter
- Add mode-based system prompt selection logic:
  - `mode: 'chat'` → Standard coaching conversation prompt
  - `mode: 'build'` → Program creation guided conversation prompt
- Implement program data detection in streamed response:
  - Parse JSON code blocks: ` ```json ... ``` `
  - Extract structured program JSON
  - Trigger program creation when detected
- Tag conversation messages with mode for analytics
- Return metadata: `{ programCreated: true, programId, suggestModeSwitch: 'chat' }`

**Database Schema**:
- Define program entity structure in DynamoDB
- Create GSI for cross-coach program queries
- Define S3 storage structure for detailed program data

**Lambda Functions**:
- `create-program`: Store generated program (called after Build mode completion)
- `get-programs`: Retrieve user's programs (all or by coach)
- `get-program-details`: Fetch specific program with today's workout
- `update-program-status`: Pause, resume, complete, archive
- `mark-workout-status`: Complete or skip workout, advance program

**API Gateway Routes**:
- Existing: POST `/users/{userId}/coaches/{coachId}/conversations/{conversationId}/send-message` (now accepts `mode`)
- POST `/users/{userId}/coaches/{coachId}/programs` (create)
- GET `/users/{userId}/programs` (list all)
- GET `/users/{userId}/coaches/{coachId}/programs` (list by coach)
- GET `/users/{userId}/coaches/{coachId}/programs/{programId}` (details)
- PUT `/users/{userId}/coaches/{coachId}/programs/{programId}` (update status)
- POST `/users/{userId}/coaches/{coachId}/programs/{programId}/workouts/{dayNumber}` (mark status)

#### AI Program Generation (Days 3-4)
**Claude Integration**:
- Build prompt template for program generation
- Input: coach config, user goals, equipment, duration, frequency, user context
- Output: Structured program JSON with phases and daily workouts
- Test with multiple coach personalities and scenarios

**Generation Logic**:
- Extract equipment and goals from creation conversation
- Calculate program structure (phases, training days)
- Generate daily workouts using coach methodology
- Validate output against workout schema
- Store in S3, create program entity in DynamoDB

#### Testing & Validation (Days 5-7)
- End-to-end program creation flow
- Test multiple coach personalities
- Validate database writes and S3 storage
- API endpoint testing
- Error handling for edge cases

---

### Week 2: User Experience & Adaptation (Days 8-14)

#### Frontend Components (Days 8-10)

**Chat Input Mode Toggle** (Priority: Day 8):
- Add mode selector to coach conversation chat input
- Two modes: 💬 Chat and 🏗️ Build
- Visual indicators: highlight active mode, change input placeholder
- State management: `const [mode, setMode] = useState('chat')`
- Send mode with each message: `{ message, mode, userId, coachId, conversationId }`
- Mode persistence: localStorage or conversation metadata
- Post-creation prompt: "Program created! Switch back to Chat mode?"

**ProgramAgent** (follows existing Agent pattern):
- Manages program state (loading, errors, data)
- API calls to backend
- State updates trigger UI re-renders

**UI Components**:
- ProgramList: Display user's programs (active, completed, archived)
- ProgramDetails: Show full program with phases and workouts
- TodaysWorkout: Prominent display of current day's workout
- WorkoutCalendar: Visual calendar of program schedule
- ProgramControls: Pause, resume, complete, archive buttons

**FloatingMenuManager Integration**:
- Add "Programs" menu item
- Display active program status
- Quick action to view today's workout
- Quick action to switch conversation to Build mode

**Management Screen**:
- `/training-grounds/programs` route
- Grid view of all programs
- Filters: active, completed, archived, by coach
- Click program → ProgramDetails page
- "Create New Program" button → Opens coach conversation in Build mode

#### Adaptation System (Days 11-12)
**Scaling Pattern Detection**:
- Monitor workout logs for consistent scaling
- Compare prescribed vs. actual (weights, reps, modifications)
- Trigger adaptation when pattern detected (3+ consecutive similar scales)
- Regenerate future workouts with adjusted prescriptions

**Missed Workout Handling**:
- Track skipped workouts count and frequency
- Trigger adaptation when threshold hit (2+ consecutive or 3+ in 7 days)
- Reduce volume/intensity for next 1-2 workouts
- Log adaptation event with reasoning

**User Feedback Integration**:
- Collect feedback after workout completion (thumbs up/down, optional comment)
- Sentiment analysis on conversational feedback
- Adjust next phase programming based on cumulative feedback
- Coach explains adjustments proactively

#### Pause/Resume Logic (Day 13)
**Pause Implementation**:
- Update program status to "paused"
- Record pausedAt timestamp
- UI displays paused state with resume option

**Resume Implementation**:
- Calculate pause duration (resumeDate - pausedAt)
- Add to cumulative pausedDuration
- Recalculate all future workout scheduledDates
- Update status to "active"
- UI shows adjusted schedule

#### Workout Regeneration (Day 14)
**Conversation Detection**:
- Identify user requests to modify workouts
- Extract which workout (today, tomorrow, Day X, next week)
- Extract constraints (duration, equipment, difficulty)

**Regeneration Process**:
- Fetch current workout from S3
- Generate new version with constraints via Claude
- Maintain phase goals and progression
- Update S3 program data
- Log in adaptationHistory
- Notify user of changes

---

### Post-Week 2: Polish & Metrics (Days 15-17)

#### Metrics Instrumentation (Day 15)
- Add event logging to all program interactions
- CloudWatch metrics setup
- Initial dashboard creation (adherence, engagement, completion rates)

#### Bug Fixes & Edge Cases (Day 16)
- Test unusual scenarios (very short programs, very long programs, multiple pauses)
- Handle timezone edge cases
- Optimize S3 reads (caching strategy)
- Performance testing with multiple concurrent users

#### Documentation & Handoff (Day 17)
- Update API documentation
- Frontend component documentation
- Business logic rules reference
- Metrics interpretation guide

---

## Risk Mitigation

### Technical Risks

#### Risk 1: AI Generation Quality
**Issue**: Claude generates invalid or low-quality programs

**Mitigation**:
- Structured output validation (JSON schema enforcement)
- Fallback to retry with adjusted prompt if validation fails
- Manual review of first 20 programs created
- User feedback loop to catch quality issues early
- Coach personality testing across diverse scenarios

**Monitoring**:
- Track regeneration request rates (high rate = quality issue)
- Monitor user feedback sentiment
- Flag programs with >30% regeneration rate for review

---

#### Risk 2: Calendar/Date Calculation Bugs
**Issue**: Workout scheduling errors, pause/resume date shifts incorrect

**Mitigation**:
- Comprehensive unit tests for date calculations
- Test across timezone boundaries
- Handle edge cases (leap years, DST changes, year boundaries)
- Store dates in UTC, convert to user timezone for display
- Manual testing with various pause scenarios

**Monitoring**:
- Log all date calculations in CloudWatch
- Alert on negative day numbers or dates in past
- User-reported issues tagged for priority fixing

---

#### Risk 3: S3/DynamoDB Consistency
**Issue**: Program data in S3 doesn't match DynamoDB metadata

**Mitigation**:
- Atomic writes (update both S3 and DynamoDB in single operation)
- Retry logic with exponential backoff
- Validation checks on reads (verify S3 key exists)
- Graceful degradation (show summary if S3 unavailable)

**Monitoring**:
- Track S3 read/write errors
- Alert on missing S3 keys referenced in DynamoDB
- Weekly consistency audit (DynamoDB records vs. S3 objects)

---

### Business Logic Risks

#### Risk 4: User Confusion Around Pausing
**Issue**: Users don't understand how pause/resume shifts dates

**Mitigation**:
- Clear messaging: "When you resume, all future workouts shift forward by X days"
- Visual calendar shows before/after pause (grayed out dates)
- Confirmation dialog: "Your program will pause. Resume anytime to continue."
- Coach explains during resume: "Welcome back! Your schedule has shifted..."

**Monitoring**:
- Track pause/resume frequency (excessive pausing = confusion?)
- User feedback on pause feature
- Support tickets related to scheduling

---

#### Risk 5: Overwhelming Adaptation
**Issue**: Too many adaptations confuse users or break program coherence

**Mitigation**:
- Adaptation thresholds (must be significant pattern, not single occurrence)
- Limit adaptations per week (max 2-3 adjustments)
- Always explain adaptations to user (transparency)
- Allow user to revert adaptations if unwanted
- Coach suggests full program rebuild if >50% workouts adapted

**Monitoring**:
- Adaptation frequency per program
- User satisfaction with adapted workouts
- Completion rates for highly-adapted vs. original programs

---

#### Risk 6: Multiple Active Programs Per Coach
**Issue**: User creates second program with same coach, conflicts arise

**Mitigation**:
- Business rule: ONE active program per coach at a time
- If user requests new program, coach asks: "Want to replace your current program or create with a different coach?"
- UI prevents "Create Program" if active program exists (show "Manage Current Program" instead)
- Allow multiple programs across different coaches (no conflicts)

**Monitoring**:
- Validate in backend (return error if active program exists)
- Track attempts to create duplicate programs
- User feedback if restriction feels limiting

---

### User Experience Risks

#### Risk 7: Program Creation Takes Too Long
**Issue**: AI generation is slow (30+ seconds), user abandons

**Mitigation**:
- Async generation: Create placeholder program immediately, generate details in background
- Show progress indicator: "Building your program... Phase 1 complete... Phase 2 complete..."
- Optimize prompt length (only essential context)
- Use Claude Sonnet 4.5 efficiently (batch generate workouts, not one at a time)
- Fallback to Haiku for simpler programs (shorter duration, fewer phases)

**Monitoring**:
- Track generation time (target <20 seconds for 4-week program)
- Monitor timeout rates
- User abandonment during creation

---

#### Risk 8: Low Adoption (Users Don't Use Programs)
**Issue**: Users prefer ad-hoc training, don't see value in programs

**Mitigation**:
- Coach proactively suggests programs at right moment (after 2-3 weeks of consistent training)
- Highlight benefits: "Programs give you structure and progression - you'll see faster results"
- Trial period: "Let's try a 2-week program, see how you like it"
- Social proof: "85% of users with programs hit their goals faster"
- Easy exit: Users can abandon program anytime, return to ad-hoc training

**Monitoring**:
- Program creation rate (% of users who create at least one program)
- Active program rate (% of users with currently active program)
- Completion rate (indicates satisfaction)
- Survey feedback on why users don't use programs

---

## Post-MVP Roadmap

### Phase 2: Enhanced Adaptation (Weeks 3-4)

#### Smart Rescheduling
- AI suggests optimal training days based on user patterns
- Handle recurring constraints: "I can't train Wednesdays" → auto-adjust all Wednesdays
- Intelligent rest day placement based on workout intensity

#### Performance Data-Driven Adaptation
- Analyze PR trends, workout times, volume capacity
- Proactive suggestions: "Your squat strength is plateauing - let's add an extra strength day"
- Predictive adaptation: Adjust before user struggles, not after

#### Advanced Regeneration
- Bulk regeneration: "Make next week easier" → regenerates entire week
- Template variations: "Give me 3 options for Day 12" → user chooses preferred workout
- Swap entire phases: "Replace Phase 2 with more Olympic lifting focus"

---

### Phase 3: Analytics & Insights (Weeks 5-6)

#### Week-Over-Week Comparison
- Volume trends: "This week's volume: 15,000 lbs (↑ 12% from last week)"
- Intensity progression: "Average RPE: 7.5 (consistent with target)"
- Movement frequency: "Squatted 4x this week (up from 3x)"

#### Phase Performance Reports
- Phase summaries: "Phase 1 Recap: 9/10 workouts completed, 3 PRs, improved pull-up capacity"
- Cross-phase comparison: "Phase 2 volume was 30% higher than Phase 1"
- Goal progress: "You're 60% to your muscle-up goal based on current progression"

#### Program Comparison
- Compare multiple programs: "Your powerlifting program vs. CrossFit program - which built more strength?"
- Coach effectiveness: "Coach A's programs: 85% adherence, Coach B's: 72%"
- Historical trends: "Your adherence improves with shorter programs (4-week optimal)"

---

### Phase 4: Social & Community (Weeks 7-8)

#### Program Sharing
- Share program with friends: "Check out my competition prep program"
- Coach marketplace: Top coaches can publish program templates
- User testimonials: "I followed this program and hit my first muscle-up!"

#### Accountability Features
- Training partners: Share program with accountability buddy, both follow same program
- Leaderboards: Compete on adherence, completion rate, PR counts
- Milestone celebrations: Badges for phase completions, streak days, program finishes

#### Coach Collaboration
- Multi-coach programs: Strength coach + gymnastics coach co-create program
- Coach handoffs: "I'm on vacation, Coach B will manage your program this week"
- Coach feedback: User's coach A reviews user's program from coach B

---

### Phase 5: Advanced Features (Weeks 9-12)

#### Dynamic Program Adjustment
- AI autonomously adjusts programs based on real-time performance (no user prompt needed)
- Seasonal periodization: Programs adapt to competition calendar automatically
- Injury accommodation: User reports shoulder pain → AI modifies all overhead work

#### Integration with Wearables
- Pull data from Apple Watch, Whoop, Garbo
- HRV-based training: "Your recovery is low, reducing today's intensity"
- Sleep quality influences programming: Poor sleep → lighter workouts
- Real-time form feedback: Watch detects poor movement quality → coach intervenes

#### AI-Powered Form Coaching
- Computer vision analyzes workout videos
- Real-time cues: "Drop your hips lower in the catch"
- Progression tracking: "Your squat depth improved 15% since Day 1"
- Injury risk detection: "Your knee valgus is increasing - let's address that"

---

## Conclusion

### Summary
This implementation plan outlines a **2-week sprint to MVP** for NeonPanda's Training Program feature, with a clear **post-MVP roadmap** for continuous improvement. The design balances:

- **User-friendliness**: Conversation-driven creation, simple calendar interface
- **Intelligence**: AI-powered generation, adaptive programming, coach personality influence
- **Flexibility**: Pause/resume, workout regeneration, user feedback integration
- **Accountability**: Calendar scheduling, adherence tracking, completion metrics

### Success Definition
MVP is successful if:
1. ✅ Users can create programs conversationally with their coaches
2. ✅ Programs generate with correct phases, workouts, and scheduling
3. ✅ Users can pause/resume without data loss or confusion
4. ✅ Workouts can be marked complete/skipped and advance correctly
5. ✅ Adaptation system triggers on patterns and adjusts programming
6. ✅ Regeneration works via conversation (user requests, coach modifies)
7. ✅ Metrics instrumentation captures adherence, engagement, retention, sentiment
8. ✅ UI integrates with FloatingMenu and Training Grounds seamlessly

**Target Metrics at 2 Weeks Post-Launch**:
- 30%+ of active users have created at least one program
- 70%+ adherence rate for active programs
- 80%+ daily engagement rate (users with programs)
- 80%+ positive feedback sentiment

### Next Steps After Reading This Plan
1. **Review & Approve**: Founder validates approach, scope, priorities
2. **Technical Deep Dive**: AI editor translates this plan into implementation tasks
3. **Sprint Kickoff**: Begin Week 1 backend foundation
4. **Daily Check-ins**: Progress tracking, blockers resolution, scope adjustments
5. **Week 1 Demo**: Backend working, program generation tested
6. **Week 2 Demo**: Full MVP functional, ready for internal testing
7. **Launch**: Soft launch to beta users, monitor metrics, iterate

---

**This plan provides the strategic foundation. The implementation details (code, components, API contracts) will be determined by the AI editor based on this architecture and business logic.**

*Document Version: 1.0*
*Last Updated: 2025-01-XX*
*Status: Ready for Implementation*