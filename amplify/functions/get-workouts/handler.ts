import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryWorkouts } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse query parameters for filtering
  const queryParams = event.queryStringParameters || {};
  const {
    fromDate,
    toDate,
    discipline,
    workoutType,
    location,
    coachId,
    minConfidence,
    limit,
    offset,
    sortBy,
    sortOrder,
  } = queryParams;

  // Build filtering options
  const options: any = {};

  if (fromDate) {
    options.fromDate = new Date(fromDate);
    if (isNaN(options.fromDate.getTime())) {
      return createErrorResponse(
        400,
        "Invalid fromDate format. Use ISO 8601 format.",
      );
    }
  }

  if (toDate) {
    options.toDate = new Date(toDate);
    if (isNaN(options.toDate.getTime())) {
      return createErrorResponse(
        400,
        "Invalid toDate format. Use ISO 8601 format.",
      );
    }
  }

  if (discipline) options.discipline = discipline;
  if (workoutType) options.workoutType = workoutType;
  if (location) options.location = location;
  if (coachId) options.coachId = coachId;

  if (minConfidence) {
    const confidence = parseFloat(minConfidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      return createErrorResponse(
        400,
        "minConfidence must be a number between 0 and 1",
      );
    }
    options.minConfidence = confidence;
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return createErrorResponse(
        400,
        "limit must be a number between 1 and 100",
      );
    }
    options.limit = limitNum;
  }

  if (offset) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return createErrorResponse(400, "offset must be a non-negative number");
    }
    options.offset = offsetNum;
  }

  if (sortBy) {
    const validSortFields = ["completedAt", "confidence", "workoutName"];
    if (!validSortFields.includes(sortBy)) {
      return createErrorResponse(
        400,
        `sortBy must be one of: ${validSortFields.join(", ")}`,
      );
    }
    options.sortBy = sortBy;
  }

  if (sortOrder) {
    if (!["asc", "desc"].includes(sortOrder)) {
      return createErrorResponse(
        400,
        'sortOrder must be either "asc" or "desc"',
      );
    }
    options.sortOrder = sortOrder;
  }

  logger.info("Querying workout sessions for user:", {
    userId,
    filters: options,
  });

  // Query workout sessions
  const workouts = await queryWorkouts(userId, options);

  // Transform the response to include summary information
  const workoutSummaries = workouts.map((session) => ({
    workoutId: session.workoutId,
    completedAt: session.completedAt,
    discipline: session.workoutData.discipline,
    workoutName: session.workoutData.workout_name,
    workoutType: session.workoutData.workout_type,
    duration: session.workoutData.duration,
    location: session.workoutData.location,
    coachIds: session.coachIds,
    coachNames: session.coachNames,
    conversationId: session.conversationId,
    confidence: session.extractionMetadata.confidence,
    extractedAt: session.extractionMetadata.extractedAt,
    // NEW: AI-generated summary for display and coach context
    summary: session.summary,
    // Include key performance metrics for quick overview
    performanceMetrics: {
      intensity: session.workoutData.performance_metrics?.intensity,
      perceived_exertion:
        session.workoutData.performance_metrics?.perceived_exertion,
      calories_burned: session.workoutData.performance_metrics?.calories_burned,
    },
    // Include PR achievements for dashboard highlights
    prAchievements: session.workoutData?.pr_achievements || [],
    // Include CrossFit specific summary if applicable
    crossfitSummary:
      session.workoutData.discipline === "crossfit"
        ? {
            workout_format:
              session.workoutData.discipline_specific?.crossfit?.workout_format,
            rx_status:
              session.workoutData.discipline_specific?.crossfit?.rx_status,
            total_time:
              session.workoutData.discipline_specific?.crossfit
                ?.performance_data?.total_time,
            rounds_completed:
              session.workoutData.discipline_specific?.crossfit
                ?.performance_data?.rounds_completed,
          }
        : undefined,
  }));

  return createOkResponse({
    workouts: workoutSummaries,
    totalCount: workoutSummaries.length,
  });
};

export const handler = withAuth(baseHandler, { allowInternalCalls: true });
