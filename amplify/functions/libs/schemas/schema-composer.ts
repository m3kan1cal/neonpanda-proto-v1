/**
 * Schema Composer - Dynamically composes workout schemas
 *
 * Combines base schema with discipline-specific plugins at runtime.
 * This reduces token usage by ~70% by only sending BASE + ONE discipline
 * instead of BASE + ALL 8 disciplines.
 *
 * Token Reduction Math:
 * - Old approach: BASE + ALL 8 plugins = ~1200 lines
 * - New approach: BASE + 1 plugin = ~350 lines
 * - Reduction: ~68%
 *
 * Related files:
 * - amplify/functions/libs/schemas/base-schema.ts (Base fields)
 * - amplify/functions/libs/schemas/disciplines/*.ts (Discipline plugins)
 * - amplify/functions/libs/agents/workout-logger/tools.ts (Usage)
 */

import { BASE_WORKOUT_SCHEMA } from "./base-schema";
import { CROSSFIT_SCHEMA_PLUGIN } from "./disciplines/crossfit-schema";
import { POWERLIFTING_SCHEMA_PLUGIN } from "./disciplines/powerlifting-schema";
import { BODYBUILDING_SCHEMA_PLUGIN } from "./disciplines/bodybuilding-schema";
import { RUNNING_SCHEMA_PLUGIN } from "./disciplines/running-schema";
import { HYROX_SCHEMA_PLUGIN } from "./disciplines/hyrox-schema";
import { OLYMPIC_WEIGHTLIFTING_SCHEMA_PLUGIN } from "./disciplines/olympic-weightlifting-schema";
import { FUNCTIONAL_BODYBUILDING_SCHEMA_PLUGIN } from "./disciplines/functional-bodybuilding-schema";
import { CALISTHENICS_SCHEMA_PLUGIN } from "./disciplines/calisthenics-schema";
import { CIRCUIT_TRAINING_SCHEMA_PLUGIN } from "./disciplines/circuit-training-schema";
import { HYBRID_SCHEMA_PLUGIN } from "./disciplines/hybrid-schema";

/**
 * Map of discipline names to their schema plugins
 */
const DISCIPLINE_PLUGIN_MAP: Record<string, any> = {
  crossfit: CROSSFIT_SCHEMA_PLUGIN,
  powerlifting: POWERLIFTING_SCHEMA_PLUGIN,
  bodybuilding: BODYBUILDING_SCHEMA_PLUGIN,
  running: RUNNING_SCHEMA_PLUGIN,
  hyrox: HYROX_SCHEMA_PLUGIN,
  olympic_weightlifting: OLYMPIC_WEIGHTLIFTING_SCHEMA_PLUGIN,
  functional_bodybuilding: FUNCTIONAL_BODYBUILDING_SCHEMA_PLUGIN,
  calisthenics: CALISTHENICS_SCHEMA_PLUGIN,
  circuit_training: CIRCUIT_TRAINING_SCHEMA_PLUGIN,
  hybrid: HYBRID_SCHEMA_PLUGIN,
};

/**
 * Composes a targeted workout schema by merging base schema with ONE discipline plugin
 *
 * @param discipline - The detected workout discipline (e.g., "crossfit", "powerlifting")
 * @returns Complete schema with base fields + discipline-specific fields
 *
 * @example
 * ```typescript
 * // For a CrossFit workout
 * const schema = composeWorkoutSchema("crossfit");
 * // Returns: BASE_WORKOUT_SCHEMA + CROSSFIT_SCHEMA_PLUGIN
 * // Token count: ~350 lines (vs ~1200 with all disciplines)
 * ```
 */
export function composeWorkoutSchema(discipline: string): any {
  // Get the plugin for the detected discipline
  let plugin = DISCIPLINE_PLUGIN_MAP[discipline];
  let actualDiscipline = discipline;

  // If no plugin found, fall back to CrossFit (most flexible and common schema)
  // This handles: "unknown", "strength_training", and any other unrecognized values
  if (!plugin) {
    console.warn(
      `⚠️ No schema plugin for discipline: ${discipline}, falling back to crossfit schema`,
    );
    plugin = DISCIPLINE_PLUGIN_MAP["crossfit"];
    actualDiscipline = "crossfit_fallback";
  }

  console.info(`📋 Composing schema for discipline: ${actualDiscipline}`);

  // CRITICAL: Merge base schema with ONLY the detected discipline plugin
  // This is the key optimization that reduces tokens by ~70%
  //
  // Before: BASE + ALL 8 plugins (~1200 lines)
  // After: BASE + 1 plugin (~350 lines)
  const composedSchema = {
    ...BASE_WORKOUT_SCHEMA,
    properties: {
      ...BASE_WORKOUT_SCHEMA.properties,
      discipline_specific: {
        type: "object",
        properties: plugin, // Only ONE discipline plugin
        description: `Discipline-specific data for ${actualDiscipline.replace("_fallback", "")} workouts`,
      },
    },
  };

  // Log schema size for monitoring
  const schemaSize = JSON.stringify(composedSchema).length;
  console.info(`📊 Composed schema size: ${schemaSize} characters`);

  return composedSchema;
}

/**
 * Get the list of supported disciplines
 * @returns Array of supported discipline names
 */
export function getSupportedDisciplines(): string[] {
  return Object.keys(DISCIPLINE_PLUGIN_MAP);
}

/**
 * Check if a discipline is supported
 * @param discipline - Discipline name to check
 * @returns True if discipline has a schema plugin
 */
export function isDisciplineSupported(discipline: string): boolean {
  return discipline in DISCIPLINE_PLUGIN_MAP;
}

/**
 * Extract the expected array field names from a discipline's schema plugin.
 * Looks for properties with type "array" in the schema.
 * This makes the schema the single source of truth for expected data structures.
 *
 * @param discipline - The discipline to get expected fields for
 * @returns Array of field names that should contain arrays (e.g., ["exercises"], ["rounds"])
 *
 * @example
 * ```typescript
 * getExpectedArrayFields("functional_bodybuilding"); // ["exercises", "target_muscles"]
 * getExpectedArrayFields("crossfit"); // ["rounds"]
 * getExpectedArrayFields("running"); // ["segments"]
 * ```
 */
export function getExpectedArrayFields(discipline: string): string[] {
  const plugin = DISCIPLINE_PLUGIN_MAP[discipline];
  if (!plugin) return [];

  // Find the discipline-specific schema (e.g., plugin.functional_bodybuilding)
  const disciplineSchema = plugin[discipline];
  if (!disciplineSchema?.properties) return [];

  // Extract field names where type is "array"
  // These are the primary data structure fields (exercises, rounds, segments, etc.)
  const arrayFields: string[] = [];
  for (const [fieldName, fieldSchema] of Object.entries(
    disciplineSchema.properties,
  )) {
    if ((fieldSchema as any)?.type === "array") {
      arrayFields.push(fieldName);
    }
  }

  return arrayFields;
}
