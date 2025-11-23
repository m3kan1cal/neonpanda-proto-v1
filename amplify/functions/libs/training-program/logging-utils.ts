/**
 * Training Program Workout Logging Utilities
 *
 * Helper functions for logging workouts from training program templates.
 * Converts natural language templates + user performance to Universal Workout Schema.
 */

import { WORKOUT_SCHEMA } from '../schemas/universal-workout-schema';
import type { CoachConfig } from '../coach-creator/types';
import type { UserProfile } from '../user/types';
import { buildCoachPersonalityPrompt } from '../coach-config/personality-utils';

/**
 * Build AI extraction prompt for logging a workout template
 *
 * Uses static/dynamic prompt pattern for Bedrock caching:
 * - Static: Coach personality, schemas, instructions (cacheable - 90% cost reduction)
 * - Dynamic: Template content, user performance, program context (unique per workout)
 *
 * Combines:
 * - The prescribed workout template (what the coach prescribed)
 * - The user's actual performance (what they actually did)
 * - Coach personality and user context
 *
 * Outputs: Universal Workout Schema
 *
 * @param templateContent - The natural language workout content from the template
 * @param templateMetadata - Metadata about the workout (name, description, etc.)
 * @param userPerformance - User's description of what they actually did
 * @param userProfile - User profile for context
 * @param coachConfig - Coach configuration for personality
 * @param programContext - Context about the training program
 * @returns Object with staticPrompt and dynamicPrompt for caching
 */
