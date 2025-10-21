# deepMerge Migration to Shared Utilities

**Date:** October 21, 2025
**Status:** ✅ Complete
**Impact:** DynamoDB operations + future reusability

## Summary

Moved the `deepMerge` utility function from `amplify/dynamodb/operations.ts` (where it was private) to the shared `amplify/functions/libs/object-utils.ts` file, making it available throughout the codebase.

## What Changed

### Before: Private Function in operations.ts

```typescript
// amplify/dynamodb/operations.ts (lines 442-459)

/**
 * Deep merge utility function for safely merging partial updates into existing objects.
 * This prevents accidental data loss when updating nested properties.
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      !(source[key] instanceof Date)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      // Direct assignment for primitives, arrays, and dates
      result[key] = source[key];
    }
  }
  return result;
}
```

**Issues:**
- ❌ Only available in `operations.ts`
- ❌ Can't be reused in other modules
- ❌ Duplicates effort if needed elsewhere
- ❌ Hidden as private implementation detail

### After: Shared Export in object-utils.ts

```typescript
// amplify/functions/libs/object-utils.ts

/**
 * Deep merges a source object into a target object
 *
 * More sophisticated than Object.assign or spread operator:
 * - Recursively merges nested objects
 * - Arrays are replaced (not merged)
 * - Date objects are preserved (not merged)
 * - Missing target properties are initialized as empty objects
 *
 * @param target - The existing object to merge into
 * @param source - The partial update object to merge from
 * @returns A new object with deep-merged properties
 */
export const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      !(source[key] instanceof Date)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      // Direct assignment for primitives, arrays, and dates
      result[key] = source[key];
    }
  }
  return result;
};
```

**Benefits:**
- ✅ Available throughout the codebase
- ✅ Can be imported wherever needed
- ✅ Properly documented with JSDoc
- ✅ Part of shared utility collection

### Updated operations.ts

```typescript
// amplify/dynamodb/operations.ts

import { deepMerge } from "../functions/libs/object-utils";

// Note: deepMerge is now imported from shared object-utils.ts
// It's used throughout this file for safe nested object merging
```

**Removed:** 18 lines of function definition + documentation
**Added:** 1 import line + 2-line comment

## Where deepMerge is Used in operations.ts

The function is critical for safe updates throughout DynamoDB operations:

### 1. **updateCoachConfig** (line 379)
```typescript
const updatedCoachConfig: CoachConfig = deepMerge(
  existingConfig.attributes,
  updates
);
```
Safely merges partial coach config updates without losing nested properties.

### 2. **updateCoachConversation** (line 1034)
```typescript
const updatedConversation: CoachConversation = deepMerge(
  existingConversation.attributes,
  updates
);
```
Merges conversation metadata updates while preserving message history.

### 3. **updateUserProfile** (line 1777)
```typescript
const updatedProfile: UserProfile = deepMerge(
  existingProfile.attributes,
  updates
);
```
Updates user profile fields without losing other profile data.

### 4. **updateWorkout** (line 1454)
```typescript
const updatedSession: Workout = deepMerge(
  existingSession.attributes,
  updates
);
```
Merges workout updates while preserving full workout data structure.

### 5. **updateTrainingProgram** (line 2733)
```typescript
const updatedProgram: TrainingProgram = deepMerge(
  existingProgram.attributes,
  updates
);
```
Updates program status/progress without losing program template.

## Why deepMerge is Important

### Problem Without It
```typescript
// Shallow merge loses nested data
const existing = {
  user: { name: 'John', age: 30, email: 'john@example.com' },
  settings: { theme: 'dark', notifications: true }
};

const update = {
  user: { age: 31 }  // Want to update just age
};

const result = { ...existing, ...update };
// Result: { user: { age: 31 }, settings: { ... } }
// ❌ Lost name and email!
```

### Solution With deepMerge
```typescript
const result = deepMerge(existing, update);
// Result: {
//   user: { name: 'John', age: 31, email: 'john@example.com' },
//   settings: { theme: 'dark', notifications: true }
// }
// ✅ Preserved all nested data
```

## Key Features

1. **Recursive Merging** - Handles deeply nested objects
2. **Array Replacement** - Arrays are replaced, not merged (expected behavior)
3. **Date Preservation** - Date objects stay as Date objects
4. **Null Handling** - Properly handles null values
5. **Type Safety** - Works with TypeScript's type system

