// Authentication utility functions

export const AUTH_ERRORS = {
  'UserNotConfirmedException': 'Please check your email and confirm your account before signing in.',
  'NotAuthorizedException': 'Incorrect email or password. Please try again.',
  'UserNotFoundException': 'No account found with this email address.',
  'InvalidPasswordException': 'Password does not meet security requirements.',
  'UsernameExistsException': 'An account with this email already exists.',
  'LimitExceededException': 'Too many attempts. Please try again later.',
  'CodeMismatchException': 'Invalid confirmation code. Please check and try again.',
  'ExpiredCodeException': 'Confirmation code has expired. Please request a new one.',
  'InvalidParameterException': 'Invalid input provided. Please check your information.',
  'TooManyRequestsException': 'Too many requests. Please wait before trying again.',
  'TooManyFailedAttemptsException': 'Account temporarily locked due to too many failed attempts.',
  'UserAlreadyConfirmedException': 'This account has already been confirmed.',
  'AliasExistsException': 'An account with this email already exists.',
  'CodeDeliveryFailureException': 'Failed to send confirmation code. Please try again.',
  'InternalErrorException': 'An internal error occurred. Please try again.',
  'ResourceNotFoundException': 'User not found. Please check your email address.',
  'UserNotConfirmedException': 'Account not confirmed. Please check your email for confirmation instructions.'
};

export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  // Handle Amplify error objects
  if (error.name && AUTH_ERRORS[error.name]) {
    return AUTH_ERRORS[error.name];
  }

  // Handle string error codes
  if (typeof error === 'string' && AUTH_ERRORS[error]) {
    return AUTH_ERRORS[error];
  }

  // Handle error messages that contain known error codes
  const errorMessage = error.message || error.toString();
  for (const [code, message] of Object.entries(AUTH_ERRORS)) {
    if (errorMessage.includes(code)) {
      return message;
    }
  }

  // Return the original message if no mapping found, but clean it up
  return errorMessage
    .replace(/^Error:\s*/, '') // Remove "Error: " prefix
    .replace(/\s*\(.*?\)$/, '') // Remove parenthetical info at end
    .trim();
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email?.trim());
};

export const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return errors;
  }

  if (password.length < 8) {
    errors.push('Must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Must contain a number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain special character');
  }

  return errors;
};

export const validateUsername = (username) => {
  if (!username?.trim()) {
    return 'Username is required';
  }

  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }

  if (username.length > 20) {
    return 'Username must be less than 20 characters';
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'Username can only contain letters, numbers, hyphens, and underscores';
  }

  return null;
};

export const validateName = (name, fieldName = 'Name') => {
  if (!name?.trim()) {
    return `${fieldName} is required`;
  }

  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }

  if (name.length > 50) {
    return `${fieldName} must be less than 50 characters`;
  }

  return null;
};

export const validateConfirmationCode = (code) => {
  if (!code?.trim()) {
    return 'Confirmation code is required';
  }

  if (!/^\d{6}$/.test(code.trim())) {
    return 'Confirmation code must be 6 digits';
  }

  return null;
};

// Format user display name
export const getUserDisplayName = (user) => {
  if (!user?.attributes) return 'User';

  const { given_name, family_name, preferred_username, email } = user.attributes;

  if (given_name && family_name) {
    return `${given_name} ${family_name}`;
  }

  if (given_name) {
    return given_name;
  }

  if (preferred_username) {
    return preferred_username;
  }

  if (email) {
    return email.split('@')[0];
  }

  return 'User';
};

// Get custom user ID for API calls
export const getCustomUserId = (user) => {
  return user?.attributes?.['custom:user_id'] || null;
};