export function buildTemplateLoggingPrompt(
  templateContent: string,
  templateMetadata: {
    name: string;
    description: string;
    coachingNotes: string;
    estimatedDuration: number;
    requiredEquipment: string[];
  },
  userPerformance: string,
  userProfile: UserProfile | null,
  coachConfig: CoachConfig,
  programContext: {
    programId: string;
    programName: string;
    dayNumber: number;
    phaseId: string;
    phaseName: string;
  }
): { staticPrompt: string; dynamicPrompt: string } {
  // Build coach personality context
  const coachPersonalityPrompt = buildCoachPersonalityPrompt(coachConfig);

  // Get critical training directive if available
  const criticalTrainingDirective = userProfile?.criticalTrainingDirective || null;

  // STATIC PROMPT (cacheable - 90% cost reduction on cache hits)
  // Contains coach personality, schemas, and extraction instructions that don't change
  const staticPrompt = `${coachPersonalityPrompt}

================================================================================
WORKOUT LOGGING FROM TRAINING PROGRAM TEMPLATE
================================================================================

You are extracting a workout that was performed based on a training program template.

${criticalTrainingDirective ? `
CRITICAL TRAINING DIRECTIVE (User's specific instruction to coach):
${criticalTrainingDirective}

Consider this directive when interpreting performance and extracting data.
` : ''}

================================================================================
EXTRACTION INSTRUCTIONS
================================================================================

Extract the workout into the Universal Workout Schema using:

1. The PRESCRIBED TEMPLATE as a reference for:
   - Overall structure and intent
   - Expected exercises and progression
   - Coaching cues and focus points

2. The USER'S ACTUAL PERFORMANCE for:
   - Weights, reps, sets actually performed
   - Times, distances, calories completed
   - Any deviations, scaling, or substitutions
   - Perceived exertion and performance notes

3. HANDLING DEVIATIONS:
   - If user scaled weight: Capture both prescribed and actual in weight fields
   - If user skipped exercises: Omit from the extracted workout
   - If user substituted: Use the substituted exercise
   - If user added exercises: Include them
   - Note significant deviations in form_notes or subjective_feedback.notes

4. DATA PRIORITY:
   - Actual performance data > Prescribed data
   - If user doesn't specify something prescribed, use the prescribed value
   - If unclear, make reasonable inferences based on template

5. TRAINING PROGRAM METADATA:
   - Set metadata.logged_via = "training_program"
   - Set metadata.extraction_method = "training_program_template"
   - Reference program context in appropriate fields

EXTRACTION CONTEXT:
You must extract data into this exact JSON structure. Use null for missing data, never omit fields.

CRITICAL EFFICIENCY RULE: For workouts with >8 rounds, apply aggressive consolidation:
- Consolidate warmup progressions into 1-2 rounds maximum
- Use concise form_notes to capture progression details
- Omit null fields that don't add contextual value
- Prioritize working sets and metcon rounds for individual tracking

ANTI-MALFORMED JSON STRATEGY:
- For workouts with >15 rounds, prioritize JSON structural integrity over complete detail
- Consider grouping similar consecutive rounds into single rounds with range notation
- Example: Instead of 8 separate identical warmup rounds, use 1 round with form_notes: "Rounds 1-8: 135lbs x 3 reps progression"
- Better to have valid parseable JSON with some detail loss than malformed JSON with full detail
- Focus on: working sets, key lifts, metcon rounds - these are most important for tracking

UNIVERSAL WORKOUT SCHEMA STRUCTURE:
${JSON.stringify(WORKOUT_SCHEMA, null, 2)}

Remember: This workout was performed as part of a training program. Preserve the connection
between what was prescribed and what was actually done. If the user deviated significantly
from the template, capture that context in the subjective feedback and coach notes sections.
`;

  // DYNAMIC PROMPT (not cacheable - unique per workout)
  // Contains the specific template content, user performance, and program context
  const dynamicPrompt = `
TRAINING PROGRAM CONTEXT:
- Program: ${programContext.programName}
- Day ${programContext.dayNumber} (${programContext.phaseName})
- Workout: ${templateMetadata.name}
- Description: ${templateMetadata.description}

PRESCRIBED WORKOUT (what the coach prescribed):
---
${templateContent}
---

COACHING NOTES:
${templateMetadata.coachingNotes}

EXPECTED DETAILS:
- Duration: ~${templateMetadata.estimatedDuration} minutes
- Equipment: ${templateMetadata.requiredEquipment.join(', ')}

USER'S ACTUAL PERFORMANCE (what they actually did):
---
${userPerformance}
---

Extract the workout now in Universal Workout Schema format.
`;

  return { staticPrompt, dynamicPrompt };
}

/**
 * Extract lightweight exercise list from natural language workout content
 * Used for quick reference and filtering without full AI processing
 *
 * This is a simple regex-based extraction for basic filtering functionality.
 * For full workout details, use the AI extraction in buildTemplateLoggingPrompt.
 *
 * @param workoutContent - Natural language workout content
 * @returns Array of basic exercise references (exerciseName and guessed movementType)
 */
export function extractExerciseList(workoutContent: string): Array<{
  exerciseName: string;
  movementType: string;
}> {
  const exercises: Array<{ exerciseName: string; movementType: string }> = [];

  // Common exercise patterns to look for
  const exercisePatterns = [
    // Barbell exercises
    { regex: /\b(back squat|front squat|squat|deadlift|bench press|overhead press|push press|clean|snatch|thruster|row)\b/gi, type: 'barbell' },
    // Dumbbell exercises
    { regex: /\b(dumbbell [a-z\s]+|db [a-z\s]+)\b/gi, type: 'dumbbell' },
    // Kettlebell exercises
    { regex: /\b(kettlebell swing|kb swing|turkish get.up)\b/gi, type: 'kettlebell' },
    // Bodyweight exercises
    { regex: /\b(pull.?up|push.?up|dip|sit.?up|burpee|lunge|box jump|muscle.?up|handstand)\b/gi, type: 'bodyweight' },
    // Cardio/monostructural
    { regex: /\b(assault bike|row|rower|concept2|ski erg|run|running)\b/gi, type: 'cardio' },
  ];

  for (const pattern of exercisePatterns) {
    const matches = workoutContent.matchAll(pattern.regex);
    for (const match of matches) {
      const name = match[0].trim();
      // Avoid duplicates
      if (!exercises.some(ex => ex.exerciseName.toLowerCase() === name.toLowerCase())) {
        exercises.push({
          exerciseName: name,
          movementType: pattern.type,
        });
      }
    }
  }

  return exercises;
}

