# Training Program V2 Redesign Analysis
**Date**: 2025-11-23
**Status**: 🔍 ANALYSIS - Awaiting Approval
**Context**: Applying Coach Creator Redesign Patterns to Training Program Implementation

---

## Executive Summary

The coach creator redesign successfully transformed a rigid, scripted flow into an intelligent, conversational system using:
1. ✅ **Todo-list based information tracking** (22 fields, AI-extracted)
2. ✅ **AI-driven conversation flow** (no hardcoded questions)
3. ✅ **Robust AI extraction** (Claude Haiku 4.5, not keyword matching)
4. ✅ **Natural conversation** (adaptive, no repetition)
5. ✅ **Clean architecture** (~1000 lines of legacy code removed)
6. ✅ **Separate session entity** (CoachCreatorSession in DynamoDB)

**This document proposes applying these patterns to training program creation**, plus adding:
- **Separate ProgramCreatorSession entity** (matches CoachCreatorSession pattern)
- **Bedrock toolConfig with JSON schema** (structured output, not fragile code block parsing)
- **AI normalization** (validate and normalize generated programs)
- **Parallel phase generation** (**REQUIRED** - current single-call exceeds 15-minute Lambda limit)

**Naming Convention**:
- Code: "program" (e.g., `ProgramCreatorSession`, `programTodoList`)
- User-facing: "training program" (e.g., "Your training program is ready")

### Quick Decision Matrix

| Change | Status | Reason |
|--------|--------|--------|
| **Todo-list conversation** | ✅ Adopt | Proven pattern from coach creator |
| **toolConfig generation** | ✅ Adopt | Proven pattern from build-workout |
| **Multimodal image support** | ✅ Adopt | Proven pattern from build-workout |
| **AI normalization** | ✅ Adopt | Proven pattern from workout normalization |
| **Parallel phase generation** | ✅ **REQUIRED** | Current approach exceeds Lambda timeout |
| **File structure alignment** | ✅ Adopt | Consistency with existing libs |
| **Cost increase to $0.60-0.75** | ⚠️ Accept | Required for functionality |

---

## Architecture Decision: Separate Entity

### ProgramCreatorSession Entity

Following the `CoachCreatorSession` pattern, program creation will use a **separate DynamoDB entity** rather than embedding state in `CoachConversation`.

**Rationale:**
- ✅ **Architectural consistency** - Matches CoachCreatorSession pattern
- ✅ **Separation of concerns** - Coach conversations are multi-purpose; program creation is single-purpose
- ✅ **Better state management** - Independent lifecycle, easy to query/resume
- ✅ **Scalability** - Pattern extends to nutrition plans, habit builders, etc.
- ✅ **Clean conversation object** - No build-specific pollution

**DynamoDB Structure:**
```
PK: user#{userId}
SK: programCreatorSession#{sessionId}
```

Where `sessionId = program_creator_{conversationId}_{timestamp}`

**Example:**
```
PK: user#user123
SK: programCreatorSession#program_creator_conv123_1732469123456
```

**This structure enables efficient querying:**
- All sessions for a user: `SK begins_with "programCreatorSession#"`
- All sessions for a conversation: `SK begins_with "programCreatorSession#program_creator_{conversationId}_"`
- Specific session: Direct get with exact SK
- Supports multiple sessions per conversation (user can start multiple programs)

**Entity:**
```typescript
ProgramCreatorSession {
  userId: string;
  sessionId: string;  // program_creator_{conversationId}_{timestamp}
  conversationId: string; // Link to conversation

  todoList: ProgramCreatorTodoList;

  isComplete: boolean;
  isDeleted?: boolean;
  startedAt: Date;
  lastActivity: Date;
  completedAt?: Date;

  programId?: string; // Set when generation completes
}
```

**Session Management Functions** (mirroring coach-creator):
- `getProgramCreatorSession(userId, conversationId)` - Load active session
- `createProgramCreatorSession(userId, conversationId)` - Initialize new session
- `saveProgramCreatorSession(session)` - Update session
- `completeProgramCreatorSession(session, programId)` - Mark complete

---

## Current Training Program Flow (As Designed)

### Architecture Overview

**Mode-Based System:**
```
User opens conversation with coach
├── Chat Mode (default) - General conversation, workout logging, advice
└── Build Mode - Program creation through guided conversation
```

**Program Creation Process:**
1. User switches to "Build Mode" via toggle
2. Coach asks questions to gather info (goals, equipment, schedule, duration)
3. Conversation continues until coach has enough context
4. Coach generates **entire program in one shot** as JSON code block
5. Backend detects JSON, parses, creates program
6. User switches back to Chat Mode

**AI Generation:**
- Single Claude Sonnet 4 call with full context
- Returns complete program with phases and all daily workouts
- Parsed from markdown code block: ` ```json {...} ``` `

### Current Strengths

✅ **Natural conversation flow** - Not a rigid form
✅ **Coach personality preserved** - Each coach creates differently
✅ **User-friendly mode toggle** - Clear distinction between chat and building
✅ **Single endpoint architecture** - No separate Lambda for program creation
✅ **Complete context** - Coach has access to memories, workout history, etc.

### Current Weaknesses

❌ **No structured information tracking** - No way to know what's been collected vs. still needed
❌ **Fragile JSON parsing** - Code block detection can fail or be incomplete
❌ **All-or-nothing generation** - If generation fails, lose everything
❌ **No validation/normalization** - AI output accepted as-is
❌ **Sequential phase generation** - Exceeds 15-minute Lambda limit, slower, less focused per phase
❌ **No progress visibility** - User doesn't know how close they are to program being ready
❌ **Different patterns** - Doesn't follow build-workout/build-coach-config architecture

---

## Coach Creator Redesign Patterns (What Worked)

### 1. Todo-List Based Information Tracking

**What It Is:**
```typescript
interface CoachCreatorTodoList {
  // 22 fields tracking all required information
  coach_gender_preference: TodoItem;
  primary_goals: TodoItem;
  age: TodoItem;
  experience_level: TodoItem;
  training_frequency: TodoItem;
  equipment_access: TodoItem;
  injury_considerations: TodoItem;
  coaching_style_preference: TodoItem;
  // ... etc
}

interface TodoItem {
  status: 'pending' | 'in_progress' | 'complete';
  value: any | null;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  extractedFrom?: string;
}
```

**Benefits:**
- ✅ **Always know what's missing** - Clear progress tracking
- ✅ **No repeated questions** - AI checks todo list before asking
- ✅ **Flexible order** - User can provide info in any order
- ✅ **Confidence tracking** - Know when to ask clarifying questions
- ✅ **Natural completion** - Session done when all required items complete

### 2. AI-Powered Extraction (Not Keyword Matching)

**What It Does:**
```typescript
async function extractAndUpdateTodoList(
  userResponse: string,
  conversationHistory: Message[],
  currentTodoList: CoachCreatorTodoList
): Promise<CoachCreatorTodoList> {
  // AI analyzes user response
  // Extracts any relevant information
  // Updates todo list with extracted data
  // Returns updated list with confidence scores
}
```

**Uses Claude Haiku 4.5** - Fast, cheap, accurate
**Robust parsing** - Handles natural language variations
**Context-aware** - Considers conversation history

### 3. Dynamic Question Generation

**What It Does:**
```typescript
async function generateNextQuestion(
  conversationHistory: Message[],
  todoList: CoachCreatorTodoList,
  sophisticationLevel: string
): Promise<string | null> {
  // Check what's missing
  const missing = getPendingRequiredItems(todoList);

  // If nothing missing, return completion message
  if (missing.length === 0) return null;

  // AI generates natural next question
  // Based on what's missing and conversation context
  return aiGeneratedQuestion;
}
```

**Benefits:**
- ✅ **Adaptive** - Adjusts to user's responses
- ✅ **Natural** - Feels like conversation, not form
- ✅ **Smart** - Won't ask for info already provided
- ✅ **Complete** - Ensures all required data collected

### 4. Clean Architecture (No Dual Paths)

**What Changed:**
- Removed all legacy question-based code (~1000 lines)
- Single approach: todo-list only
- Clean, maintainable codebase
- Easier to debug and extend

---

## Key Learnings from Existing Code

### From `stream-coach-creator-session/handler.ts`

**Generator Pattern for Streaming:**
```typescript
async function* handleTodoListConversation(
  userResponse: string,
  session: any
): AsyncGenerator<string, any, unknown> {
  // Extract info
  session.todoList = await extractAndUpdateTodoList(...);

  // Generate question stream
  const questionStream = generateNextQuestionStream(...);

  let nextResponse = '';
  for await (const chunk of questionStream) {
    nextResponse += chunk;
    yield formatChunkEvent(chunk); // Real-time streaming
  }

  // Return processed response for caller
  return {
    cleanedResponse: nextResponse,
    isComplete: isSessionComplete(session.todoList),
    progressDetails: getTodoProgress(session.todoList),
  };
}
```

