import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  saveSharedProgram,
  getProgram,
  getSharedProgramByProgramId,
} from "../../dynamodb/operations";
import { getProgramDetailsFromS3 } from "../libs/program/s3-utils";
import { storeSharedProgramDetailsInS3 } from "../libs/shared-program/s3-utils";
import {
  SharedProgram,
  SharedProgramSnapshot,
  CreateSharedProgramRequest,
} from "../libs/shared-program/types";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { getUserProfile } from "../../dynamodb/operations";
import { getAppUrl } from "../libs/domain-utils";
import { generateSharedProgramId } from "../libs/id-utils";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;
    const programId = event.pathParameters?.programId;

    if (!programId) {
      return createErrorResponse(400, "programId is required");
    }

    if (!event.body) {
      return createErrorResponse(400, "Request body is required");
    }

    const body: CreateSharedProgramRequest = JSON.parse(event.body);
    const { coachId } = body;

    // Validate required fields
    if (!coachId) {
      return createErrorResponse(400, "coachId is required");
    }

    // 1. Check if an active shared program already exists for this program (idempotency)
    // Uses GSI2 for efficient direct lookup instead of query + filter
    const existingShare = await getSharedProgramByProgramId(userId, programId);

    if (existingShare) {
      // Return existing shared program instead of creating a duplicate
      const shareUrl = `${getAppUrl()}/shared/programs/${existingShare.sharedProgramId}`;
      logger.info("Returning existing shared program (idempotency check):", {
        sharedProgramId: existingShare.sharedProgramId,
        originalProgramId: programId,
        userId,
      });
      return createOkResponse({
        sharedProgramId: existingShare.sharedProgramId,
        shareUrl,
        createdAt:
          existingShare.createdAt?.toISOString() || new Date().toISOString(),
        message: "Program already shared",
        existing: true,
      });
    }

    // 2. Get the original program
    const program = await getProgram(userId, coachId, programId);
    if (!program) {
      return createErrorResponse(404, `Program not found: ${programId}`);
    }

    // 3. Verify program can be shared (active, paused, or completed - not archived)
    if (program.status === "archived") {
      return createErrorResponse(
        400,
        `Cannot share an archived program. Current status: ${program.status}`,
      );
    }

    // 4. Verify program has workouts generated (required for sharing)
    if (!program.s3DetailKey) {
      return createErrorResponse(
        400,
        "This program doesn't have workouts generated yet. Only programs with generated workouts can be shared.",
      );
    }

    // 5. Get user profile for username attribution
    const userProfile = await getUserProfile(userId);
    const creatorUsername =
      userProfile?.username || userProfile?.email?.split("@")[0] || "Anonymous";

    // 6. Get program details from S3
    const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);
    if (!programDetails) {
      return createErrorResponse(500, "Failed to load program details from S3");
    }

    // 7. Create program snapshot (preserve all coach names for multi-coach attribution)
    const programSnapshot: SharedProgramSnapshot = {
      name: program.name,
      description: program.description || "",
      totalDays: program.totalDays,
      trainingFrequency: program.trainingFrequency,
      phases: program.phases,
      trainingGoals: program.trainingGoals || [],
      equipmentConstraints: program.equipmentConstraints || [],
      coachNames: program.coachNames || [], // Use existing coach names from program
    };

    // 8. Generate shared program ID (no userId for privacy)
    const sharedProgramId = generateSharedProgramId();

    // 9. Store full program details in S3
    const s3DetailKey = await storeSharedProgramDetailsInS3(
      sharedProgramId,
      userId,
      programDetails,
      programSnapshot,
    );

    // 10. Create shared program entity
    const sharedProgram: SharedProgram = {
      sharedProgramId,
      originalProgramId: programId,
      originalCoachId: coachId, // Enable linking back to source program
      creatorUserId: userId,
      creatorUsername,
      programSnapshot,
      s3DetailKey,
      isActive: true,
      // Initialize engagement metrics
      viewCount: 0,
      copyCount: 0,
    };

    // 11. Save to DynamoDB
    await saveSharedProgram(sharedProgram);

    // 12. Generate share URL
    const shareUrl = `${getAppUrl()}/shared/programs/${sharedProgramId}`;

    logger.info("Shared program created successfully:", {
      sharedProgramId,
      originalProgramId: programId,
      userId,
      creatorUsername,
      programName: program.name,
      shareUrl,
    });

    // TODO: Track analytics event: share_link_generated

    return createOkResponse({
      sharedProgramId,
      shareUrl,
      createdAt: new Date().toISOString(),
      message: "Program shared successfully",
    });
  } catch (error) {
    logger.error("Error creating shared program:", error);
    return createErrorResponse(500, "Failed to share program", error);
  }
};

export const handler = withAuth(baseHandler);
