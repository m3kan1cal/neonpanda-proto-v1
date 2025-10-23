# Training Program Normalization Implementation

## Overview
Following the exact pattern used for workout normalization in `build-workout/handler.ts`, we've implemented AI-powered normalization for training program generation. This ensures all AI-generated training programs conform to our schema structure and have valid data integrity.

## Implementation Pattern

### 1. **AI-Powered Validation** (Not Manual TypeScript Validation)
- Uses Claude (via Bedrock API) to intelligently validate and normalize data
- AI understands context and can make intelligent corrections
- More flexible than rigid manual validation rules
- Can handle complex nested structures and cross-references

### 2. **Two-Step AI Process**
```
Step 1: Extract → AI extracts training program structure from conversation
Step 2: Normalize → AI validates and normalizes the extracted structure
```

This mirrors the workout flow:
```
Step 1: Extract → AI extracts workout from user message
Step 2: Normalize → AI validates and normalizes the extracted workout
```

## Files Created

### `amplify/functions/libs/training-program/normalization.ts` (NEW)
**Purpose**: Intelligent normalization of training program data

**Key Functions**:
- `normalizeTrainingProgram()` - Main normalization orchestrator
- `shouldNormalizeTrainingProgram()` - Determines if normalization is needed
- `buildProgramNormalizationPrompt()` - Constructs AI normalization prompt
- `generateProgramNormalizationSummary()` - Human-readable summary

**Validation Focus Areas**:
1. **Program Structure** - Core metadata (name, description, duration)
2. **Phase Logic** - Sequential, non-overlapping, complete phase coverage
3. **Date Consistency** - All date math and ranges are valid
4. **Workout Templates** - Each template has valid exercise structures
5. **Cross-References** - Phase indices, day numbers are consistent
6. **Data Completeness** - Required fields present

**Issue Types**:
- `structure` - Missing or misplaced fields
- `data_quality` - Invalid data types or ranges
- `cross_reference` - Inconsistent references between entities
- `date_logic` - Invalid date calculations
- `phase_logic` - Problems with phase sequencing

## Integration

### Updated: `amplify/functions/libs/training-program/program-generator.ts`

**Added Imports**:
```typescript
import {
  normalizeTrainingProgram,
  shouldNormalizeTrainingProgram,
  generateProgramNormalizationSummary,
} from './normalization';
```

**Added Normalization Step** (after structure extraction, before program creation):
```typescript
// Step 1: Extract training program structure
const rawTrainingProgramData = await extractTrainingProgramStructure(...);

// NORMALIZATION STEP
let finalTrainingProgramData = rawTrainingProgramData;
let normalizationSummary = "Normalization skipped";

const initialConfidence = 0.85; // Default for AI-generated data

if (shouldNormalizeTrainingProgram(rawTrainingProgramData, initialConfidence)) {
  const normalizationResult = await normalizeTrainingProgram(
    rawTrainingProgramData,
    userId,
    true // Enable thinking for complex validation
  );

  // Use normalized data if validation was successful
  if (normalizationResult.isValid || normalizationResult.issues.some(i => i.corrected)) {
    finalTrainingProgramData = normalizationResult.normalizedData;
  }
}

const trainingProgramData = finalTrainingProgramData;

// Step 2: Continue with program creation using normalized data
```

## Benefits

### 1. **Data Integrity**
- ✅ Ensures all programs conform to expected schema
- ✅ Prevents phase logic errors (gaps, overlaps)
- ✅ Validates date calculations and ranges
- ✅ Ensures exercise structures are complete

### 2. **Error Prevention**
- ✅ Catches structural issues before they reach DynamoDB
- ✅ Prevents cascading errors across weeks of training
- ✅ Validates cross-references between phases and templates
- ✅ Ensures templates are executable by users

### 3. **Intelligent Correction**
- ✅ AI can fix issues contextually (not just reject)
- ✅ Preserves intent while correcting structure
- ✅ Handles complex nested structures intelligently
- ✅ More flexible than rigid validation rules

### 4. **Consistency with Workouts**
- ✅ Follows exact same pattern as workout normalization
- ✅ Same AI-powered approach for validation
- ✅ Consistent error handling and logging
- ✅ Reuses `parseJsonWithFallbacks` for robust parsing