## Potential Future Uses

Now that `deepMerge` is exported, it can be used anywhere:

### API Request Handlers
```typescript
import { deepMerge } from '../libs/object-utils';

// Merge default options with user-provided options
const options = deepMerge(defaultOptions, userOptions);
```

### Config Management
```typescript
// Merge base config with environment-specific overrides
const config = deepMerge(baseConfig, envConfig);
```

### State Updates
```typescript
// Safe state updates in complex objects
const newState = deepMerge(currentState, stateUpdates);
```

### Form Data Processing
```typescript
// Merge form updates with existing data
const updatedForm = deepMerge(existingFormData, formUpdates);
```

## Comparison with Other Utilities

| Utility | Use Case | Example |
|---------|----------|---------|
| `Object.assign()` | Shallow merge | `Object.assign({}, obj1, obj2)` ❌ Loses nested data |
| `{ ...spread }` | Shallow merge | `{ ...obj1, ...obj2 }` ❌ Loses nested data |
| `deepClone` | Copy object | `deepClone(obj)` ✅ Preserves structure, but doesn't merge |
| `deepMerge` | Merge nested | `deepMerge(target, source)` ✅ Perfect for updates |
| `mergeAndFilter` | Merge + clean | `mergeAndFilter(obj1, obj2)` ✅ Merges and removes nulls |

## Testing Recommendations

### Unit Tests
```typescript
describe('deepMerge', () => {
  it('merges nested objects', () => {
    const target = { a: { b: 1, c: 2 } };
    const source = { a: { c: 3, d: 4 } };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
  });

  it('replaces arrays', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [4, 5] };
    const result = deepMerge(target, source);
    expect(result).toEqual({ items: [4, 5] });
  });

  it('preserves Date objects', () => {
    const date = new Date('2025-01-01');
    const target = { created: new Date('2024-01-01') };
    const source = { created: date };
    const result = deepMerge(target, source);
    expect(result.created).toBe(date);
    expect(result.created instanceof Date).toBe(true);
  });

  it('initializes missing nested objects', () => {
    const target = {};
    const source = { a: { b: { c: 1 } } };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: { b: { c: 1 } } });
  });
});
```

### Integration Tests
```typescript
describe('DynamoDB update operations', () => {
  it('safely updates nested coach config', async () => {
    const updates = { technical_config: { experience_level: 'advanced' } };
    const result = await updateCoachConfig(userId, coachId, updates);
    // Should preserve all other technical_config fields
    expect(result.technical_config.programming_focus).toBeDefined();
  });
});
```

## Migration Checklist

- [x] Moved function to `object-utils.ts`
- [x] Added comprehensive JSDoc documentation
- [x] Added usage examples in documentation
- [x] Updated `operations.ts` import
- [x] Removed old private function from `operations.ts`
- [x] Updated `OBJECT_UTILS_REFACTOR.md` documentation
- [x] Updated `OBJECT_UTILS_SUMMARY.md` (9 utilities now)
- [x] Zero linter errors
- [x] All existing functionality preserved
- [x] No breaking changes

## Impact

**Code Quality:**
- ✅ Reduced code duplication
- ✅ Improved discoverability
- ✅ Better documentation
- ✅ Consistent patterns

**Maintainability:**
- ✅ Single source of truth
- ✅ Easier to test
- ✅ Easier to update
- ✅ Clear ownership

**Developer Experience:**
- ✅ Available for import anywhere
- ✅ Well-documented with examples
- ✅ Part of utility collection
- ✅ TypeScript support

## Related Documentation

- `docs/implementations/OBJECT_UTILS_REFACTOR.md` - Main refactor documentation
- `docs/implementations/OBJECT_UTILS_SUMMARY.md` - Quick reference
- `amplify/functions/libs/object-utils.ts` - Source code
- `amplify/dynamodb/operations.ts` - Primary consumer

## Summary

Successfully migrated `deepMerge` from a private helper function to a shared utility, making it available throughout the codebase. This follows the same pattern as other object utilities (`filterNullish`, `deepClone`, etc.) and improves code reusability without any breaking changes. 🎉

