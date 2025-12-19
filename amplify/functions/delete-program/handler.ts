import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  updateProgram,
  getProgram,
  deleteProgram,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { deleteProgramSummaryFromPinecone } from "../libs/program/pinecone";
import { deleteObject } from "../libs/s3-utils";

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
      console.info("Hard deleting program (complete removal):", {
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
      console.info("✅ Program deleted from DynamoDB");

      // Delete from Pinecone
      const pineconeResult = await deleteProgramSummaryFromPinecone(
        userId,
        programId,
      );
      if (pineconeResult.success) {
        console.info("✅ Program summary deleted from Pinecone");
      } else {
        console.warn(
          "⚠️ Failed to delete program summary from Pinecone:",
          pineconeResult.error,
        );
      }

      // Delete from S3 if s3DetailKey exists
      if (program.s3DetailKey) {
        try {
          await deleteObject(program.s3DetailKey);
          console.info("✅ Program details deleted from S3");
        } catch (s3Error) {
          console.warn("⚠️ Failed to delete program details from S3:", s3Error);
        }
      }

      console.info("Training program hard deleted successfully:", {
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
      console.info("Archiving program (soft delete):", {
        userId,
        coachId,
        programId,
      });

      // Soft delete in DynamoDB - archive the program for audit trail
      // S3 workout templates and Pinecone summaries remain intact for potential restore
      const updatedProgram = await updateProgram(userId, coachId, programId, {
        status: "archived",
      });

      console.info("Training program archived successfully:", {
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
    console.error("Error deleting training program:", error);
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
