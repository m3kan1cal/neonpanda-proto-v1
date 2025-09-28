/**
 * Route Pattern Constants for Streaming Functions
 *
 * Centralized route patterns that can be used for:
 * - Path parameter extraction
 * - Route validation
 * - Frontend URL building
 * - API documentation
 * - Testing and mocking
 */

// Core streaming route patterns
export const STREAMING_ROUTE_PATTERNS = {
  // Coach conversation streaming (currently implemented)
  COACH_CONVERSATION: 'users/{userId}/coaches/{coachId}/conversations/{conversationId}/stream',
} as const;

// Array of all available patterns (for validation and logging)
export const AVAILABLE_STREAMING_PATTERNS = Object.values(STREAMING_ROUTE_PATTERNS);

// Pattern metadata for enhanced functionality
export const ROUTE_PATTERN_METADATA = {
  [STREAMING_ROUTE_PATTERNS.COACH_CONVERSATION]: {
    name: 'Coach Conversation Streaming',
    description: 'Real-time streaming for coach conversations with AI responses',
    requiredParams: ['userId', 'coachId', 'conversationId'],
    optionalParams: [],
    authRequired: true,
    validateUserMatch: true,
  },
} as const;

// Helper function to get required parameters for a pattern
export function getRequiredParams(pattern: string): readonly string[] {
  const metadata = ROUTE_PATTERN_METADATA[pattern as keyof typeof ROUTE_PATTERN_METADATA];
  return metadata?.requiredParams || [];
}


// Helper function to extract pattern from URL
export function detectPatternFromUrl(url: string): string | null {
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  const urlParts = cleanUrl.split('/');

  // Try to match against known patterns
  for (const pattern of AVAILABLE_STREAMING_PATTERNS) {
    const patternParts = pattern.split('/');

    if (urlParts.length === patternParts.length) {
      let matches = true;

      for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];
        const urlPart = urlParts[i];

        // If it's not a parameter placeholder, it must match exactly
        if (!patternPart.startsWith('{') && patternPart !== urlPart) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return pattern;
      }
    }
  }

  return null;
}

// Type exports for better TypeScript support
export type StreamingRoutePattern = keyof typeof STREAMING_ROUTE_PATTERNS;
export type RoutePatternValue = typeof STREAMING_ROUTE_PATTERNS[StreamingRoutePattern];
