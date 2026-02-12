import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  deleteProgramDesignerSession,
  getProgramDesignerSession,
  saveProgramDesignerSession,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { deleteProgramDesignerSessionSummaryFromPinecone } from "../libs/program-designer/pinecone";
import { deleteObjects } from "../libs/s3-utils";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  const sessionId = event.pathParameters?.sessionId;
  if (!sessionId) {
    return createErrorResponse(400, "sessionId is required");
  }

  // Parse hardDelete query parameter (defaults to false for soft delete)
  const hardDelete = event.queryStringParameters?.hardDelete === "true";

  try {
    // Get the session first to check existence and retrieve data
    const session = await getProgramDesignerSession(userId, sessionId);
    if (!session) {
      return createErrorResponse(404, "Program designer session not found");
    }

    if (hardDelete) {
      logger.info(
        "Hard deleting program designer session (complete removal):",
        {
          userId,
          sessionId,
        },
      );

      // Delete from DynamoDB
      await deleteProgramDesignerSession(userId, sessionId);
      logger.info("✅ Program designer session deleted from DynamoDB");

      // Delete from Pinecone
      const pineconeResult =
        await deleteProgramDesignerSessionSummaryFromPinecone(
          userId,
          sessionId,
        );
      if (pineconeResult.success) {
        logger.info(
          "✅ Program designer session summary deleted from Pinecone",
        );
      } else {
        logger.warn(
          "⚠️ Failed to delete program designer session summary from Pinecone:",
          pineconeResult.error,
        );
      }

      // Delete images from S3 if imageS3Keys exist (using batch delete for efficiency)
      if (session.imageS3Keys && session.imageS3Keys.length > 0) {
        logger.info(`Deleting ${session.imageS3Keys.length} images from S3`);
        const deleteResult = await deleteObjects(session.imageS3Keys);
        logger.info(`✅ Deleted ${deleteResult.deletedCount} images from S3`);
        if (deleteResult.errors.length > 0) {
          logger.warn(
            `⚠️ Failed to delete ${deleteResult.errors.length} images:`,
            deleteResult.errors,
          );
        }
      }

      logger.info("Program designer session hard deleted successfully:", {
        userId,
        sessionId,
      });

      return createOkResponse(
        {
          sessionId,
          deleted: true,
          hardDelete: true,
        },
        "Program designer session permanently deleted",
      );
    } else {
      logger.info("Soft deleting program designer session:", {
        userId,
        sessionId,
      });

      // Soft delete - mark as deleted but keep in DynamoDB
      session.isDeleted = true;
      session.completedAt = new Date();
      await saveProgramDesignerSession(session);

      logger.info("Program designer session soft deleted successfully:", {
        userId,
        sessionId,
      });

      return createOkResponse(
        {
          sessionId,
          deleted: true,
          hardDelete: false,
        },
        "Program designer session archived successfully",
      );
    }
  } catch (error: any) {
    logger.error("Error deleting program designer session:", error);
    if (error.message && error.message.includes("not found")) {
      return createErrorResponse(404, "Program designer session not found");
    }
    return createErrorResponse(
      500,
      hardDelete
        ? "Failed to delete program designer session"
        : "Failed to archive program designer session",
      error,
    );
  }
};

export const handler = withAuth(baseHandler);
