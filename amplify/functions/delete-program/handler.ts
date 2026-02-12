import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  updateProgram,
  getProgram,
  deleteProgram,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { deleteProgramSummaryFromPinecone } from "../libs/program/pinecone";
import { deleteObject } from "../libs/s3-utils";
import { logger } from "../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const coachId = event.pathParameters?.coachId;
  const programId = event.pathParameters?.programId;

  if (!coachId) {
    return createErrorResponse(400, "coachId is required");
  }

  if (!programId) {
    return createErrorResponse(400, "programId is required");
  }

  // Parse hardDelete query parameter (defaults to false for soft delete)
  const hardDelete = event.queryStringParameters?.hardDelete === "true";

  try {
    if (hardDelete) {
      logger.info("Hard deleting program (complete removal):", {
        userId,
        coachId,
        programId,
      });

      // Get the program first to retrieve s3DetailKey
      const program = await getProgram(userId, coachId, programId);
      if (!program) {
        return createErrorResponse(404, "Training program not found");
      }

      // Delete from DynamoDB
      await deleteProgram(userId, coachId, programId);
      logger.info("✅ Program deleted from DynamoDB");

      // Delete from Pinecone
      const pineconeResult = await deleteProgramSummaryFromPinecone(
        userId,
        programId,
      );
      if (pineconeResult.success) {
        logger.info("✅ Program summary deleted from Pinecone");
      } else {
        logger.warn(
          "⚠️ Failed to delete program summary from Pinecone:",
          pineconeResult.error,
        );
      }

      // Delete from S3 if s3DetailKey exists
      if (program.s3DetailKey) {
        try {
          await deleteObject(program.s3DetailKey);
          logger.info("✅ Program details deleted from S3");
        } catch (s3Error) {
          logger.warn("⚠️ Failed to delete program details from S3:", s3Error);
        }
      }

      logger.info("Training program hard deleted successfully:", {
        programId,
        coachId,
        userId,
      });

      return createOkResponse(
        {
          programId,
          deleted: true,
          hardDelete: true,
        },
        "Training program permanently deleted",
      );
    } else {
      logger.info("Archiving program (soft delete):", {
        userId,
        coachId,
        programId,
      });

      // Soft delete in DynamoDB - archive the program for audit trail
      // S3 workout templates and Pinecone summaries remain intact for potential restore
      const updatedProgram = await updateProgram(userId, coachId, programId, {
        status: "archived",
      });

      logger.info("Training program archived successfully:", {
        programId,
        coachId,
        userId,
        status: "archived",
      });

      return createOkResponse(
        {
          program: updatedProgram,
        },
        "Training program archived successfully",
      );
    }
  } catch (error) {
    logger.error("Error deleting training program:", error);
    return createErrorResponse(
      500,
      hardDelete
        ? "Failed to delete training program"
        : "Failed to archive training program",
      error,
    );
  }
};

export const handler = withAuth(baseHandler);
