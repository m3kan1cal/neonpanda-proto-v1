/**
 * AI Training Program Generator
 *
 * This module handles the end-to-end generation of training programs from Build mode conversations.
 * It uses Claude to extract program structure and generate detailed workout templates.
 */

import { callBedrockApi, MODEL_IDS, queryPineconeContext } from '../api-helpers';
import { getJsonFormattingInstructions } from '../prompt-helpers';
import { parseJsonWithFallbacks, removeTriggerFromStream, toTitleCase } from '../response-utils';
import {
  TrainingProgram,
  TrainingProgramPhase,
  WorkoutTemplate,
  TrainingProgramGenerationData,
  TrainingProgramGenerationDetection,
} from './types';
import { saveTrainingProgram, getCoachConfig, getUserProfile } from '../../../dynamodb/operations';
import { storeTrainingProgramDetailsInS3 } from './s3-utils';
import type { CoachConfig, DynamoDBItem } from '../coach-creator/types';
import type { UserProfile } from '../user/types';
import {
  getTrainingProgramStructureSchemaWithContext,
  getWorkoutTemplateArraySchemaWithContext
} from '../schemas/training-program-schema';
import { buildCoachPersonalityPrompt } from '../coach-config/personality-utils';
import {
  normalizeTrainingProgram,
  shouldNormalizeTrainingProgram,
  generateNormalizationSummary,
} from './normalization';

/**
 * Detects if the AI response contains a training program generation trigger
 * @param aiResponse - The AI's response text
 * @returns True if training program should be generated
 */
export function detectTrainingProgramGenerationTrigger(aiResponse: string): boolean {
  // Check for any variation of [GENERATE_PROGRAM] trigger (case-insensitive, with/without markdown)
  return /\[GENERATE_PROGRAM\]/i.test(aiResponse);
}

/**
 * Extract training program structure from conversation using Claude
 * This analyzes the conversation history to understand what training program the user wants
 * Incorporates coach personality, user memories, and critical directives
 */
