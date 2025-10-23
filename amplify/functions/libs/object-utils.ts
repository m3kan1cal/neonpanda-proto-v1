/**
 * Object Utility Functions
 *
 * Pure TypeScript/JavaScript utilities for object manipulation.
 * These are framework-agnostic helpers that can be used across the codebase.
 */

/**
 * Filters out null and undefined values from an object
 *
 * Useful for:
 * - Pinecone metadata (doesn't accept null values)
 * - API responses (clean up optional fields)
 * - DynamoDB updates (avoid setting null values)
 * - S3 metadata tags (requires non-null string values)
 *
 * @param obj - Object with potentially null/undefined values
 * @returns New object with only defined values (null/undefined removed)
 *
 * @example
 * ```typescript
 * const data = { a: 1, b: null, c: undefined, d: 0, e: false };
 * filterNullish(data);
 * // Returns: { a: 1, d: 0, e: false }
 * ```
 */
export const filterNullish = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined)
  ) as Partial<T>;
};

/**
 * Filters out all falsy values from an object (null, undefined, false, 0, '', NaN)
 *
 * More aggressive than filterNullish - removes any falsy value.
 * Use when you want to remove empty strings, false booleans, and zeros.
 *
 * @param obj - Object with potentially falsy values
 * @returns New object with only truthy values
 *
 * @example
 * ```typescript
 * const data = { a: 1, b: null, c: 0, d: '', e: false, f: 'hello' };
 * filterFalsy(data);
 * // Returns: { a: 1, f: 'hello' }
 * ```
 */
export const filterFalsy = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => Boolean(value))
  ) as Partial<T>;
};

/**
 * Picks specified keys from an object and filters out null/undefined values
 *
 * Combines picking specific fields with null filtering in one operation.
 *
 * @param obj - Source object
 * @param keys - Array of keys to pick from the object
 * @returns New object with only the specified keys (null/undefined values filtered)
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'John', email: null, age: 30, verified: undefined };
 * pickDefined(user, ['name', 'email', 'age']);
 * // Returns: { name: 'John', age: 30 }
 * ```
 */
export const pickDefined = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Partial<Pick<T, K>> => {
  return filterNullish(
    Object.fromEntries(
      keys.map(key => [key, obj[key]])
    )
  ) as Partial<Pick<T, K>>;
};

/**
 * Omits specified keys from an object
 *
 * @param obj - Source object
 * @param keys - Array of keys to omit from the object
 * @returns New object without the specified keys
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'John', password: 'secret', email: 'john@example.com' };
 * omit(user, ['password']);
 * // Returns: { id: 1, name: 'John', email: 'john@example.com' }
 * ```
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const keysToOmit = new Set(keys);
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysToOmit.has(key as K))
  ) as Omit<T, K>;
};

/**
 * Deep clones an object (including nested objects and arrays)
 *
 * Note: This uses JSON parse/stringify which has limitations:
 * - Doesn't handle functions, symbols, or undefined values
 * - Doesn't preserve Date objects (converts to strings)
 * - Doesn't handle circular references
 *
 * For simple data objects (common in API/database operations), this works well.
 * For more sophisticated merging with nested objects, see `deepMerge`.
 *
 * @param obj - Object to clone
 * @returns Deep clone of the object
 *
 * @example
 * ```typescript
 * const original = { a: 1, b: { c: 2 } };
 * const clone = deepClone(original);
 * clone.b.c = 3;
 * console.info(original.b.c); // Still 2
 * ```
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Deep merges a source object into a target object
 *
 * More sophisticated than Object.assign or spread operator:
 * - Recursively merges nested objects
 * - Arrays are replaced (not merged)
 * - Date objects are preserved (not merged)
 * - Missing target properties are initialized as empty objects
 *
 * This prevents accidental data loss when updating nested properties.
 * Originally from DynamoDB operations, now available as a shared utility.
 *
 * @param target - The existing object to merge into
 * @param source - The partial update object to merge from
 * @returns A new object with deep-merged properties
 *
 * @example
 * ```typescript
 * const target = {
 *   user: { name: 'John', age: 30 },
 *   settings: { theme: 'dark' }
 * };
 * const source = {
 *   user: { age: 31 },
 *   settings: { notifications: true }
 * };
 * deepMerge(target, source);
 * // Returns: {
 * //   user: { name: 'John', age: 31 },
 * //   settings: { theme: 'dark', notifications: true }
 * // }
 * ```
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

/**
 * Checks if an object is empty (has no own properties)
 *
 * @param obj - Object to check
 * @returns True if object has no own properties
 *
 * @example
 * ```typescript
 * isEmpty({});           // true
 * isEmpty({ a: 1 });     // false
 * isEmpty(null);         // true
 * isEmpty(undefined);    // true
 * ```
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (typeof obj !== 'object') return false;
  return Object.keys(obj).length === 0;
};

/**
 * Recursively converts all undefined values to null in an object
 *
 * Useful for DynamoDB which doesn't support undefined but accepts null.
 * This is the inverse of filterNullish.
 *
 * Note: This is already implemented in amplify/functions/libs/workout/extraction.ts
 * Consider using that implementation or consolidating here.
 *
 * @param obj - Object with potentially undefined values
 * @returns New object with undefined values converted to null
 *
 * @example
 * ```typescript
 * const data = { a: 1, b: undefined, c: { d: undefined } };
 * convertUndefinedToNull(data);
 * // Returns: { a: 1, b: null, c: { d: null } }
 * ```
 */
export const convertUndefinedToNull = (obj: any): any => {
  if (obj === undefined) {
    return null;
  }

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertUndefinedToNull(item));
  }

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = convertUndefinedToNull(obj[key]);
    }
  }
  return result;
};

/**
 * Merges multiple objects, with later objects taking precedence
 * Filters out null/undefined values from the merged result
 *
 * @param objects - Objects to merge
 * @returns Merged object with null/undefined filtered
 *
 * @example
 * ```typescript
 * const base = { a: 1, b: 2 };
 * const updates = { b: null, c: 3 };
 * mergeAndFilter(base, updates);
 * // Returns: { a: 1, c: 3 }
 * ```
 */
export const mergeAndFilter = <T extends Record<string, any>>(
  ...objects: Partial<T>[]
): Partial<T> => {
  const merged = Object.assign({}, ...objects);
  return filterNullish(merged);
};