**Key Takeaways:**
- ✅ Generator function with `async function*`
- ✅ Yields chunks as they arrive (not simulated word-by-word)
- ✅ Returns structured object at end for caller to handle
- ✅ Separation of concerns: conversation vs. generation

### From `build-workout/handler.ts`

**Multimodal Image Handling:**
```typescript
// Check if images are present
const hasImages = event.imageS3Keys && event.imageS3Keys.length > 0;

try {
  let result;

  if (hasImages) {
    console.info("🖼️ Processing with images:", {
      imageCount: event.imageS3Keys!.length,
      imageKeys: event.imageS3Keys,
    });

    // Build multimodal message
    const currentMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user" as const,
      content: workoutContent,
      timestamp: new Date(),
      messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
      imageS3Keys: event.imageS3Keys,
    };

    // Convert to Bedrock Converse format
    const converseMessages = await buildMultimodalContent([currentMessage]);

    // Call multimodal API with tools
    result = await callBedrockApiMultimodal(
      extractionPrompt,
      converseMessages,
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
      {
        enableThinking,
        tools: {
          name: 'generate_workout',
          inputSchema: WORKOUT_SCHEMA
        },
        expectedToolName: 'generate_workout'
      }
    );
  } else {
    // Text-only extraction
    result = await callBedrockApi(extractionPrompt, workoutContent, ...);
  }

  if (typeof result !== 'string') {
    workoutData = result.input;
    generationMethod = "tool";
  }
} catch (toolError) {
  // FALLBACK: Same multimodal branching for fallback
  if (hasImages) {
    fallbackResult = await callBedrockApiMultimodal(...);
  } else {
    fallbackResult = await callBedrockApi(...);
  }
  workoutData = parseJsonWithFallbacks(fallbackResult);
}
```

**Key Takeaways:**
- ✅ Check for images first: `event.imageS3Keys`
- ✅ Branch between multimodal and text-only paths
- ✅ Use `buildMultimodalContent()` to format messages
- ✅ Use `callBedrockApiMultimodal()` for images
- ✅ Same pattern for both tool-based and fallback paths
- ✅ Tools work with multimodal input

### From `build-coach-config/handler.ts`

**Async Handler Pattern:**
```typescript
export const handler = async (event: CoachConfigEvent) => {
  return withHeartbeat('Coach Config Generation', async () => {
    try {
      // Load session
      session = await getCoachCreatorSession(userId, sessionId);

      // Generate config (long-running)
      const coachConfig = await generateCoachConfig(session, creationTimestamp);

      // Save to DynamoDB
      await saveCoachConfig(userId, coachConfig, creationTimestamp);

      // Store summary in Pinecone
      await storeCoachCreatorSummaryInPinecone(...);

      return createOkResponse({ success: true, coachConfigId });
    } catch (error) {
      return createErrorResponse(500, error.message);
    }
  });
};
```

**Key Takeaways:**
- ✅ `withHeartbeat()` wrapper for long-running operations
- ✅ Consistent timestamp for all operations
- ✅ Store summary in Pinecone after generation
- ✅ Return structured response (not throw)
- ✅ Error handling updates session status

---

## Critical Architecture Alignment

### Exact Pattern Matching Required

**This redesign follows existing patterns EXACTLY - no deviation:**

| Component | Pattern Source | Files to Match |
|-----------|---------------|----------------|
| **Todo-list conversation** | `libs/coach-creator/` | `todo-list-utils.ts`, `todo-extraction.ts`, `question-generator.ts`, `conversation-handler.ts` |
| **Tool-based generation** | `libs/workout/` + `build-workout/handler.ts` | Schema definition, toolConfig usage, fallback handling |
| **Multimodal images** | `build-workout/handler.ts` | `buildMultimodalContent()`, `callBedrockApiMultimodal()`, image branching |
| **Normalization** | `libs/workout/normalization.ts` | AI normalization with schema comparison |
| **Async handler** | `build-coach-config/handler.ts` | `withHeartbeat()`, error handling, Pinecone storage |
| **Streaming** | `stream-coach-creator-session/handler.ts` | Generator functions, chunk yielding, SSE format |

**File Structure Must Match:**
```
amplify/functions/libs/program-creator/
├── types.ts                     ← Session entity + todo list types
├── session-management.ts        ← Load, save, create, complete session
├── todo-list-utils.ts           ← Same structure as coach-creator
├── todo-extraction.ts           ← Same structure as coach-creator
├── question-generator.ts        ← Same structure as coach-creator
├── conversation-handler.ts      ← Same structure as coach-creator
└── (Week 2 files)
    ├── schema.ts                ← Same structure as schemas/universal-workout-schema.ts
    ├── phase-generator.ts       ← Uses toolConfig pattern
    ├── generation.ts            ← Update, uses toolConfig pattern
    └── normalization.ts         ← Update, uses toolConfig pattern
```

**Naming Convention:**
- Code: "program" (`ProgramCreatorSession`, `programTodoList`, `generateProgram`)
- User-facing: "training program" ("Your training program is ready", "Building your training program")

---

## Proposed Training Program V2 Architecture

### Core Concept: Todo-List Based Program Creation

Replace **free-form conversation → single generation** with **structured conversation → parallel validated generation**.

### Phase 1: Information Gathering (Todo-List Approach)

#### Program Creation Todo List

Define all required information for program creation:

```typescript
interface ProgramCreatorTodoList {
  // Core Program Definition
  training_goals: TodoItem;              // Primary objectives
  target_event: TodoItem;                // Competition, race, testing, or null
  program_duration: TodoItem;            // Weeks or specific end date

  // Schedule & Logistics
  training_frequency: TodoItem;          // Days per week
  session_duration: TodoItem;            // Typical workout length
  start_date: TodoItem;                  // When to begin
  rest_days_preference: TodoItem;        // Specific days off, or flexible

  // Equipment & Environment
  equipment_access: TodoItem;            // Available equipment with specifics
  training_environment: TodoItem;        // Home gym, commercial, CrossFit box, etc.

  // User Context
  experience_level: TodoItem;            // Beginner, intermediate, advanced
  current_fitness_baseline: TodoItem;    // Recent performance indicators
  injury_considerations: TodoItem;       // Current injuries or limitations
  movement_preferences: TodoItem;        // What they enjoy
  movement_dislikes: TodoItem;           // What to minimize

  // Program Structure Preferences
  program_focus: TodoItem;               // Strength, conditioning, gymnastics, mixed
  intensity_preference: TodoItem;        // Conservative, moderate, aggressive
  volume_tolerance: TodoItem;            // How much work they can handle

  // Optional Advanced
  deload_preference: TodoItem;           // Built-in recovery weeks
  progression_style: TodoItem;           // Linear, undulating, block periodization
}

interface TodoItem {
  status: 'pending' | 'in_progress' | 'complete';
  value: any | null;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  extractedFrom?: string; // Message ID or timestamp
  imageRefs?: string[]; // S3 keys if extracted from images (e.g., equipment photos)
}
```

#### Conversation Flow (With Image Support)

**Build Mode Activated:**
1. Initialize empty todo list (all items = 'pending')
2. Coach greeting: "Let's build your training program! What are you working towards?"
3. User responds (text + optional images)
4. **AI Extraction (Multimodal):** Update todo list with extracted info from text AND images
5. **AI Question Generation:** Generate next question based on what's missing
6. Repeat 3-5 until all required items = 'complete'
7. **Trigger program generation** (includes image context from conversation)

**Image Use Cases:**
- 📸 Home gym setup → Equipment assessment
- 📸 Injury photos → Movement limitations understanding
- 📸 Training space → Environment constraints
- 📸 Form videos → Current technique baseline
- 📸 Previous program screenshots → Context for goals

