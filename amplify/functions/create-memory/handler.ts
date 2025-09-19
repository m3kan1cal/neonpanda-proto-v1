import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  createCreatedResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import { saveMemory, getCoachConfig } from "../../dynamodb/operations";
import {
  UserMemory,
  generateMemoryId,
  detectMemoryCharacteristics,
} from "../libs/memory";
import { storeMemoryInPinecone } from "../libs/user/pinecone";
import { getUserId, extractJWTClaims, authorizeUser } from '../libs/auth/jwt-utils';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract userId from path parameters and validate against JWT claims
    const requestedUserId = event.pathParameters?.userId;
    if (!requestedUserId) {
      return createErrorResponse(400, 'Missing userId in path parameters.');
    }

    // Authorize that the requested userId matches the authenticated user
    authorizeUser(event, requestedUserId);

    // Use the validated userId
    const userId = requestedUserId;
    const claims = extractJWTClaims(event);

    if (!event.body) {
      return createErrorResponse(400, "Request body is required");
    }

    const requestBody = JSON.parse(event.body);
    const { content, coachId } = requestBody;

    if (!content || !content.trim()) {
      return createErrorResponse(
        400,
        "content is required and cannot be empty"
      );
    }

    // Load coach config to get coach name for AI scope detection
    let coachName = undefined;
    if (coachId) {
      try {
        const coachConfig = await getCoachConfig(userId, coachId);
        if (!coachConfig) {
          return createErrorResponse(404, "Coach configuration not found");
        }
        coachName = coachConfig?.attributes?.coach_name;
      } catch (error) {
        console.error(
          "Failed to load coach config for memory creation:",
          error
        );
        return createErrorResponse(500, "Unable to verify coach configuration");
      }
    }

    console.info("Creating memory:", {
      userId,
      contentLength: content.length,
      coachId: coachId || "global",
      coachName: coachName || "unknown",
    });

    // Use AI to determine memory characteristics (combined analysis)
    console.info("🤖 Running AI analysis for memory...");
    const memoryCharacteristics = await detectMemoryCharacteristics(
      content.trim(),
      coachName
    );

    console.info("🎯 AI Memory Analysis:", {
      content:
        content.trim().substring(0, 50) + (content.length > 50 ? "..." : ""),
      result: `${memoryCharacteristics.isCoachSpecific ? "coach-specific" : "global"},
        ${memoryCharacteristics.type}, ${memoryCharacteristics.importance}`,
      coachId: memoryCharacteristics.isCoachSpecific ? coachId : null,
    });

    // Generate unique memory ID
    const memoryId = generateMemoryId();

    // Create the memory object with AI-determined values
    const memory: UserMemory = {
      memoryId,
      userId,
      coachId: memoryCharacteristics.isCoachSpecific ? coachId : undefined, // AI determines scope
      content: content.trim(),
      memoryType: memoryCharacteristics.type, // AI-determined type
      metadata: {
        createdAt: new Date(),
        lastUsed: new Date(), // Set lastUsed to current time when created
        usageCount: 0,
        source: "explicit_request",
        importance: memoryCharacteristics.importance, // AI-determined importance
        tags: memoryCharacteristics.isCoachSpecific
          ? ["coach_specific"]
          : ["global"],
      },
    };

    // Save the memory to DynamoDB
    await saveMemory(memory);

    // Store memory in Pinecone for semantic search (async, don't block response)
    console.info("🧠 Storing memory in Pinecone...");
    const pineconeResult = await storeMemoryInPinecone(memory);

    // Return success response with the created memory
    return createCreatedResponse({
      message: "Memory created successfully",
      memory,
      memoryId,
      userId,
      pineconeStored: pineconeResult.success,
      pineconeRecordId:
        pineconeResult.success && "recordId" in pineconeResult
          ? pineconeResult.recordId
          : null,
    });
  } catch (error) {
    console.error("Error creating memory:", error);

    if (error instanceof SyntaxError) {
      return createErrorResponse(400, "Invalid JSON in request body");
    }

    return createErrorResponse(
      500,
      "Internal server error while creating memory"
    );
  }
};
