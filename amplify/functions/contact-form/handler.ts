import type { APIGatewayProxyHandler } from 'aws-lambda';

// Interface matching the React contact form fields
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  contactType: 'waitlist' | 'collaborate' | 'general';
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

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Contact form submission event:', JSON.stringify(event, null, 2));

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
      },
      body: JSON.stringify({
        error: 'Method not allowed. Only POST requests are supported.',
      }),
    };
  }

  try {
    // Parse the request body
    let formData: ContactFormData;

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        body: JSON.stringify({
          error: 'Request body is required',
        }),
      };
    }

    try {
      formData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
        }),
      };
    }

    // Validate the form data
    const validation = validateContactForm(formData);

    if (!validation.isValid) {
      console.log('Form validation failed:', validation.errors);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST'
        },
        body: JSON.stringify({
          error: 'Validation failed',
          details: validation.errors,
        }),
      };
    }

    // Sanitize and prepare data for logging
    const sanitizedData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
      contactType: formData.contactType,
      timestamp: new Date().toISOString(),
      requestId: event.requestContext?.requestId,
      sourceIp: event.requestContext?.identity?.sourceIp,
    };

    // Echo the form payload to console (as requested)
    console.log('=== CONTACT FORM SUBMISSION ===');
    console.log('Contact Type:', sanitizedData.contactType);
    console.log('Name:', `${sanitizedData.firstName} ${sanitizedData.lastName}`);
    console.log('Email:', sanitizedData.email);
    console.log('Subject:', sanitizedData.subject);
    console.log('Message:', sanitizedData.message);
    console.log('Timestamp:', sanitizedData.timestamp);
    console.log('Request ID:', sanitizedData.requestId);
    console.log('Source IP:', sanitizedData.sourceIp);
    console.log('=== END SUBMISSION ===');

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
      },
      body: JSON.stringify({
        success: true,
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
      }),
    };

  } catch (error) {
    console.error('Unexpected error processing contact form:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request',
      }),
    };
  }
};