# Workout Extraction Error Fix

**Date**: October 23, 2025
**Issue**: Build-workout Lambda failing on markdown-wrapped JSON responses
**Status**: ✅ Resolved

## Problem Analysis

### Root Cause

User submitted "WARM up" via `/log-workout` slash command, triggering two cascading issues:

1. **Premature Validation Blocking Cleanup**: The parsing code had validation checks BEFORE calling the cleanup function
2. **No Pre-Validation**: Incomplete/accidental submissions weren't caught before expensive AI calls

### The Error Flow

```
1. User types "WARM up" → 7 characters
2. Build-workout Lambda invoked → No pre-validation
3. Extraction prompt sent to Claude → 34KB prompt for 7 char input
4. Claude returns JSON wrapped in markdown:
   ```json
   {...}
   ```
5. Parsing validation check:
   if (!trimmedData.startsWith("{")) throw error
6. ❌ FAILS before cleanup function can strip markdown
7. Error logged, workout not saved
```

### Evidence from Logs

```
ERROR Response does not start with {. First 100 chars: ```json
{"workout_id":null,"user_id":null,"date":"2025-10-22"...
```

The response was valid JSON but wrapped in markdown code fences despite:
- Multiple prompt instructions against markdown
- Explicit warnings about backtick failures
- Clear examples of correct/incorrect formats

## Solution Implemented

### 1. Remove Premature Validation ✅

**File**: `amplify/functions/libs/workout/extraction.ts` (lines 785-787)

**Before**:
```typescript
// Check if response starts and ends with proper JSON structure
const trimmedData = extractedData.trim();
if (!trimmedData.startsWith("{")) {
  throw new Error("Response does not start with valid JSON opening brace");
}
if (!trimmedData.endsWith("}")) {
  throw new Error("Response does not end with valid JSON closing brace");
}

// Parse the JSON response with cleaning and fixing
const workoutData = parseJsonWithFallbacks(extractedData);
```

**After**:
```typescript
// Parse the JSON response with cleaning and fixing (handles markdown-wrapped JSON and common issues)
// Note: parseJsonWithFallbacks will strip markdown code fences and clean the response
const workoutData = parseJsonWithFallbacks(extractedData);
```

**Reasoning**: The `parseJsonWithFallbacks()` function already handles markdown cleanup via `cleanResponse()`. The premature validation was preventing this cleanup from running, causing the error. By removing the pre-check, we let the existing cleanup logic handle markdown-wrapped responses gracefully.

### 2. Add Pre-Validation for Slash Commands ✅

**File**: `amplify/functions/build-workout/handler.ts` (lines 54-99)

**Added**:
```typescript
if (event.isSlashCommand) {
  // Pre-validate slash command content to catch incomplete/accidental submissions
  const contentTrimmed = workoutContent.trim();
  const wordCount = contentTrimmed.split(/\s+/).length;
  const charCount = contentTrimmed.length;

  // Check for obviously incomplete submissions
  if (charCount < 10 || wordCount < 3) {
    return createOkResponse({
      success: false,
      skipped: true,
      reason: "Workout description too short - please provide more details...",
      validation: { contentLength: charCount, wordCount, minimumRequired: "..." }
    });
  }

  // Check if it's just a single keyword without context
  const singleWordPattern = /^(warm|workout|exercise|training|gym|lift)\s*(up)?$/i;
  if (singleWordPattern.test(contentTrimmed)) {
    return createOkResponse({
      success: false,
      skipped: true,
      reason: "Please provide complete workout details...",
      validation: { detectedKeyword: contentTrimmed, suggestion: "..." }
    });
  }
}
```

**Reasoning**:
- Catches incomplete submissions BEFORE making expensive Bedrock API calls
- Provides helpful user feedback explaining what's needed
- Specific pattern matching for common incomplete keywords ("warm", "workout", etc.)
- Only applies to slash commands (explicit logging intent) not natural conversation

### 3. Enhance Markdown Cleanup ✅

**File**: `amplify/functions/libs/response-utils.ts` (lines 12-44)

**Enhanced**:
```typescript
export const cleanResponse = (response: string): string => {
  // More aggressive markdown removal - handle all variations
  let cleaned = response
    .replace(/^```json\s*/gm, '')  // Remove ```json at start of lines
    .replace(/^```\s*/gm, '')       // Remove ``` at start of lines
    .replace(/\s*```$/gm, '')       // Remove ``` at end of lines
    .replace(/```json/g, '')        // Remove any remaining ```json
    .replace(/```/g, '');           // Remove any remaining ```

  // Log if we detected and cleaned markdown (for monitoring)
  if (cleaned !== response.trim()) {
    console.info("✅ Stripped markdown code fences from AI response", {
      originalLength: response.length,
      cleanedLength: cleaned.length,
      hadMarkdown: true,
    });
  }

  // Find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
};
```

**Improvements**:
- More comprehensive regex patterns for markdown removal
- Multiline matching with `gm` flags
- Logging when markdown is detected (for monitoring AI behavior)
- Handles edge cases like markdown at line endings

## Why This Happens

Despite extensive prompt engineering with explicit instructions to NOT wrap JSON in markdown:
- AI models sometimes ignore formatting instructions
- Especially common for edge cases (very short/incomplete inputs)
- The AI correctly identified the input as problematic but still wrapped the response

### Prompt Already Had Strong Instructions

The extraction prompt contained:
```
CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON. No markdown backticks
- THE VERY FIRST CHARACTER of your response must be {
- CRITICAL: If your response starts with a backtick (`) character, you have FAILED
- CRITICAL: If your response contains the text ```json anywhere, you have FAILED
```

But Claude sometimes still wraps responses in markdown, particularly for:
- Very simple/short responses
- Error cases or edge inputs
- Responses with validation flags set

## Benefits of This Fix

### 1. **Graceful Handling**
- Markdown-wrapped JSON no longer causes failures
- Existing cleanup logic now runs as intended
- Better error recovery without data loss

### 2. **Cost Savings**
- Pre-validation prevents expensive AI calls for incomplete submissions
- 34KB prompts won't be sent for 7-character inputs
- Reduced Bedrock API costs

### 3. **Better UX**
- Users get immediate, helpful feedback for incomplete submissions
- Clear guidance on what's needed ("at least 10 characters and 3 words")
- Examples provided for proper workout descriptions

### 4. **Monitoring**
- Logging when markdown is detected helps track AI behavior
- Can identify patterns in when Claude ignores formatting instructions
- Useful for future prompt optimization

## Testing Recommendations

### Test Case 1: Incomplete Submission
```
Input: "WARM up"
Expected: Pre-validation catches it, returns helpful error
Result: No AI call made, user gets clear feedback
```

### Test Case 2: Markdown-Wrapped Response
```
Input: Valid workout description
AI Returns: ```json {...} ```
Expected: Cleanup strips markdown, parses successfully
Result: Workout saved normally
```

### Test Case 3: Valid Short Workout
```
Input: "3x5 squats at 185"
Expected: Passes pre-validation (11 chars, 4 words), extracts successfully
Result: Workout saved
```

### Test Case 4: Edge Keywords
```
Input: "workout" or "warm" or "gym"
Expected: Pre-validation catches keyword-only pattern
Result: Helpful error with example
```

## Deployment Notes

- ✅ No database migrations required
- ✅ Backwards compatible (doesn't affect existing workouts)
- ✅ No changes to API contracts
- ✅ Minimal risk - only affects error handling paths
- ✅ Improves both reliability and cost efficiency

## Monitoring After Deployment

Watch for these log patterns:

1. **Pre-validation catches**:
   ```
   ⚠️ Suspiciously short workout content detected
   ⚠️ Single keyword detected without workout details
   ```

2. **Markdown cleanup success**:
   ```
   ✅ Stripped markdown code fences from AI response
   ```

3. **Reduced error rate**:
   - Should see fewer "Response does not start with {" errors
   - Should see fewer JSON parse errors on valid-but-wrapped responses

## Future Improvements

1. **Prompt Optimization**: Experiment with different formatting instruction placements
2. **Model Selection**: Consider if different models respect formatting instructions better
3. **Validation Thresholds**: May need to adjust the 10 char / 3 word minimums based on real usage
4. **Pattern Expansion**: Add more incomplete submission patterns as we discover them

## Additional Findings: parseJsonWithFallbacks Audit

After fixing the workout extraction error, we audited all AI response parsing to ensure `parseJsonWithFallbacks` was used consistently across the codebase.

### Files Found Using Raw JSON.parse() on AI Responses

1. **`memory/detection.ts`** (2 instances - lines 198 & 424) ✅ FIXED
   - Had manual markdown cleanup duplicating `parseJsonWithFallbacks` logic
   - Already imported the utility but wasn't using it consistently
   - Replaced 34 lines of manual cleanup with single function call

2. **`coach-conversation/summary.ts`** (1 instance - line 170) ✅ FIXED
   - Custom regex-based JSON extraction without markdown cleanup
   - Didn't import `parseJsonWithFallbacks` at all
   - Replaced 22 lines of custom extraction logic with centralized utility

### Benefits of Consolidation

**Code Reduction**: Removed ~56 lines of redundant markdown cleanup/JSON extraction code

**Consistency**: All AI JSON parsing now uses the same robust error handling

**Better Error Recovery**: All locations now benefit from:
- Multi-pattern markdown removal (`` ```json ``, `` ``` ``, inline, multiline)
- Automatic JSON fixing (trailing commas, unbalanced braces, etc.)
- Consistent error logging with response preview
- Graceful fallback handling

**Maintainability**: Single source of truth for AI response parsing logic

### Verified Clean Files

These files already use `parseJsonWithFallbacks` correctly:
- ✅ `workout/extraction.ts`
- ✅ `workout/detection.ts`
- ✅ `workout/normalization.ts`
- ✅ `workout/validation.ts`
- ✅ `training-program/program-generator.ts`
- ✅ `training-program/normalization.ts`
- ✅ `analytics/data-fetching.ts`
- ✅ `analytics/normalization.ts`
- ✅ `coach-creator/session-management.ts`
- ✅ `coach-creator/coach-generation.ts`
- ✅ `coach-conversation/detection.ts`
- ✅ `pinecone-utils.ts`

## Related Files

- `amplify/functions/build-workout/handler.ts` - Pre-validation logic
- `amplify/functions/libs/workout/extraction.ts` - Parsing logic
- `amplify/functions/libs/response-utils.ts` - Cleanup utilities (core implementation)
- `amplify/functions/libs/prompt-helpers.ts` - JSON formatting instructions
- `amplify/functions/libs/memory/detection.ts` - Memory detection parsing
- `amplify/functions/libs/coach-conversation/summary.ts` - Conversation summary parsing

## Lessons Learned

1. **Defense in Depth**: Always have fallback handling, even with strong prompts
2. **Validate Early**: Catch bad inputs before expensive operations
3. **Don't Block Cleanup**: Validation should happen after cleanup, not before
4. **Log Everything**: Good logging helps diagnose AI behavior patterns
5. **Use Centralized Utilities**: Don't duplicate JSON parsing logic - one robust implementation is better than many fragile ones
6. **Audit Regularly**: Periodically check for inconsistent patterns across the codebase