**Example Conversation (with Images):**
```
Coach: "Let's build your training program! What are you working towards?"
User: "I want to compete in a local CrossFit competition in 8 weeks. I need to work on my Olympic lifts and pull-ups."

[AI Extraction Updates:]
- training_goals: { value: "improve Olympic lifts and pull-ups", status: "complete", confidence: "high" }
- target_event: { value: "local CrossFit competition", status: "complete", confidence: "high" }
- program_duration: { value: "8 weeks", status: "complete", confidence: "high" }
- program_focus: { value: "Olympic lifting and gymnastics", status: "complete", confidence: "high" }

Coach: "Perfect - 8 weeks to prep for competition, focusing on Olympic lifts and pull-ups. What equipment do you have access to?"
User: "Here's my home gym setup" [uploads 2 photos showing barbell, squat rack, pull-up bar, dumbbells]

[AI Extraction Updates (MULTIMODAL):]
- equipment_access: {
    value: ["barbell", "squat rack", "pull-up bar", "dumbbells up to 50lbs"],
    status: "complete",
    confidence: "high",
    imageRefs: ["s3://user-uploads/img1.jpg", "s3://user-uploads/img2.jpg"]
  }
- training_environment: {
    value: "home gym (limited space, good for Olympic lifting)",
    status: "complete",
    confidence: "high",
    imageRefs: ["s3://user-uploads/img1.jpg", "s3://user-uploads/img2.jpg"]
  }

Coach: "Great - full gym access. How many days per week can you train?"
User: "5 days, I usually rest weekends"

[AI Extraction Updates:]
- training_frequency: { value: 5, status: "complete", confidence: "high" }
- rest_days_preference: { value: ["Saturday", "Sunday"], status: "complete", confidence: "high" }

Coach: "Perfect. Any injuries or movement limitations I should know about?"
User: "Nothing major, but my left shoulder gets cranky with too much overhead volume"

[AI Extraction Updates:]
- injury_considerations: { value: "left shoulder sensitivity to overhead volume", status: "complete", confidence: "high" }

Coach: "Got it - I'll manage overhead volume carefully. What's your experience level - how long have you been training CrossFit?"
User: "About 2 years, consistently 4-5x per week"

[AI Extraction Updates:]
- experience_level: { value: "intermediate (2 years consistent)", status: "complete", confidence: "high" }

[Check Todo List: All required items complete!]

Coach: "Excellent! I have everything I need. I'll create your 8-week competition prep program focusing on:
- Olympic lift technique and strength
- Pull-up capacity building
- Competition-style workouts
- Shoulder-friendly overhead programming
- 5 days/week with weekend rest

Ready to generate your program?"

User: "Yes!"

[Trigger Program Generation]
```

**Benefits:**
- ✅ **Progress tracking** - User knows what's been covered
- ✅ **No repetition** - AI won't re-ask what's already collected
- ✅ **Flexible order** - User can volunteer info in any order
- ✅ **Complete data** - Ensures nothing missed before generation
- ✅ **Natural conversation** - Still feels like talking to a coach

---

### Phase 2: Structured Program Generation (Bedrock toolConfig)

#### Current Approach (Fragile)

```typescript
// Coach generates response with embedded JSON
const response = await bedrock.converse({
  messages: [...],
  system: "... when ready, output program as ```json {...} ```"
});

// Parse code block from markdown
const jsonMatch = response.match(/```json\n(.*?)\n```/s);
const program = JSON.parse(jsonMatch[1]); // ❌ Fragile!
```

**Problems:**
- ❌ AI might not format code block correctly
- ❌ JSON might be incomplete or invalid
- ❌ No type safety or validation
- ❌ Easy to fail silently

#### Proposed Approach (Bedrock toolConfig)

**Define Training Program JSON Schema:**

```typescript
const programSchema = {
  type: "object",
  properties: {
    programName: {
      type: "string",
      description: "Creative, motivating program name"
    },
    programDescription: {
      type: "string",
      description: "Overview of program goals and structure"
    },
    totalDays: {
      type: "number",
      description: "Total program length in days (includes rest days)"
    },
    trainingDays: {
      type: "number",
      description: "Number of actual training days"
    },
    startDate: {
      type: "string",
      format: "date",
      description: "Program start date (YYYY-MM-DD)"
    },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phaseNumber: { type: "number" },
          phaseName: { type: "string" },
          phaseDescription: { type: "string" },
          startDay: { type: "number" },
          endDay: { type: "number" },
          focusAreas: {
            type: "array",
            items: { type: "string" }
          },
          intensityRange: {
            type: "array",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2
          },
          volumeCharacteristics: { type: "string" }
        },
        required: ["phaseNumber", "phaseName", "startDay", "endDay", "focusAreas"]
      }
    },
    dailyWorkouts: {
      type: "array",
      items: {
        // Universal workout schema (existing)
      }
    },
    equipmentConstraints: {
      type: "array",
      items: { type: "string" }
    },
    trainingGoals: {
      type: "array",
      items: { type: "string" }
    },
    methodology: {
      type: "object",
      properties: {
        progressionStrategy: { type: "string" },
        intensityPattern: { type: "string" },
        deloadStrategy: { type: "string" }
      }
    }
  },
  required: [
    "programName",
    "programDescription",
    "totalDays",
    "phases",
    "dailyWorkouts",
    "equipmentConstraints",
    "trainingGoals"
  ]
};
```

**Generate with toolConfig:**

```typescript
async function generateProgram(
  todoList: ProgramCreatorTodoList,
  coachConfig: CoachConfig,
  userContext: UserContext
): Promise<Program> {

  const response = await bedrock.converse({
    modelId: MODEL_IDS.CLAUDE_SONNET_4_FULL,
    messages: [{
      role: "user",
      content: buildProgramGenerationPrompt(todoList, coachConfig, userContext)
    }],
    system: [{
      text: buildCoachPersonalityPrompt(coachConfig)
    }],
    toolConfig: {
      tools: [{
        toolSpec: {
          name: "generate_training_program",
          description: "Generate a complete training program with phases and daily workouts",
          inputSchema: {
            json: programSchema
          }
        }
      }],
      toolChoice: {
        tool: { name: "generate_training_program" }
      }
    }
  });

  // Extract tool use from response
  const toolUse = response.output.message.content.find(
    block => block.toolUse?.name === "generate_training_program"
  );

  if (!toolUse) {
    throw new Error("AI did not generate program using tool");
  }

  const rawProgram = toolUse.toolUse.input;

  // Validate and normalize
  const normalizedProgram = await normalizeProgram(rawProgram);

  return normalizedProgram;
}
```

**Benefits:**
- ✅ **Structured output** - AI forced to follow schema
- ✅ **Type safety** - JSON structure validated
- ✅ **No parsing fragility** - No markdown code block detection
- ✅ **Better error handling** - Clear when generation fails
- ✅ **Same pattern as build-workout** - Consistent architecture

---

### Phase 3: AI Normalization (Like build-workout)

#### Normalization Purpose

After AI generates program, normalize with a second AI pass to ensure:
- Phase progression is logical
- Daily workouts follow universal schema
- Movements are properly structured
- Equipment constraints respected
- Progressive overload implemented correctly
- Deload weeks placed appropriately (if applicable)
- No duplicate workout IDs
- Dates calculated correctly

#### Normalization Function

```typescript
async function normalizeProgram(
  rawProgram: any,
  todoList: ProgramCreatorTodoList,
  coachConfig: CoachConfig
): Promise<Program> {

  const normalizationPrompt = `
  You are normalizing a training program generated by an AI coach.

  EXPECTED SCHEMA:
  ${JSON.stringify(programSchema, null, 2)}

  RAW PROGRAM (may have errors or inconsistencies):
  ${JSON.stringify(rawProgram, null, 2)}

  ORIGINAL REQUIREMENTS:
  ${JSON.stringify(todoList, null, 2)}

  NORMALIZATION TASKS:
  1. Compare raw program against the expected schema
  2. Validate all phases have correct day ranges (no gaps, no overlaps)
  3. Ensure dailyWorkouts array length matches totalDays
  4. Normalize all workout movements to universal workout schema
  5. Validate equipment in workouts matches equipmentConstraints
  6. Ensure progression logic is consistent across phases
  7. Calculate scheduledDate for each workout based on startDate
  8. Assign unique workoutIds (format: workout_userId_timestamp_shortId)
  9. Validate all required fields are present and properly typed
  10. Fix any inconsistencies or errors while preserving coach personality
  11. Return fully normalized program matching the schema

  IMPORTANT:
  - Preserve the coach's personality, style, and programming philosophy
  - Only fix structural/schema issues, not content/coaching decisions
  - If equipment used doesn't match constraints, substitute appropriately
  - Ensure all dates are valid and properly calculated
  - All workout movements must follow universal movement schema

  OUTPUT FORMAT: Use the normalize_training_program tool with normalized data.
  `;

  const response = await bedrock.converse({
    modelId: MODEL_IDS.CLAUDE_SONNET_4_FULL,
    messages: [{
      role: "user",
      content: normalizationPrompt
    }],
    toolConfig: {
      tools: [{
        toolSpec: {
          name: "normalize_training_program",
          description: "Return normalized training program matching schema",
          inputSchema: { json: programSchema }
        }
      }],
      toolChoice: {
        tool: { name: "normalize_training_program" }
      }
    }
  });

  const normalizedProgram = extractToolUseInput(response);

  // Additional validation
  validateProgramStructure(normalizedProgram);

  return normalizedProgram;
}
```

