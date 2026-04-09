import { authenticatedFetch } from "./apiConfig";

/**
 * List identity providers and password status for a user.
 * @returns {{ linkedProviders, hasPassword, isGoogleLinked, email, userStatus }}
 */
export const listIdentityProviders = async (userId) => {
  return authenticatedFetch(`/users/${userId}/identity-providers`, {
    method: "POST",
    body: JSON.stringify({ action: "list" }),
  });
};

/**
 * Set a permanent password for a user (typically Google-only users establishing
 * email/password sign-in for the first time).
 * @param {string} userId
 * @param {string} password - Must meet Cognito complexity requirements
 */
export const setPassword = async (userId, password) => {
  return authenticatedFetch(`/users/${userId}/identity-providers`, {
    method: "POST",
    body: JSON.stringify({ action: "set-password", password }),
  });
};

/**
 * Disconnect a federated identity provider from the user's account.
 * Only allowed when the user has at least one other sign-in method (i.e. a password).
 * @param {string} userId
 * @param {string} provider - e.g. 'Google'
 */
export const disconnectProvider = async (userId, provider) => {
  return authenticatedFetch(`/users/${userId}/identity-providers`, {
    method: "POST",
    body: JSON.stringify({ action: "disconnect", provider }),
  });
};
