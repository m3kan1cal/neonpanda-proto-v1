import { createOkResponse, createErrorResponse } from "../../libs/api-helpers";
import { updateMemory } from "../../../dynamodb/operations";
import { storeMemoryInPinecone } from "../../libs/user/pinecone";
import { UserMemory } from "../../libs/memory/types";
import { withAuth, AuthenticatedHandler } from "../../libs/auth/middleware";
import { logger } from "../../libs/logger";

const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;

  const memoryId = event.pathParameters?.memoryId;
  if (!memoryId) {
    return createErrorResponse(400, "memoryId is required");
  }

  if (!event.body) {
    return createErrorResponse(400, "Request body is required");
  }

  let updateData: Partial<UserMemory>;
  try {
    updateData = JSON.parse(event.body);
  } catch (error) {
    return createErrorResponse(400, "Invalid JSON in request body");
  }

  const restrictedFields = ["memoryId", "userId"];
  for (const field of restrictedFields) {
    if (field in updateData) {
      return createErrorResponse(400, `Field '${field}' cannot be updated`);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return createErrorResponse(
      400,
      "At least one field must be provided for update",
    );
  }

  try {
    logger.info("Updating memory:", {
      userId,
      memoryId,
      updateFields: Object.keys(updateData),
    });

    const updatedMemory = await updateMemory(userId, memoryId, updateData);

    // Sync to Pinecone in the handler layer, consistent with create-memory pattern
    try {
      await storeMemoryInPinecone(updatedMemory);
    } catch (pineconeError) {
      logger.warn("Failed to sync updated memory to Pinecone:", pineconeError);
    }

    return createOkResponse({
      message: "Memory updated successfully",
      memory: updatedMemory,
      updateFields: Object.keys(updateData),
    });
  } catch (error) {
    logger.error("Error updating memory:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return createErrorResponse(404, error.message);
      }
      if (
        error.message.includes("validation") ||
        error.message.includes("invalid")
      ) {
        return createErrorResponse(400, error.message);
      }
    }

    return createErrorResponse(500, "Internal server error");
  }
};

export const handler = withAuth(baseHandler);
