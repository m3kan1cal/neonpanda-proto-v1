/**
 * Workout Session Detection Library
 *
 * This module provides functionality to detect when users are describing
 * completed workouts in their coach conversations.
 */

import { QuickWorkoutExtraction } from './types';
import { callBedrockApi, MODEL_IDS } from '../api-helpers';

/**
 * Supported workout slash commands
 */
export const WORKOUT_SLASH_COMMANDS = ['log-workout'] as const;

/**
 * Slash command parsing result
 */
export interface SlashCommandResult {
  isSlashCommand: boolean;
  command?: string;
  content?: string;
}

/**
 * Parses a message to detect and extract slash command structure
 *
 * @param message - The user's message to analyze
 * @returns object containing slash command information
 *
 * @example
 * ```typescript
 * parseSlashCommand("/log-workout I did Fran in 8:57");
 * // Returns: { isSlashCommand: true, command: "log-workout", content: "I did Fran in 8:57" }
 *
 * parseSlashCommand("I just finished my workout");
 * // Returns: { isSlashCommand: false }
 * ```
 */
export const parseSlashCommand = (message: string): SlashCommandResult => {
  if (!message || typeof message !== 'string') {
    return { isSlashCommand: false };
  }

  const slashCommandRegex = /^\/([a-zA-Z0-9-]+)\s*([\s\S]*)$/;
  const match = message.match(slashCommandRegex);

  if (!match) {
    return { isSlashCommand: false };
  }

  const [, command, content] = match;
  return {
    isSlashCommand: true,
    command: command.toLowerCase(),
    content: content.trim()
  };
};

/**
 * Checks if a slash command is a workout logging command
 *
 * @param slashCommandResult - Result from parseSlashCommand
 * @returns boolean indicating if this is a workout logging command
 *
 * @example
 * ```typescript
 * const result = parseSlashCommand("/log-workout I did Fran");
 * isWorkoutSlashCommand(result); // Returns: true
 *
 * const result2 = parseSlashCommand("/help");
 * isWorkoutSlashCommand(result2); // Returns: false
 * ```
 */
export const isWorkoutSlashCommand = (slashCommandResult: SlashCommandResult): boolean => {
  return slashCommandResult.isSlashCommand &&
    slashCommandResult.command !== undefined &&
    WORKOUT_SLASH_COMMANDS.includes(slashCommandResult.command as any);
};

/**
 * AI-powered detection of completed workout logging in user messages
 * Analyzes both workout content and completion intent in a single pass
 *
 * @param message - The user's message to analyze
 * @returns Promise<boolean> indicating if the message is a workout log
 *
 * @example
 * ```typescript
 * const isWorkout = await isWorkoutLog("I just finished Fran in 8:57");
 * // Returns: true
 *
 * const isPlanning = await isWorkoutLog("Can I superset bench press with pushups?");
 * // Returns: false (planning/advice, not completed workout)
 * ```
 */
