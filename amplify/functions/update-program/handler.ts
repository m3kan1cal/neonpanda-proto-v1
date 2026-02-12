import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { updateProgram, getProgram } from '../../dynamodb/operations';
import { calculatePauseDuration } from '../libs/program/calendar-utils';
import { withAuth, AuthenticatedHandler } from '../libs/auth/middleware';
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const coachId = event.pathParameters?.coachId;
    const programId = event.pathParameters?.programId;

    if (!coachId) {
      return createErrorResponse(400, 'coachId is required');
    }

    if (!programId) {
      return createErrorResponse(400, 'programId is required');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const body = JSON.parse(event.body);

    // Restricted fields that cannot be updated by users
    const restrictedFields = [
      'programId', 'userId', 'coachId', 'creationConversationId',
      's3DetailKey', 'totalWorkouts', 'completedWorkouts', 'skippedWorkouts',
      'adherenceRate', 'dayCompletionStatus'
    ];

    // Check for restricted fields
    for (const field of restrictedFields) {
      if (field in body) {
        return createErrorResponse(400, `Field '${field}' cannot be updated directly`);
      }
    }

    // Prepare sanitized update object
    const updates: any = {};

    // Handle action-based updates (pause/resume/complete/archive/update)
    if (body.action === 'pause') {
      updates.status = 'paused';
      updates.pausedAt = new Date();
    } else if (body.action === 'resume') {
      // Get existing program to calculate pause duration from stored pausedAt
      const existingProgramData = await getProgram(userId, coachId, programId);
      if (!existingProgramData) {
        return createErrorResponse(404, 'Training program not found');
      }

      const existingProgram = existingProgramData;
      if (!existingProgram.pausedAt) {
        return createErrorResponse(400, 'Program is not currently paused');
      }

      // Calculate pause duration from stored pausedAt (don't trust client)
      const pauseDuration = calculatePauseDuration(
        new Date(existingProgram.pausedAt),
        new Date()
      );
      updates.pausedDuration = (existingProgram.pausedDuration || 0) + pauseDuration;
      updates.pausedAt = null;
      updates.status = 'active';
    } else if (body.action === 'complete') {
      updates.status = 'completed';
    } else if (body.action === 'update' || !body.action) {
      // Allow explicit field updates (only safe fields)
      // This handles both explicit 'update' action and legacy direct field updates
      const allowedFields = [
        'name', 'description', 'startDate', 'endDate', 'phases',
        'equipmentConstraints', 'trainingGoals', 'trainingFrequency',
        'currentDay', 'adaptationLog'
      ];

      for (const field of allowedFields) {
        if (field in body) {
          updates[field] = body[field];
        }
      }

      // Validate at least one field is being updated
      if (Object.keys(updates).length === 0) {
        return createErrorResponse(400, 'At least one valid field must be provided for update');
      }
    } else {
      return createErrorResponse(400, `Invalid action: ${body.action}`);
    }

    // Update the program
    const updatedProgram = await updateProgram(
      userId,
      coachId,
      programId,
      updates
    );

    return createOkResponse({
      success: true,
      program: updatedProgram,
      message: 'Training program updated successfully'
    });
  } catch (error) {
    logger.error('Error updating training program:', error);
    return createErrorResponse(500, 'Failed to update training program', error);
  }
};

export const handler = withAuth(baseHandler);
