import outputs from "../../../amplify_outputs.json";
import { fetchAuthSession } from "aws-amplify/auth";

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that a userId is valid and not the literal string "null"
 * This prevents API calls with malformed URLs like /users/null/coaches
 *
 * @param {string|null|undefined} userId - The userId to validate
 * @returns {boolean} - True if userId is valid, false otherwise
 */
export const isValidUserId = (userId) => {
  // Check for null, undefined, empty string
  if (!userId) return false;

  // Check for literal string "null" or "undefined" (common JS template string bug)
  if (userId === "null" || userId === "undefined") return false;

  // Check for whitespace-only strings
  if (typeof userId === "string" && userId.trim() === "") return false;

  return true;
};

/**
 * Validates userId and throws an error if invalid
 * Use this in API functions to fail fast with a clear error message
 *
 * @param {string|null|undefined} userId - The userId to validate
 * @param {string} functionName - Name of the calling function for error messages
 * @throws {Error} - If userId is invalid
 */
export const requireValidUserId = (userId, functionName = "API call") => {
  if (!isValidUserId(userId)) {
    throw new Error(
      `${functionName}: Invalid userId "${userId}". A valid userId is required.`,
    );
  }
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

// Amplify API Configuration - Must be declared first!
const AMPLIFY_API_NAME = Object.keys(outputs.custom?.api || {})[0];
if (!AMPLIFY_API_NAME) {
  throw new Error("No API found in amplify_outputs.json");
}

// API Configuration
const API_CONFIG = {
  // NeonPanda API endpoints
  baseUrl: import.meta.env.VITE_API_URL || getDefaultApiUrl(),
};

// Determine the appropriate API URL based on environment
function getDefaultApiUrl() {
  const apiConfig = outputs.custom?.api?.[AMPLIFY_API_NAME];
  const customEndpoint = apiConfig?.customEndpoint;
  const endpoint = apiConfig?.endpoint;

  // Use customEndpoint if it exists and is valid (not null or "https://null")
  if (
    customEndpoint &&
    customEndpoint !== "https://null" &&
    !customEndpoint.includes("/null")
  ) {
    return customEndpoint;
  }

  // Fall back to standard endpoint (used for sandbox deployments)
  if (endpoint) {
    return endpoint;
  }

  // This should rarely happen - amplify_outputs.json should always have an endpoint
  throw new Error(
    "No API endpoint found in amplify_outputs.json. Please deploy your Amplify backend first.",
  );
}

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};

// Helper function to get authenticated headers for API calls
export const getAuthHeaders = async (forceRefresh = false) => {
  try {
    const session = await fetchAuthSession({ forceRefresh });
    const token = session.tokens?.idToken?.toString();

    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  } catch (error) {
    // Silent failure - return headers without token
    return {
      "Content-Type": "application/json",
    };
  }
};

// Authenticated fetch wrapper with automatic token refresh on 401
export const authenticatedFetch = async (url, options = {}) => {
  // Construct full URL (if url is relative, prepend API base URL)
  const fullUrl = url.startsWith("http") ? url : getApiUrl(url);

  // First attempt with current token
  let authHeaders = await getAuthHeaders();
  let response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers, // Allow overriding headers if needed
    },
  });

  // If we get a 401 (Unauthorized), this likely means refresh token expired or session revoked
  // Amplify normally handles token refresh automatically, so 401s indicate serious auth issues
  if (response.status === 401) {
    handleAuthFailure();
  }

  return response;
};

// Global auth failure handler - can be overridden by components
let authFailureHandler = null;

// Set a custom auth failure handler (typically from a component with router access)
export const setAuthFailureHandler = (handler) => {
  authFailureHandler = handler;
};

// Handle authentication failures
const handleAuthFailure = () => {
  if (authFailureHandler) {
    // Use the custom handler if available (preferred - uses React Router)
    authFailureHandler();
  } else {
    // Fallback to window.location as last resort
    window.location.href = "/auth";
  }
};

// ============================================================================
// STREAMING CONFIGURATION (Lambda Function URLs)
// ============================================================================