export const isWorkoutLog = async (message: string): Promise<boolean> => {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const detectionPrompt = `
Analyze this message to determine if it describes a COMPLETED WORKOUT that should be logged.

MESSAGE: "${message}"

Return ONLY a JSON response in this exact format:
{
  "isWorkoutLog": boolean,
  "confidence": number,
  "reasoning": "brief explanation"
}

STRICT WORKOUT LOGGING DETECTION CRITERIA:

ONLY classify as workout logging if ALL THREE requirements are met:

1. PAST TENSE COMPLETION: Message must explicitly indicate a workout WAS COMPLETED
   REQUIRED language patterns:
   - "I did [workout]" / "Did [workout]"
   - "I finished [workout]" / "Just finished [workout]" / "Finished [workout]"
   - "I completed [workout]" / "Completed [workout]"
   - "I crushed [workout]" / "Crushed [workout]"
   - "I performed [workout]" / "Performed [workout]"
   - "I trained [workout]" / "Trained [workout]"
   - "I got through [workout]" / "Got through [workout]"
   - "I knocked out [workout]" / "Knocked out [workout]"

   AVOID: "will do", "going to", "planning", "want to", "should I", "might do"

2. SPECIFIC WORKOUT CONTENT: Must contain concrete workout details
   REQUIRED content (at least one):
   - Specific times: "8:57", "30 minutes", "45 seconds"
   - Weights/loads: "315 lbs", "50kg", "bodyweight", "135#"
   - Reps/rounds: "5 rounds", "20 reps", "3 sets", "AMRAP"
   - Named workouts: "Fran", "Murph", "Cindy", "Helen"
   - Distances: "3 miles", "5k", "400m"
   - Specific exercises: "deadlifts", "thrusters", "pull-ups"
   - Workout structures: "21-15-9", "EMOM", "tabata"

   AVOID: Vague references like "worked out", "exercised", "trained hard"

3. EXPLICIT LOGGING INTENT: Clear intent to record/document the completed workout
   REQUIRED intent patterns:
   - "I did [specific workout details]"
   - "Just finished [specific workout details]"
   - "Completed [specific workout details]"
   - "Today's workout: [specific details]"
   - "My workout today: [specific details]"
   - "This morning I did [specific details]"
   - "Workout done: [specific details]"
   - "Training session complete: [specific details]"

   LOGGING REQUEST language (even more explicit):
   - "Log this workout:"
   - "Track this:"
   - "Record my workout:"
   - "Add this to my log:"
   - "Save this workout:"
   - "Document this session:"

   AVOID: Questions, discussions, experiences, feelings, commentary

EXAMPLES THAT SHOULD BE DETECTED AS WORKOUT LOGS:
[YES] "I did Fran today in 8:57"
[YES] "Just finished my deadlift session - 5x3 at 315lbs"
[YES] "Completed a 5k run this morning in 24:30"
[YES] "Today's workout: 3 rounds of burpees and squats"
[YES] "Crushed that EMOM - 10 minutes of thrusters"
[YES] "Did 21-15-9 of pull-ups and push-ups"
[YES] "Log this workout: 5 rounds of Cindy"
[YES] "Record my training: back squats 3x5 at 275lbs"
[YES] "Track this: 30-minute bike ride"
[YES] "Workout done: bench press and rows"

EXAMPLES THAT SHOULD NOT BE DETECTED (casual conversation):
[NO] "I felt strong during squats" (discussing experience, no completion language)
[NO] "The thrusters were tough today" (commentary on difficulty, not logging)
[NO] "I'm sore from yesterday's deadlifts" (discussing recovery, not logging)
[NO] "Should I do Murph this week?" (future planning question)
[NO] "What did I do last Tuesday?" (asking about past, not logging new)
[NO] "How was your workout?" (asking about others)
[NO] "I love doing burpees" (expressing preferences)
[NO] "My form felt off on squats" (technique discussion)
[NO] "I want to work on pull-ups" (future goals, not completed workout)
[NO] "The gym was crowded today" (general discussion)
[NO] "That workout looks hard" (commenting on future workout)
[NO] "I'm thinking about doing Fran" (considering, not completed)
[NO] "Deadlifts are my favorite" (preference discussion)

CRITICAL EXCLUSION PATTERNS:
- Question words: "what", "how", "when", "where", "why", "should", "can", "could"
- Future tense: "will", "going to", "planning", "want to", "need to"
- Conditional: "if I", "maybe", "thinking about", "considering"
- Discussion: "I like", "I prefer", "I think", "I feel"
- Experience sharing: "it was", "felt like", "seemed", "appeared"
- Advice seeking: "recommendations", "suggestions", "help", "tips"

CONFIDENCE SCORING:
- 0.9+: Clear past tense + specific details + explicit logging language
- 0.7-0.9: Past tense + workout content but less explicit logging intent
- 0.5-0.7: Ambiguous but contains some workout logging elements
- <0.5: Missing key requirements or clearly not workout logging

CRITICAL: When in doubt, DO NOT classify as workout logging. It's better to miss a workout log than create false positives from casual fitness conversation.`;

    const response = await callBedrockApi(detectionPrompt, message, MODEL_IDS.NOVA_MICRO);
  const result = JSON.parse(response);

  console.info('AI workout detection:', {
    message: message.substring(0, 100),
    isWorkoutLog: result.isWorkoutLog,
    confidence: result.confidence,
    reasoning: result.reasoning
  });

  return result.isWorkoutLog && result.confidence > 0.5;
};

/**
 * AI-powered quick extraction of workout information for immediate coach response
 * This is used for immediate coach response while full extraction runs async
 *
 * @param message - The user's message to analyze
 * @returns Promise<QuickWorkoutExtraction> with extracted information
 */
