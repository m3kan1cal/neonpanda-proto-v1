import { logger } from "./logger";
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
 * logger.info(original.b.c); // Still 2
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

/**
 * Deeply sanitizes an object by recursively removing all null/undefined values
 * from objects and arrays at any nesting level.
 *
 * This is essential for Pinecone metadata which does not accept null values:
 * - Filters null/undefined from object properties
 * - Filters null/undefined elements from arrays
 * - Recursively processes nested objects and arrays
 * - Preserves other falsy values (0, false, empty strings)
 *
 * @param value - The value to sanitize (can be object, array, or primitive)
 * @returns Sanitized version with all nulls/undefined removed
 *
 * @example
 * ```typescript
 * const data = {
 *   topics: ['workout', null, 'training', undefined],
 *   metadata: {
 *     discipline: 'crossfit',
 *     workoutType: null,
 *     nested: {
 *       values: [1, null, 2, undefined, 3]
 *     }
 *   }
 * };
 * deepSanitizeNullish(data);
 * // Returns: {
 * //   topics: ['workout', 'training'],
 * //   metadata: {
 *  //     discipline: 'crossfit',
 * //     nested: { values: [1, 2, 3] }
 * //   }
 * // }
 * ```
 */
export const deepSanitizeNullish = (value: any): any => {
  // Handle null/undefined at root level
  if (value === null || value === undefined) {
    return undefined; // Will be filtered out by parent
  }

  // Handle arrays - filter out nulls and recursively sanitize elements
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== null && item !== undefined)
      .map(item => deepSanitizeNullish(item));
  }

  // Handle objects - filter out null properties and recursively sanitize
  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};

    for (const [key, val] of Object.entries(value)) {
      // Skip null/undefined values
      if (val === null || val === undefined) {
        continue;
      }

      // Recursively sanitize the value
      const sanitizedValue = deepSanitizeNullish(val);

      // Only add if the sanitized value is not undefined
      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }

    return sanitized;
  }

  // Primitives (strings, numbers, booleans) pass through
  return value;
};

/**
 * Normalizes a tool response by coercing non-array values to arrays for schema
 * properties declared as type "array". Mutates the response in place so
 * downstream callers receive well-typed data.
 *
 * Models occasionally return a string or null for array fields when they
 * believe a field has no meaningful content (e.g. returning "" instead of []).
 * Normalizing before validation lets AJV pass and gives downstream parsing
 * clean arrays.
 *
 * @param response - The parsed tool input returned by the model (mutated in place)
 * @param schema - The JSON Schema object the response will be validated against
 *
 * @example
 * ```typescript
 * const schema = { properties: { tags: { type: "array" } } };
 * const response = { tags: "urgent" };
 * normalizeSchemaArrayFields(response, schema);
 * // response is now: { tags: ["urgent"] }
 *
 * const response2 = { tags: null };
 * normalizeSchemaArrayFields(response2, schema);
 * // response2 is now: { tags: [] }
 * ```
 */
export const normalizeSchemaArrayFields = (
  response: Record<string, unknown>,
  schema: Record<string, unknown>,
): void => {
  const properties = (schema as any).properties as
    | Record<string, any>
    | undefined;
  if (!properties) return;

  for (const [key, propSchema] of Object.entries(properties)) {
    if (propSchema?.type === "array" && key in response) {
      const value = response[key];
      if (!Array.isArray(value)) {
        if (typeof value === "string" && value.trim().length > 0) {
          // Single non-empty string — wrap in a one-element array
          response[key] = [value];
        } else {
          // null, undefined, empty string, or other non-array → empty array
          response[key] = [];
        }
      }
    }
  }
};

/**
 * Creates a condensed version of a JSON schema for use in AI prompts
 *
 * Removes verbose fields that increase prompt size without adding value:
 * - description (verbose text explanations)
 * - pattern (regex patterns for validation)
 * - examples (example values)
 * - default (default values)
 *
 * Keeps essential structure needed for normalization:
 * - type, required, properties (core schema structure)
 * - enum (abbreviated to first value + count)
 *
 * @param schema - Full JSON schema object
 * @returns Condensed schema with verbose fields removed
 *
 * @example
 * ```typescript
 * const fullSchema = {
 *   type: 'object',
 *   properties: {
 *     name: {
 *       type: 'string',
 *       description: 'User full name',
 *       pattern: '^[A-Za-z ]+$',
 *       examples: ['John Doe', 'Jane Smith']
 *     },
 *     role: {
 *       type: 'string',
 *       enum: ['admin', 'user', 'guest', 'moderator']
 *     }
 *   }
 * };
 *
 * const condensed = getCondensedSchema(fullSchema);
 * // Returns:
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     name: { type: 'string' },
 * //     role: { type: 'string', enum: ['admin', '...3 more'] }
 * //   }
 * // }
 * ```
 */
export const getCondensedSchema = (schema: any): any => {
  const condense = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(condense);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip verbose fields that aren't needed for structural normalization
      if (key === 'description' || key === 'pattern' || key === 'examples' || key === 'default') {
        continue;
      }

      // Keep only first enum value as example (instead of all possible values)
      // This reduces size while still showing the AI what kind of values are expected
      if (key === 'enum' && Array.isArray(value) && value.length > 3) {
        result[key] = [value[0], `...${value.length - 1} more`];
        continue;
      }

      result[key] = condense(value);
    }
    return result;
  };

  return condense(schema);
};
