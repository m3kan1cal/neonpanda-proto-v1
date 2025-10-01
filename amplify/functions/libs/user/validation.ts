/**
 * User Profile Validation Utilities
 */

import { UserProfile } from './types';

/**
 * Validation result for Critical Training Directive
 */
export interface DirectiveValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate Critical Training Directive content and structure
 * Returns validation result with error message if invalid
 */
export const validateCriticalTrainingDirective = (
  directive: UserProfile['criticalTrainingDirective']
): DirectiveValidationResult => {
  if (!directive) {
    return { isValid: true };
  }

  // Validate content length
  if (directive.content && directive.content.length > 500) {
    return {
      isValid: false,
      error: 'Critical Training Directive must be 500 characters or less'
    };
  }

  // Validate enabled is boolean
  if (typeof directive.enabled !== 'boolean') {
    return {
      isValid: false,
      error: 'Critical Training Directive enabled must be a boolean'
    };
  }

  // Basic content validation (block obvious jailbreak attempts)
  if (directive.content) {
    const content = directive.content.toLowerCase();
    const blockedPatterns = [
      'ignore all previous',
      'disregard all',
      'forget all instructions',
      'system prompt',
      'jailbreak',
      'ignore safety',
      'bypass constraints'
    ];

    if (blockedPatterns.some(pattern => content.includes(pattern))) {
      return {
        isValid: false,
        error: 'Invalid directive content. Please remove system override attempts.'
      };
    }
  }

  return { isValid: true };
};

/**
 * Normalize Critical Training Directive with timestamps
 * Sets createdAt if not present, always updates updatedAt
 */
export const normalizeCriticalTrainingDirective = (
  directive: UserProfile['criticalTrainingDirective']
): UserProfile['criticalTrainingDirective'] => {
  if (!directive) {
    return undefined;
  }

  const now = new Date();

  return {
    ...directive,
    createdAt: directive.createdAt || now,
    updatedAt: now
  };
};

