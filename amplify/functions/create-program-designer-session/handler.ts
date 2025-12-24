import {
  createCreatedResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import {
  saveProgramDesignerSession,
  getCoachConfig,
} from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import { createEmptyProgramTodoList } from "../libs/program-designer/todo-list-utils";
import type { ProgramDesignerSession } from "../libs/program-designer/types";
import { REQUIRED_PROGRAM_FIELDS } from "../libs/program-designer/types";

/**
 * Lambda handler for creating a new program designer session
 * @route POST /users/{userId}/program-designer-sessions
 * @body { coachId: string }
 *
 * Mirrors the CoachCreator pattern - creates a session with empty todoList and no initial message.
 * The backend will generate the first question when the user sends their first message.
 */
const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;

  // Parse request body to get coachId
  let coachId: string;
  try {
    const body = JSON.parse(event.body || "{}");
    coachId = body.coachId;

    if (!coachId) {
      return createErrorResponse(
        400,
        "Missing required field: coachId",
        "MISSING_COACH_ID",
      );
    }
  } catch (error) {
    return createErrorResponse(
      400,
      "Invalid request body",
      "INVALID_REQUEST_BODY",
    );
  }

  // Create session ID following pattern: program_designer_{userId}_{timestamp}
  const sessionId = `program_designer_${userId}_${Date.now()}`;

  console.info("📝 Creating new program designer session", {
    userId,
    coachId,
    sessionId,
  });

  // Fetch coach config to validate it exists and get coach name
  let coachName: string | undefined;
  try {
    const coachConfig = await getCoachConfig(userId, coachId);

    // Validate coach exists - don't create session if coach is invalid
    if (!coachConfig) {
      console.warn("❌ Coach configuration not found", { coachId, userId });
      return createErrorResponse(
        400,
        `Invalid coachId: ${coachId}. Coach configuration does not exist.`,
        "INVALID_COACH_ID",
      );
    }

    coachName = coachConfig.coach_name;
    if (!coachName) {
      console.warn("⚠️ Coach config found but no coach_name present", {
        coachId,
      });
    }
  } catch (error) {
    console.error("❌ Failed to fetch coach config", {
      coachId,
      error,
    });
    return createErrorResponse(
      500,
      "Failed to validate coach configuration",
      "COACH_VALIDATION_ERROR",
    );
  }

  // Create initial todo list and calculate totals BEFORE saving
  const todoList = createEmptyProgramTodoList();
  const totalItems = Object.keys(todoList).length;

  // Create initial session object with correct totalItems
  const session: ProgramDesignerSession = {
    userId,
    coachId, // Store coachId in session
    coachName, // Store coach name for display (optional)
    sessionId,
    todoList,
    conversationHistory: [],
    isComplete: false,
    startedAt: new Date(),
    lastActivity: new Date(),
    turnCount: 0,
    imageS3Keys: [],
    progressDetails: {
      itemsCompleted: 0,
      totalItems, // Use calculated value instead of 0
      percentage: 0,
    },
  };

  // Save session to DynamoDB
  await saveProgramDesignerSession(session);

  console.info("✅ Program designer session created successfully", {
    sessionId,
    userId,
    totalItems,
  });
  const requiredQuestions = REQUIRED_PROGRAM_FIELDS.length;

  // Return rich metadata for frontend progress tracking
  return createCreatedResponse({
    sessionId: session.sessionId,
    progress: 0,
    progressDetails: {
      itemsCompleted: 0,
      totalItems,
      percentage: 0,
    },
    estimatedDuration: "10-20 minutes",
    totalQuestions: totalItems,
    requiredQuestions,
    message: "Program designer session created successfully",
  });
};

export const handler = withAuth(baseHandler);
