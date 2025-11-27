# Training Program Schema
## Complete Documentation and AI Generation Guide

### Version 1.0 | Created for Custom Fitness AI Agents Platform

---

## Table of Contents

1. [Philosophy & Design Principles](#philosophy--design-principles)
2. [Schema Overview](#schema-overview)
3. [Core Program Structure](#core-program-structure)
4. [Workout Template Architecture](#workout-template-architecture)
5. [Natural Language Approach](#natural-language-approach)
6. [AI Generation Guidelines](#ai-generation-guidelines)
7. [Calendar & Scheduling System](#calendar--scheduling-system)
8. [Implementation Strategy](#implementation-strategy)
9. [Extension & Evolution Guide](#extension--evolution-guide)
10. [Complete Schema Reference](#complete-schema-reference)

---

## Philosophy & Design Principles

### Core Design Philosophy

This schema enables **AI coaches to generate complete multi-week training programs through natural conversation**, then structure them into intelligent systems that provide progression, accountability, and adaptation. The design balances three critical requirements:

1. **Conversational Program Creation**: Users describe goals naturally, AI generates structured programs
2. **Human-Readable Templates**: Workout prescriptions read like a coach wrote them, not like JSON
3. **Intelligent Calendar Systems**: Phase-aware scheduling with timezone-correct "today" detection

### Key Design Principles

#### 1. **Conversation-to-Structure Pipeline**
```
User Conversation (Build Mode)
├── AI extracts program requirements (goals, timeline, equipment)
├── Generates phase structure with progression logic
├── Creates daily workout templates in natural language
└── Produces calendar with timezone-aware scheduling
```

Users describe what they want:
- *"I need an 8-week program to increase my squat and build conditioning"*
- *"Training 4 days a week, have a barbell and pullup bar in my garage"*
- *"Competition is March 15th, need to peak for that"*

AI structures this into periodized programs with intelligent progression.

#### 2. **Natural Language Templates, Structured Metadata**
```
Workout Template Architecture
├── workoutContent (natural language prescription)
├── coachingNotes (form cues, scaling, motivation)
├── prescribedExercises (lightweight reference array)
└── metadata (status, dates, linking, adaptation history)
```

**Human-Readable Example:**
```
Warmup (10 minutes):
Hip circles, leg swings, deep squat holds, PVC pass-throughs.
Get the hips and shoulders mobile before we load them.

Strength Block:
Back Squat 5x5 @ 205lbs (75% of your estimated 1RM ~275lbs)
Focus on hitting depth consistently every rep. Feel your weight
shift to mid-foot at the bottom. Keep chest up throughout the
movement. Rest 3 minutes between sets. Film your heavy set if
possible - I want to see depth consistency.

Scale: If form breaks, reduce weight 10% immediately.
```

When users log from this template, AI converts their performance into Universal Workout Schema.

#### 3. **Phase-Based Periodization**
- Programs divided into training phases (Foundation, Development, Peak, Deload)
- Each phase has clear focus areas and progression strategies
- Sequential day numbering ensures proper calendar generation
- Progressive overload built into phase transitions

#### 4. **Timezone-Aware Intelligence**
- Calendar calculations use user's local timezone (not server UTC)
- "Today's workout" detection accurate regardless of location
- Handles rest days, pauses, and real-world schedule chaos
- Defaults to America/Los_Angeles if user timezone not set

#### 5. **Adaptation by Design**
```
Template Lifecycle
├── pending (not yet trained)
├── completed (logged with performance data)
├── skipped (recorded but not trained)
├── adapted (regenerated based on feedback)
└── linkedWorkoutId (references actual logged workout)
```

Templates can be regenerated based on:
- User feedback ("too heavy", "felt easy")
- Missed workouts (life happens)
- Performance trends (progressing faster/slower than expected)
- Equipment changes or injuries

#### 6. **Optional, Not Mandatory**
Training Programs are one way to use NeonPanda. Users can:
- Follow AI-generated programs (structured periodization)
- Follow personal trainer programs (log for accountability)
- Train intuitively (chat with coach, log individual workouts)
- Mix approaches (program for strength, intuitive for conditioning)

---

## Schema Overview

### High-Level Structure

```json
{
  // Core Program Identity
  "programId": "program_{userId}_{timestamp}_{shortId}",
  "userId": "user_reference",
  "coachId": "coach_reference",
  "name": "Program name (concise, descriptive)",
  "description": "1-2 sentence overview",

  // Timeline & Scheduling
  "totalDays": 56,
  "trainingFrequency": 4,
  "startDate": "2025-01-20",
  "endDate": null,
  "status": "active|completed|paused|abandoned",

  // Program Structure
  "phases": [
    {
      "phaseId": "phase_1",
      "name": "Foundation Building",
      "startDay": 1,
      "endDay": 21,
      "description": "Build movement patterns and work capacity",
      "focusAreas": ["technique", "conditioning", "movement_quality"]
    }
  ],

  // Goals & Constraints
  "trainingGoals": ["increase squat 1RM", "improve conditioning"],
  "equipmentConstraints": ["barbell", "pullup bar", "dumbbells"],

  // Progress Tracking
  "completedWorkouts": 0,
  "totalPlannedWorkouts": 32,
  "adherenceRate": 0,
  "lastCompletedDay": null,

  // Calendar & Scheduling
  "pauseHistory": [],
  "calendar": {
    "daysGenerated": [...],
    "todayIndex": 5,
    "currentPhaseId": "phase_1"
  },

  // Metadata
  "createdAt": "ISO timestamp",
  "lastActivityAt": "ISO timestamp",
  "isDeleted": false
}
```

### Workout Template Structure

```json
{
  "templateId": "template_day1_primary",
  "dayNumber": 1,
  "templateType": "primary|optional|accessory",
  "templatePriority": 1,
  "scheduledDate": "2025-01-20",
  "phaseId": "phase_1",

  // Template Identity
  "name": "Lower Body Strength - Squat Focus",
  "description": "Build squat strength with high-quality movement",
  "estimatedDuration": 75,
  "requiredEquipment": ["barbell", "squat rack"],

  // Natural Language Content (PRIMARY)
  "workoutContent": "Warmup (10 minutes):\n...\n\nStrength Block:\n...",
  "coachingNotes": "Focus on depth and bar speed. Film heavy sets.",

  // Lightweight Exercise Reference
  "prescribedExercises": [
    {
      "exerciseName": "Back Squat",
      "movementType": "barbell"
    }
  ],

  // Status & Linking
  "status": "pending|completed|skipped",
  "completedAt": null,
  "linkedWorkoutId": null,
  "userFeedback": null,
  "adaptationHistory": []
}
```

---

## Core Program Structure

### Program Identification

#### programId Pattern
```
Format: program_{userId}_{timestamp}_{shortId}
Example: program_user123_1705708800000_a1b2c3

Components:
- entityType: "program" (entity namespace)
- userId: User-scoped (not coach-scoped)
- timestamp: Creation timestamp for chronological sorting
- shortId: Random identifier for uniqueness
```

**Why User-Scoped:**
- Users may have multiple coaches
- Programs belong to users, not coaches
- Enables cross-coach analytics and program comparison

### Timeline & Duration

#### totalDays
Total program duration in days (includes training and rest days).

```typescript
totalDays: number // 21, 42, 56, 84, etc.
```

**Common Program Lengths:**
- 3 weeks (21 days): Short cycle, technique focus
- 6 weeks (42 days): Build phase
- 8 weeks (56 days): Complete strength or conditioning cycle
- 12 weeks (84 days): Competition preparation

#### trainingFrequency
Number of training days per week (rest days scheduled automatically).

```typescript
trainingFrequency: number // 3, 4, 5, or 6
```

**Frequency Guidelines:**
- 3x/week: Beginners, busy schedules, full-body focus
- 4x/week: Most common, balanced load
- 5x/week: Advanced athletes, competition prep
- 6x/week: Elite training, structured deloads critical

#### startDate
Program start date in user's local timezone (YYYY-MM-DD).

```typescript
startDate: string // "2025-01-20"
```

**Timezone Handling:**
- Stored in user's timezone for calendar accuracy
- "Today's workout" calculated using user timezone
- Defaults to America/Los_Angeles if no timezone preference set
- Critical for international users

### Status Management

```typescript
status: "active" | "completed" | "paused" | "abandoned"
```

**Status Definitions:**

- **active**: Currently in progress, user training
- **completed**: Successfully finished entire program
- **paused**: Temporarily stopped (injury, vacation, life event)
- **abandoned**: User stopped without completing (not a failure, just life)

**Pause History:**
```json
{
  "pauseHistory": [
    {
      "pausedAt": "2025-01-25",
      "resumedAt": "2025-02-01",
      "reason": "vacation",
      "daysPaused": 7
    }
  ]
}
```

Pause functionality enables:
- Calendar recalculation on resume
- Adherence metrics adjustment
- Coach awareness of breaks
- Realistic timeline management

### Goals & Constraints

#### trainingGoals
User's specific objectives for this program (extracted from conversation).

```typescript
trainingGoals: string[]
```

**Examples:**
```json
{
  "trainingGoals": [
    "increase back squat 1RM from 275lbs to 315lbs",
    "improve Fran time to sub-8 minutes",
    "build conditioning for Open workouts",
    "maintain strength during endurance training block"
  ]
}
```

**Goal Quality Standards:**
- Specific and measurable when possible
- Time-bound (implied by program duration)
- Realistic based on training age
- Aligned with phase structure

#### equipmentConstraints
Available equipment (limits exercise selection).

```typescript
equipmentConstraints: string[]
```

**Common Equipment:**
```json
{
  "equipmentConstraints": [
    "barbell",
    "squat rack",
    "pullup bar",
    "dumbbells",
    "kettlebells",
    "assault bike",
    "rower",
    "rings",
    "jump rope",
    "plyo box"
  ]
}
```

AI respects these constraints:
- Only prescribes exercises using available equipment
- Suggests alternatives if standard movements unavailable
- Adapts program structure to equipment limitations
- Garage gym programs different from full-facility programs

---

## Workout Template Architecture

### Template Identity & Classification

#### templateId Pattern
```
Format: template_day{dayNumber}_primary
Example: template_day1_primary, template_day23_primary

Components:
- prefix: "template" (entity type)
- dayNumber: 1-indexed day within program
- classification: primary|optional|accessory
```

#### templateType
Workout classification for prioritization.

```typescript
templateType: "primary" | "optional" | "accessory"
```

**Type Definitions:**

- **primary**: Main prescribed workout for the day (90% of templates)
- **optional**: Bonus work if time/energy available (rare)
- **accessory**: Extra work for specific weaknesses (rare)

**Most programs use only "primary" templates.** Optional/accessory templates are advanced features for athletes with extra training capacity.

#### templatePriority
Display order when multiple templates exist for one day.

```typescript
templatePriority: number // 1 = highest priority
```

Standard: `templatePriority: 1` for primary daily workout.

### Template Metadata

#### name
Concise workout title describing focus.

```typescript
name: string
```

**Naming Patterns:**
```
"Lower Body Strength - Squat Focus"
"Upper Body Push - Bench Press + Accessories"
"Conditioning - AMRAP + Intervals"
"Olympic Lifting - Snatch Complex"
"Active Recovery - Mobility + Light Cardio"
```

**Naming Guidelines:**
- Lead with body region or energy system
- Include primary movement or modality
- Keep under 60 characters
- Clear at-a-glance purpose

#### description
One-sentence overview of what workout accomplishes.

```typescript
description: string
```

**Examples:**
```
"Build squat strength with high-quality movement patterns"
"Develop upper body pressing power and shoulder stability"
"Improve aerobic capacity through interval work"
"Practice Olympic lifting technique at moderate loads"
"Promote recovery while maintaining movement quality"
```

#### estimatedDuration
Realistic time to complete (minutes).

```typescript
estimatedDuration: number // 45-120 typically
```

**Duration Guidelines:**
- Warmup: 10-15 minutes
- Strength work: 30-60 minutes
- Conditioning: 10-30 minutes
- Cooldown/mobility: 5-10 minutes

**Common Totals:**
- 45-60 min: Focused strength or conditioning session
- 60-75 min: Combined strength + conditioning
- 75-90 min: Full training session with accessories
- 90-120 min: Competition-style or high-volume day

**Rest Day Templates:** 15-30 minutes (mobility, stretching, light cardio)

#### requiredEquipment
Subset of program equipment needed for this workout.

```typescript
requiredEquipment: string[]
```

```json
{
  "requiredEquipment": ["barbell", "squat rack", "pullup bar"]
}
```

Enables:
- Quick "can I do this workout today?" check
- Equipment-based workout filtering
- Home vs. gym session planning
- Travel adaptation ("what can I do with hotel gym equipment?")

---

## Natural Language Approach

### Philosophy: Write Like a Coach

Traditional fitness apps store workouts as rigid JSON:
```json
{
  "exercises": [
    {
      "name": "Back Squat",
      "sets": 5,
      "reps": 5,
      "weight": {"value": 205, "unit": "lbs"},
      "rest": 180
    }
  ]
}
```

**Problems with Structured Approach:**
1. Loses coaching nuance and context
2. Can't express "if form breaks, reduce weight"
3. No space for motivational cues
4. Feels robotic, not human
5. Difficult to express complex protocols

### Natural Language Template Design

#### workoutContent Field (PRIMARY)

This is the workout prescription written as a **human coach writes it**.

```typescript
workoutContent: string // Natural language, NOT JSON
```

**Example:**
```
Warmup (10 minutes):
Hip circles, leg swings, deep squat holds, PVC pass-throughs.
Get the hips and shoulders mobile before we load them.

Strength Block:
Back Squat 5x5 @ 205lbs (75% of your estimated 1RM ~275lbs)
Focus on hitting depth consistently every rep. Feel your weight
shift to mid-foot at the bottom. Keep chest up throughout the
movement. Rest 3 minutes between sets. Film your heavy set if
possible - I want to see depth consistency.

Scale: If form breaks, reduce weight 10% immediately.

Bulgarian Split Squat 3x10 each leg @ 40lb dumbbells
10 reps per leg. Focus on front leg doing the work. Keep torso
upright. Rest 90 seconds between sets.

Conditioning Finisher:
EMOM 10: 10 calories assault bike
Moderate pace—should finish with 20-30 seconds rest. This is
conditioning work, not a sprint. Keep breathing controlled.
```

**Content Structure Guidelines:**

1. **Clear Sections**
   - Warmup
   - Strength/Main Work
   - Accessory Work
   - Conditioning/Finisher
   - Cooldown

2. **Exercise Specificity**
   - Sets x Reps format (5x5, 3x10, etc.)
   - Load prescription (weight, % of 1RM, RPE)
   - Rest periods between sets
   - Tempo if relevant

3. **Coaching Cues**
   - Form focus points
   - What should feel like
   - Common mistakes to avoid
   - When to scale or stop

4. **Intensity Guidance**
   - RPE (Rate of Perceived Exertion)
   - Percentage of 1RM
   - "Should feel like X"
   - Breathing/pacing cues

5. **Scaling Options**
   - If/then conditions
   - Beginner modifications
   - Equipment substitutions

**AI Generation Requirements:**

When generating `workoutContent`, AI must:
- Write in second person ("you", not "the athlete")
- Use complete sentences and paragraphs
- Include specific numbers (sets, reps, weights, rest)
- Add motivational language naturally
- Structure with clear sections
- Provide context for why exercises matter
- Include practical coaching cues

#### coachingNotes Field

Additional context NOT in workoutContent.

```typescript
coachingNotes: string
```

**Purpose:**
- Meta-commentary on workout goals
- Scaling guidance beyond what's in content
- Connection to program phase objectives
- What to watch for today
- Recovery emphasis

**Example:**
```
This is your first heavy squat day of the phase. We're establishing
baselines, so don't chase PRs. Focus on consistent depth and bar
speed. If 205 feels too light, that's fine—we're building over 6 weeks.
Priority is technique quality, not load.

Recovery note: You mentioned feeling tired yesterday. If you're still
dragging today, reduce all working sets by 10% and add 5 minutes to
rest periods. Better to nail technique at 185 than grind ugly reps at 205.
```

**When to Use coachingNotes:**
- Phase-specific context
- Intensity/recovery guidance
- Connections to long-term goals
- Safety considerations
- Mindset framing

#### prescribedExercises Field (LIGHTWEIGHT)

Minimal structured reference for filtering and analytics.

```typescript
prescribedExercises: Array<{
  exerciseName: string
  movementType: 'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' | 'gymnastics' | 'cardio' | 'other'
}>
```

**Purpose:**
- Enable "show me all squat days" filtering
- Movement pattern balance analysis
- Exercise progression tracking
- Quick scan of workout focus

**NOT for:**
- Detailed set/rep/load data (that's in workoutContent)
- Complete exercise listing (only main movements)
- Warmup or cooldown exercises

**Example:**
```json
{
  "prescribedExercises": [
    {
      "exerciseName": "Back Squat",
      "movementType": "barbell"
    },
    {
      "exerciseName": "Bulgarian Split Squat",
      "movementType": "dumbbell"
    },
    {
      "exerciseName": "Assault Bike",
      "movementType": "cardio"
    }
  ]
}
```

**Extraction Rules:**
- 3-5 exercises maximum
- Main work only (skip warmup)
- Compound movements prioritized
- Conditioning modality included

---

## AI Generation Guidelines

### Phase 1: Program Structure Generation

**Input:** Build mode conversation history

**Process:**
1. Extract user goals, timeline, constraints
2. Determine appropriate program length (weeks)
3. Calculate training frequency based on availability
4. Design phase structure with progression logic
5. Assign focus areas to each phase

**Output:** Training Program Structure (sans workout templates)

**AI Extraction Prompt Pattern:**
```
Analyze the conversation and extract:
- User's primary training goals (specific, measurable)
- Program duration (explicitly stated or inferred from goals)
- Training frequency (days per week they can commit)
- Available equipment (explicitly mentioned)
- Phase structure (how many phases, what each focuses on)

Return structured JSON following TRAINING_PROGRAM_STRUCTURE_SCHEMA.
```

**Quality Checks:**
- Phases cover entire program duration (day 1 to totalDays)
- Phase start/end days are sequential and non-overlapping
- Training frequency realistic (3-6 days/week)
- Equipment list complete but not over-specified
- Goals specific enough to guide programming

### Phase 2: Workout Template Generation

**Input:**
- Program structure
- Single phase details
- Coach personality/methodology context

**Process:**
1. Generate templates for phase duration (e.g., 21 days)
2. Write each as natural language workout prescription
3. Apply progressive overload across phase
4. Schedule training vs. rest days per frequency
5. Ensure exercise variety within phase focus

**Output:** Array of workout templates for the phase

**AI Generation Prompt Pattern:**
```
Generate {phaseDurationDays} daily workout templates for:
- Phase: {phaseName}
- Focus: {phaseDescription}
- Frequency: {trainingFrequency}x per week
- Equipment: {equipmentList}
- Goals: {programGoals}

Write workoutContent in natural language like a coach writes.
Include form cues, scaling options, and motivational context.

Return array of templates following WORKOUT_TEMPLATE_STRUCTURE_SCHEMA.
```

**Quality Checks:**
- Exactly correct number of templates generated
- Day numbers sequential (startDay to endDay)
- Training frequency respected (rest days included)
- Progressive overload evident across templates
- Equipment constraints honored
- workoutContent is natural prose (NOT JSON or structured format)
- coachingNotes add value beyond workoutContent

**Rest Day Templates:**
```json
{
  "templateType": "optional",
  "name": "Active Recovery",
  "estimatedDuration": 20,
  "workoutContent": "Light movement day. 15 minutes easy row or bike,
                     keeping heart rate conversational. Follow with 10
                     minutes of stretching focusing on hips and shoulders.
                     The goal is blood flow and mobility, not training stress."
}
```

### Phase 3: Normalization & Validation

**After generation, validate:**

1. **Structure Integrity**
   - All required fields present
   - Data types correct
   - Dates in YYYY-MM-DD format

2. **Logical Consistency**
   - Phase dates don't overlap
   - Template days match phase ranges
   - Equipment usage matches constraints

3. **Content Quality**
   - workoutContent is natural language
   - Contains specific sets/reps/loads
   - Includes coaching cues
   - Provides scaling options

4. **Progressive Overload**
   - Load/volume increases across templates
   - Deload week if program >4 weeks
   - Phase transitions make sense

**AI Normalization Prompt:**
```
Review generated training program for:
- Structural correctness
- Logical consistency
- Content quality
- Progressive overload

If issues found, fix them and return corrected program.
If acceptable, return original with validation confirmation.
```

### Prompt Caching Strategy

**Cacheable Content:**
- Coach personality and methodology
- Universal coaching principles
- Schema definitions
- JSON formatting instructions

**Dynamic Content:**
- User's specific goals and constraints
- Conversation context
- Phase-specific details
- Equipment availability

**Implementation:**
```typescript
// Cache (90% of prompt)
const cachedPrompt = `
You are ${coachName}, a ${methodology} coach.
${coachPersonality}
${programSchemaDefinition}
${jsonFormattingInstructions}
`;

// Dynamic (10% of prompt)
const dynamicPrompt = `
Generate program for:
User Goals: ${userGoals}
Duration: ${duration}
Frequency: ${frequency}
Equipment: ${equipment}
`;
```

---

## Calendar & Scheduling System

### Calendar Generation

When program is created, generate calendar of all days:

```typescript
interface ProgramCalendarDay {
  dayNumber: number              // 1-indexed day within program
  calendarDate: string           // "YYYY-MM-DD" in user timezone
  dayType: 'training' | 'rest'   // Based on training frequency
  phaseId: string                // Which phase this day belongs to
  templateIds: string[]          // Templates prescribed for this day
  status: 'pending' | 'completed' | 'skipped'
  completedAt: string | null
}
```

**Generation Logic:**
```typescript
function generateCalendar(
  startDate: string,
  totalDays: number,
  trainingFrequency: number,
  phases: Phase[]
): ProgramCalendarDay[] {
  const calendar = [];
  const start = new Date(startDate);

  for (let day = 1; day <= totalDays; day++) {
    const date = addDays(start, day - 1);
    const dayOfWeek = date.getDay();

    // Determine if training or rest day
    const isTrainingDay = calculateTrainingDay(
      day,
      trainingFrequency,
      dayOfWeek
    );

    // Find phase for this day
    const phase = phases.find(p =>
      day >= p.startDay && day <= p.endDay
    );

    calendar.push({
      dayNumber: day,
      calendarDate: formatDate(date),
      dayType: isTrainingDay ? 'training' : 'rest',
      phaseId: phase.phaseId,
      templateIds: [], // Populated when templates generated
      status: 'pending',
      completedAt: null
    });
  }

  return calendar;
}
```

### "Today's Workout" Detection

**Critical: Use user's timezone, not server UTC**

```typescript
function getTodaysWorkout(
  program: Program,
  userTimezone: string = 'America/Los_Angeles'
): ProgramCalendarDay | null {
  // Get today's date in user's timezone
  const today = getTodayInTimezone(userTimezone); // "YYYY-MM-DD"

  // Find matching calendar day
  const todayEntry = program.calendar.daysGenerated.find(
    day => day.calendarDate === today
  );

  return todayEntry || null;
}
```

**Why Timezone Matters:**

User in New York (EST) at 11 PM:
- Server (UTC): Next day
- User's timezone: Still current day
- "Today's workout" must reflect USER's perception

Solution: Always calculate using `getUserTimezoneOrDefault()` from date-utils.

### Pause & Resume Logic

**Pausing a Program:**
```typescript
function pauseProgram(
  programId: string,
  reason: string,
  pausedAt: string
): void {
  updateProgram(programId, {
    status: 'paused',
    pauseHistory: [
      ...existingHistory,
      {
        pausedAt,
        resumedAt: null,
        reason,
        daysPaused: null
      }
    ]
  });
}
```

**Resuming a Program:**
```typescript
function resumeProgram(
  programId: string,
  resumedAt: string
): void {
  const pauseEntry = getLatestPause(programId);
  const daysPaused = calculateDaysBetween(
    pauseEntry.pausedAt,
    resumedAt
  );

  // Update pause record
  pauseEntry.resumedAt = resumedAt;
  pauseEntry.daysPaused = daysPaused;

  // Regenerate calendar with shifted dates
  const newCalendar = regenerateCalendar(
    programId,
    daysPaused
  );

  updateProgram(programId, {
    status: 'active',
    calendar: newCalendar,
    pauseHistory: updatedHistory
  });
}
```

**Calendar Shift Logic:**
After pause, shift all future calendar dates forward:
```
Before Pause:
- Day 5: 2025-01-25
- Day 6: 2025-01-26 (paused here)
- Day 7: 2025-01-27

After 7-Day Pause:
- Day 5: 2025-01-25 (unchanged, already completed)
- Day 6: 2025-02-02 (shifted +7 days)
- Day 7: 2025-02-03 (shifted +7 days)
```

---

## Implementation Strategy

### DynamoDB Storage

**Training Programs (Metadata):**
```
Table: AllItems
PK: user#{userId}
SK: program#{programId}

Attributes:
- All program metadata
- Phase structure
- Goals, equipment
- Progress tracking
- Calendar summary (NOT full calendar)
```

**Rationale:** Calendar can be 50+ days × 200+ bytes = 10KB+. Too large for DynamoDB item. Store calendar in S3.

### S3 Storage

**Program Details + Full Calendar:**
```
Bucket: midgard-apps-{branch}
Key: programs/{userId}/{programId}/details.json

Content:
{
  "programStructure": {...},
  "calendar": {
    "daysGenerated": [...],
    "todayIndex": 5,
    "currentPhaseId": "phase_1"
  }
}
```

**Workout Templates:**
```
Key: programs/{userId}/{programId}/workout-templates.json

Content: [
  { templateId, dayNumber, workoutContent, ... },
  ...
]
```

**Benefits:**
- Large data (50+ templates) stored efficiently
- Reduces DynamoDB item size
- Easy to regenerate templates per phase
- Presigned URLs for secure frontend access

### Pinecone Integration

**Store Program Summaries for Semantic Search:**

```typescript
interface ProgramPineconeMetadata {
  programId: string
  userId: string
  coachId: string
  name: string
  description: string

  // Searchable arrays (strings only)
  phaseNames: string[]              // ["Foundation", "Development", "Peak"]
  allFocusAreas: string[]           // ["strength", "conditioning", "power"]

  // Numeric metadata
  totalDays: number
  trainingFrequency: number
  completedWorkouts: number
  adherenceRate: number

  // Dates
  startDate: string                 // "2025-01-20"
  createdAt: string
}
```

**Embedding Content:**
```
Program: {name}

Description: {description}

Duration: {totalDays} days over {phases.length} phases
Training {trainingFrequency}x per week

Goals: {trainingGoals.join(', ')}

Phases:
- {phase1.name}: {phase1.description}
- {phase2.name}: {phase2.description}
...

Equipment: {equipmentConstraints.join(', ')}

Focus Areas: {allFocusAreas.join(', ')}
```

**Use Cases:**
- Coach references past programs: *"You ran a similar strength cycle last year"*
- Program recommendation: *"Based on your goals, here's a program structure"*
- Learning from history: *"Your last 8-week program had 87% adherence"*

**CRITICAL:** Do NOT store complex objects (phases array) in metadata. Pinecone requires flat structures. Store `phaseNames` and `allFocusAreas` as string arrays instead.

### API Endpoints

**Create Training Program:**
```
POST /programs
Body: { userId, coachId, conversationContext }
Response: { programId, name, phases, templateCount }
```

**Get Training Program:**
```
GET /programs/{programId}
Query: ?userId={userId}
Response: { program metadata, S3 presigned URLs for details/templates }
```

**Update Training Program:**
```
PUT /programs/{programId}
Body: { partial updates }
Response: { updated program }
```

**Delete Training Program:**
```
DELETE /programs/{programId}
Query: ?userId={userId}
Response: { success }
```

**List User's Programs:**
```
GET /programs
Query: ?userId={userId}&status=active
Response: { programs: [...] }
```

**Get Today's Workout:**
```
GET /programs/{programId}/today
Query: ?userId={userId}
Response: { calendarDay, template(s), phaseContext }
```

### Async Lambda Pattern

**Program Generation is Asynchronous:**

```typescript
// User conversation triggers program generation
// Stream handler detects [GENERATE_PROGRAM] trigger
// Invokes async Lambda

await invokeAsyncLambda('build-program', {
  conversationId,
  userId,
  coachId,
  conversationMessages: buildModeMessages
});

// Lambda runs in background:
// 1. Extract program structure
// 2. Normalize structure
// 3. Save program to DynamoDB
// 4. For each phase:
//    - Generate workout templates
//    - Normalize templates
//    - Store in S3
// 5. Generate Pinecone summary
// 6. Store in Pinecone
```

**Why Async:**
- Generation takes 30-60 seconds (multiple AI calls)
- User shouldn't wait for streaming to complete
- Contextual updates during generation ("Building your program...")
- Error handling without blocking conversation

---

## Extension & Evolution Guide

### Adding New Template Features

**Example: Add Video Links**

1. **Update Schema:**
```typescript
interface WorkoutTemplate {
  // ... existing fields ...
  videoLinks?: Array<{
    exerciseName: string
    videoUrl: string
    description: string
  }>
}
```

2. **Update AI Generation:**
```typescript
// Add to prompt context
const videoGuidance = `
If user needs form guidance, suggest video links:
- Use YouTube or coaching platform URLs
- Match exercises in prescribedExercises
- Include brief description of what video shows
`;
```

3. **Backward Compatible:**
- Field is optional
- Existing templates work without it
- Frontend checks for presence before rendering

### Adding New Program Types

**Example: Add Competition Peaking Programs**

1. **Add Program Type:**
```typescript
interface Program {
  // ... existing fields ...
  programType?: 'general' | 'competition_prep' | 'off_season' | 'rehabilitation'
  competitionDate?: string // For competition_prep type
  targetEvent?: string     // "CrossFit Open", "Powerlifting Meet"
}
```

2. **Update Generation Logic:**
```typescript
// Competition programs peak toward date
if (programType === 'competition_prep') {
  // Last week: taper/deload
  // Week before: test lifts
  // Phases: build → intensify → peak → taper
}
```

3. **Update Calendar:**
```typescript
// Add countdown to competition
interface CalendarDay {
  // ... existing fields ...
  daysUntilCompetition?: number // For competition_prep programs
}
```

### Supporting Program Templates

**Future: Pre-built Program Templates**

Instead of generating from scratch, offer templates:

```typescript
interface ProgramTemplate {
  templateId: string
  name: string              // "8-Week Squat Cycle"
  description: string
  categoryTags: string[]    // ["strength", "squat", "powerlifting"]

  // Template structure (user fills in specifics)
  durationWeeks: number
  suggestedFrequency: number
  requiredEquipment: string[]

  // Parameterized workouts
  phaseTemplates: PhaseTemplate[]
  workoutTemplates: WorkoutTemplate[]

  // User customization
  customizationOptions: {
    canAdjustFrequency: boolean
    canSubstituteExercises: boolean
    canModifyDuration: boolean
  }
}
```

**User Flow:**
1. Browse template library
2. Select template
3. AI customizes for user's equipment/schedule
4. Generate personalized version

**Benefit:** Faster program creation for common goals.

### Coach Learning & Adaptation

**Future: Coaches Learn from Program Outcomes**

```typescript
interface ProgramOutcome {
  programId: string
  userId: string
  coachId: string

  // Completion metrics
  adherenceRate: number
  completedWorkouts: number
  averageWorkoutRating: number

  // Goal achievement
  goalsAchieved: string[]      // Which goals were met
  goalsMissed: string[]        // Which goals were not met
  unexpectedBenefits: string[] // Bonus improvements

  // User feedback
  userSatisfaction: number     // 1-10
  wouldRepeatProgram: boolean
  tooEasy: boolean
  tooHard: boolean
  goodPacing: boolean

  // Program characteristics
  phaseStructure: string[]
  totalVolume: number
  averageIntensity: number
}
```

**Learning System:**
- Store outcomes in Pinecone
- Coach queries past programs with similar goals
- AI learns: "When user wants to increase squat, 6-week programs with 4x frequency had 90% success rate"
- Future programs informed by historical success

---

## Complete Schema Reference

### Program Interface

```typescript
interface Program {
  // Core Identity
  programId: string                    // program_{userId}_{timestamp}_{shortId}
  userId: string                       // User who owns program
  coachId: string                      // Coach who created program

  // Program Identity
  name: string                         // Concise program name
  description: string                  // 1-2 sentence overview

  // Timeline
  totalDays: number                    // Total program duration
  trainingFrequency: number            // Training days per week (3-6)
  startDate: string                    // "YYYY-MM-DD" in user timezone
  endDate: string | null               // Calculated or null if in progress

  // Status
  status: 'active' | 'completed' | 'paused' | 'abandoned'

  // Structure
  phases: ProgramPhase[]       // Array of training phases

  // Goals & Constraints
  trainingGoals: string[]              // User's specific objectives
  equipmentConstraints: string[]       // Available equipment

  // Progress Tracking
  completedWorkouts: number            // Workouts logged from program
  totalPlannedWorkouts: number         // Total training days
  adherenceRate: number                // 0-100 percentage
  lastCompletedDay: number | null      // Last day user trained

  // Pause Tracking
  pauseHistory: ProgramPause[]

  // Calendar (stored in S3)
  calendar?: ProgramCalendar   // Full calendar (S3 only)

  // Metadata
  createdAt: string                    // ISO timestamp
  lastActivityAt: string               // ISO timestamp
  isDeleted: boolean                   // Soft delete flag
}
```

### ProgramPhase Interface

```typescript
interface ProgramPhase {
  phaseId: string                      // "phase_1", "phase_2", etc.
  name: string                         // "Foundation Building", "Strength Development"
  startDay: number                     // 1-indexed day within program
  endDay: number                       // 1-indexed day within program
  description: string                  // What this phase focuses on
  focusAreas: string[]                 // ["strength", "conditioning", "power"]

  // Computed
  durationDays?: number                // endDay - startDay + 1
  isCurrentPhase?: boolean             // Calculated based on today
}
```

### WorkoutTemplate Interface

```typescript
interface WorkoutTemplate {
  // Template Identity
  templateId: string                   // "template_day1_primary"
  dayNumber: number                    // 1-indexed day within program
  templateType: 'primary' | 'optional' | 'accessory'
  templatePriority: number             // 1 = highest
  scheduledDate: string                // "YYYY-MM-DD"
  phaseId: string                      // Which phase this belongs to

  // Template Metadata
  name: string                         // Workout title
  description: string                  // One-sentence overview
  estimatedDuration: number            // Minutes
  requiredEquipment: string[]          // Subset of program equipment

  // Natural Language Content (PRIMARY)
  workoutContent: string               // Coach-written workout prescription
  coachingNotes: string                // Additional context and cues

  // Lightweight Exercise Reference
  prescribedExercises: PrescribedExercise[]

  // Status & Linking
  status: 'pending' | 'completed' | 'skipped'
  completedAt: string | null           // ISO timestamp
  linkedWorkoutId: string | null       // References logged workout

  // Adaptation
  userFeedback: string | null          // "too heavy", "felt great", etc.
  adaptationHistory: TemplateAdaptation[]
}
```

### PrescribedExercise Interface

```typescript
interface PrescribedExercise {
  exerciseName: string                 // "Back Squat", "Assault Bike"
  movementType: 'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' |
                'gymnastics' | 'cardio' | 'other'
}
```

### ProgramCalendar Interface

```typescript
interface ProgramCalendar {
  daysGenerated: ProgramCalendarDay[]
  todayIndex: number | null            // Index of today's day (or null)
  currentPhaseId: string | null        // Current phase user is in
}

interface ProgramCalendarDay {
  dayNumber: number                    // 1-indexed
  calendarDate: string                 // "YYYY-MM-DD" in user timezone
  dayType: 'training' | 'rest'
  phaseId: string
  templateIds: string[]                // Templates prescribed for this day
  status: 'pending' | 'completed' | 'skipped'
  completedAt: string | null
}
```

### ProgramPause Interface

```typescript
interface ProgramPause {
  pausedAt: string                     // "YYYY-MM-DD"
  resumedAt: string | null             // "YYYY-MM-DD" or null if still paused
  reason: string                       // "injury", "vacation", "life event"
  daysPaused: number | null            // Calculated when resumed
}
```

### TemplateAdaptation Interface

```typescript
interface TemplateAdaptation {
  adaptedAt: string                    // ISO timestamp
  reason: string                       // Why template was regenerated
  previousContent: string              // Original workoutContent
  newContent: string                   // Adapted workoutContent
  triggeredBy: 'user_feedback' | 'coach_decision' | 'automated_adjustment'
}
```

---

## Version History

### Version 1.0 (January 2025)
- Initial training program schema definition
- Natural language workout template approach
- Phase-based periodization structure
- Timezone-aware calendar system
- DynamoDB + S3 hybrid storage strategy
- Pinecone integration for semantic program search
- Async generation with contextual updates

---

## Related Documentation

- **Universal Workout Schema**: How logged workouts from templates are stored
- **Universal Analytics Schema**: How program adherence and progression are analyzed
- **Coach Config Schema**: How coach personality influences program generation
- **User Profile Schema**: How timezone preferences are stored

---

*Last Updated: January 2025*
*Schema Version: 1.0*
*Maintained by: NeonPanda Engineering Team*

