import outputs from '../../../amplify_outputs.json';
import { fetchAuthSession } from 'aws-amplify/auth';

// Amplify API Configuration - Must be declared first!
const AMPLIFY_API_NAME = Object.keys(outputs.custom?.api || {})[0];
if (!AMPLIFY_API_NAME) {
  throw new Error('No API found in amplify_outputs.json');
}

// API Configuration
const API_CONFIG = {
  // NeonPanda API endpoints
  baseUrl: import.meta.env.VITE_API_URL || getDefaultApiUrl()
};

// Determine the appropriate API URL based on environment
function getDefaultApiUrl() {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

  // Get the custom endpoint from amplify_outputs.json
  const customEndpoint = outputs.custom?.api?.[AMPLIFY_API_NAME]?.customEndpoint;
  console.info('API customEndpoint:', customEndpoint);
  if (customEndpoint) {
    // Replace 'dev' with 'prod' for production environment
    if (isDevelopment) {
      return customEndpoint; // Use as-is for development (api-dev.neonpanda.ai)
    } else {
      return customEndpoint.replace('-dev.', '-prod.'); // Change to api-prod.neonpanda.ai
    }
  }

  // Fallback to hardcoded values if customEndpoint not found
  if (isDevelopment) {
    return 'https://api-dev.neonpanda.ai';
  } else {
    return 'https://api-prod.neonpanda.ai';
  }
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
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  } catch (error) {
    console.warn('Error getting auth token:', error);
    return {
      'Content-Type': 'application/json'
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
      ...options.headers  // Allow overriding headers if needed
    }
  });

    // If we get a 401 (Unauthorized), this likely means refresh token expired or session revoked
  // Amplify normally handles token refresh automatically, so 401s indicate serious auth issues
  if (response.status === 401) {
    console.warn('Received 401 - likely refresh token expired or session revoked');
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
  console.warn('Authentication failed - attempting to redirect to login');

  if (authFailureHandler) {
    // Use the custom handler if available (preferred - uses React Router)
    authFailureHandler();
  } else {
    // Fallback to window.location as last resort
    console.warn('No custom auth failure handler set, using window.location fallback');
    window.location.href = '/auth';
  }
};

// Export both legacy and Amplify configurations
export { AMPLIFY_API_NAME };