export const quickWorkoutExtraction = async (message: string): Promise<QuickWorkoutExtraction> => {
  const extractionPrompt = `
Extract key workout information from this message for immediate coach feedback.

MESSAGE: "${message}"

Return ONLY a JSON response in this exact format:
{
  "workoutName": "string|null",
  "discipline": "crossfit|powerlifting|running|bodybuilding|hiit|general|null",
  "timeDetected": "string|null",
  "weightDetected": "string|null",
  "repCountDetected": "string|null",
  "roundsDetected": "string|null",
  "intensityDetected": "string|null",
  "equipmentUsed": "string|null",
  "locationContext": "string|null",
  "keyExercises": ["array of main exercises"],
  "confidence": number,
  "quickSummary": "brief one-line summary for coach"
}

EXTRACTION GUIDELINES:
1. workoutName: Named workouts (Fran, Murph, etc.) or user-given names
2. discipline: Best guess based on movements/language
3. timeDetected: Any time mentions (8:57, 30 minutes, etc.)
4. weightDetected: Primary weights used (135 lbs, 50kg dumbbells, etc.)
5. repCountDetected: Key rep numbers mentioned
6. roundsDetected: Rounds/sets completed
7. intensityDetected: RPE, effort level, or descriptive intensity
8. equipmentUsed: Key equipment (dumbbells, barbell, bodyweight, etc.)
9. locationContext: Gym, home, hotel, outdoors, etc.
10. keyExercises: 2-4 main movements mentioned
11. confidence: 0.8+ for clear info, 0.5-0.7 moderate, <0.5 unclear
12. quickSummary: One sentence for immediate coach context

Examples:
- "Just finished Fran in 8:57 with 95lb thrusters" → workoutName: "Fran", timeDetected: "8:57", weightDetected: "95 lbs"
- "Crushed 5 rounds of that brutal hotel workout" → roundsDetected: "5", intensityDetected: "brutal", locationContext: "hotel"
- "Deadlifted 315 for 3 reps, new PR!" → discipline: "powerlifting", weightDetected: "315", repCountDetected: "3", intensityDetected: "PR"`;

    const response = await callBedrockApi(extractionPrompt, message, MODEL_IDS.NOVA_MICRO);
  const result = JSON.parse(response);

  console.info('AI quick workout extraction:', {
    message: message.substring(0, 100),
    confidence: result.confidence,
    summary: result.quickSummary
  });

  return result;
};



/**
 * Generates AI coach context for workout detection responses
 * Provides different coaching guidance based on detection method
 *
 * @param isSlashCommand - Whether workout was detected via slash command
 * @returns array of context strings for AI coach system prompt
 *
 * @example
 * ```typescript
 * // For slash command detection
 * const context = generateWorkoutDetectionContext(true);
 * // Returns context for explicit workout logging
 *
 * // For natural language detection
 * const context = generateWorkoutDetectionContext(false);
 * // Returns context for detected workout sharing
 * ```
 */
