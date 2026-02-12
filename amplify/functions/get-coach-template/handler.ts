import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  createOkResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import { getCoachTemplate } from "../../dynamodb/operations";
import { logger } from "../libs/logger";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract template ID from path parameters
    const templateId = event.pathParameters?.templateId;
    if (!templateId) {
      return createErrorResponse(400, "Template ID is required");
    }

    // Get the specific coach template
    const template = await getCoachTemplate(templateId);

    if (!template) {
      return createErrorResponse(
        404,
        `Coach template not found: ${templateId}`
      );
    }

    if (!template.metadata.is_active) {
      return createErrorResponse(
        404,
        `Coach template is not active: ${templateId}`
      );
    }

    logger.info("Successfully retrieved coach template:", {
      templateId,
      templateName: template.template_name,
      personaCategory: template.persona_category,
    });

    return createOkResponse({
      template: template,
    });
  } catch (error) {
    logger.error("Error getting coach template:", error);
    return createErrorResponse(500, "Internal server error");
  }
};
