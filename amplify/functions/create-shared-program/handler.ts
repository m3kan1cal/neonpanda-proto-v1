import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  saveSharedProgram,
  getProgram,
  getCoachConfig,
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

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    // Auth handled by middleware - userId is already validated
    const userId = event.user.userId;

    if (!event.body) {
      return createErrorResponse(400, "Request body is required");
    }

    const body: CreateSharedProgramRequest = JSON.parse(event.body);
    const { programId, coachId } = body;

    // Validate required fields
    if (!programId || !coachId) {
      return createErrorResponse(
        400,
        "Missing required fields: programId, coachId",
      );
    }

    // 1. Get the original program
    const program = await getProgram(userId, coachId, programId);
    if (!program) {
      return createErrorResponse(404, `Program not found: ${programId}`);
    }

    // 2. Verify program is completed or active
    if (program.status === "archived") {
      return createErrorResponse(400, "Cannot share an archived program");
    }

    // 3. Get user profile for username attribution
    const userProfile = await getUserProfile(userId);
    const creatorUsername =
      userProfile?.username || userProfile?.email?.split("@")[0] || "Anonymous";

    // 4. Get program details from S3
    const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);
    if (!programDetails) {
      return createErrorResponse(500, "Failed to load program details from S3");
    }

    // 5. Get coach name for attribution
    const coachConfig = await getCoachConfig(userId, coachId);
    const coachName = coachConfig?.coach_name || "Unknown Coach";

    // 6. Create program snapshot
    const programSnapshot: SharedProgramSnapshot = {
      name: program.name,
      description: program.description || "",
      totalDays: program.totalDays,
      trainingFrequency: program.trainingFrequency,
      phases: program.phases,
      trainingGoals: program.trainingGoals || [],
      equipmentConstraints: program.equipmentConstraints || [],
      coachNames: [coachName],
    };

    // 7. Generate shared program ID
    const shortId = Math.random().toString(36).substring(2, 11);
    const sharedProgramId = `sharedProgram_${userId}_${Date.now()}_${shortId}`;

    // 8. Store full program details in S3
    const s3DetailKey = await storeSharedProgramDetailsInS3(
      sharedProgramId,
      userId,
      programDetails,
      programSnapshot,
    );

    // 9. Create shared program entity
    const sharedProgram: SharedProgram = {
      sharedProgramId,
      originalProgramId: programId,
      creatorUserId: userId,
      creatorUsername,
      programSnapshot,
      s3DetailKey,
      isActive: true,
    };

    // 10. Save to DynamoDB
    await saveSharedProgram(sharedProgram);

    // 11. Generate share URL
    const shareUrl = `${getAppUrl()}/shared/programs/${sharedProgramId}`;

    console.info("Shared program created successfully:", {
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
    console.error("Error creating shared program:", error);
    return createErrorResponse(500, "Failed to share program", error);
  }
};

export const handler = withAuth(baseHandler);
