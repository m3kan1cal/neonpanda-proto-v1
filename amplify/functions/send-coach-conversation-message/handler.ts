import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createSuccessResponse, createErrorResponse, callBedrockApi, MODEL_IDS, invokeAsyncLambda, storeDebugDataInS3, queryPineconeContext } from '../libs/api-helpers';
import { getCoachConversation, sendCoachConversationMessage, getCoachConfig, queryWorkouts } from '../../dynamodb/operations';
import { CoachMessage } from '../libs/coach-conversation/types';
import { generateSystemPrompt, validateCoachConfig, generateSystemPromptPreview } from '../libs/coach-conversation/prompt-generation';
import { detectWorkoutLogging, parseSlashCommand, isWorkoutSlashCommand, generateWorkoutDetectionContext, WORKOUT_SLASH_COMMANDS } from '../libs/workout';
import { shouldUsePineconeSearch, formatPineconeContext } from '../libs/pinecone-utils';

// Configuration constants
const RECENT_WORKOUTS_CONTEXT_LIMIT = 14;
const ENABLE_S3_DEBUG_LOGGING = false; // Set to true to enable system prompt debugging in S3

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    const coachId = event.pathParameters?.coachId;
    const conversationId = event.pathParameters?.conversationId;

    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    if (!conversationId) {
      return createErrorResponse(400, 'conversationId is required');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const body = JSON.parse(event.body);
    const { userResponse } = body;

    if (!userResponse || typeof userResponse !== 'string') {
      return createErrorResponse(400, 'User response is required');
    }

    // Load existing conversation
    const existingConversation = await getCoachConversation(userId, coachId, conversationId);
    if (!existingConversation) {
      return createErrorResponse(404, 'Conversation not found');
    }

    // Load coach config for system prompt
    const coachConfig = await getCoachConfig(userId, coachId);
    if (!coachConfig) {
      return createErrorResponse(404, 'Coach configuration not found');
    }

    // Load recent workouts for context
    let recentWorkouts: any[] = [];
    try {
      const workoutResults = await queryWorkouts(userId, {
        limit: RECENT_WORKOUTS_CONTEXT_LIMIT,
        sortBy: 'completedAt',
        sortOrder: 'desc'
      });
      recentWorkouts = workoutResults.map(workout => ({
        completedAt: workout.attributes.completedAt,
        summary: workout.attributes.summary,
        discipline: workout.attributes.workoutData.discipline,
        workoutName: workout.attributes.workoutData.workout_name
      }));
      console.info('Loaded recent workouts for context:', {
        userId,
        workoutCount: recentWorkouts.length,
        summaries: recentWorkouts.map(w => w.summary?.substring(0, 50) + '...')
      });
    } catch (error) {
      console.warn('Failed to load recent workouts for context, continuing without:', error);
      // Continue without workout context - don't fail the conversation
    }

    // Query Pinecone for semantic context if appropriate
    let pineconeContext = '';
    let pineconeMatches: any[] = [];
    const shouldQueryPinecone = shouldUsePineconeSearch(userResponse);

    if (shouldQueryPinecone) {
      try {
        console.info('🔍 Querying Pinecone for semantic context:', {
          userId,
          userMessageLength: userResponse.length,
          messagePreview: userResponse.substring(0, 100) + '...'
        });

        const pineconeResult = await queryPineconeContext(userId, userResponse, {
          topK: 3,
          includeWorkouts: true,
          includeCoachCreator: true,
          minScore: 0.7
        });

        if (pineconeResult.success && pineconeResult.matches.length > 0) {
          pineconeMatches = pineconeResult.matches;
          pineconeContext = formatPineconeContext(pineconeMatches);

          console.info('✅ Successfully retrieved Pinecone context:', {
            totalMatches: pineconeResult.totalMatches,
            relevantMatches: pineconeResult.relevantMatches,
            contextLength: pineconeContext.length
          });
        } else {
          console.info('📭 No relevant Pinecone context found:', {
            success: pineconeResult.success,
            totalMatches: pineconeResult.totalMatches,
            error: pineconeResult.error
          });
        }
      } catch (error) {
        console.warn('⚠️ Failed to query Pinecone context, continuing without:', error);
        // Continue without Pinecone context - don't fail the conversation
      }
    } else {
      console.info('⏭️ Skipping Pinecone query - message does not require semantic search');
    }

    // Create user message
    const newUserMessage: CoachMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userResponse,
      timestamp: new Date()
    };

    // Calculate conversation context from existing messages
    const existingMessages = existingConversation.attributes.messages;
    const conversationContext = {
      sessionNumber: existingMessages.filter(msg => msg.role === 'user').length + 1
    };

    // Check for workout logging detection (natural language OR slash commands)
    const slashCommand = parseSlashCommand(userResponse);
    const isSlashCommandWorkout = isWorkoutSlashCommand(slashCommand);
    const isNaturalLanguageWorkout = !slashCommand.isSlashCommand && detectWorkoutLogging(userResponse);
    const isWorkoutLogging = isSlashCommandWorkout || isNaturalLanguageWorkout;

    let workoutDetectionContext: string[] = [];
    let workoutContent = userResponse; // Default to full user response

    if (isWorkoutLogging) {
      console.info('🏋️ WORKOUT DETECTED:', {
        userId,
        coachId,
        conversationId,
        userMessage: userResponse,
        detectionType: isSlashCommandWorkout ? 'slash_command' : 'natural_language',
        slashCommand: isSlashCommandWorkout ? slashCommand.command : null,
        sessionNumber: conversationContext.sessionNumber,
        coachName: coachConfig.attributes.coach_name,
        timestamp: new Date().toISOString()
      });

      // For slash commands, use just the content after the command
      if (isSlashCommandWorkout && slashCommand.content) {
        workoutContent = slashCommand.content;
      }

      // Generate appropriate workout detection context for AI coach
      workoutDetectionContext = generateWorkoutDetectionContext(isSlashCommandWorkout);

      // Trigger async workout extraction (fire-and-forget)
      // This runs in parallel while the conversation continues
      try {
            const buildFunction = process.env.BUILD_WORKOUT_FUNCTION_NAME;
    if (!buildFunction) {
      throw new Error('BUILD_WORKOUT_FUNCTION_NAME environment variable not set');
        }

        // Ensure we have valid workout content to extract
        const extractionContent = workoutContent || userResponse;

        await invokeAsyncLambda(
          buildFunction,
          {
            userId,
            coachId,
            conversationId,
            userMessage: extractionContent,
            coachConfig: coachConfig.attributes,
            isSlashCommand: isSlashCommandWorkout,
            slashCommand: isSlashCommandWorkout ? (slashCommand.command || null) : null
          },
          'workout extraction'
        );
      } catch (error) {
        console.error('❌ Failed to trigger workout extraction, but continuing conversation:', error);
        // Don't throw - we want the conversation to continue even if extraction fails
      }
    }

    // Validate coach config and generate comprehensive system prompt
    let aiResponseContent: string;
    let promptMetadata: any = null;

    try {
      // Validate coach config has all required prompts
      const validation = validateCoachConfig(coachConfig);
      if (!validation.isValid) {
        console.error('Coach config validation failed:', {
          missingComponents: validation.missingComponents,
          coachId,
          userId
        });
        // Still continue but with warnings
      }

      if (validation.warnings.length > 0) {
        console.warn('Coach config validation warnings:', {
          warnings: validation.warnings,
          coachId,
          userId
        });
      }

      // Generate comprehensive system prompt using coach conversation utilities
      const promptOptions = {
        includeConversationGuidelines: true,
        includeUserContext: true, // Now enabled with real context
        includeDetailedBackground: true,
        conversationContext,
        additionalConstraints: workoutDetectionContext, // Add workout context if detected
        workoutContext: recentWorkouts // Add recent workout summaries for context
      };

      const { systemPrompt, metadata } = generateSystemPrompt(coachConfig, promptOptions);
      promptMetadata = metadata;

      // Log prompt preview for debugging (in development)
      if (process.env.NODE_ENV !== 'production') {
        const preview = generateSystemPromptPreview(coachConfig);
        console.info('Generated system prompt preview:', {
          ...preview,
          conversationContext,
          promptLength: metadata.promptLength,
          coachId: metadata.coachId,
          hasPineconeContext: pineconeContext.length > 0,
          pineconeMatches: pineconeMatches.length
        });
      }

      // Build conversation history into system prompt (following coach creator pattern exactly)
      let systemPromptWithHistory = systemPrompt;

      // Add Pinecone context to system prompt if available
      if (pineconeContext) {
        systemPromptWithHistory += `\n\nSEMANTIC CONTEXT:${pineconeContext}

IMPORTANT: Use the semantic context above to provide more informed and contextual responses. Reference relevant past workouts or patterns when appropriate, but don't explicitly mention that you're using stored context.`;
      }

      if (existingMessages.length > 0) {
        // Format conversation history like coach creator does
        const conversationHistoryText = existingMessages.map((msg, index) => {
          const messageNumber = Math.floor(index / 2) + 1;
          return msg.role === 'user'
            ? `Exchange ${messageNumber}:\nUser: ${msg.content}`
            : `Coach: ${msg.content}`;
        }).join('\n\n');

        systemPromptWithHistory = `${systemPrompt}

CONVERSATION HISTORY:
${conversationHistoryText}

CRITICAL:
Review the conversation history above. Build naturally on what you already know about this athlete.
USE THIS CONTEXT SILENTLY - don't explicitly reference previous exchanges unless directly relevant to the current topic.
Provide contextually relevant responses that demonstrate continuity with the ongoing coaching relationship.`;
      }

      // Store system prompt with history in S3 for debugging (only if enabled)
      if (ENABLE_S3_DEBUG_LOGGING) {
        try {
          const s3Location = await storeDebugDataInS3(systemPromptWithHistory, {
            userId,
            coachId,
            conversationId,
            coachName: coachConfig.attributes.coach_name,
            userMessage: userResponse,
            sessionNumber: conversationContext.sessionNumber,
            promptLength: systemPromptWithHistory.length,
            workoutContext: recentWorkouts.length > 0,
            workoutDetected: isWorkoutLogging,
            pineconeContext: pineconeMatches.length > 0,
            pineconeMatches: pineconeMatches.length,
            type: 'coach-conversation-prompt'
          }, 'debug');

          console.info('System prompt stored in S3 for debugging:', {
            location: s3Location,
            promptLength: systemPromptWithHistory.length,
            workoutContextIncluded: recentWorkouts.length > 0,
            pineconeContextIncluded: pineconeMatches.length > 0
          });
        } catch (s3Error) {
          console.warn('Failed to store system prompt in S3 (continuing anyway):', s3Error);
        }
      }

      try {
        aiResponseContent = await callBedrockApi(systemPromptWithHistory, userResponse);
      } catch (error) {
        console.error('Claude API error:', error);
        return createErrorResponse(500, 'Failed to process response with AI');
      }

    } catch (aiError) {
      console.error('Error generating AI response:', aiError);
      return createErrorResponse(500, 'Failed to generate coach response');
    }

    // Create AI response message
    const newAiMessage: CoachMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: aiResponseContent,
      timestamp: new Date(),
      metadata: {
        model: MODEL_IDS.CLAUDE_SONNET_4_DISPLAY
        // Note: Additional context like session number, prompt metadata, and Pinecone context
        // are logged above for debugging but not stored in message metadata
        // due to interface constraints
      }
    };

    // Update conversation with both messages
    const updatedMessages = [
      ...existingConversation.attributes.messages,
      newUserMessage,
      newAiMessage
    ];

    await sendCoachConversationMessage(userId, coachId, conversationId, updatedMessages);

    return createSuccessResponse({
      userResponse: newUserMessage,
      aiResponse: newAiMessage,
      conversationId,
      pineconeContext: {
        used: pineconeMatches.length > 0,
        matches: pineconeMatches.length,
        contextLength: pineconeContext.length
      }
    }, 'Conversation updated successfully');

  } catch (error) {
    console.error('Error updating coach conversation:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};