export async function extractTrainingProgramStructure(
  conversationMessages: any[],
  userId: string,
  coachId: string,
  coachConfig: DynamoDBItem<CoachConfig>,
  userProfile: DynamoDBItem<UserProfile> | null,
  pineconeContext: string
): Promise<TrainingProgramGenerationData> {
  // Build conversation context for Claude
  const conversationText = conversationMessages
    .map((msg) => `${msg.role === 'user' ? 'Athlete' : 'Coach'}: ${msg.content}`)
    .join('\n\n');

  // Build comprehensive coach personality prompt using shared utility
  const coachPersonalityPrompt = buildCoachPersonalityPrompt(
    coachConfig,
    userProfile,
    {
      includeDetailedPersonality: true,
      includeMethodologyDetails: true,
      includeMotivation: false, // Not needed for structure extraction
      includeSafety: true,
      includeCriticalDirective: true,
      context: 'ANALYZING BUILD MODE CONVERSATION TO EXTRACT TRAINING PROGRAM STRUCTURE',
    }
  );

  // Use Pinecone context for user memories and relevant information
  const memoryContext = pineconeContext || 'No specific context found.';

  // STATIC PROMPT (cacheable - 90% cost reduction on cache hits)
  // Contains coach personality, schemas, and instructions that don't change per request
  const staticPrompt = `${coachPersonalityPrompt}

---

# YOUR TASK
Analyze this Build mode conversation and extract the training program structure into JSON format.

RELEVANT USER MEMORIES & CONTEXT:
${memoryContext}

Consider these memories when structuring the program (past injuries, preferences, what's worked/failed, etc.)

${getJsonFormattingInstructions()}

${getTrainingProgramStructureSchemaWithContext()}`;

  // DYNAMIC PROMPT (not cacheable - changes per request)
  // Contains the actual conversation that varies each time
  const dynamicPrompt = `Analyze this conversation and extract the training program structure:

${conversationText}

${getJsonFormattingInstructions()}`;

  console.info('🔍 Extracting training program structure from conversation...', {
    messageCount: conversationMessages.length,
    userId,
    coachId,
    staticPromptLength: staticPrompt.length,
    dynamicPromptLength: dynamicPrompt.length,
  });

  let response: string;
  try {
    response = await callBedrockApi(
      staticPrompt,
      dynamicPrompt,
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
      {
        staticPrompt,
        dynamicPrompt,
        prefillResponse: '{', // Force JSON response format
      }
    );

    // Store debug data in S3 for troubleshooting
    try {
      const { storeDebugDataInS3 } = await import('../api-helpers');
      const debugContent = JSON.stringify({
        step: 'extract_training_program_structure',
        userId,
        coachId,
        promptLengths: {
          static: staticPrompt.length,
          dynamic: dynamicPrompt.length,
        },
        response: {
          length: response.length,
          preview: response.substring(0, 500),
        },
        staticPrompt,
        dynamicPrompt,
        fullResponse: response,
      }, null, 2);

      await storeDebugDataInS3(
        debugContent,
        {
          userId,
          step: 'extract_structure',
          type: 'program-structure-extraction-success',
        },
        'training-program'
      );
    } catch (debugError) {
      console.warn('Failed to store structure extraction debug data (non-critical):', debugError);
    }
  } catch (error) {
    console.error('❌ Failed to extract training program structure:', error);

    // Store error debug data
    try {
      const { storeDebugDataInS3 } = await import('../api-helpers');
      const errorDebugContent = JSON.stringify({
        step: 'extract_training_program_structure',
        userId,
        coachId,
        promptLengths: {
          static: staticPrompt.length,
          dynamic: dynamicPrompt.length,
        },
        staticPrompt,
        dynamicPrompt,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      }, null, 2);

      await storeDebugDataInS3(
        errorDebugContent,
        {
          userId,
          step: 'extract_structure',
          type: 'program-structure-extraction-error',
        },
        'training-program'
      );
    } catch (debugError) {
      console.warn('Failed to store structure extraction error debug data (non-critical):', debugError);
    }

    throw error;
  }

  // Validate response before parsing
  if (!response || response.trim().length === 0) {
    throw new Error('Bedrock returned empty response for training program structure extraction');
  }

  if (response.includes('[object Object]') || response === '[object Object]' || response === '{object Object}') {
    console.error('❌ Bedrock returned invalid object string for structure extraction:', {
      response,
      responseLength: response.length,
    });
    throw new Error('Bedrock returned "[object Object]" instead of valid JSON. This suggests a prompt construction issue or API error.');
  }

  // Parse the JSON response with fallback handling for malformed AI responses
  try {
    const trainingProgramData = parseJsonWithFallbacks(response);

    // Normalize equipment constraints to Title Case for consistency
    if (trainingProgramData.equipmentConstraints) {
      trainingProgramData.equipmentConstraints = trainingProgramData.equipmentConstraints.map(
        (item: string) => toTitleCase(item)
      );
    }

    console.info('✅ Successfully extracted training program structure:', {
      name: trainingProgramData.name,
      totalDays: trainingProgramData.totalDays,
      phaseCount: trainingProgramData.phases?.length || 0,
      equipmentConstraints: trainingProgramData.equipmentConstraints,
    });
    return trainingProgramData as TrainingProgramGenerationData;
  } catch (error) {
    console.error('❌ Failed to parse training program structure JSON:', {
      error,
      response: response.substring(0, 500),
    });
    throw new Error('Failed to extract valid training program structure from conversation');
  }
}

/**
 * Generate daily workout templates for a phase using Claude
 * This creates segmented workout templates grouped by day
 */
