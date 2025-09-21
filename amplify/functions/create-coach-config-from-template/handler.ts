import {
  createCreatedResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import { createCoachConfigFromTemplate } from "../../dynamodb/operations";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  // Auth handled by middleware - userId is already validated
  const userId = event.user.userId;
  const templateId = event.pathParameters?.templateId;

  if (!templateId) {
    return createErrorResponse(400, "Template ID is required");
  }

  try {
    console.info("Creating coach config from template:", {
      userId,
      templateId,
    });

    // Create the coach config from the template
    const newCoachConfig = await createCoachConfigFromTemplate(
      userId,
      templateId
    );

    console.info("Successfully created coach config from template:", {
      userId,
      templateId,
      newCoachId: newCoachConfig.coach_id,
      coachName: newCoachConfig.coach_name,
    });

    return createCreatedResponse(
      {
        coachConfig: {
          coach_id: newCoachConfig.coach_id,
          coach_name: newCoachConfig.coach_name,
          selected_personality: newCoachConfig.selected_personality,
          technical_config: newCoachConfig.technical_config,
          metadata: newCoachConfig.metadata,
        },
      },
      "Coach config created successfully from template"
    );
  } catch (error) {
    console.error("Error creating coach config from template:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return createErrorResponse(404, error.message);
      }

      if (error.message.includes("not active")) {
        return createErrorResponse(400, error.message);
      }
    }

    return createErrorResponse(500, "Internal server error");
  }
};

export const handler = withAuth(baseHandler);
