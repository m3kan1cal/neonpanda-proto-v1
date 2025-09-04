import { Context, Handler } from 'aws-lambda';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { generateCoachConfig, storeCoachCreatorSummaryInPinecone, generateCoachCreatorSessionSummary } from '../libs/coach-creator';
import { saveCoachConfig, getCoachCreatorSession, saveCoachCreatorSession } from '../../dynamodb/operations';

// Interface for the event payload
interface CoachConfigEvent {
  userId: string;
  sessionId: string;
}

export const handler: Handler<CoachConfigEvent> = async (event: CoachConfigEvent, context: Context) => {
  const { userId, sessionId } = event;
  let session: any = null;

  try {
    console.info('Starting async coach config generation for:', event);

    if (!userId || !sessionId) {
      throw new Error('Missing required fields: userId, sessionId');
    }

    // Load the completed session
    session = await getCoachCreatorSession(userId, sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }

    if (!session.attributes.isComplete) {
      throw new Error('Session is not complete');
    }

    // Update session to indicate config generation is in progress
    const updatedSession = {
      ...session.attributes,
      configGenerationStatus: 'IN_PROGRESS',
      configGenerationStartedAt: new Date(),
      lastActivity: new Date()
    };
    await saveCoachCreatorSession(updatedSession);

    console.info('Generating coach configuration...');

    // Generate the coach config (this is the long-running process)
    const coachConfig = await generateCoachConfig(session.attributes);

    console.info('Saving coach configuration...');

    // Save the coach config
    await saveCoachConfig(userId, coachConfig);

    // Store coach creator summary in Pinecone for future analysis
    console.info('📝 Storing coach creator summary in Pinecone...');
    const conversationSummary = generateCoachCreatorSessionSummary(session.attributes);
    const pineconeResult = await storeCoachCreatorSummaryInPinecone(
      userId,
      conversationSummary,
      session.attributes,
      coachConfig
    );

    // Update session to indicate completion
    const completedSession = {
      ...session.attributes,
      configGenerationStatus: 'COMPLETE',
      configGenerationCompletedAt: new Date(),
      coachConfigId: coachConfig.coach_id,
      lastActivity: new Date()
    };
    await saveCoachCreatorSession(completedSession);

    console.info('✅ Coach config generation completed successfully:', {
      coachConfigId: coachConfig.coach_id,
      coachName: coachConfig.coach_name,
      userId,
      sessionId,
      pineconeStored: pineconeResult.success,
      pineconeRecordId: pineconeResult.success && 'recordId' in pineconeResult ? pineconeResult.recordId : null
    });

    return createOkResponse({
      success: true,
      coachConfigId: coachConfig.coach_id,
      coachName: coachConfig.coach_name,
      userId,
      sessionId,
      message: 'Coach configuration generated successfully'
    });

  } catch (error) {
    console.error('Error generating coach config:', error);

    // Update session to indicate failure
    if (event.userId && event.sessionId && session) {
      try {
        const failedSession = {
          ...session.attributes,
          configGenerationStatus: 'FAILED',
          configGenerationFailedAt: new Date(),
          configGenerationError: error instanceof Error ? error.message : 'Unknown error',
          lastActivity: new Date()
        };
        await saveCoachCreatorSession(failedSession);
      } catch (updateError) {
        console.error('Failed to update session with error status:', updateError);
      }
    }

    // Return error response instead of throwing (for consistency with other Lambda functions)
    return createErrorResponse(500, error instanceof Error ? error.message : 'Failed to generate coach configuration', {
      userId: event.userId,
      sessionId: event.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};