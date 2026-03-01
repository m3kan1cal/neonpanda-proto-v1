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
import { normalizeSchemaArrayFields } from "./object-utils";

const ajv = new Ajv({ allErrors: true });

const schemaCache = new Map<string, ValidateFunction>();

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
  normalizeSchemaArrayFields(response, schema);

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
