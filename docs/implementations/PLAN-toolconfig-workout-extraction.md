# Implementation Plan: ToolConfig for Workout Extraction

## Overview
Implement the `toolConfig` pattern for workout extraction in `build-workout` Lambda, following the exact same approach successfully used in `build-coach-config`. This will enable structured JSON output directly from Bedrock API using tool-based generation, eliminating the need for JSON parsing and improving extraction reliability.

## Current State Analysis

### Current Implementation
**File**: `amplify/functions/build-workout/handler.ts` (622 lines)

**Current Flow**:
1. Validates workout content (slash command checks, complexity analysis)
2. Builds extraction prompt using `buildWorkoutExtractionPrompt()`
3. Calls Bedrock API with system prompt + user message (lines 134-139)
4. Returns **string response** (not tool-based)
5. Parses response with `parseAndValidateWorkoutData()` using `parseJsonWithFallbacks()`
6. Applies normalization via `normalizeWorkout()` if needed
7. Validates discipline, checks blocking flags
8. Saves to DynamoDB + Pinecone

**Current Bedrock Call** (line 134-139):
```typescript
const extractedData = await callBedrockApi(
  extractionPrompt,
  workoutContent,
  MODEL_IDS.CLAUDE_SONNET_4_FULL,
  { enableThinking }
) as string; // No tools used, always returns string
```

### Key Difference from Coach Config
- **Coach Config**: Calls multiple extraction functions (safety, methodology, etc.) THEN main generation
- **Workout**: Single extraction call that outputs the entire Universal Workout Schema

### Target Schema
**Universal Workout Schema v2.0** - defined in `amplify/functions/libs/schemas/universal-workout-schema.ts`

Complex nested structure including:
- Basic workout metadata (date, discipline, type, duration)
- Performance metrics (intensity, heart rate, calories)
- Discipline-specific data (crossfit, powerlifting, running, etc.)
- PR achievements
- Subjective feedback (enjoyment, difficulty, soreness)
- Environmental factors
- Recovery metrics
- Coach notes
- Metadata (confidence, validation flags, extraction notes)

---

## Implementation Plan

### Phase 1: Create Workout Extraction Tool Schema

**File to Create**: `amplify/functions/libs/workout/tool-schema.ts`

**Actions**:
1. ✅ Create new file for tool schema definition
2. ✅ Define `WORKOUT_EXTRACTION_TOOL_SCHEMA` based on Universal Workout Schema v2.0
3. ✅ Use JSON Schema format compatible with Bedrock `toolConfig`
4. ✅ Match the structure from `universal-workout-schema.ts` exactly
5. ✅ Include all required and optional fields with proper types
6. ✅ Add detailed descriptions for each field to guide AI generation
7. ✅ Define nested objects (discipline_specific, performance_metrics, etc.)
8. ✅ Export schema constant for use in extraction

**Schema Structure**:
```typescript
export const WORKOUT_EXTRACTION_TOOL_SCHEMA = {
  toolSpec: {
    name: 'extract_workout_data',
    description: 'Extract structured workout data from natural language workout descriptions using the Universal Workout Schema v2.0',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          // Map every field from UNIVERSAL_WORKOUT_SCHEMA_V2
          date: { type: 'string', description: 'Workout date in YYYY-MM-DD format' },
          discipline: {
            type: 'string',
            enum: ['crossfit', 'powerlifting', 'bodybuilding', 'hiit', 'running', 'swimming', 'cycling', 'yoga', 'martial_arts', 'climbing', 'hybrid'],
            description: 'Primary training discipline'
          },
          // ... all other fields
          discipline_specific: {
            type: 'object',
            properties: {
              crossfit: { /* nested structure */ },
              powerlifting: { /* nested structure */ },
              running: { /* nested structure */ },
              // ... etc
            }
          },
          metadata: {
            type: 'object',
            required: ['data_confidence', 'schema_version', 'validation_flags'],
            properties: {
              // ... metadata fields
            }
          }
        },
        required: ['date', 'discipline', 'workout_type', 'metadata']
      }
    }
  }
};
```

---

### Phase 2: Update Extraction Function

**File to Modify**: `amplify/functions/libs/workout/extraction.ts`

**Function**: `buildWorkoutExtractionPrompt()` (currently returns string prompt)

