import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getCurrentTimestamp, getRequestId, getSourceIp } from '../libs/api-helpers';

// Interface matching the React contact form fields
export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  contactType: 'waitlist' | 'collaborate' | 'general';
}

// Interface for sanitized contact form data
export interface SanitizedContactFormData extends ContactFormData {
  timestamp: string;
  requestId: string | undefined;
  sourceIp: string | undefined;
}

// Helper function to log contact form submission
export function logContactSubmission(data: SanitizedContactFormData): void {
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
export function sanitizeFormData(formData: ContactFormData, event: APIGatewayProxyEventV2): SanitizedContactFormData {
  return {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim().toLowerCase(),
    subject: formData.subject.trim(),
    message: formData.message.trim(),
    contactType: formData.contactType,
    timestamp: getCurrentTimestamp(),
    requestId: getRequestId(event),
    sourceIp: getSourceIp(event),
  };
}

// Validation function
export function validateContactForm(data: any): { isValid: boolean; errors: string[] } {
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