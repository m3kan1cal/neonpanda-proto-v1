/**
 * Workout Session Detection Library
 *
 * This module provides functionality to detect when users are describing
 * completed workouts in their coach conversations.
 */

import { QuickWorkoutExtraction } from './types';

/**
 * Supported workout slash commands
 */
export const WORKOUT_SLASH_COMMANDS = ['log-workout', 'log', 'workout'] as const;

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

  const slashCommandRegex = /^\/(\w+)\s*(.*)$/;
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
 * Detects if a user message contains workout logging indicators
 * Uses two-stage detection: first checks for workout-related terms,
 * then analyzes intent to distinguish between completed workouts and planning/advice
 *
 * @param message - The user's message to analyze
 * @returns boolean indicating if workout logging was detected
 *
 * @example
 * ```typescript
 * const isWorkout = detectWorkoutLogging("I just finished Fran in 8:57");
 * // Returns: true
 *
 * const isPlanning = detectWorkoutLogging("Can I superset bench press with pushups?");
 * // Returns: false (workout terms detected, but intent is planning)
 * ```
 */
export const detectWorkoutLogging = (message: string): boolean => {
  if (!message || typeof message !== 'string') {
    return false;
  }

  // Stage 1: Check for workout-related terms
  const workoutTermIndicators = [
    // Completion phrases
    /did\s+\w+\s+today/i,
    /just\s+finished/i,
    /completed\s+\w+/i,
    /finished\s+the\s+workout/i,
    /workout\s+complete/i,
    /just\s+did/i,
    /training\s+session/i,
    /exercise\s+complete/i,
    /workout\s+log/i,

    // Performance indicators
    /my\s+time\s+was/i,
    /crushed\s+it/i,
    /smashed\s+it/i,
    /went\s+heavy/i,
    /lifted\s+\d+/i,

    // Time formats (e.g., 8:57, 12:34)
    /\d+:\d+/,

    // Weight formats (e.g., 95 lbs, 135 kg)
    /\d+\s*(lbs?|kg|pounds?|kilos?)/i,

    // Rep and round counts
    /\d+\s+reps/i,
    /\d+\s+rounds/i,

    // Time units
    /\d+\s*(min|mins|minutes|seconds|sec|secs)/i,

    // CrossFit benchmarks (common named workouts)
    /(fran|murph|helen|diane|grace|cindy|annie|jackie|karen|nancy|elizabeth)/i,

    // PR and achievement language
    /pr\s+today/i,
    /new\s+personal\s+best/i,
    /personal\s+record/i,
    /best\s+time/i,
    /hit\s+a\s+pr/i,

    // Scaling and modifications
    /scaled\s+to/i,
    /rx\s*$/i,
    /as\s+prescribed/i,
    /modified/i,

    // Movement-specific terms
    /deadlift/i,
    /squat/i,
    /bench\s+press/i,
    /pull\s*ups?/i,
    /push\s*ups?/i,
    /thrusters?/i,
    /burpees?/i,
    /box\s+jumps?/i,
    /wall\s+balls?/i,
    /kettlebell/i,
    /barbell/i,
    /dumbbell/i,

    // Workout format terms
    /amrap/i,
    /emom/i,
    /tabata/i,
    /for\s+time/i,
    /metcon/i,
    /wod/i, // Workout of the Day

    // Distance and cardio
    /ran\s+\d+/i,
    /mile/i,
    /kilometer/i,
    /\d+k\s+run/i,
    /treadmill/i,
    /bike/i,
    /rowing/i,
    /swim/i
  ];

  // Stage 1: Check if message contains workout-related terms
  const hasWorkoutTerms = workoutTermIndicators.some(pattern => pattern.test(message));

  if (!hasWorkoutTerms) {
    return false; // No workout terms detected, definitely not a workout log
  }

  // Stage 2: If workout terms detected, check if it's actually a completed workout vs planning/advice
  return isCompletedWorkout(message);
};

/**
 * Extracts basic workout information from a message for quick analysis
 * This is used for immediate coach response while full extraction runs async
 *
 * @param message - The user's message to analyze
 * @returns object with basic extracted information
 */