// Generic Lambda Function URL Streaming Configuration
// Supports multiple streaming endpoints (coach conversations, coach creator sessions, etc.)
export const STREAMING_CONFIG = {
  // Coach Conversation Streaming
  coachConversation: {
    functionUrl: getCoachConversationStreamingUrl(),
  },

  // Coach Creator Session Streaming
  coachCreatorSession: {
    functionUrl: getCoachCreatorStreamingUrl(),
  },

  // Program Designer Session Streaming
  programDesignerSession: {
    functionUrl: getProgramDesignerSessionStreamingUrl(),
  },

  // Feature toggle - can be controlled via environment variable
  enabled: import.meta.env.VITE_USE_LAMBDA_STREAMING !== "false", // Default to true

  // Timeout for streaming requests (90 seconds - allows time for contextual updates and AI processing)
  timeout: 90000,

  // Retry configuration
  maxRetries: 1,
  retryDelay: 1000,
};

/**
 * Get the coach conversation streaming function URL from amplify_outputs.json
 * @returns {string | null} - The Lambda Function URL for coach conversation streaming
 */
function getCoachConversationStreamingUrl() {
  const streamingConfig = outputs.custom?.coachConversationStreamingApi;

  if (!streamingConfig?.functionUrl) {
    console.warn(
      "⚠️ No coach conversation streaming function URL found in amplify_outputs.json",
    );
    return null;
  }

  return streamingConfig.functionUrl;
}

/**
 * Get the coach creator session streaming function URL from amplify_outputs.json
 * @returns {string | null} - The Lambda Function URL for coach creator session streaming
 */
function getCoachCreatorStreamingUrl() {
  const streamingConfig = outputs.custom?.coachCreatorSessionStreamingApi;

  if (!streamingConfig?.functionUrl) {
    console.warn(
      "⚠️ No coach creator session streaming function URL found in amplify_outputs.json",
    );
    return null;
  }

  return streamingConfig.functionUrl;
}

/**
 * Get the program designer session streaming function URL from amplify_outputs.json
 * @returns {string | null} - The Lambda Function URL for program designer session streaming
 */
function getProgramDesignerSessionStreamingUrl() {
  const streamingConfig = outputs.custom?.programDesignerSessionStreamingApi;

  if (!streamingConfig?.functionUrl) {
    console.warn(
      "⚠️ No program designer session streaming function URL found in amplify_outputs.json",
    );
    return null;
  }

  return streamingConfig.functionUrl;
}

/**
 * Get the full streaming URL for a given endpoint type and path
 * @param {string} endpointType - The endpoint type ('coachConversation', 'coachCreatorSession', or 'programDesignerSession')
 * @param {string} path - The path to append (should start with 'users/')
 * @returns {string} - Full streaming URL
 */
export const getStreamingUrl = (endpointType, path) => {
  const functionUrl = STREAMING_CONFIG[endpointType]?.functionUrl;

  if (!functionUrl) {
    throw new Error(`No function URL found for endpoint type: ${endpointType}`);
  }

  // Ensure path doesn't start with '/' to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${functionUrl}${cleanPath}`;
};

/**
 * Check if Lambda Function URL streaming is available and enabled
 * @param {string} endpointType - Optional endpoint type to check ('coachConversation' or 'coachCreatorSession')
 * @returns {boolean} - Whether streaming should be used
 */
export const isStreamingEnabled = (endpointType = null) => {
  if (!STREAMING_CONFIG.enabled) {
    return false;
  }

  // If checking a specific endpoint type
  if (endpointType) {
    const functionUrl = STREAMING_CONFIG[endpointType]?.functionUrl;
    return (
      functionUrl &&
      functionUrl !== "your-function-url-here" &&
      functionUrl !== null
    );
  }

  // If no specific endpoint, check if ANY streaming is available
  return (
    isStreamingEnabled("coachConversation") ||
    isStreamingEnabled("coachCreatorSession") ||
    isStreamingEnabled("programDesignerSession")
  );
};

// Export both legacy and Amplify configurations
export { AMPLIFY_API_NAME };
