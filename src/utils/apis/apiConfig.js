// API Configuration
const API_CONFIG = {
  // CoachForge API endpoints
  baseUrl: import.meta.env.VITE_API_URL || getDefaultApiUrl(),
  endpoints: {
    contact: '/contact'
  }
};

// Determine the appropriate API URL based on environment
function getDefaultApiUrl() {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

  // Use appropriate subdomain based on environment
  if (isDevelopment) {
    return 'https://api-dev.neonpanda.ai';
  } else {
    return 'https://api-prod.neonpanda.ai';
  }
}

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint] || endpoint}`;
};

// API client with error handling
export const apiClient = {
  async post(endpoint, data) {
    const response = await fetch(getApiUrl(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `API Error: ${response.status}`);
    }

    return result;
  }
};

export default API_CONFIG;