**Benefits:**
- ✅ **Quality assurance** - Catch AI generation errors
- ✅ **Consistent structure** - All programs follow same schema
- ✅ **Movement normalization** - Workouts use proper movement objects
- ✅ **Date calculation** - Correct scheduledDate for every workout
- ✅ **Equipment validation** - No invalid equipment references

---

### Phase 4: Parallel Phase Generation (**REQUIRED FOR MVP**)

#### Why Parallel is Required (Not Optional)

**Critical Issue**: Current `build-program` Lambda exceeds 15-minute timeout
- Single AI call to generate 4-8 week program with all daily workouts
- Can take 20-30+ minutes for complex programs
- Lambda hard limit: 15 minutes maximum execution time
- **Result**: Program generation fails for anything beyond simple 2-week programs

**Parallel solves this**:
- Generate phases independently in parallel
- 3 phases × 5 minutes each = 5 minutes total (vs. 20+ minutes sequential)
- Fits well within Lambda limits
- Scales to longer programs (12+ weeks)

#### Current Approach (Fails)

AI generates entire program in one call:
- All phases at once
- All daily workouts at once
- Single large context window
- **Exceeds Lambda timeout for MVP-scale programs**

#### Proposed Parallel Approach (Required)

**Step 1: Generate Phase Definitions (Sequential)**

```typescript
async function generatePhaseStructure(
  todoList: ProgramCreatorTodoList,
  coachConfig: CoachConfig
): Promise<ProgramPhase[]> {

  // First, determine optimal phase structure
  const phaseStructure = await bedrock.converse({
    // ... prompt to determine number of phases and their purposes
  });

  return phaseStructure; // e.g., 3 phases for 8-week program
}
```

**Step 2: Generate Each Phase's Workouts (Parallel)**

```typescript
async function generatePhaseWorkouts(
  phase: ProgramPhase,
  todoList: ProgramCreatorTodoList,
  coachConfig: CoachConfig
): Promise<Workout[]> {

  // Generate all workouts for this specific phase
  const phasePrompt = `
  Generate ${phase.endDay - phase.startDay + 1} daily workouts for ${phase.phaseName}.

  Phase Focus: ${phase.focusAreas.join(", ")}
  Days: ${phase.startDay} to ${phase.endDay}
  Equipment: ${todoList.equipment_access.value}
  Training Frequency: ${todoList.training_frequency.value} days/week

  Apply ${coachConfig.personalityName} coaching style.
  Ensure progression within this phase.
  `;

  const response = await bedrock.converse({
    // ... toolConfig with workout array schema
  });

  return extractedWorkouts;
}

// Generate all phases in parallel
async function generateAllPhaseWorkouts(
  phases: ProgramPhase[],
  todoList: ProgramCreatorTodoList,
  coachConfig: CoachConfig
): Promise<Workout[][]> {

  const phaseWorkoutPromises = phases.map(phase =>
    generatePhaseWorkouts(phase, todoList, coachConfig)
  );

  // Execute in parallel
  const phaseWorkouts = await Promise.all(phaseWorkoutPromises);

  return phaseWorkouts;
}
```

**Step 3: Assemble Complete Program**

```typescript
async function assembleProgram(
  phases: ProgramPhase[],
  phaseWorkouts: Workout[][],
  todoList: ProgramCreatorTodoList
): Promise<Program> {

  // Flatten phase workouts into single array
  const allWorkouts = phaseWorkouts.flat();

  // Create program structure
  const program: Program = {
    programId: generateId(),
    programName: await generateProgramName(todoList),
    programDescription: await generateProgramDescription(todoList, phases),
    totalDays: allWorkouts.length,
    startDate: todoList.start_date.value,
    phases: phases,
    dailyWorkouts: allWorkouts,
    equipmentConstraints: todoList.equipment_access.value,
    trainingGoals: todoList.training_goals.value,
    // ... other fields
  };

  // Normalize assembled program
  return await normalizeProgram(program, todoList, coachConfig);
}
```

**Benefits of Parallel Approach:**
- ✅ **Faster generation** - 3 phases in parallel = 1/3 the time
- ✅ **Better phase focus** - Each AI call focuses on single phase
- ✅ **Higher quality per phase** - More context dedicated to phase goals
- ✅ **Easier to regenerate** - Can regenerate single phase if needed
- ✅ **Scalability** - Long programs (12+ weeks) still fast

**Trade-offs:**
- ⚠️ **More complex** - Assembly logic required (but manageable, follows existing patterns)
- ⚠️ **Inter-phase coherence** - Normalization ensures phases connect smoothly (already required)
- ⚠️ **More API calls** - Higher cost (3-5 calls instead of 1), but necessary for functionality

**Verdict:** **Required for MVP** - Single-call exceeds Lambda timeout. Parallel is the only viable approach.

---

### Image Context Preservation Strategy

**Smart Image Handling:**
Instead of passing raw images through multiple AI calls (expensive), we:

1. **Extract context once** during todo-extraction:
   - Equipment photos → Text description: "barbell, squat rack, dumbbells to 50lbs"
   - Space photos → Text description: "10x10 home gym, ceiling height 8ft"
   - Injury photos → Text description: "left shoulder mobility limited"

2. **Store descriptions in todo list**:
   - `equipment_access: { value: "...", imageRefs: ["s3://..."] }`
   - Image refs preserved for audit/debugging

3. **Use text descriptions** in phase generation:
   - Phase generators receive: "Equipment: barbell, squat rack, dumbbells to 50lbs"
   - No need to re-download or re-process images
   - Faster, cheaper, same quality

4. **Benefits**:
   - ✅ Multimodal extraction once (Haiku 4.5 - cheap)
   - ✅ Text-only phase generation (Sonnet 4 - no image markup)
   - ✅ Parallel phases don't need image access
   - ✅ Cost-effective: 1 multimodal call vs. 5+ multimodal calls

---

## Proposed Implementation Phases

### Implementation Sequence Overview

**Week 1: Todo-List Foundation (Steps 1-7)**
1. Define session entity and types
2. Create session management functions
3. Create todo list utilities
4. Create todo extraction (multimodal)
5. Create question generator
6. Create conversation handler
7. Wire up stream handler

**Week 1.5: Multimodal Integration (Step 7)**
7. Test and refine image handling

**Week 2: Parallel Generation (Steps 8-10)**
8. Create schema + phase generator
9. Update generation logic
10. Update async handler + normalization

---

### Week 1: Todo-List Based Information Gathering

**Pattern**: Follow **exact structure** of `libs/coach-creator/` directory

#### Step 1: Define Session Entity and Types (45 minutes)

**File**: `amplify/functions/libs/program-creator/types.ts` (NEW - following coach-creator pattern)

**What to create:**
```typescript
// Re-export shared types
export type { TodoItem, ConversationMessage } from '../todo-types';

/**
 * ProgramCreatorSession - Separate entity for program creation
 * Pattern: Matches CoachCreatorSession structure exactly
 */
export interface ProgramCreatorSession {
  userId: string;
  sessionId: string;  // program_creator_{conversationId}_{timestamp}
  conversationId: string;

  // Todo-list based conversational flow
  todoList: ProgramCreatorTodoList;
  conversationHistory: ConversationMessage[];

  // Session status
  isComplete: boolean;
  isDeleted?: boolean; // Soft delete when program generation succeeds
  startedAt: Date;
  lastActivity: Date;
  completedAt?: Date;

  // Progress tracking
  progressDetails?: {
    itemsCompleted: number;
    totalItems: number;
    percentage: number;
  };

  // Link to generated program
  programGeneration?: {
    status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
    startedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    error?: string;
    programId?: string;
  };
}

/**
 * Complete to-do list for program creation
 * 21 fields tracking all required information
 */
export interface ProgramCreatorTodoList {
  // Core Program Definition (3 fields)
  trainingGoals: TodoItem;
  targetEvent: TodoItem;
  programDuration: TodoItem;

  // Schedule & Logistics (4 fields)
  trainingFrequency: TodoItem;
  sessionDuration: TodoItem;
  startDate: TodoItem;
  restDaysPreference: TodoItem;

  // Equipment & Environment (2 fields)
  equipmentAccess: TodoItem;
  trainingEnvironment: TodoItem;

  // User Context (5 fields)
  experienceLevel: TodoItem;
  currentFitnessBaseline: TodoItem;
  injuryConsiderations: TodoItem;
  movementPreferences: TodoItem;
  movementDislikes: TodoItem;

  // Program Structure Preferences (3 fields)
  programFocus: TodoItem;
  intensityPreference: TodoItem;
  volumeTolerance: TodoItem;

  // Optional Advanced (2 fields)
  deloadPreference: TodoItem;
  progressionStyle: TodoItem;
}
```