**Actions**:
1. ✅ Keep existing function signature (don't break existing code)
2. ✅ Update system prompt to work with tool-based generation
3. ✅ Remove JSON formatting instructions (no longer needed - tool handles structure)
4. ✅ Focus prompt on *what to extract* rather than *how to format JSON*
5. ✅ Add instructions for tool usage
6. ✅ Maintain domain-specific guidance (CrossFit rounds, powerlifting sets, etc.)

**Example Updated Prompt** (simplified):
```typescript
export const buildWorkoutExtractionPrompt = (
  workoutContent: string,
  coachConfig: CoachConfig,
  criticalTrainingDirective: string | null,
  userTimezone: string
): string => {
  return `You are an expert workout data extraction specialist...

YOUR TASK:
Extract structured workout data from the user's workout description using the extract_workout_data tool.

EXTRACTION GUIDELINES:
1. Analyze the workout description carefully
2. Identify discipline, workout type, and key performance data
3. Extract exercises, sets, reps, weights, times, etc.
4. Capture subjective feedback if mentioned
5. Identify any PR achievements
6. Note safety concerns in coach_notes

DISCIPLINE-SPECIFIC EXTRACTION:
[Current guidance for CrossFit, Powerlifting, Running, etc.]

USE THE TOOL:
Call extract_workout_data with the structured data you've extracted.
${getSchemaWithContext('extraction')}
`;
};
```

---

### Phase 3: Update Handler to Use ToolConfig

**File to Modify**: `amplify/functions/build-workout/handler.ts`

**Current Call Location**: Lines 134-139

**Actions**:
1. ✅ Import `WORKOUT_EXTRACTION_TOOL_SCHEMA` from `tool-schema.ts`
2. ✅ Update `callBedrockApi` to include `toolConfig` parameter
3. ✅ Handle tool-based response vs text response (similar to coach-config)
4. ✅ Remove reliance on `parseAndValidateWorkoutData()` for initial parsing
5. ✅ Keep validation logic for system-generated fields
6. ✅ Add comprehensive logging for tool usage

**Before** (line 134-139):
```typescript
const extractedData = await callBedrockApi(
  extractionPrompt,
  workoutContent,
  MODEL_IDS.CLAUDE_SONNET_4_FULL,
  { enableThinking }
) as string;
```

**After**:
```typescript
import { WORKOUT_EXTRACTION_TOOL_SCHEMA } from '../libs/workout/tool-schema';

// Build the system prompt (updated for tool-based extraction)
const systemPrompt = buildWorkoutExtractionPrompt(
  workoutContent,
  event.coachConfig,
  event.criticalTrainingDirective,
  event.userTimezone
);

console.info("🎯 Attempting tool-based workout extraction");

// Call Bedrock with toolConfig
const response = await callBedrockApi(
  systemPrompt,
  workoutContent,
  MODEL_IDS.CLAUDE_SONNET_4_FULL,
  {
    enableThinking,
    toolConfig: WORKOUT_EXTRACTION_TOOL_SCHEMA
  }
);

let workoutData: UniversalWorkoutSchema;

// Check if tool was used
if (typeof response === 'object' && 'toolUse' in response) {
  console.info("✅ Tool-based extraction succeeded");
  workoutData = response.toolUse.input as UniversalWorkoutSchema;

  // Set system-generated fields
  const shortId = Math.random().toString(36).substring(2, 11);
  workoutData.workout_id = `workout_${event.userId}_${Date.now()}_${shortId}`;
  workoutData.user_id = event.userId;

} else {
  // Fallback to text parsing if tool wasn't used
  console.warn("⚠️ Tool not used, falling back to text parsing");
  const extractedData = response as string;
  workoutData = await parseAndValidateWorkoutData(extractedData, event.userId);
}
```

---

### Phase 4: Update api-helpers.ts (if needed)

**File**: `amplify/functions/libs/api-helpers.ts`

**Check**: Verify `callBedrockApi` already supports `toolConfig` parameter (it should from coach-config implementation)

**Actions**:
1. ✅ Confirm `toolConfig` parameter is supported
2. ✅ Verify tool response handling matches our expectations
3. ✅ Add any workout-specific error handling if needed

**Expected signature** (already implemented):
```typescript
export async function callBedrockApi(
  systemPrompt: string,
  userMessage: string = "Please proceed.",
  modelId: string = MODEL_IDS.CLAUDE_SONNET_4_FULL,
  options?: {
    enableThinking?: boolean;
    toolConfig?: any; // <-- This should already exist
    staticPrompt?: string;
    dynamicPrompt?: string;
    prefillText?: string;
  }
): Promise<string | ToolUseResponse>
```

---

### Phase 5: Logging & Debugging

**File to Modify**: `amplify/functions/build-workout/handler.ts`

**Actions**:
1. ✅ Add logging for tool-based vs text-based extraction path
2. ✅ Log tool response structure for debugging
3. ✅ Store tool-based extraction data in S3 (similar to prompt/response storage)
4. ✅ Track success/fallback metrics in logs
5. ✅ Add validation logging for tool-generated data

**Example Logging**:
```typescript
console.info("Extraction method used:", {
  method: typeof response === 'object' && 'toolUse' in response ? 'tool-based' : 'text-parsing',
  responseType: typeof response,
  hasToolUse: typeof response === 'object' && 'toolUse' in response,
  toolName: typeof response === 'object' && 'toolUse' in response ? response.toolUse.name : null
});

// Store tool success/failure data in S3
await storeDebugDataInS3(
  JSON.stringify(response, null, 2),
  {
    userId: event.userId,
    type: typeof response === 'object' && 'toolUse' in response ? 'tool-success' : 'tool-fallback',
    method: 'workout-extraction',
    timestamp: new Date().toISOString()
  },
  'workout-extraction'
);
```

---

### Phase 6: Maintain Backward Compatibility

**Critical Requirement**: Don't break existing functionality

**Actions**:
1. ✅ Keep `parseAndValidateWorkoutData()` as fallback
2. ✅ Keep normalization logic (`normalizeWorkout()`) for edge cases
3. ✅ Maintain all validation checks (blocking flags, discipline classification, etc.)
4. ✅ Keep S3 debug storage for prompts/responses
5. ✅ Preserve all confidence scoring and metadata logic
6. ✅ Keep all existing error handling paths

**Fallback Strategy**:
```typescript
// If tool fails or isn't used, gracefully fall back to text parsing
if (typeof response === 'string') {
  console.warn("Tool-based extraction not used, parsing text response");
  workoutData = await parseAndValidateWorkoutData(response, event.userId);
}
```

---

### Phase 7: Testing & Validation

**Test Cases**:

1. **Simple Workout** (e.g., "3x5 back squat at 185lbs")
   - ✅ Verify tool generates valid structure
   - ✅ Check all required fields present
   - ✅ Validate discipline classification

2. **Complex CrossFit Workout** (multiple rounds, varied exercises)
   - ✅ Test tool handles nested `discipline_specific.crossfit.rounds[]`
   - ✅ Verify exercise objects properly structured
   - ✅ Check performance_data extraction

3. **Running Workout** (distance, pace, segments)
   - ✅ Test `discipline_specific.running` structure
   - ✅ Verify segments array properly formed
   - ✅ Check environmental factors capture

4. **Slash Command** (`/log warm up, then 5 sets of deadlifts`)
   - ✅ Verify tool works with slash command flow
   - ✅ Check metadata.logged_via field

5. **Incomplete Data** (minimal user input)
   - ✅ Test tool handles missing data gracefully
   - ✅ Verify null values used appropriately
   - ✅ Check confidence scores reflect data quality

6. **Fallback Test**
   - ✅ Simulate tool failure, verify text parsing fallback works
   - ✅ Ensure no data loss or errors

**Validation Checks**:
- ✅ Schema compliance (all required fields present)
- ✅ Data type correctness (numbers are numbers, not strings)
- ✅ Nested structure integrity (discipline_specific properly formed)
- ✅ Metadata completeness (validation_flags, confidence, etc.)
- ✅ S3 storage successful (prompts, responses, debug data)
- ✅ Pinecone storage successful (workout summaries)

---

## Success Criteria

### Must Have
1. ✅ Tool-based extraction generates valid Universal Workout Schema v2.0 structure
2. ✅ All required fields populated correctly by tool
3. ✅ Nested objects (discipline_specific, performance_metrics) properly structured
4. ✅ Text parsing fallback works if tool fails
5. ✅ No breaking changes to existing functionality
6. ✅ Comprehensive logging for debugging

### Nice to Have
1. ✅ Reduced normalization frequency (better initial structure from tool)
2. ✅ Improved extraction confidence scores
3. ✅ Faster execution time (less post-processing needed)
4. ✅ Better handling of complex multi-phase workouts

### Metrics to Track
- **Tool Usage Rate**: % of extractions using tool vs fallback
- **Normalization Rate**: % of workouts requiring normalization (expect decrease)
- **Confidence Scores**: Average data_confidence (expect increase)
- **Validation Flags**: Frequency of blocking flags (expect decrease)
- **Execution Time**: Total Lambda duration (expect slight decrease)

---

## Implementation Order

### Step 1: Create Tool Schema ✅
- Create `amplify/functions/libs/workout/tool-schema.ts`
- Define complete schema matching Universal Workout Schema v2.0
- Export `WORKOUT_EXTRACTION_TOOL_SCHEMA`

### Step 2: Update Extraction Prompt ✅
- Modify `buildWorkoutExtractionPrompt()` in `extraction.ts`
- Remove JSON formatting instructions
- Add tool usage guidance

### Step 3: Update Handler ✅
- Modify `build-workout/handler.ts`
- Import tool schema
- Update Bedrock API call with toolConfig
- Add tool response handling
- Implement fallback logic
- Add comprehensive logging

### Step 4: Test Thoroughly ✅
- Test simple workouts
- Test complex multi-phase workouts
- Test each discipline (CrossFit, Powerlifting, Running)
- Test slash commands
- Test fallback scenarios
- Verify S3 and Pinecone storage

### Step 5: Monitor & Iterate ✅
- Deploy to production
- Monitor CloudWatch logs for tool usage
- Track success/fallback rates
- Adjust tool schema if needed based on real-world usage
- Document any issues or improvements needed

---

## Key Differences from Coach Config Implementation

| Aspect | Coach Config | Workout Extraction |
|--------|-------------|-------------------|
| **Extraction Calls** | Multiple (safety, methodology, etc.) | Single comprehensive extraction |
| **Schema Complexity** | Moderate (coach personality, technical config) | High (nested discipline-specific data) |
| **Required Fields** | Fixed set | Varies by discipline |
| **Normalization** | Not needed | May still need for complex workouts |
| **Tool Schema Size** | ~500 lines | ~1000 lines (more disciplines) |
| **Fallback Importance** | Low (coach config usually works) | High (workout variety is extreme) |

---

## Risks & Mitigations

### Risk 1: Tool Schema Too Complex
**Impact**: Bedrock might not handle deeply nested schema
**Mitigation**: Start with full schema, simplify if needed, maintain fallback

### Risk 2: Discipline-Specific Variations
**Impact**: Different workouts need different structures
**Mitigation**: Make discipline_specific flexible, use detailed descriptions

### Risk 3: Performance Degradation
**Impact**: Tool generation might be slower than text parsing
**Mitigation**: Monitor execution time, keep fallback fast

### Risk 4: Breaking Existing Flows
**Impact**: Changes could affect downstream processing
**Mitigation**: Extensive testing, maintain backward compatibility

---

## Rollback Plan

If tool-based extraction causes issues:

1. ✅ **Immediate**: Comment out toolConfig parameter (revert to text parsing)
2. ✅ **Quick Fix**: Adjust tool schema based on errors, redeploy
3. ✅ **Full Rollback**: Revert all changes, return to pure text parsing
4. ✅ **Fallback Always Works**: Text parsing remains functional as safety net

---

## Files to Create/Modify

### New Files
- `amplify/functions/libs/workout/tool-schema.ts` (new)

### Modified Files
- `amplify/functions/libs/workout/extraction.ts` (update prompt function)
- `amplify/functions/build-workout/handler.ts` (add tool handling)
- `amplify/functions/libs/api-helpers.ts` (verify toolConfig support - may not need changes)

### Reference Files (no changes)
- `amplify/functions/libs/schemas/universal-workout-schema.ts` (schema reference)
- `amplify/functions/libs/workout/types.ts` (TypeScript interfaces)
- `amplify/functions/libs/workout/validation.ts` (validation logic)
- `amplify/functions/libs/workout/normalization.ts` (normalization logic)

---

## Timeline Estimate

- **Phase 1** (Tool Schema): 2-3 hours
- **Phase 2** (Update Prompt): 1 hour
- **Phase 3** (Update Handler): 2 hours
- **Phase 4** (API Helpers Check): 30 minutes
- **Phase 5** (Logging): 1 hour
- **Phase 6** (Compatibility): 30 minutes
- **Phase 7** (Testing): 3-4 hours

**Total**: ~10-12 hours of focused work

---

## Notes

- Follow exact same pattern as coach-config (proven to work)
- Tool schema is larger and more complex due to workout variety
- Fallback to text parsing is CRITICAL (workout descriptions are unpredictable)
- Monitor tool usage rate to measure success
- Expect iterative refinement of tool schema based on real usage

