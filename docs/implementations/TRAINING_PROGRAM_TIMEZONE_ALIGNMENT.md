# Training Program Timezone Alignment

## Overview
Updated training program calendar utilities to be timezone-aware, aligning with the analytics system approach for consistent date handling across global users.

## Problem Statement
The original training program calendar system used server-side dates (`new Date()`), which could cause incorrect "today's workout" calculations for users in different timezones. For example:
- User in Tokyo (UTC+9) at 8 AM would see wrong workout day
- User in LA at 11:30 PM would have workouts counted as next day's in UTC

## Solution
Implemented timezone-aware date handling consistent with the analytics system:

1. **Fetch user timezone from profile** with fallback to `America/Los_Angeles`
2. **Convert UTC timestamps to user's local date** using `convertUTCToUserDate()`
3. **Updated all calendar functions** to accept `userTimezone` parameter
4. **Updated handlers** to pass user timezone to date-related functions

---

## Updated Files

### 1. `amplify/functions/libs/training-program/calendar-utils.ts`

#### Added Imports
```typescript
import {
  convertUTCToUserDate,
  getUserTimezoneOrDefault
} from '../analytics/date-utils';

// Re-export for convenience
export { getUserTimezoneOrDefault };
```

#### Updated Functions

**`calculateCurrentDay()`** - Now timezone-aware
```typescript
export function calculateCurrentDay(
  startDate: string,
  pausedDuration: number,
  totalDays: number,
  userTimezone: string  // NEW PARAMETER
): number {
  // Get "today" in user's timezone (not server timezone)
  const todayInUserTz = convertUTCToUserDate(now, userTimezone);
  const today = new Date(todayInUserTz);
  // ... rest of logic
}
```

**`getTodayDate()`** - Now timezone-aware
```typescript
export function getTodayDate(userTimezone: string): string {
  return convertUTCToUserDate(new Date(), userTimezone);
}
```

**`isTrainingProgramActive()`** - Now timezone-aware
```typescript
export function isTrainingProgramActive(
  status: TrainingProgram['status'],
  startDate: string,
  endDate: string,
  userTimezone: string  // NEW PARAMETER
): boolean {
  const todayInUserTz = convertUTCToUserDate(new Date(), userTimezone);
  // ... rest of logic
}
```

**`generateTrainingProgramCalendar()`** - Now timezone-aware
```typescript
export function generateTrainingProgramCalendar(
  workouts: WorkoutTemplate[],
  startDate: string,
  totalDays: number,
  pausedDuration: number,
  userTimezone: string  // NEW PARAMETER
): TrainingProgramCalendarDay[] {
  const today = getTodayDate(userTimezone);
  // ... rest of logic
}
```

---

### 2. `amplify/functions/get-workout-template/handler.ts`

#### Added Imports
```typescript
import { getUserProfile } from '../../dynamodb/operations';
import { getUserTimezoneOrDefault } from '../libs/training-program/calendar-utils';
```

#### Fetch User Timezone
```typescript
// Fetch user profile for timezone (parallel with program fetch)
const [programData, userProfile] = await Promise.all([
  getTrainingProgram(userId, coachId, programId),
  getUserProfile(userId)
]);

// Get user timezone with LA fallback
const userTimezone = getUserTimezoneOrDefault(userProfile?.attributes?.preferences?.timezone);
```

Now passes `userTimezone` to all date-related function calls.

---

### 3. `amplify/functions/log-workout-template/handler.ts`

#### Added Imports
```typescript
import { getUserProfile } from '../../dynamodb/operations';
import { getUserTimezoneOrDefault } from '../libs/training-program/calendar-utils';
import { convertUTCToUserDate } from '../analytics/date-utils';
```

#### Fetch User Timezone
```typescript
// Fetch user profile for timezone (parallel with program fetch)
const [programData, userProfile] = await Promise.all([
  getTrainingProgram(userId, coachId, programId),
  getUserProfile(userId)
]);

// Get user timezone with LA fallback
const userTimezone = getUserTimezoneOrDefault(userProfile?.attributes?.preferences?.timezone);
```

Now passes `userTimezone` to all date-related function calls.

---

## Usage Pattern

All training program handlers now follow this pattern:

```typescript
// 1. Fetch user profile in parallel with other data
const [data, userProfile] = await Promise.all([
  getSomeData(),
  getUserProfile(userId)
]);

// 2. Extract timezone with fallback
const userTimezone = getUserTimezoneOrDefault(
  userProfile?.attributes?.preferences?.timezone
);

// 3. Pass timezone to calendar functions
const today = getTodayDate(userTimezone);
const currentDay = calculateCurrentDay(startDate, pausedDuration, totalDays, userTimezone);
const isActive = isTrainingProgramActive(status, startDate, endDate, userTimezone);
```

---

## Consistency with Analytics

Training program date handling now matches the analytics system:

| Feature | Analytics | Training Programs |
|---------|-----------|-------------------|
| User timezone fetch | ✅ `getUserTimezoneOrDefault()` | ✅ `getUserTimezoneOrDefault()` |
| Default timezone | ✅ `America/Los_Angeles` | ✅ `America/Los_Angeles` |
| UTC conversion | ✅ `convertUTCToUserDate()` | ✅ `convertUTCToUserDate()` |
| Timezone awareness | ✅ All date functions | ✅ All date functions |

---

## Benefits

1. **Accurate "today" calculations** - Users see correct workout for their local date
2. **Global user support** - Works correctly across all timezones
3. **Consistent with analytics** - Same date handling patterns throughout app
4. **Future-proof** - Ready for international expansion
5. **User preference respect** - Honors user's timezone setting in profile

---

## Testing Considerations

When testing training programs:
1. Test with users in different timezones (Tokyo, London, New York, LA)
2. Test edge cases (midnight transitions, DST changes)
3. Verify "today's workout" is correct for user's local time
4. Check that workout logging uses correct date
5. Ensure program advancement happens on correct day

---

## Migration Notes

- ✅ No database migration required
- ✅ Backward compatible (fetches timezone on each request)
- ✅ Zero downtime deployment
- ✅ No changes to stored data format
- ✅ All existing programs continue to work

---

## Performance

- User profile fetch happens in **parallel** with program data fetch
- No additional latency introduced
- Timezone lookup is a simple object property access
- `convertUTCToUserDate()` uses built-in `Intl.DateTimeFormat` (fast)

---

## Date: October 20, 2025
## Status: ✅ Complete

