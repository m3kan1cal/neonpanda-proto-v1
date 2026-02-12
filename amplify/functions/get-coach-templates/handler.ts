import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  createOkResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import { queryCoachTemplates } from "../../dynamodb/operations";
import { logger } from "../libs/logger";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Query all active coach templates
    const templates = await queryCoachTemplates();

    logger.info("Successfully retrieved coach templates:", {
      templateCount: templates.length,
      templateNames: templates.map((t) => t.template_name),
    });

    return createOkResponse({
      templates: templates.map((template) => ({
        template_id: template.template_id,
        template_name: template.template_name,
        persona_category: template.persona_category,
        description: template.description,
        target_audience: template.target_audience,
        metadata: template.metadata,
      })),
      count: templates.length,
    });
  } catch (error) {
    logger.error("Error getting coach templates:", error);
    return createErrorResponse(500, "Internal server error");
  }
};