export async function generatePhaseWorkouts(
  phase: TrainingProgramPhase,
  phaseIndex: number,
  trainingProgramData: TrainingProgramGenerationData,
  daysBeforePhase: number,
  userId: string,
  coachConfig: DynamoDBItem<CoachConfig>,
  userProfile: DynamoDBItem<UserProfile> | null,
  pineconeContext: string
): Promise<WorkoutTemplate[]> {
  const phaseContext = {
    phaseName: phase.name,
    phaseDescription: phase.description,
    phaseDurationDays: phase.durationDays,
    phaseStartDay: daysBeforePhase + 1,
    programName: trainingProgramData.name,
    trainingFrequency: trainingProgramData.trainingFrequency,
    equipment: trainingProgramData.equipmentConstraints || [],
    goals: trainingProgramData.trainingGoals || [],
    userId: userId,
  };

  // Build comprehensive coach personality prompt using shared utility
  const coachPersonalityPrompt = buildCoachPersonalityPrompt(
    coachConfig,
    userProfile,
    {
      includeDetailedPersonality: true,
      includeMethodologyDetails: true,
      includeMotivation: true, // Include motivation for workout design
      includeSafety: true,
      includeCriticalDirective: true,
      context: 'GENERATING DAILY WORKOUT TEMPLATES FOR A TRAINING PHASE',
    }
  );

  // Use Pinecone context for user memories and relevant information
  const memoryContext = pineconeContext || 'No specific context found.';

  // STATIC PROMPT (cacheable - 90% cost reduction on cache hits)
  // Contains coach personality, schemas, and instructions that don't change per phase
  const staticPrompt = `${coachPersonalityPrompt}

---

# YOUR TASK
Generate a flat array of workout templates for this training phase in JSON format.
Templates for the same day share the same groupId and dayNumber.

RELEVANT USER CONTEXT:
${memoryContext}

Consider injuries, preferences, and past experiences when prescribing exercises.

${getJsonFormattingInstructions()}

${getWorkoutTemplateArraySchemaWithContext(phaseContext)}`;

  // DYNAMIC PROMPT (not cacheable - changes per phase)
  // Contains the specific phase details that vary
  const dynamicPrompt = `Generate workout templates for ${phase.durationDays} days for Phase ${phaseIndex + 1}: "${phase.name}"

Focus Areas: ${phase.focusAreas.join(', ')}

Return a flat array of all templates for these ${phase.durationDays} days.

${getJsonFormattingInstructions()}`;

  console.info('🏋️ Generating workout templates for phase...', {
    phase: phase.name,
    durationDays: phase.durationDays,
    startDay: daysBeforePhase + 1,
    staticPromptLength: staticPrompt.length,
    dynamicPromptLength: dynamicPrompt.length,
  });

  let response: string;
  try {
    response = await callBedrockApi(
      staticPrompt,
      dynamicPrompt,
      MODEL_IDS.CLAUDE_SONNET_4_FULL,
      {
        staticPrompt,
        dynamicPrompt,
        prefillResponse: '[', // Force JSON array response format
      }
    );

    // Store debug data in S3 for troubleshooting
    try {
      const { storeDebugDataInS3 } = await import('../api-helpers');
      const debugContent = JSON.stringify({
        phaseIndex: phaseIndex + 1,
        phaseName: phase.name,
        phaseDuration: phase.durationDays,
        promptLengths: {
          static: staticPrompt.length,
          dynamic: dynamicPrompt.length,
        },
        response: {
          length: response.length,
          preview: response.substring(0, 500),
        },
        staticPrompt,
        dynamicPrompt,
        fullResponse: response,
      }, null, 2);

      await storeDebugDataInS3(
        debugContent,
        {
          userId,
          phaseIndex: phaseIndex + 1,
          phaseName: phase.name.replace(/[^a-zA-Z0-9]/g, '_'),
          type: 'phase-generation-success',
        },
        'training-program'
      );
    } catch (debugError) {
      console.warn('Failed to store phase generation debug data (non-critical):', debugError);
    }
  } catch (error) {
    console.error('❌ Failed to generate workout templates for phase:', error);

    // Store error debug data
    try {
      const { storeDebugDataInS3 } = await import('../api-helpers');
      const errorDebugContent = JSON.stringify({
        phaseIndex: phaseIndex + 1,
        phaseName: phase.name,
        phaseDuration: phase.durationDays,
        promptLengths: {
          static: staticPrompt.length,
          dynamic: dynamicPrompt.length,
        },
        staticPrompt,
        dynamicPrompt,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      }, null, 2);

      await storeDebugDataInS3(
        errorDebugContent,
        {
          userId,
          phaseIndex: phaseIndex + 1,
          phaseName: phase.name.replace(/[^a-zA-Z0-9]/g, '_'),
          type: 'phase-generation-error',
        },
        'training-program'
      );
    } catch (debugError) {
      console.warn('Failed to store phase error debug data (non-critical):', debugError);
    }

    throw error;
  }

  // Validate response before parsing
  if (!response || response.trim().length === 0) {
    throw new Error('Bedrock returned empty response');
  }

  if (response.includes('[object Object]') || response === '[object Object]') {
    console.error('❌ Bedrock returned invalid object string:', {
      response,
      responseLength: response.length,
      phase: phase.name,
    });
    throw new Error('Bedrock returned "[object Object]" instead of valid JSON. This suggests a prompt construction issue or API error.');
  }

  // Parse the JSON response with fallback handling for malformed AI responses
  try {
    const workoutTemplates = parseJsonWithFallbacks(response);

    if (!Array.isArray(workoutTemplates)) {
      throw new Error('Response is not an array');
    }

    // Normalize equipment and add phaseId to each template
    const normalizedTemplates = workoutTemplates.map((template: WorkoutTemplate) => {
      // Normalize equipment to Title Case for consistency with program constraints
      if (template.equipment) {
        template.equipment = template.equipment.map((item: string) => toTitleCase(item));
      }

      // Add phaseId reference for easier querying (Phase 3 enhancement)
      template.phaseId = phase.phaseId;

      return template;
    });

    console.info('✅ Successfully generated workout templates:', {
      phase: phase.name,
      phaseId: phase.phaseId,
      templateCount: normalizedTemplates.length,
    });

    return normalizedTemplates as WorkoutTemplate[];
  } catch (error) {
    console.error('❌ Failed to parse workout templates JSON:', {
      error,
      phase: phase.name,
      responseLength: response.length,
      responsePreview: response.substring(0, 500), // First 500 chars
      responseTail: response.substring(Math.max(0, response.length - 500)), // Last 500 chars
    });

    // Log the problematic section if we can identify the error position
    if (error instanceof Error && error.message.includes('position')) {
      const posMatch = error.message.match(/position (\d+)/);
      if (posMatch) {
        const errorPos = parseInt(posMatch[1], 10);
        const contextStart = Math.max(0, errorPos - 200);
        const contextEnd = Math.min(response.length, errorPos + 200);
        console.error('❌ Context around JSON error position:', {
          errorPosition: errorPos,
          totalLength: response.length,
          context: response.substring(contextStart, contextEnd),
        });
      }
    }

    throw new Error(`Failed to generate valid workout templates for phase: ${phase.name}`);
  }
}

