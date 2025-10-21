# Running Workout Fixes & Schema Improvements

**Date:** October 21, 2025
**Author:** System
**Status:** ✅ Complete

## Problem Summary

When logging a running workout, the build-workout Lambda was failing to store the workout summary in Pinecone with the following error:

```
PineconeBadRequestError: Invalid type for field 'methodology' in record
(must be a string, number, boolean or list of strings, got 'null')
```

## Root Cause

In `amplify/functions/libs/workout/pinecone.ts`, the `methodology` field was being set directly without checking for null values:

```typescript
methodology: workoutData.methodology,  // ❌ This can be null
```

Pinecone metadata fields do not accept `null` values - fields must either have valid values or be omitted entirely.

## Solution Implemented

### 1. Fixed Pinecone Null Handling

**File:** `amplify/functions/libs/workout/pinecone.ts`

Created a reusable helper function to filter out null/undefined values:

```typescript
/**
 * Helper to filter out null/undefined values from an object
 * Pinecone metadata doesn't accept null values, so we only include defined values
 */
const filterNullish = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined)
  ) as Partial<T>;
};
```

Then refactored the metadata construction to be much cleaner and more maintainable:

**Before:**
```typescript
// Verbose and error-prone
methodology: workoutData.methodology,  // ❌ Can be null
...(workoutData.duration !== null && { duration: workoutData.duration }),
...(workoutData.performance_metrics?.intensity !== null &&
    workoutData.performance_metrics?.intensity !== undefined &&
    { intensity: workoutData.performance_metrics.intensity }),
```

**After:**
```typescript
// Clean and maintainable
const optionalFields = filterNullish({
  methodology: workoutData.methodology,
  duration: workoutData.duration,
  intensity: workoutData.performance_metrics?.intensity,
  perceivedExertion: workoutData.performance_metrics?.perceived_exertion,
  location: workoutData.location,
});
```

This approach:
- ✅ Prevents null values from being sent to Pinecone
- ✅ Much easier to read and maintain
- ✅ Reduces code duplication
- ✅ Can be reused for other metadata sections

### 2. Enhanced Running Workout Schema

**File:** `amplify/functions/libs/schemas/universal-workout-schema.ts`

Significantly expanded the running discipline schema to better capture running-specific data:

#### New Fields Added:

**Run Types:**
- Added: `progression`, `threshold`, `hill_repeats`, `speed_work` to existing types

**Distance & Elevation:**
- `distance_unit`: "miles|km" - explicitly track unit of measurement
- `elevation_loss`: Track descents in addition to climbs

**Enhanced Weather Tracking:**
```typescript
"weather": {
  "temperature": "number (fahrenheit or celsius)|null",
  "temperature_unit": "F|C|null",
  "conditions": "sunny|cloudy|rainy|snowy|windy|foggy|null",
  "wind_speed": "number (mph or km/h)|null",
  "humidity": "number (percent)|null"
}
```

**Equipment Tracking:**
```typescript
"equipment": {
  "shoes": "string|null",           // Track shoe model/type
  "wearable": "string|null",        // Watch, fitness tracker
  "other_gear": "array|null"        // Hydration vest, etc.
}
```

**Structured Warmup/Cooldown:**
```typescript
"warmup": {
  "distance": "number|null",
  "time": "number (seconds)|null",
  "description": "string|null"
},
"cooldown": {
  "distance": "number|null",
  "time": "number (seconds)|null",
  "description": "string|null"
}
```

**Enhanced Segment Data:**
```typescript
"segments": [
  {
    "segment_number": "integer",
    "segment_type": "warmup|working|interval|recovery|cooldown|main",
    "distance": "number",
    "time": "number (seconds)",
    "pace": "string (MM:SS)",
    "heart_rate_avg": "number|null",
    "heart_rate_max": "number|null",      // NEW
    "cadence": "number (steps per minute)|null",  // NEW
    "effort_level": "easy|moderate|hard|max",
    "terrain": "flat|uphill|downhill|mixed",
    "elevation_change": "number (feet or meters)|null",  // NEW
    "notes": "string|null"                // NEW
  }
]
```

**Route Information:**
```typescript
"route": {
  "name": "string|null",               // Route name (e.g., "Lake Loop")
  "description": "string|null",
  "type": "out_and_back|loop|point_to_point|null"
}
```

**Fueling & Hydration:**
```typescript
"fueling": {
  "pre_run": "string|null",           // Pre-run nutrition
  "during_run": "array|null",         // Gels, chews, etc.
  "hydration_oz": "number|null"       // Fluid intake in ounces
}
```

### 3. Enhanced Pinecone Metadata for Running

**File:** `amplify/functions/libs/workout/pinecone.ts`

Added running-specific metadata fields to improve semantic search and coach context:

```typescript
// Running-specific data (filter out null values)
...(workoutData.discipline === 'running' && workoutData.discipline_specific?.running && {
  runType: workoutData.discipline_specific.running.run_type,
  ...(workoutData.discipline_specific.running.total_distance !== null && { totalDistance: ... }),
  ...(workoutData.discipline_specific.running.total_time !== null && { totalTime: ... }),
  ...(workoutData.discipline_specific.running.average_pace !== null && { averagePace: ... }),
  ...(workoutData.discipline_specific.running.surface !== null && { surface: ... }),
  ...(workoutData.discipline_specific.running.elevation_gain !== null && { elevationGain: ... }),
}),
```