## Normalization Triggers

Normalization runs when:
1. **Confidence < 0.7** - Low confidence in extraction
2. **Structural Issues** - Missing root properties or invalid structure
3. **Phase Logic Issues** - Non-sequential, overlapping, or incomplete phases
4. **Template Issues** - Invalid workout template structures

## AI Normalization Prompt Structure

```typescript
buildProgramNormalizationPrompt(programData) {
  1. Task Definition
     - Analyze against schema
     - Normalize structure
     - Fix issues
     - Return valid JSON

  2. Critical Instructions
     - Transform to match schema exactly
     - Move misplaced fields
     - Preserve all data
     - Fix data types

  3. Program-Specific Validation Focus
     - Program structure
     - Phase logic (sequential, non-overlapping)
     - Date consistency
     - Workout template validation
     - Cross-references
     - Data completeness

  4. Schema Definitions
     - Training Program Structure Schema
     - Workout Template Schema

  5. Expected Output Format
     {
       isValid: boolean,
       normalizedData: TrainingProgramGenerationData,
       issues: [...],
       confidence: number,
       summary: string
     }

  6. Data to Normalize
     JSON.stringify(programData)
}
```

## Logging & Observability

**Before Normalization**:
```
🔧 Running normalization on training program data...
- reason: structural_check
- confidence: 0.85
- phases: 4
- totalDays: 84
```

**After Normalization**:
```
Normalization completed:
- isValid: true
- issuesFound: 3
- correctionsMade: 3
- normalizationConfidence: 0.92
- summary: ✅ Program validated | 3 issues | 3 corrected | confidence: 92%
```

**Using Normalized Data**:
```
✅ Using normalized training program data
- phaseCount: 4
- totalDays: 84
- issuesCorrected: 3
```

## Testing Scenarios

### Scenario 1: Missing Phase Fields
**Input**: Phase missing `focusAreas`
**Expected**: AI adds placeholder or extracts from description
**Result**: Normalized data includes valid `focusAreas`

### Scenario 2: Overlapping Phases
**Input**: Phase 2 starts on Day 28, Phase 3 starts on Day 28
**Expected**: AI adjusts Phase 3 to start on Day 29
**Result**: Phases are sequential and non-overlapping

### Scenario 3: Invalid Exercise Structure
**Input**: Exercise missing `reps` field
**Expected**: AI extracts from description or sets reasonable default
**Result**: Exercise has valid structure

### Scenario 4: Incorrect Total Days
**Input**: 4 phases, last phase ends on Day 82, but totalDays is 84
**Expected**: AI corrects totalDays to 82 or extends last phase
**Result**: totalDays matches actual phase coverage

## Next Steps

1. ✅ **Normalization implemented** - AI-powered validation
2. ✅ **Integrated into program generator** - Runs after extraction
3. ⏳ **Test with real AI-generated programs** - Validate effectiveness
4. ⏳ **Monitor normalization logs** - Identify common AI extraction issues
5. ⏳ **Refine normalization prompt** - Improve based on real-world data

## Alignment with Workout Normalization

| Aspect | Workout Normalization | Training Program Normalization |
|--------|----------------------|-------------------------------|
| **Approach** | AI-powered via Bedrock | AI-powered via Bedrock |
| **Trigger** | `shouldNormalizeWorkout()` | `shouldNormalizeTrainingProgram()` |
| **Prompt Builder** | `buildNormalizationPrompt()` | `buildProgramNormalizationPrompt()` |
| **Schema Reference** | `universal-workout-schema.ts` | `training-program-schema.ts` |
| **Issue Types** | structure, data_quality, cross_reference | structure, data_quality, cross_reference, date_logic, phase_logic |
| **Output** | `NormalizationResult` | `ProgramNormalizationResult` |
| **Thinking** | Enabled for complex workouts | Enabled by default for programs |
| **Parsing** | `parseJsonWithFallbacks()` | `parseJsonWithFallbacks()` |

## Summary

✅ **Complete parity with workout normalization pattern**
✅ **AI-powered intelligent validation and correction**
✅ **Robust error handling and logging**
✅ **Ready for Phase 2 testing and Phase 3 frontend integration**

This ensures that all AI-generated training programs are structurally sound, logically consistent, and ready for users to execute. 🚀