**Why first**: All other code depends on these types.

---

#### Step 2: Create Session Management Functions (1 hour)

**File**: `amplify/functions/libs/program-creator/session-management.ts` (NEW)

**Pattern**: Copy structure from `libs/coach-creator/session-management.ts`

**Functions to implement:**
- `getProgramCreatorSession(userId, conversationId)` - Load active session for conversation
- `createProgramCreatorSession(userId, conversationId)` - Initialize new session
- `saveProgramCreatorSession(session)` - Update session in DynamoDB
- `completeProgramCreatorSession(session, programId)` - Mark complete and soft-delete

**Why second**: Session management needed before conversation flow.

---

#### Step 3: Create Todo List Utilities (1 hour)

**File**: `amplify/functions/libs/program-creator/todo-list-utils.ts` (NEW)

**Pattern**: Copy structure from `libs/coach-creator/todo-list-utils.ts`

**Functions to implement:**
- `createEmptyProgramTodoList()` - Initialize empty list
- `getRequiredPendingItems()` - What's missing
- `getTodoProgress()` - Completion %
- `isSessionComplete()` - Ready to generate?
- `getTodoSummary()` - Human-readable summary

**Why second**: Pure functions, no dependencies, easy to test.

---

#### Step 4: Create Todo Extraction (2 hours)

**File**: `amplify/functions/libs/program-creator/todo-extraction.ts` (NEW)

**Pattern**: Copy `libs/coach-creator/todo-extraction.ts` + multimodal from `build-workout`

**Main function:**
```typescript
export async function extractAndUpdateProgramTodoList(
  userResponse: string,
  conversationHistory: ConversationMessage[],
  currentTodoList: ProgramCreatorTodoList,
  imageS3Keys?: string[] // Multimodal support
): Promise<ProgramCreatorTodoList>
```

**Why third**: Depends on types and utils, but independent from other features.

---

#### Step 5: Create Question Generator (2 hours)

**File**: `amplify/functions/libs/program-creator/question-generator.ts` (NEW)

**Pattern**: Copy `libs/coach-creator/question-generator.ts`

**Functions:**
- `generateNextProgramQuestion()` - Non-streaming
- `generateNextProgramQuestionStream()` - Streaming (production)

**Why fourth**: Depends on types and utils, needed by conversation handler.

---

#### Step 6: Create Conversation Handler (2 hours)

**File**: `amplify/functions/libs/program-creator/conversation-handler.ts` (NEW)

**Pattern**: Copy `libs/coach-creator/conversation-handler.ts`

**Main function:**
```typescript
export async function* handleProgramTodoListConversation(
  userResponse: string,
  session: any,
  imageS3Keys?: string[]
): AsyncGenerator<string, any, unknown>
```

**Why fifth**: Orchestrates extraction + question generation, needed by stream handler.

---

#### Step 7: Wire Up Stream Handler (1 hour)

**File**: `amplify/functions/stream-coach-conversation/handler.ts` (UPDATE)

**Changes:**
- Add Build mode detection (already exists)
- Load or create `ProgramCreatorSession` for conversation
- Call `handleTodoListConversation()` generator with session
- Yield chunks to user
- Save updated session after each message
- Trigger async program generation when complete
- Mark session complete and soft-delete

**Why last**: Integration point, everything above must exist first.

**Key difference from current approach:**
- **Before**: `conversation.programBuildState` embedded in conversation
- **After**: `ProgramCreatorSession` as separate entity, linked by `conversationId`

---

**Week 1 Testing:**
- Unit tests for utilities
- Test extraction with text-only
- Test extraction with images
- Test question generation
- Test streaming conversation
- End-to-end: complete conversation

---

### Week 1.5: Multimodal Image Handling

#### Step 7: Test and Refine Image Handling (integrated in Steps 3-6)

(See document section "Week 1.5: Multimodal Image Handling" for details)

**This is embedded in Steps 3-6 above**, not a separate implementation step.

---

### Week 2: Parallel Generation & Normalization

**Pattern**: Follow **exact structure** of `build-workout` and `build-coach-config` handlers

#### Step 8: Create Schema + Phase Generator (4 hours)

**Step 8a**: `amplify/functions/libs/program/schema.ts` (NEW)
- Define `PROGRAM_SCHEMA` for toolConfig (like `WORKOUT_SCHEMA`)
- Define `PHASE_SCHEMA` for individual phase generation
- Export schemas for generation and normalization
- **Pattern**: Same structure as `schemas/universal-workout-schema.ts`

**Step 8b**: `amplify/functions/libs/program/phase-generator.ts` (NEW)
- `generatePhaseStructure()` - Determine optimal phase breakdown (considers image context)
- `generateSinglePhaseWorkouts()` - Generate workouts for one phase (uses toolConfig, multimodal-aware)
- `generateAllPhasesParallel()` - Execute phase generation in parallel using `Promise.all()`
- `assembleProgram()` - Combine phases into complete program
- **Image Context**: Equipment/space images referenced during phase generation prompts
- **Pattern**: Uses toolConfig with `generate_training_program_phase` tool (snake_case naming)
- **Tool Names**: `generate_phase_structure`, `generate_training_program_phase` (follows `generate_workout`, `generate_coach_config` convention)

---

#### Step 9: Update Generation Logic (2 hours)

**File**: `amplify/functions/libs/program/generation.ts` (UPDATE/REFACTOR)

**Changes:**
- Update `generateProgram()` to call parallel pipeline
- Pipeline: `generatePhaseStructure()` → `generateAllPhasesParallel()` → `assembleProgram()`
- Use toolConfig throughout (remove JSON code block parsing)
- **Pattern**: Same approach as `build-workout` handler

---

#### Step 10: Update Async Handler + Normalization (3 hours)

**Step 10a**: Update `amplify/functions/libs/program/normalization.ts`
- Update `normalizeProgram()` to use toolConfig with `normalize_training_program` tool
- Provide schema in prompt for AI comparison
- Add `validateProgramStructure()` - Additional validation checks
- **Pattern**: Same as `workout/normalization.ts`

**Step 10b**: Update `amplify/functions/build-program/handler.ts`
- Follow **exact pattern** of `build-workout/handler.ts`
- Use `withHeartbeat()` wrapper
- Tool-based generation with fallback
- Normalization pass
- Store in DynamoDB + S3
- Generate and store summary in Pinecone
- Debug data to S3 on error

---

**Week 2 Testing:**
- Test schema validation with various program structures
- Test parallel phase generation (2, 3, 4, 5 phases)
- Test assembly logic
- Test normalization with intentionally flawed programs
- Test date calculations across various start dates
- Test complete generation flow with heartbeat monitoring
- **Verify execution stays under 15 minutes** (critical success metric)

---

### Week 1.5: Multimodal Image Handling (Reference)

**Pattern**: Follow **exact structure** of `build-workout` multimodal handling

**Image Flow Through System:**
```
User uploads image in Build Mode conversation
    ↓
Frontend: Uploads to S3, gets imageS3Keys
    ↓
stream-coach-conversation receives: { userResponse, imageS3Keys }
    ↓
handleProgramTodoListConversation(userResponse, session, imageS3Keys)
    ↓
extractAndUpdateProgramTodoList():
    ├─ If imageS3Keys → callBedrockApiMultimodal(Haiku 4.5)
    └─ Else → callBedrockApi(Haiku 4.5)
    ↓
Store image context in todo list:
    - equipmentAccess: { value: [...], imageRefs: ["s3://..."] }
    - injuryConsiderations: { value: "...", imageRefs: ["s3://..."] }
    ↓
Trigger program generation (pass todo list with image refs)
    ↓
generatePhaseStructure():
    - Prompt includes: "User provided images showing [equipment/space/etc]"
    - Context: Equipment constraints from images
    ↓
generateSinglePhaseWorkouts():
    - Each phase generation aware of equipment from images
    - No need to re-download images (context already extracted)
```

**Key Image Utilities (from build-workout):**
- `buildMultimodalContent()` - Converts messages with S3 keys to Bedrock format
- `callBedrockApiMultimodal()` - Handles multimodal API calls
- `MESSAGE_TYPES.TEXT_WITH_IMAGES` - Message type for tracking

**Implementation Notes:**
- Images processed during todo-extraction (not stored long-term)
- Image context extracted into text description in todo list
- Phase generation uses text descriptions (not raw images)
- Reduces tokens and complexity during parallel generation

---

### Week 2: Parallel Generation & Normalization

**Pattern**: Follow **exact structure** of `build-workout` and `build-coach-config` handlers

**Files to Create/Update:**

- `amplify/functions/libs/program/schema.ts` (NEW)
  - Define `PROGRAM_SCHEMA` for toolConfig (like `WORKOUT_SCHEMA`)
  - Define `PHASE_SCHEMA` for individual phase generation
  - Export schemas for generation and normalization
  - **Pattern**: Same structure as `schemas/universal-workout-schema.ts`