/**
 * Generate a complete training program from a Build mode conversation
 * This is the main orchestrator function with full personalization
 */
export async function generateTrainingProgram(
  conversationMessages: any[],
  userId: string,
  coachId: string,
  conversationId: string
): Promise<{ programId: string; program: TrainingProgram }> {
  console.info('🚀 Starting AI training program generation...', {
    userId,
    coachId,
    conversationId,
    messageCount: conversationMessages.length,
  });

  // Step 0: Fetch coach config, user profile, and relevant context for personalization
  const [coachConfig, userProfile] = await Promise.all([
    getCoachConfig(userId, coachId),
    getUserProfile(userId),
  ]);

  if (!coachConfig) {
    throw new Error(`Coach configuration not found for coachId: ${coachId}`);
  }

  // Query Pinecone for relevant context (memories, past program details, etc.)
  let pineconeContext = '';
  try {
    const conversationSummary = conversationMessages.slice(-3).map(m => m.content).join(' ');
    const pineconeResults = await queryPineconeContext(
      userId,
      conversationSummary,
      {
        topK: 10,
        includeWorkouts: true, // Include workout history for context
        includeConversationSummaries: true, // Include past conversation context
        includeCoachCreator: true, // Include coach config context
        includeMethodology: true, // Include methodology context
      }
    );

    // Extract content from matches if successful
    if (pineconeResults.success && pineconeResults.matches) {
      pineconeContext = pineconeResults.matches
        .map(match => match.content || '')
        .filter(content => content.length > 0)
        .join('\n');
    }
  } catch (error) {
    console.warn('Failed to query Pinecone context, continuing without:', error);
  }

  console.info('✅ Loaded personalization context:', {
    coachName: coachConfig.attributes.coach_name,
    specialty: coachConfig.attributes.technical_config?.specializations?.join(', '),
    hasUserProfile: !!userProfile,
    hasPineconeContext: !!pineconeContext,
    hasCriticalDirective: !!userProfile?.attributes?.criticalTrainingDirective?.enabled,
  });

  // Step 1: Extract training program structure from conversation with full context
  const rawTrainingProgramData = await extractTrainingProgramStructure(
    conversationMessages,
    userId,
    coachId,
    coachConfig,
    userProfile,
    pineconeContext
  );

  // NORMALIZATION STEP - Normalize training program data for schema compliance
  let finalTrainingProgramData = rawTrainingProgramData;
  let normalizationSummary = "Normalization skipped";

  // Calculate initial confidence (we don't have confidence from extraction yet, so estimate)
  const initialConfidence = 0.85; // Default assumption for AI-generated data

  if (shouldNormalizeTrainingProgram(rawTrainingProgramData, initialConfidence)) {
    console.info('🔧 Running normalization on training program data...', {
      reason: initialConfidence < 0.7 ? "low_confidence" : "structural_check",
      confidence: initialConfidence,
      phases: rawTrainingProgramData.phases?.length || 0,
      totalDays: rawTrainingProgramData.totalDays,
    });

    const normalizationResult = await normalizeTrainingProgram(
      rawTrainingProgramData,
      userId,
      true // Enable thinking for complex program validation
    );
    normalizationSummary = generateNormalizationSummary(normalizationResult);

    console.info('Normalization completed:', {
      isValid: normalizationResult.isValid,
      issuesFound: normalizationResult.issues.length,
      correctionsMade: normalizationResult.issues.filter((i) => i.corrected).length,
      normalizationConfidence: normalizationResult.confidence,
      summary: normalizationSummary,
    });

    // Use normalized data if normalization was successful
    if (
      normalizationResult.isValid ||
      normalizationResult.issues.some((i) => i.corrected)
    ) {
      finalTrainingProgramData = normalizationResult.normalizedData;

      console.info('✅ Using normalized training program data', {
        phaseCount: finalTrainingProgramData.phases.length,
        totalDays: finalTrainingProgramData.totalDays,
        issuesCorrected: normalizationResult.issues.filter((i) => i.corrected).length,
      });
    } else {
      console.warn('⚠️ Normalization did not improve data, using original', {
        issues: normalizationResult.issues.map(i => i.description),
      });
    }
  } else {
    console.info('⏩ Skipping normalization:', {
      reason: initialConfidence > 0.9 ? "high_confidence" : "no_structural_issues",
      confidence: initialConfidence,
    });
  }

  const trainingProgramData = finalTrainingProgramData;

  // Step 2: Generate training program ID
  const shortId = Math.random().toString(36).substring(2, 11);
  const programId = `program_${userId}_${Date.now()}_${shortId}`;

  // Step 3: Generate workout templates for each phase
  const allWorkoutTemplates: WorkoutTemplate[] = [];
  let dayCounter = 0;

  for (let i = 0; i < trainingProgramData.phases.length; i++) {
    const phase = trainingProgramData.phases[i];
    // Calculate duration from startDay and endDay
    const durationDays = phase.endDay - phase.startDay + 1;

    // Convert phase to TrainingProgramPhase format for generation
    const phaseForGeneration: TrainingProgramPhase = {
      phaseId: `phase_${i + 1}`,
      name: phase.name,
      description: phase.description,
      startDay: phase.startDay,
      endDay: phase.endDay,
      durationDays: durationDays,
      focusAreas: phase.focusAreas,
    };
    const phaseWorkouts = await generatePhaseWorkouts(
      phaseForGeneration,
      i,
      trainingProgramData,
      dayCounter,
      userId,
      coachConfig,
      userProfile,
      pineconeContext
    );

    // Natural language templates don't require normalization or cleanup
    // AI writes coherent prose by default, and workoutContent is just a string
    console.info(`✅ Generated ${phaseWorkouts.length} natural language workout templates for phase ${i + 1}`);

    allWorkoutTemplates.push(...phaseWorkouts);
    dayCounter += durationDays;
  }

  console.info('✅ Generated all workout templates:', {
    totalTemplates: allWorkoutTemplates.length,
    phaseCount: trainingProgramData.phases.length,
  });

  // Step 4: Store workout templates in S3
  const s3DetailKey = await storeTrainingProgramDetailsInS3(
    programId,
    userId,
    coachId,
    allWorkoutTemplates,
    {
      goals: trainingProgramData.trainingGoals || [],
      purpose: trainingProgramData.description,
      successMetrics: [], // Will be refined during training program execution
      equipmentConstraints: trainingProgramData.equipmentConstraints || [],
    },
    {
      generatedBy: 'ai-conversation',
      aiModel: MODEL_IDS.CLAUDE_SONNET_4_FULL,
      confidence: 0.95,
      generationPrompt: `Generated from Build mode conversation ${conversationId}`,
    }
  );

  // Step 5: Create TrainingProgram entity
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  // Calculate end date from start date + total days
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + trainingProgramData.totalDays - 1);
  const endDateString = endDate.toISOString().split('T')[0];

  // Extract coach name for multi-coach support
  const coachName = coachConfig.attributes.coach_name || 'Unknown Coach';

  const trainingProgram: TrainingProgram = {
    programId,
    userId,
    coachIds: [coachId], // Array of all coaches (initially just the creating coach)
    coachNames: [coachName], // Array of all coach names
    creationConversationId: conversationId,
    name: trainingProgramData.name,
    description: trainingProgramData.description,
    status: 'active',
    startDate: todayString,
    endDate: endDateString,
    totalDays: trainingProgramData.totalDays,
    currentDay: 1,
    pausedAt: null,
    pausedDuration: 0,
    phases: trainingProgramData.phases.map((phase, index) => ({
      phaseId: `phase_${index + 1}`,
      name: phase.name,
      description: phase.description,
      startDay: phase.startDay,
      endDay: phase.endDay,
      durationDays: phase.endDay - phase.startDay + 1,
      focusAreas: phase.focusAreas,
    })),
    equipmentConstraints: trainingProgramData.equipmentConstraints || [],
    trainingGoals: trainingProgramData.trainingGoals || [],
    trainingFrequency: trainingProgramData.trainingFrequency,
    totalWorkouts: allWorkoutTemplates.length, // All templates are workouts in the new structure
    completedWorkouts: 0,
    skippedWorkouts: 0,
    adherenceRate: 0,
    lastActivityAt: today,
    s3DetailKey,
    adaptationLog: [],
    dayCompletionStatus: {},
  };

  // Step 6: Save to DynamoDB
  await saveTrainingProgram(trainingProgram);

  console.info('✅ Training program created successfully:', {
    programId,
    name: trainingProgram.name,
    totalDays: trainingProgram.totalDays,
    templateCount: allWorkoutTemplates.length,
  });

  return { programId, program: trainingProgram };
}

/**
 * Detects if an AI response contains the training program generation trigger
 * and extracts it if present
 */
export function detectAndPrepareForTrainingProgramGeneration(aiResponse: string): TrainingProgramGenerationDetection {
  const hasTrigger = detectTrainingProgramGenerationTrigger(aiResponse);

  if (!hasTrigger) {
    return {
      shouldGenerate: false,
      cleanedResponse: aiResponse,
    };
  }

  // Remove the trigger from the response using centralized utility
  const { cleanedContent } = removeTriggerFromStream(aiResponse);

  return {
    shouldGenerate: true,
    cleanedResponse: cleanedContent.trim(),
  };
}