export const generateWorkoutDetectionContext = (isSlashCommand: boolean): string[] => {
  const baseContext = isSlashCommand
    ? [
        'The user has explicitly requested to log a workout using a slash command. Acknowledge this clearly and provide encouraging feedback.',
        'Since they used a command, you can be more direct about the logging: "Perfect! I\'ve logged that workout for you..." or "Great! Got that workout recorded..."',
        'Focus on the specific workout content they provided and give coaching feedback about their performance, form, or progress.',
        'You can mention they can view their workout history in the Training Grounds if it fits naturally in the conversation.'
      ]
    : [
        'The user has just shared details about a completed workout. Respond naturally as their coach - be encouraging about their effort and performance.',
        'You can casually mention that you\'re tracking their workout, but keep it brief and natural (e.g., "Great work! I\'m logging this for you..." or "Nice! Got this recorded..."). Don\'t be overly technical.',
        'You can naturally let them know they can view their workout history by going back to the Training Grounds if it fits the conversation flow.',
        'Focus primarily on coaching feedback about their workout performance, form, progress, or next steps rather than the tracking mechanics.'
      ];

  // Add critical workout analysis guidelines to prevent calculation errors
  const workoutAnalysisGuidelines = [
    'CRITICAL WORKOUT ANALYSIS GUIDELINES:',
    '• When calculating total reps, volume, or any workout metrics, be extremely careful with your math',
    '• DOUBLE-CHECK ALL MATHEMATICAL CALCULATIONS before mentioning specific numbers',
    '• For circuit/round-based workouts: Total reps = rounds × reps per round (e.g., 5 rounds × 5 reps = 25 total reps)',
    '• For multi-exercise workouts: Calculate each exercise separately, do not combine different exercises',
    '• For time-based workouts: Reference the actual time mentioned, do not estimate or guess',
    '• For weight calculations: Use the exact weights mentioned, multiply by actual reps performed',
    '• If you\'re unsure about any calculation, acknowledge the workout without specific numbers',
    '• Focus on effort, consistency, and progress rather than just raw numbers when possible',
    '',
    'CRITICAL: EQUIPMENT TERMINOLOGY AND REP COUNTING:',
    '• "50# each hand" means 50 pounds PER DUMBBELL, NOT double the reps',
    '• "DB bench press 50# each hand" = normal reps with 50lb dumbbells in each hand',
    '• "Each hand" refers to WEIGHT PER HAND, not reps per hand',
    '• Examples:',
    '  - "20 DB bench press 50# each hand" = 20 total reps using 50lb dumbbells',
    '  - "4 rounds of 20 reps" = 4 × 20 = 80 total reps, NOT 160',
    '  - "10 reps each arm" = 10 per arm = 20 total reps (this is different from weight notation)',
    '• NEVER double rep counts for dumbbell exercises unless explicitly stated "reps per arm"',
    '• Weight notation ("each hand", "per hand") describes equipment load, not repetition count',
    '• Rep notation ("each arm", "per arm") describes repetition count per limb',
    '',
    'CRITICAL: BILATERAL DUMBBELL TRAINING LOAD ANALYSIS:',
    '• When analyzing training load for bilateral dumbbell movements, use TOTAL LOAD',
    '• "50# each hand" = 100# total load for volume calculations',
    '• Examples for coach analysis:',
    '  - "4 thrusters 50# each hand" = 4 reps × 100# = 400# volume',
    '  - "DB bench 30kg per hand" = 60kg total load per rep',
    '  - "Single-arm row 40#" = 40# load (unilateral, no doubling)',
    '• Always specify when referencing load: "100# total" or "50# per dumbbell"',
    '• Focus on TOTAL TRAINING LOAD for progression tracking and volume analysis',
    '',
    'ADDITIONAL EQUIPMENT TERMINOLOGY:',
    '• "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement',
    '• Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells',
    '• "Single DB" means using one dumbbell for the movement',
    '• "Alternating" means switching between arms/sides but count total reps, not per side',
    '• "Each side" means WEIGHT PER SIDE, not reps per side',
    '• When in doubt about equipment terminology, count the TOTAL movement repetitions performed',
    '',
    'INTERVAL WORKOUT ANALYSIS:',
    '• For interval workouts, analyze each segment separately - don\'t combine different movement patterns',
    '• When counting rounds for specific exercises, only count rounds WHERE THAT EXERCISE APPEARS',
    '• Example: 4 intervals with 2 AMRAP segments = count only the 2 AMRAP segments for that exercise',
    '• Do not say "3+3+2+2" if there are only 2 AMRAP segments - say "3 rounds + 2 rounds = 5 total rounds"',
    '• Always specify what you\'re counting: "power clean rounds", "total workout rounds", "AMRAP segments"',
    '• Compare like with like: AMRAP 1 vs AMRAP 2 performance, not interval 1 vs interval 3'
  ];

  return [...baseContext, ...workoutAnalysisGuidelines];
};

/**
 * Generates structured workout data context for AI coach analysis
 * Used when the AI has access to the extracted workout data structure
 * This helps prevent calculation errors by referencing actual data
 *
 * @param workoutData - The structured workout data from extraction
 * @returns array of context strings for AI coach system prompt
 *
 * @example
 * ```typescript
 * const context = generateStructuredWorkoutContext(workout.workoutData);
 * // Returns context with accurate workout metrics for AI analysis
 * ```
 */
