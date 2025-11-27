/**
 * AI Program Generator (V2 - Parallel Generation)
 *
 * This module handles parallel generation of training programs using the V2 approach:
 * - Todo-list based requirements gathering
 * - Parallel phase generation via Promise.all()
 * - Bedrock toolConfig for structured output
 * - AI normalization for quality assurance
 *
 * Pattern: Follows build-workout and build-coach-config patterns
 * Critical: Required for MVP due to 15-minute Lambda timeout
 */

import { queryPineconeContext } from '../api-helpers';
import {
  Program,
} from './types';
import { getCoachConfig, getUserProfile } from '../../../dynamodb/operations';
import type { CoachConfig } from '../coach-creator/types';
import type { UserProfile } from '../user/types';
import {
  generatePhaseStructure,
  generateAllPhasesParallel,
  assembleProgram,
} from './phase-generator';
import type { ProgramCreatorTodoList } from '../program-creator/types';

/**
 * Generate program using PARALLEL phase generation (V2 REDESIGN)
 *
 * This is the V2 approach that uses:
 * - Todo list for requirements (from conversational flow)
 * - Parallel phase generation via Promise.all()
 * - Bedrock toolConfig for structured output
 * - AI normalization for quality assurance
 *
 * Pattern: Follows build-workout and build-coach-config patterns
 * Critical: Required for MVP due to 15-minute Lambda timeout
 *
 * @param userId - User ID
 * @param programId - Program ID
 * @param conversationId - Conversation ID
 * @param coachId - Coach ID
 * @param todoList - Complete program requirements from todo-list conversation
 * @param conversationContext - Full conversation history as text
 * @returns Complete program with phases and workouts
 */
export async function generateProgramV2(
  userId: string,
  programId: string,
  conversationId: string,
  coachId: string,
  todoList: ProgramCreatorTodoList,
  conversationContext: string
): Promise<Program> {
  console.info('🚀 Starting V2 parallel program generation:', {
    userId,
    programId,
    conversationId,
    coachId,
  });

  const startTime = Date.now();

  try {
    // 1. Load coach config and user profile
    console.info('📥 Loading coach and user data...');
    const [coachConfigResult, userProfile] = await Promise.all([
      getCoachConfig(userId, coachId),
      getUserProfile(userId),
    ]);

    const coachConfig = coachConfigResult as CoachConfig;

    if (!coachConfig) {
      throw new Error(`Coach config not found for coachId: ${coachId}`);
    }

    // 2. Query Pinecone for relevant user context
    console.info('🔍 Querying Pinecone for user context...');
    const pineconeResult = await queryPineconeContext(
      userId,
      `Program for: ${todoList.trainingGoals?.value || 'fitness goals'}`,
      {
        topK: 5,
        includeWorkouts: true,
        includeCoachCreator: true,
        includeConversationSummaries: true,
      }
    );

    // Extract text context from Pinecone results
    let pineconeContext = '';
    if (pineconeResult.success && pineconeResult.matches) {
      pineconeContext = pineconeResult.matches
        .map(match => match.content || '')
        .filter(content => content.length > 0)
        .join('\n');
    }

    // 3. Build phase generation context
    const programDuration = parseInt(todoList.programDuration?.value || '56', 10);
    const trainingFrequency = parseInt(todoList.trainingFrequency?.value || '4', 10);

    const phaseContext = {
      userId,
      programId,
      todoList,
      coachConfig,
      userProfile,
      conversationContext,
      pineconeContext,
      totalDays: programDuration,
      trainingFrequency,
    };

    // 4. Generate phase structure (determines how to break down the program)
    console.info('🎯 Step 1: Generating phase structure...');
    const phaseStructure = await generatePhaseStructure(phaseContext);

    console.info('✅ Phase structure generated:', {
      phaseCount: phaseStructure.length,
      phases: phaseStructure.map(p => ({
        name: p.name,
        days: `${p.startDay}-${p.endDay}`,
        focusAreas: p.focusAreas,
      })),
    });

    // 5. Generate all phases in PARALLEL (critical for staying under timeout)
    console.info('🚀 Step 2: Generating all phases in parallel...');
    const phasesWithWorkouts = await generateAllPhasesParallel(phaseStructure, phaseContext);

    // 6. Assemble complete program
    console.info('🔧 Step 3: Assembling complete program...');
    const { phases, workoutTemplates, totalWorkouts } = assembleProgram(phasesWithWorkouts, phaseContext);

    // 7. Calculate dates
    const startDate = todoList.startDate?.value || new Date().toISOString().split('T')[0];
    const endDate = new Date(new Date(startDate).getTime() + (programDuration - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // 8. Build complete program object
    // Generate a program name from training goals or use default
    const programName = todoList.trainingGoals?.value
      ? `${programDuration}-Day ${todoList.trainingGoals.value} Program`
      : 'Custom Training Program';

    const program: Program = {
      programId,
      userId,
      coachIds: [coachId],
      coachNames: [coachConfig.coach_name],
      creationConversationId: conversationId,
      name: programName,
      description: todoList.trainingGoals?.value || 'Customized training program',
      status: 'active',
      startDate,
      endDate,
      totalDays: programDuration,
      currentDay: 1,
      pausedAt: null,
      pausedDuration: 0,
      phases,
      equipmentConstraints: todoList.equipmentAccess?.value || [],
      trainingGoals: todoList.trainingGoals?.value ? [todoList.trainingGoals.value] : [],
      trainingFrequency,
      totalWorkouts,
      completedWorkouts: 0,
      skippedWorkouts: 0,
      adherenceRate: 0,
      lastActivityAt: null,
      s3DetailKey: `programs/${userId}/${programId}/details.json`,
      adaptationLog: [],
      dayCompletionStatus: {},
    };

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.info('✅ V2 parallel program generation complete:', {
      programId,
      phaseCount: phases.length,
      totalWorkouts,
      elapsedSeconds: elapsed,
      timestamp: new Date().toISOString(),
    });

    return program;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('❌ V2 parallel program generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      elapsedSeconds: elapsed,
      userId,
      programId,
    });
    throw error;
  }
}