- `amplify/functions/libs/program/phase-generator.ts` (NEW)
  - `generatePhaseStructure()` - Determine optimal phase breakdown (considers image context)
  - `generateSinglePhaseWorkouts()` - Generate workouts for one phase (uses toolConfig, multimodal-aware)
  - `generateAllPhasesParallel()` - Execute phase generation in parallel using `Promise.all()`
  - `assembleProgram()` - Combine phases into complete program
  - **Image Context**: Equipment/space images referenced during phase generation prompts
  - **Pattern**: Uses toolConfig with `generate_training_program_phase` tool (snake_case naming)
  - **Tool Names**: `generate_phase_structure`, `generate_training_program_phase` (follows `generate_workout`, `generate_coach_config` convention)

- `amplify/functions/libs/program/generation.ts` (UPDATE/REFACTOR)
  - `generateProgram()` - Main entry point
  - Calls `generatePhaseStructure()` → `generateAllPhasesParallel()` → `assembleProgram()`
  - Uses toolConfig throughout (no JSON code block parsing)
  - **Pattern**: Same approach as `build-workout` handler

- `amplify/functions/libs/program/normalization.ts` (UPDATE)
  - `normalizeProgram()` - AI normalization (already exists)
  - Update to use toolConfig with `normalize_training_program` tool
  - Provide schema in prompt for comparison
  - `validateProgramStructure()` - Additional validation checks
  - **Pattern**: Same as `workout/normalization.ts`

**Files to Update:**
- `amplify/functions/build-program/handler.ts`
  - Follow **exact pattern** of `build-workout/handler.ts`
  - Use `withHeartbeat()` wrapper
  - Tool-based generation with fallback
  - Normalization pass
  - Store in DynamoDB + S3
  - Generate and store summary in Pinecone
  - Debug data to S3 on error

**Testing:**
- Test schema validation with various program structures
- Test parallel phase generation (2, 3, 4, 5 phases)
- Test assembly logic
- Test normalization with intentionally flawed programs
- Test date calculations across various start dates
- Test complete generation flow with heartbeat monitoring
- Verify execution stays under 15 minutes

---

## Comparison: Current vs. Proposed

| Aspect | Current Design | Proposed V2 |
|--------|----------------|-------------|
| **Information Gathering** | Free-form conversation | Todo-list based tracking |
| **Progress Visibility** | None - user doesn't know | Todo progress % shown |
| **Completion Detection** | AI decides when ready | All required items complete |
| **Repetition Prevention** | AI must remember | Todo list prevents re-asking |
| **Data Extraction** | Implicit in conversation | Explicit AI extraction |
| **Generation Format** | JSON code block | Bedrock toolConfig |
| **Output Validation** | Parse JSON, hope it works | Schema-enforced structure |
| **Normalization** | None | AI normalization pass |
| **Phase Generation** | All at once (fails >15 min) | Parallel (required) |
| **Error Handling** | Fragile parsing | Structured tool use |
| **Flexibility** | User provides info in any order | User provides info in any order ✅ |
| **Natural Conversation** | Yes ✅ | Yes ✅ |
| **Image Support** | No | Yes (equipment, space, injuries) ✅ |
| **Quality Assurance** | None | Normalization + validation |

---

## Architecture Comparison

### Current Architecture (Broken)

```
User Message (Build Mode)
    ↓
Stream Coach Conversation Handler
    ↓
AI Response (conversational)
    ↓
Continue conversation OR detect completion
    ↓
Invoke build-program Lambda (async)
    ↓
Single AI call generates entire program
    ↓
Parse JSON code block (fragile)
    ↓
❌ Lambda timeout (>15 minutes)
    ↓
Create program in DynamoDB + S3 (IF it completes)
```

### Proposed V2 Architecture (Fixed)

```
CONVERSATION PHASE (stream-coach-conversation):
User Message (Build Mode)
    ↓
handleProgramTodoListConversation() (generator)
    ↓
extractAndUpdateProgramTodoList() (Haiku 4.5)
    ↓
Check if complete?
    ├─ No → generateNextProgramQuestionStream() (Sonnet 4)
    │         ↓
    │      Yield chunks to user (SSE)
    │         ↓
    │      User responds → Loop
    │
    └─ Yes → Invoke build-program Lambda (async)

GENERATION PHASE (build-program):
    ↓
generatePhaseStructure() (Sonnet 4, toolConfig)
    ↓
    └─ Returns 3-5 phase definitions
    ↓
generateAllPhasesParallel() (Promise.all)
    ├─ Phase 1: generateSinglePhaseWorkouts() (Sonnet 4, toolConfig)
    ├─ Phase 2: generateSinglePhaseWorkouts() (Sonnet 4, toolConfig)
    ├─ Phase 3: generateSinglePhaseWorkouts() (Sonnet 4, toolConfig)
    └─ (3-5 phases total, all parallel)
    ↓
    └─ All phases complete in ~5-8 minutes (vs. 20+)
    ↓
assembleProgram() (combine phases)
    ↓
normalizeProgram() (Sonnet 4, toolConfig with schema)
    ↓
validateProgramStructure() (validation checks)
    ↓
✅ Store in DynamoDB + S3 (under 15 minutes)
    ↓
Generate and store summary in Pinecone
    ↓
Return success
```

---

## Benefits of V2 Approach

### 1. Better User Experience
- ✅ **Progress tracking** - User sees "75% complete" indicator
- ✅ **No repetition** - AI won't re-ask collected info
- ✅ **Clear completion** - Know when ready to generate
- ✅ **Natural conversation** - Still feels like talking to coach

### 2. Better Data Quality
- ✅ **Structured extraction** - AI explicitly extracts each field
- ✅ **Validation before generation** - Ensure all required data present
- ✅ **Confidence scoring** - Know when to ask clarifying questions
- ✅ **Normalization** - Catch and fix AI generation errors

### 3. Better Technical Architecture
- ✅ **Structured output** - toolConfig eliminates parsing fragility
- ✅ **Type safety** - JSON schema enforces structure
- ✅ **Testability** - Clear separation of concerns
- ✅ **Maintainability** - Todo-list approach easier to extend
- ✅ **Consistency** - Same patterns as coach creator and build-workout

### 4. Better Error Handling
- ✅ **Graceful failures** - Can retry generation without losing conversation
- ✅ **Validation** - Catch issues before storing
- ✅ **Normalization** - Fix minor issues automatically
- ✅ **Clear error messages** - Know exactly what went wrong

### 5. Better Scalability
- ✅ **Parallel phase generation** - Fast generation for long programs
- ✅ **Incremental improvement** - Easy to add new required fields
- ✅ **Coach learning** - Todo list tracking enables better coach adaptation
- ✅ **Analytics** - Track which info users struggle to provide

---

## Migration Strategy

### Option A: Clean Break (Recommended)

**Why:** Early stage, few users with in-progress program creation sessions

**Approach:**
1. Implement V2 architecture completely
2. Remove old JSON code block parsing
3. Deploy with announcement: "Program creation improved!"
4. Any in-progress sessions restart (acceptable at this stage)

**Benefits:**
- ✅ Clean codebase
- ✅ Faster development
- ✅ No dual-path complexity

### Option B: Gradual Migration

**Why:** If significant number of in-progress sessions exist

**Approach:**
1. Keep JSON code block parsing as fallback
2. Add V2 todo-list approach
3. New sessions use V2, old sessions continue with old approach
4. Deprecate old approach after 2 weeks

**Benefits:**
- ✅ No disruption to existing sessions
- ✅ Can compare approaches side-by-side

**Drawbacks:**
- ⚠️ Dual-path complexity
- ⚠️ More code to maintain
- ⚠️ Slower development

**Recommendation:** **Option A (Clean Break)** - Early stage justifies clean architecture.

---

## Cost Analysis

### Current Approach

**Single Program Generation:**
- 1 AI call to generate complete program (Claude Sonnet 4)
- Estimated tokens: ~15,000 input + ~20,000 output
- Cost: ~$0.15 per program

**Total Cost per Program:** ~$0.15

### Proposed V2 Approach (With Parallel Generation)

**Information Gathering (5-10 messages):**
- 5-10 extraction calls (Claude Haiku 4.5)
  - ~500 input + ~200 output each
  - Cost: ~$0.005 each × 8 average = $0.04
- 5-10 question generation calls (Claude Sonnet 4)
  - ~2,000 input + ~100 output each
  - Cost: ~$0.01 each × 8 average = $0.08

**Phase Structure Generation:**
- 1 call to determine optimal phase breakdown (Claude Sonnet 4)
  - ~5,000 input + ~2,000 output
  - Cost: ~$0.03

