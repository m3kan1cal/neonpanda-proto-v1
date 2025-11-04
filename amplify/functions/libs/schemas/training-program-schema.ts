/**
 * Training Program Schema - Shared Schema Definition
 *
 * This module contains the complete Training Program structure that can be
 * dynamically loaded into prompts for program generation from conversations.
 */

/**
 * Complete Training Program Structure Schema
 * Used for AI-powered program generation from Build mode conversations
 */
export const TRAINING_PROGRAM_STRUCTURE_SCHEMA = `{
  "name": "string (concise, descriptive program name)",
  "description": "string (1-2 sentences describing the program)",
  "totalDays": "number (total program duration in days)",
  "trainingFrequency": "number (training days per week)",
  "startDate": "string (YYYY-MM-DD format, typically today's date)",
  "phases": [
    {
      "name": "string (phase name, e.g., 'Foundation Building', 'Strength Development')",
      "startDay": "number (1-indexed starting day within program)",
      "endDay": "number (1-indexed ending day within program)",
      "description": "string (what this phase focuses on)",
      "focusAreas": ["string array (e.g., 'strength', 'conditioning', 'power', 'endurance')"]
    }
  ],
  "trainingGoals": ["string array (user's goals, e.g., 'increase squat 1RM', 'improve conditioning')"],
  "equipmentConstraints": ["string array (available equipment, e.g., 'barbell', 'pullup bar', 'dumbbells')"],
  "workoutTemplates": []
}`;

/**
 * Complete Workout Template Array Schema (Segmented Approach with Implicit Grouping)
 * Used for AI-powered daily workout generation for each phase
 *
 * Templates for the same day are linked via groupId (implicit grouping)
 * Each template represents a distinct, independently trackable workout.
 *
 * Simple days: 1 template with same groupId
 * Complex days: 2-5 templates with same groupId (e.g., "Strength Block", "Accessory Work", "Conditioning")
 */
export const WORKOUT_TEMPLATE_ARRAY_SCHEMA = `[
  {
    "templateId": "string (format: 'template_userId_timestamp_shortId' - system will generate)",
    "groupId": "string (format: 'group_userId_timestamp_shortId' - links templates for same day)",
    "dayNumber": "number (1-indexed day within program)",
    "name": "string (clear, user-facing name: 'Strength Block', 'Lower Body Burn', 'Metcon Chipper')",
    "type": "'strength' | 'accessory' | 'conditioning' | 'skill' | 'mobility' | 'warmup' | 'cooldown' | 'recovery' | 'power' | 'olympic' | 'endurance' | 'flexibility' | 'balance' | 'core' | 'stability' | 'mixed'",
    "description": "string (NATURAL LANGUAGE - write the workout as a human coach would)",
    "prescribedExercises": ["string array (e.g., 'Back Squat', 'KB Swings')"],
    "scoringType": "'load' | 'time' | 'amrap' | 'rounds_plus_reps' | 'emom' | 'reps' | 'distance' | 'calories' | 'pace' | 'rpe' | 'completion' | 'none'",
    "timeCap": "number | null (for timed workouts, in minutes)",
    "estimatedDuration": "number (expected duration in minutes)",
    "restAfter": "number (rest after this workout in minutes, 0 if last of day)",
    "equipment": ["string array (optional, e.g., 'Barbell', 'Kettlebell')"],
    "notes": "string (REQUIRED for strength/power/max testing, OPTIONAL for simple accessory/mobility - see guidelines below)",
    "metadata": {
      "difficulty": "string (optional: 'beginner', 'intermediate', 'advanced')",
      "focusAreas": ["string array (optional: ['Lower Body', 'Strength'])"]
    }
  }
]`;

/**
 * Schema version information
 */
export const TRAINING_PROGRAM_SCHEMA_VERSION = "1.0";
export const TRAINING_PROGRAM_SCHEMA_LAST_UPDATED = "2025-01-20";

/**
 * Helper function to get the training program structure schema with context
 */
