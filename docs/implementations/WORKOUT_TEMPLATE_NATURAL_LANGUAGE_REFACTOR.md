# Workout Template Natural Language Refactoring Plan

## Overview
Refactor workout templates from strictly-typed structured objects to a hybrid approach with natural language content. This makes templates feel more human/coach-like while maintaining necessary metadata for app functionality.

## Current State
- **Workout Templates**: Fully structured with `Exercise[]` objects containing sets, reps, weights, etc.
- **AI Generation**: Creates complex JSON structures, requires normalization & cleanup
- **Logging**: Direct conversion from template structure to Universal Schema
- **UX**: Rigid, JSON-like presentation of workouts

## Target State
- **Workout Templates**: Natural language `workoutContent` + structured metadata + optional lightweight `prescribedExercises`
- **AI Generation**: Writes workouts as a human coach would (natural prose)
- **Logging**: AI reads template + user performance → Universal Schema (like `build-workout`)
- **UX**: Authentic, human-written workout descriptions

---

## Phase 1: Update Type Definitions

### Files to Update

#### `amplify/functions/libs/training-program/types.ts`

**Current `WorkoutTemplate` Interface:**
```typescript
export interface WorkoutTemplate {
  templateId: string;
  dayNumber: number;
  templateType: "primary" | "optional" | "accessory";
  templatePriority: number;
  scheduledDate: string;
  phaseId: string;

  name: string;
  description: string;
  estimatedDuration: number;
  requiredEquipment: string[];
  coachingNotes: string;

  prescribedExercises: Exercise[];  // ❌ Will become optional

  status: "pending" | "completed" | "skipped" | "regenerated";
  completedAt: Date | null;
  linkedWorkoutId: string | null;
  userFeedback: WorkoutFeedback | null;
  adaptationHistory: WorkoutAdaptation[];
}
```

**New `WorkoutTemplate` Interface:**
```typescript
export interface WorkoutTemplate {
  // === Structured Metadata (for app functionality) ===
  templateId: string;
  dayNumber: number;
  templateType: "primary" | "optional" | "accessory";
  templatePriority: number;
  scheduledDate: string;
  phaseId: string;

  // === Display Fields ===
  name: string;                      // "Lower Body Strength - Squat Focus"
  description: string;               // Brief 1-sentence overview
  estimatedDuration: number;         // Minutes
  requiredEquipment: string[];      // ["barbell", "squat rack", "assault bike"]

  // === NEW: Natural Language Workout Content ===
  workoutContent: string;           // The actual workout written naturally
  coachingNotes: string;            // Additional context, cues, scaling options

  // === Optional: Lightweight Exercise References ===
  prescribedExercises?: Exercise[]; // Optional - for filtering/quick reference only

  // === Status Tracking ===
  status: "pending" | "completed" | "skipped" | "regenerated";
  completedAt: Date | null;
  linkedWorkoutId: string | null;
  userFeedback: WorkoutFeedback | null;
  adaptationHistory: WorkoutAdaptation[];
}
```

**Keep `Exercise` Interface (optional use):**
- Used for quick filtering/reference
- AI can generate if helpful, but not required
- Frontend can parse from `workoutContent` if needed

---

## Phase 2: Update AI Generation Schema

### Files to Update

#### `amplify/functions/libs/schemas/training-program-schema.ts`

**New Workout Template Schema:**
```typescript
export const WORKOUT_TEMPLATE_STRUCTURE_SCHEMA = `[
  {
    "templateId": "string (unique, format: 'template_day{dayNumber}_primary')",
    "dayNumber": "number (1-indexed day within program)",
    "templateType": "'primary' | 'optional' | 'accessory'",
    "templatePriority": "number (1 = highest)",
    "scheduledDate": "string (YYYY-MM-DD, will be calculated)",
    "phaseId": "string (e.g., 'phase_1', 'phase_2')",

    "name": "string (workout name, e.g., 'Lower Body Strength - Squat Focus')",
    "description": "string (1 sentence overview of the workout)",
    "estimatedDuration": "number (minutes)",
    "requiredEquipment": ["array of equipment strings"],

    "workoutContent": "string (NATURAL LANGUAGE WORKOUT - write as a human coach would)",
    "coachingNotes": "string (additional cues, scaling options, focus points)",

    "prescribedExercises": [
      {
        "exerciseName": "string (main movement name for filtering)",
        "movementType": "'barbell' | 'dumbbell' | 'kettlebell' | 'bodyweight' | 'cardio' | 'other'"
      }
    ],

    "status": "'pending'",
    "completedAt": "null",
    "linkedWorkoutId": "null",
    "userFeedback": "null",
    "adaptationHistory": "[]"
  }
]`;
```

**Update Context Helper:**
```typescript
export const getWorkoutTemplateSchemaWithContext = (phaseContext) => {
  return `
