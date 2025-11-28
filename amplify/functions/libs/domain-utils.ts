/**
 * Domain & URL Utilities
 *
 * Branch-aware domain and URL builders for consistent environment routing.
 * Automatically detects environment (sandbox/develop/main) and returns appropriate domains.
 */

// Branch name for environment-aware URLs
const BRANCH_NAME = process.env.BRANCH_NAME || 'main';

// Base domain for NeonPanda
const BASE_DOMAIN = 'neonpanda.ai';

/**
 * Get the appropriate API domain based on the current branch/environment
 *
 * @returns API domain (e.g., 'api-prod.neonpanda.ai', 'api-dev.neonpanda.ai')
 */
export function getApiDomain(): string {
  // Sandbox/local development - use environment variable if available
  // (In sandbox, the actual API Gateway URL will be injected as an env var)
  if (process.env.API_ENDPOINT) {
    return process.env.API_ENDPOINT.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  // Production (main branch)
  if (BRANCH_NAME === 'main') {
    return `api-prod.${BASE_DOMAIN}`;
  }

  // Non-production branches (develop, feature branches, etc.)
  return `api-dev.${BASE_DOMAIN}`;
}

/**
 * Get the appropriate app domain based on the current branch/environment
 *
 * @returns App domain (e.g., 'neonpanda.ai', 'dev.neonpanda.ai')
 */
export function getAppDomain(): string {
  // Production (main branch) - use root domain
  if (BRANCH_NAME === 'main') {
    return BASE_DOMAIN;
  }

  // Non-production branches - use dev subdomain
  // (Adjust this based on your actual frontend hosting setup)
  return `dev.${BASE_DOMAIN}`;
}

/**
 * Get the current app URL (for linking to frontend)
 *
 * @returns Full app URL with protocol (e.g., 'https://neonpanda.ai')
 */
export function getAppUrl(): string {
  return `https://${getAppDomain()}`;
}

/**
 * Get the current API URL (for API endpoints)
 *
 * @returns Full API URL with protocol (e.g., 'https://api-prod.neonpanda.ai')
 */
export function getApiUrl(): string {
  return `https://${getApiDomain()}`;
}

/**
 * Get the current branch name
 *
 * @returns Branch name (e.g., 'main', 'develop', 'feature/xyz')
 */
export function getBranchName(): string {
  return BRANCH_NAME;
}

/**
 * Check if running in production environment
 *
 * @returns True if running on main branch
 */
export function isProduction(): boolean {
  return BRANCH_NAME === 'main';
}

/**
 * Check if running in sandbox/local development
 *
 * @returns True if API_ENDPOINT env var is set (sandbox indicator)
 */
export function isSandbox(): boolean {
  return !!process.env.API_ENDPOINT;
}
