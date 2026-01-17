import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { updateCoachConfig, queryPrograms } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;

  if (!coachId) {
    return createErrorResponse(400, "coachId is required");
  }

  try {
    // Check if there are any non-archived programs associated with this coach
    const programs = await queryPrograms(userId);
    const associatedPrograms = programs.filter(
      (p) => p.coachIds?.includes(coachId) && p.status !== "archived",
    );

    if (associatedPrograms.length > 0) {
      const programNames = associatedPrograms
        .slice(0, 3)
        .map((p) => p.name || "Unnamed Program")
        .join(", ");
      const moreCount =
        associatedPrograms.length > 3
          ? ` and ${associatedPrograms.length - 3} more`
          : "";

      console.warn("Cannot delete coach with associated programs:", {
        coachId,
        userId,
        programCount: associatedPrograms.length,
        programIds: associatedPrograms.map((p) => p.programId),
      });

      return createErrorResponse(
        409,
        `Cannot delete coach. There are ${associatedPrograms.length} training program(s) associated with this coach (${programNames}${moreCount}). Please archive or delete these programs first, or reassign them to another coach.`,
      );
    }

    // Soft delete by setting status to 'archived'
    const updatedCoachConfig = await updateCoachConfig(userId, coachId, {
      status: "archived",
    });

    console.info("Coach deleted successfully:", {
      coachId,
      userId,
    });

    return createOkResponse(
      {
        coachConfig: updatedCoachConfig,
      },
      "Coach deleted successfully",
    );
  } catch (error) {
    console.error("Error deleting coach:", error);
    return createErrorResponse(500, "Failed to delete coach", error);
  }
};

export const handler = withAuth(baseHandler);