export const getTrainingProgramStructureSchemaWithContext = (): string => {
  return `
TRAINING PROGRAM STRUCTURE EXTRACTION CONTEXT:
You must extract training program structure from the conversation into this exact JSON structure.

IMPORTANT RULES:
- Ensure phases cover the entire program duration (phases should span from day 1 to totalDays)
- Phase startDay and endDay must be consecutive and non-overlapping
- Phase 1 should always start at day 1
- Training frequency should match what was discussed (typically 3-6 days per week)
- Equipment constraints should only include equipment that was explicitly mentioned
- Focus areas should be specific and actionable (e.g., "strength", "power", "conditioning", "technique")
- startDate should typically be today's date (will be set by system if not provided)
- workoutTemplates should be an empty array (workouts generated separately per phase)

PROGRAM STRUCTURE SCHEMA:
${TRAINING_PROGRAM_STRUCTURE_SCHEMA}`;
};

/**
 * Helper function to get the workout template array schema with context
 * Generates flat array of segmented workout templates with implicit grouping
 */
export const getWorkoutTemplateArraySchemaWithContext = (phaseContext: {
  phaseName: string;
  phaseDescription: string;
  phaseDurationDays: number;
  phaseStartDay: number;
  programName: string;
  trainingFrequency: number;
  equipment: string[];
  goals: string[];
  userId: string;
}): string => {
  return `
WORKOUT TEMPLATE GENERATION - SEGMENTED APPROACH WITH IMPLICIT GROUPING:

Generate a flat array of WorkoutTemplates for this phase.
Templates for the same day are linked via matching groupId and dayNumber.
Each template represents a distinct workout that the athlete will log separately.

Think like SugarWOD or TrainHeroic: complex training days are broken into logical,
independently trackable workouts (e.g., "Strength Block", "Accessory Work", "Conditioning").

PHASE CONTEXT:
- Phase: ${phaseContext.phaseName}
- Description: ${phaseContext.phaseDescription}
- Duration: ${phaseContext.phaseDurationDays} days
- Starting at day: ${phaseContext.phaseStartDay}
- Program: ${phaseContext.programName}
- Training Frequency: ${phaseContext.trainingFrequency}x per week
- Available Equipment: ${phaseContext.equipment.join(', ')}
- Program Goals: ${phaseContext.goals.join(', ')}

CRITICAL TEMPLATE STRUCTURE GUIDELINES:

1. GROUPING TEMPLATES BY DAY:
   - Simple days: 1 template with unique groupId
   - Complex days: 2-5 templates sharing the same groupId
   - All templates for a day have the same dayNumber and groupId
   - Each template = distinct workout user tracks separately

2. TEMPLATE NAMING (USER-FACING) - STRICT LATIN CONVENTION:
   - Give each template a clear, descriptive name
   - Users will see this in UI displayed prominently
   - Make names motivating and specific
   - Avoid generic names like "Workout 1" or "Template A"

   LATIN NAMING RULES (MANDATORY):
   - Use ONLY Latin words - NO English, NO Greek mythology
   - Structure: [Latin Adjective/Noun] [Latin Noun] or [Latin Noun] [Latin Noun]
   - GOOD EXAMPLES:
     * "Fortis Vigor" (Strong Energy)
     * "Mortis Trahens" (Death Pull/Deadlift)
     * "Catena Posterior" (Posterior Chain)
     * "Pressa Maximus" (Maximum Press)
     * "Impetus Potentia" (Power Impulse)
     * "Infernus Maximus" (Maximum Hell/Fire)
     * "Tempestus Ferrum" (Iron Storm)
   - BAD EXAMPLES (DO NOT USE):
     * "Gladiator Complex" (mixing Latin + English)
     * "Tempestus Power" (mixing Latin + English)
     * "Titan Shoulders" (Greek mythology)
     * "Hercules Arms" (Greek hero)
     * "Cyclone Chaos" (plain English)
     * "Olympus Endurance" (Greek mythology)
   - Common Latin words: Fortis (strong), Magnus (great), Velocitas (speed), Potentia (power),
     Ferrum (iron), Tempestus (storm), Mortis (death), Vigor (energy), Infernus (hell/fire)
   - This is a SIGNATURE FEATURE - maintain strict consistency across all templates

3. TEMPLATE TYPES:
   - strength: Heavy barbell lifts, max effort work
   - accessory: Secondary strength, hypertrophy
   - conditioning: MetCons, cardio, AMRAPs, EMOMs
   - skill: Technique practice, skill development
   - mobility: Stretching, mobility work
   - warmup: Warm-up specific movements
   - cooldown: Cool-down specific movements
   - recovery: Recovery-focused work
   - power: Powerlifting work, max effort singles/doubles
   - olympic: Olympic lifting work (snatch, clean & jerk)
   - endurance: Endurance cardio, long distance work
   - flexibility: Flexibility and stretching work
   - balance: Balance training
   - core: Core-focused work
   - stability: Stability training
   - mixed: Combination of multiple types

4. SCORING TYPES:
   - load: Track weight lifted (e.g., Back Squat 5RM)
   - time: For time workouts (e.g., "21-15-9 For Time")
   - amrap: As many rounds as possible
   - rounds_plus_reps: Track rounds + partial reps (e.g., "3 rounds + 15 reps")
   - emom: Every minute on the minute
   - reps: Total reps completed
   - distance: Distance covered
   - calories: Track calories on cardio equipment (rower, bike, ski erg)
   - pace: Speed tracking (min/mile, min/km, min/500m)
   - rpe: Rate of Perceived Exertion (1-10 scale for auto-regulated training)
   - completion: Just mark as done
   - none: No scoring needed

5. NATURAL LANGUAGE DESCRIPTIONS:
   - Write each template description as a human coach would
   - Be specific: sets, reps, weights, rest periods
   - Include coaching cues, form focus, intensity guidance
   - Add motivational language and context

   EXAMPLE (Strength Template):
   "Back Squat\n5x5 @ 205lbs (75% of your 1RM ~275lbs)\nFocus on hitting depth
   consistently every rep. Keep chest up throughout. Rest 3 minutes between sets.\n\n
   Scale: If form breaks, reduce weight 10% immediately."

   EXAMPLE (Conditioning Template):
   "12 minute AMRAP:\n15 KB Swings (53#)\n12 Box Step-Ups (24\", alternating legs)
   \n10 Burpees\n\nPace yourself - this is about consistency. Aim for 4-5 rounds.
   Keep breathing controlled."

6. COACH NOTES - WHEN REQUIRED VS OPTIONAL:

   REQUIRED (must include detailed notes):
   - strength templates: Form cues, scaling options, RPE guidance, video recommendations
   - power templates: Max effort strategy, technique reminders, safety notes
   - Max testing templates: Warm-up protocol, attempt strategy, form checkpoints

   STRONGLY RECOMMENDED (should include notes):
   - Complex conditioning: Pacing strategy, movement standards, break strategies
   - Longer endurance sessions (>20 min): Pacing guidance, intensity targets
   - Technical skill work: Specific cues, progression/regression options

   OPTIONAL (may omit if description is self-explanatory):
   - Simple accessory circuits: Basic movements with clear rep schemes
   - Mobility/recovery work: Straightforward stretching or foam rolling
   - Short conditioning finishers: Simple AMRAPs with common movements

   NOTES EXAMPLES:
   - Strength: "Film your third set - I want to see depth consistency. Scale to 195lbs if form breaks."
   - Max Testing: "Rest 4-5 min between heavy singles. Stop if bar speed slows or form breaks."
   - Endurance: "Keep intensity at RPE 6-7, conversational pace throughout. This builds aerobic base."

7. PRESCRIBED EXERCISES:
   - Array of exercise names: ["Back Squat", "KB Swings", "Burpees"]
   - For AI context and filtering only
   - List key movements from the template

8. DURATION & REST:
   - estimatedDuration: realistic (10-30 minutes per template)
   - restAfter: 2-5 minutes between templates, 0 if last template of day

9. GROUP IDS & TEMPLATE IDS:
   - Generate unique IDs using pattern:
   - groupId: "group_${phaseContext.userId}_" + timestamp + "_" + random 9-char string
   - templateId: "template_${phaseContext.userId}_" + timestamp + "_" + random 9-char string
   - Templates for same day share the same groupId
   - Use different timestamps/randoms for each templateId to ensure uniqueness

GENERATION REQUIREMENTS:
- Generate templates for ${phaseContext.phaseDurationDays} days
- Day numbers: ${phaseContext.phaseStartDay} to ${phaseContext.phaseStartDay + phaseContext.phaseDurationDays - 1}
- Training ${phaseContext.trainingFrequency}x per week - include rest/recovery days
- Rest days: 1 template (type: "mobility", brief stretching/recovery work)
- Progressive overload: difficulty increases throughout phase
- Equipment: ONLY use from [${phaseContext.equipment.join(', ')}]
- Each day has 1-5 templates sharing the same groupId
- Return a flat array of ALL templates for the phase

SCHEMA (return a flat array of all templates for ${phaseContext.phaseDurationDays} days):
${WORKOUT_TEMPLATE_ARRAY_SCHEMA}`;
};