export const generateStructuredWorkoutContext = (workoutData: any): string[] => {
  const context = [
    'STRUCTURED WORKOUT DATA AVAILABLE:',
    'You have access to the structured workout data that was extracted and validated.',
    'When analyzing this workout, reference the structured data for accurate calculations.',
    'Do not recalculate metrics that are already provided in the structured data.'
  ];

  // Add specific workout metrics if available
  if (workoutData.discipline_specific?.crossfit?.performance_data) {
    const perfData = workoutData.discipline_specific.crossfit.performance_data;
    context.push('');
    context.push('CROSSFIT PERFORMANCE DATA:');
    if (perfData.total_reps) {
      context.push(`• Total reps in workout: ${perfData.total_reps}`);
    }
    if (perfData.rounds_completed) {
      context.push(`• Rounds completed: ${perfData.rounds_completed}`);
    }
    if (perfData.total_time) {
      context.push(`• Total time: ${perfData.total_time} seconds`);
    }
  }

  // Add workout structure information
  if (workoutData.discipline_specific?.crossfit?.rounds) {
    const rounds = workoutData.discipline_specific.crossfit.rounds;
    context.push('');
    context.push('WORKOUT STRUCTURE:');
    context.push(`• Workout consisted of ${rounds.length} total rounds (including all movements)`);

    // Extract exercise information and analyze workout segments
    const exerciseInfo = new Map();
    const segmentAnalysis = new Map();

    rounds.forEach((round: any, index: number) => {
      round.exercises?.forEach((exercise: any) => {
        const name = exercise.exercise_name;
        const reps = exercise.reps?.completed || exercise.reps?.prescribed;
        const weight = exercise.weight?.value;

        if (!exerciseInfo.has(name)) {
          exerciseInfo.set(name, { totalReps: 0, weight: weight, unit: exercise.weight?.unit, roundCount: 0 });
        }
        exerciseInfo.get(name).totalReps += reps || 0;
        exerciseInfo.get(name).roundCount += 1;
      });
    });

    // Analyze for interval patterns (look for repeated exercise sequences)
    const exerciseSequences = new Map();
    rounds.forEach((round: any, index: number) => {
      const exerciseNames = round.exercises?.map((ex: any) => ex.exercise_name).join('+') || 'unknown';
      if (!exerciseSequences.has(exerciseNames)) {
        exerciseSequences.set(exerciseNames, []);
      }
      exerciseSequences.get(exerciseNames).push(index + 1);
    });

    // Provide intelligent analysis for multi-segment workouts
    if (exerciseSequences.size > 1) {
      context.push('');
      context.push('SEGMENT ANALYSIS (for interval/multi-part workouts):');
      exerciseSequences.forEach((roundNumbers, exercisePattern) => {
        if (roundNumbers.length > 1 && exercisePattern !== 'unknown') {
          const segmentCount = roundNumbers.length;
          context.push(`• ${exercisePattern} pattern: ${segmentCount} rounds (rounds ${roundNumbers.join(', ')})`);
        }
      });
    }

    context.push('');
    context.push('EXERCISE TOTALS:');
    exerciseInfo.forEach((info, exerciseName) => {
      if (info.weight) {
        context.push(`• ${exerciseName}: ${info.totalReps} total reps across ${info.roundCount} rounds at ${info.weight} ${info.unit || 'lbs'}`);
      } else {
        context.push(`• ${exerciseName}: ${info.totalReps} total reps across ${info.roundCount} rounds`);
      }
    });

    // Add specific guidance for interval analysis
    if (exerciseSequences.size > 1) {
      context.push('');
      context.push('ANALYSIS GUIDANCE:');
      context.push('• This appears to be an interval or multi-segment workout');
      context.push('• When discussing exercise performance, count rounds only for that specific exercise');
      context.push('• Compare performance between segments of the same exercise pattern');
      context.push('• Do not combine different movement patterns when calculating rounds');
    }
  }

  // Add extraction metadata
  if (workoutData.metadata?.data_confidence) {
    context.push('');
    context.push('EXTRACTION METADATA:');
    context.push(`• Data confidence: ${Math.round(workoutData.metadata.data_confidence * 100)}%`);
    context.push(`• Extraction method: ${workoutData.metadata.extraction_method || 'AI analysis'}`);
  }

  context.push('');
  context.push('IMPORTANT: Use these structured data points for accurate analysis rather than recalculating from the natural language description.');

  return context;
};
