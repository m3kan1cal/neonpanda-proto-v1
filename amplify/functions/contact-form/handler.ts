import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// Interface matching the React contact form fields
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  contactType: 'waitlist' | 'collaborate' | 'general';
}

// Common CORS headers
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST'
} as const;

// Helper function to create standardized API responses
function createResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

// Helper function to create error responses
function createErrorResponse(statusCode: number, error: string, details?: any): APIGatewayProxyResultV2 {
  const errorBody: any = { error };
  if (details) {
    errorBody.details = details;
  }
  return createResponse(statusCode, errorBody);
}

// Helper function to create success responses
function createSuccessResponse(data: any, message?: string): APIGatewayProxyResultV2 {
  const successBody: any = { success: true };
  if (message) {
    successBody.message = message;
  }
  return createResponse(200, { ...successBody, ...data });
}

// Helper function to get HTTP method from API Gateway v2 event
function getHttpMethod(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.http?.method || '';
}

// Helper function to log contact form submission
function logContactSubmission(data: any): void {
  console.log('=== CONTACT FORM SUBMISSION ===');
  console.log('Contact Type:', data.contactType);
  console.log('Name:', `${data.firstName} ${data.lastName}`);
  console.log('Email:', data.email);
  console.log('Subject:', data.subject);
  console.log('Message:', data.message);
  console.log('Timestamp:', data.timestamp);
  console.log('Request ID:', data.requestId);
  console.log('Source IP:', data.sourceIp);
  console.log('=== END SUBMISSION ===');
}

// Helper function to sanitize form data
function sanitizeFormData(formData: ContactFormData, event: APIGatewayProxyEventV2) {
  return {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim().toLowerCase(),
    subject: formData.subject.trim(),
    message: formData.message.trim(),
    contactType: formData.contactType,
    timestamp: new Date().toISOString(),
    requestId: event.requestContext?.requestId,
    sourceIp: event.requestContext?.http?.sourceIp,
  };
}

// Validation function
function validateContactForm(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
    errors.push('First name is required');
  }

  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
    errors.push('Last name is required');
  }

  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Please enter a valid email address');
    }
  }

  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    errors.push('Subject is required');
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.push('Message is required');
  }

  // Validate contact type
  if (!data.contactType || !['waitlist', 'collaborate', 'general'].includes(data.contactType)) {
    errors.push('Invalid contact type');
  }

  // Additional validation rules
  if (data.firstName && data.firstName.length > 128) {
    errors.push('First name must be less than 128 characters');
  }

  if (data.lastName && data.lastName.length > 128) {
    errors.push('Last name must be less than 128 characters');
  }

  if (data.email && data.email.length > 128) {
    errors.push('Email must be less than 128 characters');
  }

  if (data.subject && data.subject.length > 256) {
    errors.push('Subject must be less than 256 characters');
  }

  if (data.message && data.message.length > 2000) {
    errors.push('Message must be less than 2000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('Contact form submission event:', JSON.stringify(event, null, 2));

  try {
    // Only allow POST requests
    if (getHttpMethod(event) !== 'POST') {
      return createErrorResponse(405, 'Method not allowed. Only POST requests are supported.');
    }

    // Check for request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    // Parse the request body
    let formData: ContactFormData;
    try {
      formData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    // Validate the form data
    const validation = validateContactForm(formData);
    if (!validation.isValid) {
      console.log('Form validation failed:', validation.errors);
      return createErrorResponse(400, 'Validation failed', validation.errors);
    }

    // Sanitize and prepare data for logging
    const sanitizedData = sanitizeFormData(formData, event);

    // Log the submission
    logContactSubmission(sanitizedData);

    // Return success response
    return createSuccessResponse({
      message: 'Contact form submitted successfully',
      timestamp: sanitizedData.timestamp,
      requestId: sanitizedData.requestId,
      data: {
        contactType: sanitizedData.contactType,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        email: sanitizedData.email,
        subject: sanitizedData.subject,
      }
    });

  } catch (error) {
    console.error('Unexpected error processing contact form:', error);
    return createErrorResponse(500, 'Internal server error', 'An unexpected error occurred while processing your request');
  }
};