**Parallel Phase Generation (3-5 phases):**
- 3-5 parallel calls (Claude Sonnet 4 with toolConfig), assume 4 average
  - ~10,000 input + ~15,000 output each
  - Cost: ~$0.10 each × 4 = $0.40

**Program Assembly & Normalization:**
- 1 assembly + normalization call (Claude Sonnet 4)
  - ~30,000 input + ~25,000 output
  - Cost: ~$0.20

**Total Cost per Program:** ~$0.75

**Cost Increase:** 5x higher ($0.15 → $0.75)

**Justification:**
- ✅ **Required for functionality** - Single-call exceeds Lambda timeout
- ✅ Higher quality programs (focused per-phase generation)
- ✅ Better user experience
- ✅ Fewer failed generations (phases generated independently)
- ✅ Still very affordable (~$0.75 per program)
- ✅ Users create programs infrequently (1-2 per month)
- ✅ Enables longer programs (12+ weeks) without timeout issues

**Cost Optimization Opportunities:**
- Use Claude Haiku for normalization (simpler task) → Save $0.10
- Cache phase generation prompts → Save 10-15%
- Optimize phase breakdown (3 phases instead of 4-5) → Save $0.10-0.20

**Optimized Cost:** ~$0.60 per program (4x increase from current, but enables functionality)

---

## Open Questions

### 1. Todo Progress Visibility
**Question:** Show todo progress to user during conversation?

**Options:**
- A) Show progress bar: "75% complete - still need schedule details"
- B) Hide progress, keep conversation natural
- C) Show progress only on request: "How much more info do you need?"

**Recommendation:** **Option B** - Keep conversation natural. Progress tracking is for AI, not necessarily user.

---

### 2. Mode Toggle UI
**Question:** Keep Build/Chat mode toggle or integrate todo-list seamlessly?

**Options:**
- A) Keep toggle - clear distinction
- B) Remove toggle - AI detects intent automatically
- C) Keep toggle but enhance with progress indicator

**Recommendation:** **Option A** - Keep toggle. Clear UX, user knows they're building program.

---

### 3. Existing Programs
**Question:** How to handle already-created programs from old flow?

**Options:**
- A) Migrate them to new schema (add empty todo list metadata)
- B) Leave them as-is (dual storage approach)
- C) Mark as "legacy" and suggest rebuilding

**Recommendation:** **Option B** - Leave existing programs unchanged. They work fine. Focus on new creation flow.

---

### 4. Normalization Depth
**Question:** How aggressive should normalization be?

**Options:**
- A) Light touch - only fix critical errors
- B) Deep normalization - restructure if needed
- C) Validation only - reject if errors

**Recommendation:** **Option B** - Deep normalization. Better to fix issues than reject and retry.

---

## Success Metrics

### Implementation Success
- [ ] Todo list tracks 15+ required fields
- [ ] AI extraction accuracy >90% (manual spot checks)
- [ ] Question generation is natural (user feedback)
- [ ] Program generation uses toolConfig successfully
- [ ] Normalization catches and fixes AI errors
- [ ] No fragile JSON parsing failures

### User Experience Success
- [ ] Program creation completion rate >85% (users who start, finish)
- [ ] Average time to complete: <15 minutes
- [ ] User feedback: "conversation felt natural"
- [ ] Zero repetition complaints
- [ ] Program quality maintained or improved

### Technical Success
- [ ] Generation success rate >95%
- [ ] Average generation time <20 seconds (excluding conversation)
- [ ] Normalized programs pass validation 100%
- [ ] Code is clean, maintainable, testable
- [ ] Consistent patterns with coach creator

---

## Risks & Mitigation

### Risk 1: Todo List Too Rigid
**Issue:** Users feel interrogated, not conversational

**Mitigation:**
- Natural question phrasing (not form-like)
- Allow users to provide info in any order
- AI combines multiple fields from single response
- Conversational acknowledgments: "Got it! And..."

---

### Risk 2: Normalization Degrades Quality
**Issue:** Normalization removes coach personality or makes program generic

**Mitigation:**
- Normalization prompt includes: "Preserve coach personality and style"
- Only fix structural issues, not content
- Test normalization with multiple coach personalities
- User feedback loop to catch quality issues

---

### Risk 3: Cost Increase
**Issue:** 3x cost increase ($0.15 → $0.45) might be prohibitive

**Mitigation:**
- Optimize: batch calls, use Haiku where possible
- Target $0.30 per program (2x increase)
- Programs created infrequently (1-2/month per user)
- Higher quality reduces support costs and improves retention

---

### Risk 4: Implementation Time
**Issue:** More complex architecture takes longer

**Mitigation:**
- Leverage coach creator patterns (already implemented)
- Leverage build-workout patterns (already implemented)
- Reuse extraction and question generation utilities
- Parallel phase generation is well-understood pattern
- Clear file structure matches existing code

**Estimated Timeline:** 2 weeks (same as original plan)
- Week 1: Todo-list based conversation flow (matches coach creator)
- Week 2: Parallel generation + normalization (matches build-workout pattern)

---

## Recommendation Summary

### ✅ RECOMMENDED: Adopt V2 Approach

**Core Changes:**
1. ✅ **Todo-list based information gathering** (exactly like coach creator)
2. ✅ **Bedrock toolConfig with JSON schema** (exactly like build-workout)
3. ✅ **AI normalization** (exactly like build-workout)
4. ✅ **Parallel phase generation** (**required for MVP** - single-call exceeds Lambda timeout)

**Migration:**
- ✅ **Clean break** - Implement V2, remove old approach
- ✅ **Acceptable impact** - Few in-progress sessions, early stage

**Benefits:**
- ✅ **Better UX** - Progress tracking, no repetition
- ✅ **Better quality** - Structured output, normalization
- ✅ **Better architecture** - Consistent patterns, maintainable
- ✅ **Better error handling** - Graceful failures, validation

**Costs:**
- ⚠️ **4-5x cost increase** - $0.15 → $0.60-0.75 per program
- ✅ **Required for functionality** - No alternative (Lambda timeout)
- ✅ **Justified** - Infrequent operation (1-2/month), enables core feature

**Timeline:**
- ✅ **2 weeks** - Week 1 (todo-list conversation), Week 2 (parallel generation + normalization)
- ✅ **Same as original** - No delay to roadmap
- ✅ **Parallel included in MVP** - Required due to Lambda timeout constraints

---

## Next Steps

### 1. Review & Approve This Document
**Action:** Founder reviews and provides feedback on proposed approach

**Questions to Answer:**
- Approve todo-list based conversation flow? (Matches coach creator exactly)
- Approve toolConfig + normalization approach? (Matches build-workout exactly)
- Approve parallel phase generation? (**Required** - Lambda timeout issue)
- Approve clean break migration strategy?
- Approve cost increase ($0.60-0.75 per program with parallel)?

### 2. Implementation Planning
**Action:** Break down into specific implementation tasks

**Create:**
- File-by-file implementation checklist
- Function signatures and interfaces
- Test plan for each component

### 3. Begin Development
**Action:** Start Week 1 implementation

**Priority:**
- Todo-list utilities
- AI extraction function
- AI question generation
- Update stream handler for Build mode

---

## Appendix: Code Examples

### A. Multimodal Todo Extraction Pattern

