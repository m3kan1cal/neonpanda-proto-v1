/**
 * Client-side tool response validation using ajv
 *
 * Compensates for the removal of Bedrock's server-side strict mode by validating
 * tool use responses against the same JSON Schemas sent to the model.
 *
 * Design:
 * - Compile each schema once, cache by toolName for subsequent requests
 * - Report all violations in a single pass (allErrors: true)
 * - Throw on failure so callers' existing retry logic can re-attempt
 *
 * strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
 */

import Ajv, { ValidateFunction } from "ajv";

const ajv = new Ajv({ allErrors: true });

const schemaCache = new Map<string, ValidateFunction>();

/**
 * Normalize a tool response before validation by coercing non-array values to
 * arrays for schema properties declared as type "array". Mutates the response
 * in place so downstream callers receive well-typed data.
 *
 * Models occasionally return a string or null for array fields when they
 * believe the field has no meaningful content (e.g. returning "" instead of []).
 * Normalizing here lets validation pass and gives downstream parsing clean arrays.
 */
function normalizeArrayFields(
  response: Record<string, unknown>,
  schema: Record<string, unknown>,
): void {
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
}

/**
 * Validate a tool response against its JSON Schema.
 *
 * @param toolName - The name of the tool (used as the cache key)
 * @param response - The parsed tool input returned by the model
 * @param schema - The JSON Schema object to validate against (same schema sent to Bedrock)
 * @throws Error with a descriptive message listing all schema violations
 */
export function validateToolResponse(
  toolName: string,
  response: Record<string, unknown>,
  schema: Record<string, unknown>,
): void {
  // Coerce non-array values to arrays where the schema requires it.
  // Mutates the response in place so downstream parsing receives well-typed data.
  normalizeArrayFields(response, schema);

  let validate = schemaCache.get(toolName);

  if (!validate) {
    validate = ajv.compile(schema);
    schemaCache.set(toolName, validate);
  }

  const valid = validate(response);

  if (!valid) {
    const errors = validate.errors ?? [];
    const errorMessages = errors
      .map((e) => `${e.instancePath || "(root)"} ${e.message}`)
      .join("; ");

    throw new Error(
      `Tool response validation failed for "${toolName}": ${errorMessages}`,
    );
  }
}
