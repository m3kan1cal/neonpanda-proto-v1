import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../libs/api-helpers";
import { queryCoachTemplates } from "../../dynamodb/operations";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Query all active coach templates
    const templates = await queryCoachTemplates();

    console.info("Successfully retrieved coach templates:", {
      templateCount: templates.length,
      templateNames: templates.map((t) => t.attributes.template_name),
    });

    return createSuccessResponse({
      templates: templates.map((template) => ({
        template_id: template.attributes.template_id,
        template_name: template.attributes.template_name,
        persona_category: template.attributes.persona_category,
        description: template.attributes.description,
        target_audience: template.attributes.target_audience,
        metadata: template.attributes.metadata,
      })),
      count: templates.length,
    });
  } catch (error) {
    console.error("Error getting coach templates:", error);
    return createErrorResponse(500, "Internal server error");
  }
};
