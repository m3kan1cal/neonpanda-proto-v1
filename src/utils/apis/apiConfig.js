import outputs from "../../../amplify_outputs.json";
import { fetchAuthSession } from "aws-amplify/auth";

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

  console.info("API customEndpoint:", customEndpoint);
  console.info("API endpoint:", endpoint);

  // Use customEndpoint if it exists and is valid (not null or "https://null")
  if (
    customEndpoint &&
    customEndpoint !== "https://null" &&
    !customEndpoint.includes("/null")
  ) {
    console.info("✅ Using customEndpoint for branch/prod deployment");
    return customEndpoint;
  }

  // Fall back to standard endpoint (used for sandbox deployments)
  if (endpoint) {
    console.info("✅ Using standard endpoint for sandbox deployment");
    return endpoint;
  }

  // This should rarely happen - amplify_outputs.json should always have an endpoint
  throw new Error(
    "No API endpoint found in amplify_outputs.json. Please deploy your Amplify backend first."
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
    console.warn("Error getting auth token:", error);
    return {
      "Content-Type": "application/json",
    };
  }
};

// Authenticated fetch wrapper with automatic token refresh on 401
export const authenticatedFetch = async (url, options = {}) => {
  // First attempt with current token
  let authHeaders = await getAuthHeaders();
  let response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers, // Allow overriding headers if needed
    },
  });

  // If we get a 401 (Unauthorized), this likely means refresh token expired or session revoked
  // Amplify normally handles token refresh automatically, so 401s indicate serious auth issues
  if (response.status === 401) {
    console.warn(
      "Received 401 - likely refresh token expired or session revoked"
    );
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
  console.warn("Authentication failed - attempting to redirect to login");

  if (authFailureHandler) {
    // Use the custom handler if available (preferred - uses React Router)
    authFailureHandler();
  } else {
    // Fallback to window.location as last resort
    console.warn(
      "No custom auth failure handler set, using window.location fallback"
    );
    window.location.href = "/auth";
  }
};

// ============================================================================
// COACH CONVERSATION STREAMING CONFIGURATION (Lambda Function URLs)
// ============================================================================

// Coach Conversation Streaming Lambda Function URL Configuration
export const STREAMING_CONFIG = {
  // Lambda Function URL for direct coach conversation streaming (bypasses API Gateway)
  // Dynamically loaded from amplify_outputs.json
  functionUrl: getStreamingFunctionUrl(),

  // Feature toggle - can be controlled via environment variable
  enabled: import.meta.env.VITE_USE_LAMBDA_STREAMING !== "false", // Default to true

  // Timeout for streaming requests (30 seconds)
  timeout: 30000,

  // Retry configuration
  maxRetries: 1,
  retryDelay: 1000,
};

/**
 * Get the coach conversation streaming function URL from amplify_outputs.json
 * @returns {string} - The Lambda Function URL for coach conversation streaming
 */
function getStreamingFunctionUrl() {
  const streamingConfig = outputs.custom?.coachConversationStreamingApi;

  if (!streamingConfig?.functionUrl) {
    console.warn('⚠️ No coach conversation streaming function URL found in amplify_outputs.json');
    return null;
  }

  console.info('✅ Using coach conversation streaming function URL from amplify_outputs.json:', streamingConfig.functionUrl);
  return streamingConfig.functionUrl;
}

/**
 * Get the full coach conversation streaming URL for a given path
 * @param {string} path - The path to append (should start with 'users/')
 * @returns {string} - Full coach conversation streaming URL
 */
export const getStreamingUrl = (path) => {
  // Ensure path doesn't start with '/' to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${STREAMING_CONFIG.functionUrl}${cleanPath}`;
};

/**
 * Check if coach conversation Lambda Function URL streaming is available and enabled
 * @returns {boolean} - Whether coach conversation streaming should be used
 */
export const isStreamingEnabled = () => {
  return (
    STREAMING_CONFIG.enabled &&
    STREAMING_CONFIG.functionUrl &&
    STREAMING_CONFIG.functionUrl !== "your-function-url-here" &&
    STREAMING_CONFIG.functionUrl !== null
  );
};

// Export both legacy and Amplify configurations
export { AMPLIFY_API_NAME };