```typescript
// amplify/functions/libs/program/todo-extraction.ts

export async function extractAndUpdateProgramTodoList(
  userResponse: string,
  conversationHistory: ConversationMessage[],
  currentTodoList: ProgramCreatorTodoList,
  imageS3Keys?: string[]
): Promise<ProgramCreatorTodoList> {

  const extractionPrompt = buildExtractionPrompt(
    userResponse,
    conversationHistory,
    currentTodoList
  );

  // Check if images are present (same pattern as build-workout)
  const hasImages = imageS3Keys && imageS3Keys.length > 0;

  let extractedData: any;

  if (hasImages) {
    console.info("🖼️ Extracting todo items with images:", {
      imageCount: imageS3Keys!.length,
      imageKeys: imageS3Keys,
    });

    // Build multimodal message
    const currentMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user" as const,
      content: userResponse,
      timestamp: new Date(),
      messageType: MESSAGE_TYPES.TEXT_WITH_IMAGES,
      imageS3Keys: imageS3Keys,
    };

    // Convert to Bedrock format
    const converseMessages = await buildMultimodalContent([currentMessage]);

    // Call with images
    const result = await callBedrockApiMultimodal(
      extractionPrompt,
      converseMessages,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL,
      {
        tools: {
          name: 'extract_program_info',
          description: 'Extract training program information from user response with images',
          inputSchema: PROGRAM_TODO_EXTRACTION_SCHEMA
        },
        expectedToolName: 'extract_program_info'
      }
    );

    extractedData = typeof result === 'string'
      ? parseJsonWithFallbacks(result)
      : result.input;

  } else {
    // Text-only extraction
    const result = await callBedrockApi(
      extractionPrompt,
      userResponse,
      MODEL_IDS.CLAUDE_HAIKU_4_FULL,
      {
        tools: {
          name: 'extract_program_info',
          inputSchema: PROGRAM_TODO_EXTRACTION_SCHEMA
        },
        expectedToolName: 'extract_program_info'
      }
    );

    extractedData = typeof result === 'string'
      ? parseJsonWithFallbacks(result)
      : result.input;
  }

  // Update todo list with extracted data
  return mergeTodoListUpdates(currentTodoList, extractedData, imageS3Keys);
}

function mergeTodoListUpdates(
  currentList: ProgramCreatorTodoList,
  extracted: any,
  imageRefs?: string[]
): ProgramCreatorTodoList {
  // Update each field that was extracted
  const updated = { ...currentList };

  for (const [key, value] of Object.entries(extracted)) {
    if (value !== null && value !== undefined) {
      updated[key] = {
        status: 'complete',
        value: value,
        confidence: 'high',
        extractedFrom: new Date().toISOString(),
        // Store image references if this field came from images
        imageRefs: imageRefs && shouldStoreImageRef(key) ? imageRefs : undefined
      };
    }
  }

  return updated;
}

function shouldStoreImageRef(fieldKey: string): boolean {
  // Fields that commonly benefit from image context
  return [
    'equipment_access',
    'training_environment',
    'injury_considerations',
    'current_fitness_baseline'
  ].includes(fieldKey);
}
```

---

### B. Program Todo List Initialization

```typescript
// amplify/functions/libs/program/program-todo-list-utils.ts

export function createEmptyProgramTodoList(): ProgramCreatorTodoList {
  const pendingItem = (): TodoItem => ({
    status: 'pending',
    value: null,
    confidence: 'low'
  });

  return {
    // Core Program Definition
    training_goals: pendingItem(),
    target_event: pendingItem(),
    program_duration: pendingItem(),

    // Schedule & Logistics
    training_frequency: pendingItem(),
    session_duration: pendingItem(),
    start_date: pendingItem(),
    rest_days_preference: pendingItem(),

    // Equipment & Environment
    equipment_access: pendingItem(),
    training_environment: pendingItem(),

    // User Context
    experience_level: pendingItem(),
    current_fitness_baseline: pendingItem(),
    injury_considerations: pendingItem(),
    movement_preferences: pendingItem(),
    movement_dislikes: pendingItem(),

    // Program Structure
    program_focus: pendingItem(),
    intensity_preference: pendingItem(),
    volume_tolerance: pendingItem(),

    // Optional
    deload_preference: pendingItem(),
    progression_style: pendingItem()
  };
}

export function getPendingRequiredItems(
  todoList: ProgramCreatorTodoList
): string[] {
  const requiredFields = [
    'training_goals',
    'program_duration',
    'training_frequency',
    'equipment_access',
    'experience_level'
  ];

  return requiredFields.filter(
    field => todoList[field].status !== 'complete'
  );
}

export function isReadyToGenerate(
  todoList: ProgramCreatorTodoList
): boolean {
  return getPendingRequiredItems(todoList).length === 0;
}

export function getTodoProgress(
  todoList: ProgramCreatorTodoList
): number {
  const requiredFields = [
    'training_goals',
    'program_duration',
    'training_frequency',
    'equipment_access',
    'experience_level'
  ];

  const completed = requiredFields.filter(
    field => todoList[field].status === 'complete'
  ).length;

  return Math.round((completed / requiredFields.length) * 100);
}
```

### C. Build Mode Detection in Stream Handler (with Images)

```typescript
// amplify/functions/stream-coach-conversation/handler.ts

// Extract mode and images from request
const mode = message.metadata?.mode || 'chat'; // 'chat' or 'build'
const imageS3Keys = message.imageS3Keys || []; // Image support

if (mode === 'build') {
  // Program creation flow (multimodal support)

  // Initialize todo list if first Build mode message
  if (!conversation.programTodoList) {
    conversation.programTodoList = createEmptyProgramTodoList();
  }

  // Extract information from user message (WITH IMAGES)
  const updatedTodoList = await extractAndUpdateProgramTodoList(
    userMessage,
    conversation.messages,
    conversation.programTodoList,
    imageS3Keys // Pass images to extraction
  );

  // Update conversation
  conversation.programTodoList = updatedTodoList;

  // Check if ready to generate
  if (isReadyToGenerate(updatedTodoList)) {
    // Invoke async program generation Lambda
    await invokeAsyncLambda('build-program', {
      userId,
      coachId,
      conversationId,
      conversationMessages: conversation.messages,
      todoList: updatedTodoList, // Includes image context
      coachConfig,
    });

    // Generate completion message
    const completionMessage = generateProgramCompletionMessage();

    // Stream response
    yield completionMessage;

    // Reset todo list
    conversation.programTodoList = null;

  } else {
    // Use generator to stream question
    const questionGenerator = handleProgramTodoListConversation(
      userMessage,
      conversation,
      imageS3Keys // Pass images through
    );

    // Yield chunks as they arrive
    for await (const chunk of questionGenerator) {
      yield chunk;
    }
  }

} else {
  // Normal chat mode
  // ... existing logic (also supports images)
}
```

---

**Document Status:** 🔍 READY FOR REVIEW

**Awaiting Approval On:**
1. ✅ Todo-list based conversation flow - **Exact match to `stream-coach-creator-session` pattern**
2. ✅ Bedrock toolConfig approach - **Exact match to `build-workout` pattern**
3. ✅ Multimodal image support - **Exact match to `build-workout` multimodal handling**
4. ✅ AI normalization pass - **Exact match to `workout/normalization.ts` pattern**
5. ✅ Parallel phase generation - **REQUIRED (not optional) due to Lambda 15-minute timeout**
6. ✅ File structure - **Exact match to `libs/coach-creator/` and `libs/workout/` patterns**
7. ⚠️ Cost increase - **$0.60-0.75 per program** (required for functionality, infrequent operation)
8. ⚠️ Clean break migration - Restart incomplete sessions (early beta, acceptable impact)

**Critical Understanding:**
- This is NOT a new architecture - it's **applying existing proven patterns**
- Todo-list conversation: `coach-creator` (already working)
- Tool-based generation: `build-workout` (already working)
- Parallel execution: `Promise.all()` pattern (standard JavaScript)
- Normalization: `workout/normalization.ts` (already working)

**Once Approved:** Begin Week 1 implementation (todo-list conversation flow)

---

## FINAL SUMMARY FOR APPROVAL

### What We're Doing
**Applying 4 proven patterns to fix training program creation:**
1. **Coach Creator's** todo-list conversation (fixes: repetition, progress tracking)
2. **Build-Workout's** toolConfig generation (fixes: fragile parsing, validation)
3. **Build-Workout's** multimodal image handling (enables: equipment photos, space photos, injury photos)
4. **Parallel execution** for phases (fixes: Lambda timeout)

### What We're NOT Doing
- ❌ NOT inventing new patterns (all patterns proven and working)
- ❌ NOT creating untested architecture (exact matches to existing code)
- ❌ NOT adding optional enhancements (everything is required)
- ❌ NOT implementing multimodal from scratch (already working in build-workout)

### Why It's Required
- Current `build-program` exceeds 15-minute Lambda limit
- Single AI call for 4-8 week programs takes 20-30+ minutes
- **Parallel phase generation is the only solution**

### Cost vs. Benefit
- **Cost**: $0.60-0.75 per program (vs. $0.15 currently)
- **Frequency**: 1-2 programs per user per month
- **Benefit**: Feature actually works, better quality, scalable to longer programs

### Implementation Risk: LOW
- All patterns already implemented and working
- File structure matches existing code exactly
- 2-week timeline (same as original plan)
- Clear separation of concerns

### Approval Required
- ✅ Apply proven patterns (yes/no)
- ✅ Include parallel generation in MVP (required for functionality)
- ✅ Include multimodal image support (equipment, space, injury photos)
- ✅ Accept cost increase (required for functionality)
- ✅ Clean break migration (restart incomplete sessions)

### Image Support Benefits
- 📸 Equipment photos → Accurate equipment constraints
- 📸 Space photos → Realistic training environment understanding
- 📸 Injury photos → Better injury consideration awareness
- 📸 Form videos → Current fitness baseline assessment
- ✅ Extracted once, used throughout (cost-effective)
- ✅ Same pattern as build-workout (proven, working)

**Ready to implement immediately upon approval.**