WORKOUT TEMPLATE GENERATION - NATURAL LANGUAGE APPROACH:

Write each workout as a human coach would write it - clear, detailed, motivational.

PHASE CONTEXT:
- Phase: ${phaseContext.phaseName}
- Description: ${phaseContext.phaseDescription}
- Duration: ${phaseContext.phaseDurationDays} days
- Starting at day: ${phaseContext.phaseStartDay}
- Training Frequency: ${phaseContext.trainingFrequency}x per week
- Available Equipment: ${phaseContext.equipment.join(', ')}
- Program Goals: ${phaseContext.goals.join(', ')}

CRITICAL INSTRUCTIONS FOR workoutContent:
1. Write the workout in natural language, as a coach would write it
2. Include all exercise details (sets, reps, weights, rest periods)
3. Provide form cues, intensity guidance, and coaching context
4. Structure it clearly with sections (Warmup, Strength, Conditioning, etc.)
5. Be specific with weights, percentages, and scaling options
6. Include motivational language and focus points
7. DO NOT use JSON or structured formats - write naturally!

EXAMPLE workoutContent:
"
Warmup (10 minutes):
Hip circles, leg swings, deep squat holds, PVC pass-throughs

Strength Block:
Back Squat 5x5 @ 205lbs (75% of your estimated 1RM ~275lbs)
Focus on hitting depth consistently every rep. Feel your weight shift to mid-foot
at the bottom. Keep chest up throughout. Rest 3 minutes between sets.
Scale: If form breaks, drop 10% immediately.

Bulgarian Split Squat 3x10 each leg @ 40lb dumbbells
Focus on front leg doing the work. Keep torso upright. Rest 90 seconds.

Conditioning Finisher:
EMOM 10: 10 calories assault bike
Moderate pace—should finish with 20-30 seconds rest. This is conditioning work,
not a sprint.
"

prescribedExercises FIELD:
- This is OPTIONAL and lightweight
- Only include main exercises for filtering/reference
- Just exerciseName and movementType
- Example: [{"exerciseName": "Back Squat", "movementType": "barbell"}]

Generate ${phaseContext.phaseDurationDays} workout templates following this schema:
${WORKOUT_TEMPLATE_STRUCTURE_SCHEMA}
`;
};
```

---

## Phase 3: Simplify Program Generation

### Files to Update

#### `amplify/functions/libs/training-program/program-generator.ts`

**Changes:**
1. Remove complex `prescribedExercises` generation from prompts
2. Focus AI on natural language `workoutContent`
3. Simplify or remove workout template normalization (Phase 4)
4. Keep phase-level generation pattern

**Key Function Updates:**
- `generatePhaseWorkouts()`: Update to expect natural language templates
- Remove detailed exercise structure validation
- Simplify JSON parsing (less complex structure)

---

## Phase 4: Simplify/Remove Normalization

### Files to Update

#### `amplify/functions/libs/training-program/normalization.ts`

**Options:**
1. **Remove workout template normalization entirely** (recommended)
   - Natural language doesn't need structure validation
   - AI writes coherent text by default
   - Less overhead, fewer API calls

2. **Lightweight validation only**
   - Check that `workoutContent` exists and is non-empty
   - Validate metadata fields (duration, equipment)
   - Fix typos/formatting

**Recommendation: Remove `normalizeWorkoutTemplates()` and `cleanupWorkoutTemplates()`**
- Keep program-level normalization for phase structure
- Skip workout-level normalization (not needed for prose)

---

## Phase 5: Update Logging Handler

### Files to Update

#### `amplify/functions/log-workout-template/handler.ts`

**Current Flow:**
```
User clicks "Log Workout"
→ Fetch template
→ Use convertTemplateToUniversalSchema()
→ Save workout
```

**New Flow:**
```
User clicks "Log Workout"
→ Fetch template (has workoutContent + metadata)
→ Prompt user: "How did the workout go?"
→ Call AI (like build-workout):
   - Template as context (what was prescribed)
   - User input (what they actually did)
   → Generate Universal Schema
→ Save workout
```

**Implementation:**
1. Add AI extraction step (reuse `build-workout` patterns)
2. Build prompt with template context + user performance
3. Use `callBedrockApi` to convert to Universal Schema
4. Validate and save

**New Handler Structure:**
```typescript
const baseHandler: AuthenticatedHandler = async (event) => {
  const { programId, templateId } = event.pathParameters;
  const { userPerformance, feedback, completedAt } = JSON.parse(event.body);

  // Fetch template (has workoutContent)
  const template = await fetchTemplate(programId, templateId);

  // Build extraction prompt
  const extractionPrompt = buildTemplateLoggingPrompt(
    template.workoutContent,      // What was prescribed
    template.coachingNotes,        // Additional context
    userPerformance,               // What user actually did
    userProfile,
    coachConfig
  );

  // AI converts to Universal Schema
  const workoutData = await callBedrockApi(extractionPrompt, ...);
  const parsedWorkout = parseAndValidateWorkoutData(workoutData);

  // Save workout
  const workout = {
    workoutId,
    userId,
    workoutData: parsedWorkout,
    trainingProgramContext: { programId, templateId, ... }
  };

  await saveWorkout(workout);

  // Update template status
  template.status = 'completed';
  template.linkedWorkoutId = workoutId;

  return createOkResponse({ workout, template });
};
```