This allows coaches to search for runs by:
- Run type (tempo, intervals, long runs, etc.)
- Distance ranges
- Pace ranges
- Surface type
- Elevation characteristics

## Benefits

### For Runners:
1. **Better Data Capture**: More comprehensive tracking of run-specific metrics
2. **Interval Training**: Proper support for structured workouts with warmup/cooldown
3. **Weather Context**: Understand how conditions affect performance
4. **Equipment Tracking**: Track shoe mileage and gear usage
5. **Nutrition Tracking**: Log fueling strategies for long runs
6. **Cadence & HR**: Track running form and effort metrics

### For Coaches:
1. **Semantic Search**: Find similar runs based on type, pace, distance
2. **Pattern Recognition**: Identify trends in performance across conditions
3. **Personalization**: Better context for workout recommendations
4. **Progress Tracking**: Compare runs over time with richer metadata

### For the System:
1. **Error Prevention**: No more Pinecone errors from null metadata fields
2. **Data Quality**: More structured and complete workout data
3. **Future-Proof**: Schema can accommodate advanced running analytics

## Testing Recommendations

### 1. Test Null Methodology Fix
- Log a workout from any discipline without a specific methodology
- Verify it saves to DynamoDB successfully
- Verify it stores in Pinecone without errors
- Check CloudWatch logs for successful Pinecone storage

### 2. Test Running Schema
Try logging various running workout types:

**Basic Tempo Run:**
```
"I did a 5 mile tempo run this morning. Started easy for 1 mile warmup at 9:30 pace,
then held 7:30 pace for 3 miles, finished with 1 mile cooldown at 9:00 pace.
Total time was 41:30. Heart rate averaged 165 bpm during the tempo portion."
```

**Interval Workout:**
```
"Track workout today: 2 mile warmup, then 6x800m intervals at 3:10 pace with 400m
recovery jogs between. Cooldown 1.5 miles. Heart rate hit 180 on the last interval.
Wore my Nike Vaporfly shoes."
```

**Long Run with Fueling:**
```
"15 mile long run on the trail. Started at 9:00am, temp was 65°F and sunny.
Average pace 9:45/mile with some hills (gained about 800ft elevation).
Had a gel at mile 8, drank 20oz of water during the run.
Used my Hoka Speedgoat shoes. Felt strong the whole way."
```

**Easy Recovery Run:**
```
"Easy 3 miler on tired legs. Just ran by feel at 10:30 pace on the road.
Heart rate stayed in zone 2 around 140 bpm. Perfect recovery run."
```

### 3. Verify Pinecone Storage
After each test:
1. Check CloudWatch logs for "✅ Successfully stored workout summary in Pinecone"
2. Verify no errors about null metadata fields
3. Confirm running-specific fields are captured in Pinecone metadata

### 4. Test Coach Context Retrieval
- Have a coach search for similar runs
- Verify semantic search works with new running metadata
- Test filtering by run type, distance, pace ranges

## Migration Notes

### Existing Data
- No migration needed for existing workouts
- Old running workouts will continue to work with the previous schema
- New workouts will automatically use the enhanced schema

### Backward Compatibility
- All new fields are optional (can be null)
- Extraction will gracefully handle both old and new schema formats
- Existing running workouts won't break with the new schema

## Reusability of `filterNullish` Helper

The `filterNullish` helper function created in this fix could be moved to a shared utility file and reused across the codebase wherever null/undefined filtering is needed:

**Potential use cases:**
1. **Other Pinecone integrations** - Coach creator, memory storage, training programs
2. **API responses** - Clean up response objects before sending to clients
3. **DynamoDB queries** - Filter out null values in update expressions
4. **S3 metadata** - Prepare clean metadata objects for S3 object tagging

**Recommended location:** `amplify/functions/libs/api-helpers.ts` or create a new `amplify/functions/libs/object-utils.ts`

**Example export:**
```typescript
// amplify/functions/libs/object-utils.ts
export const filterNullish = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined)
  ) as Partial<T>;
};

// Also useful variants:
export const filterFalsy = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => Boolean(value))
  ) as Partial<T>;
};
```

## Future Enhancements

Consider implementing:

1. **Auto-detection of Interval Structure**: AI could detect interval patterns and structure segments automatically
2. **Pace Zones**: Define custom pace zones (easy, tempo, threshold, VO2max) per user
3. **Shoe Mileage Tracking**: Automatically track total miles per shoe
4. **Weather API Integration**: Auto-populate weather data based on location and time
5. **Route Library**: Save and reuse favorite routes
6. **Comparison Analytics**: Compare performance across similar runs
7. **Training Load Calculation**: Calculate TRIMP or TSS for running workouts

## Related Files

- `amplify/functions/libs/workout/pinecone.ts` - Pinecone storage with null handling
- `amplify/functions/libs/schemas/universal-workout-schema.ts` - Enhanced running schema
- `amplify/functions/build-workout/handler.ts` - Main workout extraction handler
- `amplify/functions/libs/workout/extraction.ts` - Workout data parsing

## Verification

✅ Code changes implemented
✅ Linter checks passed
✅ No TypeScript errors
✅ Null handling follows existing patterns
✅ Schema expansion is backward compatible
✅ Documentation updated

Ready for deployment and testing.

