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
 * Data coercion (applied before validation):
 * - useDefaults: backfills missing properties that declare a `default` in the schema
 * - removeAdditional: strips properties not declared in the schema where
 *   `additionalProperties: false` is set — tolerates non-deterministic LLM output
 *   while still enforcing required fields, types, and enum constraints
 *
 * strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
 */

import Ajv, { ValidateFunction } from "ajv";

const ajv = new Ajv({
  allErrors: true,
  useDefaults: true,
  removeAdditional: true,
});

const schemaCache = new Map<string, ValidateFunction>();

/**
 * Validate a tool response against its JSON Schema. Throws on failure.
 *
 * Before validation, AJV automatically coerces the data:
 * - Backfills missing properties that declare a `default` (useDefaults)
 * - Strips undeclared properties where `additionalProperties: false` (removeAdditional)
 *
 * This means validation enforces structure (required, type, enum) while
 * tolerating the extra fields LLMs non-deterministically add.
 * The response object is mutated in place — callers receive clean data.
 *
 * @param toolName - The name of the tool (used as the cache key)
 * @param response - The parsed tool input returned by the model (mutated in place)
 * @param schema - The JSON Schema object to validate against (same schema sent to Bedrock)
 * @throws Error with a descriptive message listing all schema violations
 */
export function validateToolResponse(
  toolName: string,
  response: Record<string, unknown>,
  schema: Record<string, unknown>,
): void {
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