---

## Phase 6: Create New Helper Functions

### New File: `amplify/functions/libs/training-program/logging-utils.ts`

**Functions to Create:**

```typescript
/**
 * Build AI extraction prompt for logging a workout template
 * Combines prescribed template with user's actual performance
 */
export function buildTemplateLoggingPrompt(
  templateContent: string,
  coachingNotes: string,
  userPerformance: string,
  userProfile: any,
  coachConfig: any
): string {
  return `
You are extracting a workout from a training program template.

PRESCRIBED WORKOUT (what the coach prescribed):
${templateContent}

COACHING NOTES:
${coachingNotes}

USER'S ACTUAL PERFORMANCE:
${userPerformance}

Extract the workout into the Universal Workout Schema, using:
- The prescribed template as a reference for structure
- The user's actual performance for weights, reps, times, etc.
- If user deviated from template (scaled, skipped, substituted), capture that

${getSchemaWithContext('extraction')}
`;
}

/**
 * Extract lightweight exercise list from natural language workout content
 * Used for filtering and quick reference
 */
export function extractExerciseList(workoutContent: string): Exercise[] {
  // Simple regex-based extraction or AI call
  // Returns lightweight exercise objects for filtering
}
```

---

## Phase 7: Update Template Utilities

### Files to Update

#### `amplify/functions/libs/training-program/template-utils.ts`

**Remove:**
- `convertTemplateToUniversalSchema()` - No longer needed (AI does this at log time)

**Add:**
- Helper for extracting exercise list from `workoutContent` if needed
- Formatting utilities for displaying natural language templates

---

## Phase 8: Frontend Updates (if needed)

### Files to Review

#### Display Components
- Update any components that display `prescribedExercises` to show `workoutContent` instead
- Render `workoutContent` as formatted text (preserve line breaks)
- Show `coachingNotes` as additional context

#### Logging Components
- Add input for "How did the workout go?"
- Pass user input to backend for AI extraction
- Show prescribed template as reference during logging

---

## Implementation Order

### Step 1: Types & Schema ✅
- Update `WorkoutTemplate` interface
- Update `WORKOUT_TEMPLATE_STRUCTURE_SCHEMA`
- Update schema context helpers

### Step 2: Program Generation ✅
- Update `generatePhaseWorkouts()` prompt
- Simplify JSON parsing expectations
- Remove complex structure validation

### Step 3: Remove Normalization ✅
- Remove `normalizeWorkoutTemplates()`
- Remove `cleanupWorkoutTemplates()`
- Keep only program-level normalization

### Step 4: Logging Handler ✅
- Create `buildTemplateLoggingPrompt()`
- Update `log-workout-template/handler.ts`
- Add AI extraction step
- Test with real templates

### Step 5: Cleanup ✅
- Remove `convertTemplateToUniversalSchema()`
- Update any remaining references
- Update documentation

### Step 6: Testing ✅
- Generate a new training program
- Verify natural language templates
- Test logging flow end-to-end
- Verify Universal Schema output

---

## Benefits of This Approach

✅ **More Authentic**: Workouts read like a human coach wrote them
✅ **Simpler Generation**: Less complex JSON, no normalization overhead
✅ **Smarter Logging**: AI has both template AND user's actual performance
✅ **Easier Adaptation**: Just edit text, not restructure objects
✅ **Better UX**: Natural, contextual, motivational workout descriptions
✅ **Maintained Functionality**: Metadata still enables filtering, calendar, etc.

---

## Risks & Mitigations

**Risk**: Frontend expects structured `prescribedExercises`
- **Mitigation**: Keep `prescribedExercises` as optional field, populate if needed

**Risk**: Harder to filter/search workouts
- **Mitigation**: Keep lightweight exercise list + metadata fields

**Risk**: More AI work at log time
- **Mitigation**: We're already doing this! And it's the RIGHT time (user has actual data)

**Risk**: Natural language is less precise
- **Mitigation**: Coach can always edit, and AI can extract structured data when needed

---

## Success Metrics

- [ ] Training program generation produces natural language templates
- [ ] Templates feel human-written, not JSON-like
- [ ] Logging flow successfully converts template + user input to Universal Schema
- [ ] No loss of app functionality (filtering, calendar, etc.)
- [ ] Reduced AI overhead during generation (no normalization)
- [ ] User feedback: templates feel more authentic and motivational

