/**
 * AI Training Program Generator
 *
 * This module handles the end-to-end generation of training programs from Build mode conversations.
 * It uses Claude to extract program structure and generate detailed workout templates.
 */

import { callBedrockApi, MODEL_IDS, queryPineconeContext } from '../api-helpers';
import { getJsonFormattingInstructions } from '../prompt-helpers';
import { parseJsonWithFallbacks } from '../response-utils';
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
  getWorkoutTemplateSchemaWithContext
} from '../schemas/training-program-schema';
import { buildCoachPersonalityPrompt } from '../coach-config/personality-utils';

/**
 * Detects if the AI response contains a training program generation trigger
 * @param aiResponse - The AI's response text
 * @returns True if training program should be generated
 */
export function detectTrainingProgramGenerationTrigger(aiResponse: string): boolean {
  return aiResponse.includes('**[GENERATE_PROGRAM]**') || aiResponse.includes('[GENERATE_PROGRAM]');
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

  const systemPrompt = `${coachPersonalityPrompt}

---

# YOUR TASK
Analyze this Build mode conversation and extract the training program structure into JSON format.

RELEVANT USER MEMORIES & CONTEXT:
${memoryContext}

Consider these memories when structuring the program (past injuries, preferences, what's worked/failed, etc.)

${getJsonFormattingInstructions()}

${getTrainingProgramStructureSchemaWithContext()}`;

  const userPrompt = `Analyze this conversation and extract the training program structure:

${conversationText}

${getJsonFormattingInstructions()}`;

  console.info('🔍 Extracting training program structure from conversation...', {
    messageCount: conversationMessages.length,
    userId,
    coachId,
  });

  const response = await callBedrockApi(
    systemPrompt,
    userPrompt,
    MODEL_IDS.CLAUDE_SONNET_4_FULL
  );

  // Parse the JSON response with fallback handling for malformed AI responses
  try {
    const trainingProgramData = parseJsonWithFallbacks(response);
    console.info('✅ Successfully extracted training program structure:', {
      name: trainingProgramData.name,
      totalDays: trainingProgramData.totalDays,
      phaseCount: trainingProgramData.phases?.length || 0,
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
 * This creates the detailed workout prescriptions with coach personality
 */
export async function generatePhaseWorkouts(
  phase: TrainingProgramPhase,
  phaseIndex: number,
  trainingProgramData: TrainingProgramGenerationData,
  daysBeforePhase: number,
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

  const systemPrompt = `${coachPersonalityPrompt}

---

# YOUR TASK
Generate detailed daily workout templates for this training phase in JSON format.

RELEVANT USER CONTEXT:
${memoryContext}

Consider injuries, preferences, and past experiences when prescribing exercises.

${getJsonFormattingInstructions()}

${getWorkoutTemplateSchemaWithContext(phaseContext)}`;

  const userPrompt = `Generate ${phase.durationDays} daily workout templates for Phase ${phaseIndex + 1}: "${phase.name}"

Focus Areas: ${phase.focusAreas.join(', ')}

${getJsonFormattingInstructions()}`;

  console.info('🏋️ Generating workout templates for phase...', {
    phase: phase.name,
    durationDays: phase.durationDays,
    startDay: daysBeforePhase + 1,
  });

  const response = await callBedrockApi(
    systemPrompt,
    userPrompt,
    MODEL_IDS.CLAUDE_SONNET_4_FULL
  );

  // Parse the JSON response with fallback handling for malformed AI responses
  try {
    const workoutTemplates = parseJsonWithFallbacks(response);

    if (!Array.isArray(workoutTemplates)) {
      throw new Error('Response is not an array');
    }

    console.info('✅ Successfully generated workout templates:', {
      phase: phase.name,
      templateCount: workoutTemplates.length,
    });

    return workoutTemplates as WorkoutTemplate[];
  } catch (error) {
    console.error('❌ Failed to parse workout templates JSON:', {
      error,
      phase: phase.name,
      response: response.substring(0, 500),
    });
    throw new Error(`Failed to generate valid workout templates for phase: ${phase.name}`);
  }
}

/**
 * Generate a complete training program from a Build mode conversation
 * This is the main orchestrator function with full personalization
 */
export async function generateTrainingProgramFromConversation(
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
  const trainingProgramData = await extractTrainingProgramStructure(
    conversationMessages,
    userId,
    coachId,
    coachConfig,
    userProfile,
    pineconeContext
  );

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
      coachConfig,
      userProfile,
      pineconeContext
    );
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

  const trainingProgram: TrainingProgram = {
    programId,
    userId,
    coachId,
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
    totalWorkouts: allWorkoutTemplates.filter(t => t.templateType === 'primary').length,
    completedWorkouts: 0,
    skippedWorkouts: 0,
    adherenceRate: 0,
    lastActivityDate: today,
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

  // Remove the trigger from the response (so it's not shown to the user)
  const cleanedResponse = aiResponse
    .replace(/\*\*\[GENERATE_PROGRAM\]\*\*/g, '')
    .replace(/\[GENERATE_PROGRAM\]/g, '')
    .trim();

  return {
    shouldGenerate: true,
    cleanedResponse,
  };
}

