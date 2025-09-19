import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  createErrorResponse,
  createOkResponse,
  getHttpMethod,
} from "../libs/api-helpers";
import { publishContactFormNotification } from "../libs/sns-helpers";
import { saveContactForm } from "../../dynamodb/operations";
import {
  ContactFormData,
  validateContactForm,
  sanitizeFormData,
  logContactSubmission,
} from "./validate";

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.info(
    "Contact form submission event:",
    JSON.stringify(event, null, 2)
  );

  try {
    // Only allow POST requests
    if (getHttpMethod(event) !== "POST") {
      return createErrorResponse(
        405,
        "Method not allowed. Only POST requests are supported."
      );
    }

    // Check for request body
    if (!event.body) {
      return createErrorResponse(400, "Request body is required");
    }

    // Parse the request body
    let formData: ContactFormData;
    try {
      formData = JSON.parse(event.body);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return createErrorResponse(400, "Invalid JSON in request body");
    }

    // Validate the form data
    const validation = validateContactForm(formData);
    if (!validation.isValid) {
      console.info("Form validation failed:", validation.errors);
      return createErrorResponse(400, "Validation failed", validation.errors);
    }

    // Sanitize and prepare data for logging
    const sanitizedData = sanitizeFormData(formData, event);

    // Log the submission
    logContactSubmission(sanitizedData);

    // Save to DynamoDB
    try {
      await saveContactForm({
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        email: sanitizedData.email,
        subject: sanitizedData.subject,
        message: sanitizedData.message,
        contactType: sanitizedData.contactType,
        timestamp: sanitizedData.timestamp,
      });
    } catch (dbError) {
      console.error("Failed to save contact form to DynamoDB:", dbError);
      return createErrorResponse(
        500,
        "Failed to save contact form",
        "There was an error saving your submission. Please try again."
      );
    }

    // Send SNS notification
    try {
      await publishContactFormNotification(sanitizedData);
    } catch (error) {
      console.error(
        "SNS notification failed, but continuing with successful response:",
        error
      );
    }

    // Return success response
    return createOkResponse({
      message: "Contact form submitted successfully",
      timestamp: sanitizedData.timestamp,
      requestId: sanitizedData.requestId,
      data: {
        contactType: sanitizedData.contactType,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        email: sanitizedData.email,
        subject: sanitizedData.subject,
      },
    });
  } catch (error) {
    console.error("Unexpected error processing contact form:", error);
    return createErrorResponse(
      500,
      "Internal server error",
      "An unexpected error occurred while processing your request"
    );
  }
};
