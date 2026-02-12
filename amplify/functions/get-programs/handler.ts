import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { queryPrograms } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const coachId = event.pathParameters?.coachId;

    // Query parameters for filtering
    const queryParams = event.queryStringParameters || {};
    const {
      status,
      limit: limitParam,
      includeArchived,
      includeStatus,
    } = queryParams;

    // Parse and validate limit
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limitParam && isNaN(limit!)) {
      return createErrorResponse(
        400,
        "Invalid limit parameter. Must be a number.",
      );
    }

    logger.info("📋 Querying programs:", {
      userId,
      coachId: coachId || "all",
      status: status || "all",
      includeStatus: includeStatus || "all",
      includeArchived: includeArchived || "false",
      limit: limit || "unlimited",
      method: "queryPrograms (GSI-based)",
    });

    // Parse includeStatus comma-separated string into array
    const includeStatuses = includeStatus
      ? includeStatus.split(",").map((s) => s.trim())
      : undefined;

    // ALWAYS use queryPrograms (GSI-based) since programs are user-scoped, not coach-scoped
    // This fixes the critical bug where queryProgramsByCoach used wrong composite PK
    let programs = await queryPrograms(userId, {
      status: status as any,
      limit,
      sortOrder: "desc", // Most recent first
      includeArchived: includeArchived === "true", // Default to false (exclude archived)
      includeStatus: includeStatuses,
    });

    logger.info("✅ Programs queried successfully:", {
      totalFound: programs.length,
      programIds: programs.map((p) => p.programId),
    });

    // Filter by coachId in memory if specified (optional filter)
    if (coachId) {
      const beforeFilterCount = programs.length;
      programs = programs.filter((p) => p.coachIds?.includes(coachId));
      logger.info("🔍 Filtered by coachId:", {
        coachId,
        beforeFilter: beforeFilterCount,
        afterFilter: programs.length,
      });
    }

    return createOkResponse({
      programs: programs.map((p) => p),
      count: programs.length,
    });
  } catch (error) {
    logger.error("❌ Error getting training programs:", error);
    return createErrorResponse(500, "Failed to get training programs", error);
  }
};

export const handler = withAuth(baseHandler);
