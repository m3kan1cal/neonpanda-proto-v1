// Global Configuration Constants for Coach Creator Agent

// Version and API Configuration
export const COACH_CREATOR_VERSION = "2.0.0";
export const MAX_QUESTIONS_PER_SESSION = 10;
export const SESSION_TIMEOUT_MINUTES = 30;
export const MIN_QUESTIONS_FOR_COACH_CREATION = 8;

// Session Management Constants
export const DEFAULT_SOPHISTICATION_LEVEL = 'UNKNOWN';
export const SOPHISTICATION_LEVELS = ['UNKNOWN', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

// Coach Creation Limits
export const MAX_COACH_PERSONALITIES_PER_USER = 3;
export const MAX_COACH_MODIFICATIONS_PER_SESSION = 5;

// Response Validation
export const MIN_RESPONSE_LENGTH = 5;
export const MAX_RESPONSE_LENGTH = 1000;

// Error Messages
export const ERROR_MESSAGES = {
  SESSION_EXPIRED: "Your session has expired. Please start a new coach creator session.",
  INVALID_RESPONSE: "Please provide a more detailed response to help us create your perfect coach.",
  QUESTION_SKIP_ERROR: "This question is required and cannot be skipped.",
  MAX_RETRIES_EXCEEDED: "We're having trouble processing your response. Please try rephrasing your answer.",
  COACH_CREATOR_FAILED: "We encountered an error creating your coach. Please try again.",
  SAFETY_VALIDATION_FAILED: "Your coach configuration didn't pass our safety checks. Please review your responses."
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SESSION_STARTED: "Great! Let's create your perfect AI coach. This will take about 10-15 minutes.",
  QUESTION_PROCESSED: "Thanks for that insight! It helps me understand what kind of coach will work best for you.",
  COACH_CREATED: "Congratulations! Your personalized AI coach has been created and is ready to help you achieve your fitness goals.",
  MODIFICATION_APPLIED: "Your coach has been updated with your preferences."
};

// Default Values
export const DEFAULTS = {
  QUESTIONS_PER_BATCH: 3,
  RESPONSE_TIMEOUT_SECONDS: 30,
  RETRY_ATTEMPTS: 3,
  SOPHISTICATION_THRESHOLD: {
    BEGINNER_TO_INTERMEDIATE: 3,
    INTERMEDIATE_TO_ADVANCED: 5
  }
};