export const quickWorkoutExtraction = (message: string): QuickWorkoutExtraction => {
  const result: QuickWorkoutExtraction = {
    confidence: 0.5 // Default confidence
  };

  // Try to extract workout name (CrossFit benchmarks)
  const benchmarkMatch = message.match(/(fran|murph|helen|diane|grace|cindy|annie|jackie|karen|nancy|elizabeth)/i);
  if (benchmarkMatch) {
    result.workoutName = benchmarkMatch[1].toLowerCase();
    result.discipline = 'crossfit';
    result.confidence = 0.9;
  }

  // Try to extract time
  const timeMatch = message.match(/(\d+:\d+)/);
  if (timeMatch) {
    result.timeDetected = timeMatch[1];
    result.confidence = Math.max(result.confidence, 0.8);
  }

  // Try to extract weight
  const weightMatch = message.match(/(\d+)\s*(lbs?|kg|pounds?|kilos?)/i);
  if (weightMatch) {
    result.weightDetected = `${weightMatch[1]} ${weightMatch[2]}`;
    result.confidence = Math.max(result.confidence, 0.7);
  }

  return result;
};

/**
 * Validates if a message is likely a workout completion vs. a workout plan
 * Used as Stage 2 of workout detection after workout terms are identified
 *
 * @param message - The user's message to analyze
 * @returns boolean indicating if this is likely a completed workout vs. planned workout
 *
 * @example
 * ```typescript
 * isCompletedWorkout("I just finished Fran in 8:57"); // Returns: true
 * isCompletedWorkout("Can I superset bench press with pushups?"); // Returns: false
 * isCompletedWorkout("Planning to do Murph tomorrow"); // Returns: false
 * ```
 */
export const isCompletedWorkout = (message: string): boolean => {
  const completionIndicators = [
    /just\s+finished/i,
    /completed/i,
    /did\s+\w+\s+today/i,
    /my\s+time\s+was/i,
    /crushed\s+it/i,
    /finished\s+in/i,
    /workout\s+complete/i,
    /done\s+with/i,
    /hit\s+a\s+pr/i,
    /new\s+personal\s+best/i
  ];

  const planningIndicators = [
    /going\s+to\s+do/i,
    /plan\s+to/i,
    /will\s+do/i,
    /should\s+i/i,
    /can\s+i/i,         // "Can I superset..."
    /what\s+about/i,
    /thinking\s+about/i,
    /tomorrow/i,
    /next\s+week/i,
    /later/i,
    /for\s+tonight/i,   // "For tonight's workout"
    /evening.*session/i // "evening supplemental session"
  ];

  const hasCompletionIndicators = completionIndicators.some(pattern => pattern.test(message));
  const hasPlanningIndicators = planningIndicators.some(pattern => pattern.test(message));

  // If has completion indicators and no planning indicators, likely completed
  if (hasCompletionIndicators && !hasPlanningIndicators) {
    return true;
  }

  // If has planning indicators, likely not completed
  if (hasPlanningIndicators) {
    return false;
  }

  // If has past tense verbs, likely completed
  const pastTenseIndicators = [
    /did/i,
    /went/i,
    /ran/i,
    /lifted/i,
    /finished/i,
    /completed/i,
    /crushed/i,
    /smashed/i,
    /hit/i
  ];

  return pastTenseIndicators.some(pattern => pattern.test(message));
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
    '• For circuit/round-based workouts: Total reps = rounds × reps per round (e.g., 5 rounds × 5 reps = 25 total reps)',
    '• For multi-exercise workouts: Calculate each exercise separately, do not combine different exercises',
    '• For time-based workouts: Reference the actual time mentioned, do not estimate or guess',
    '• For weight calculations: Use the exact weights mentioned, multiply by actual reps performed',
    '• ALWAYS double-check your calculations before mentioning specific numbers',
    '• If you\'re unsure about any calculation, acknowledge the workout without specific numbers',
    '• Focus on effort, consistency, and progress rather than just raw numbers when possible',
    '',
    'EQUIPMENT TERMINOLOGY INTERPRETATION:',
    '• "Dual DBs" or "dual dumbbells" means using TWO dumbbells simultaneously for ONE movement',
    '• Example: "30 reps dual DBs" = 30 total reps using two dumbbells at once, NOT 30 reps × 2 dumbbells',
    '• "Single DB" means using one dumbbell for the movement',
    '• "Alternating" means switching between arms/sides but count total reps, not per side',
    '• "Each arm" or "per arm" means multiply by 2 (e.g., "10 reps each arm" = 20 total reps)',
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
