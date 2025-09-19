import { useState, useEffect } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to authorize that the userId in URL matches the authenticated user
 * @param {string} urlUserId - The userId from URL parameters
 * @param {Object} options - Configuration options
 * @param {boolean} options.redirectOnMismatch - Whether to redirect if userId doesn't match (default: true)
 * @param {string} options.redirectPath - Where to redirect on mismatch (default: '/coaches')
 * @returns {Object} { isValidating, isValid, authenticatedUserId, error }
 */
export const useAuthorizeUser = (urlUserId, options = {}) => {
  const {
    redirectOnMismatch = true,
    redirectPath = '/coaches'
  } = options;

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [authenticatedUserId, setAuthenticatedUserId] = useState(null);
  const [userAttributes, setUserAttributes] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const validateUserId = async () => {
      if (!urlUserId) {
        setError('No userId provided in URL');
        setIsValidating(false);
        return;
      }

      try {
        setIsValidating(true);
        setError(null);

        // Get the authenticated user's attributes
        const fetchedUserAttributes = await fetchUserAttributes();
        const authUserId = fetchedUserAttributes['custom:user_id'];

        if (!authUserId) {
          setError('Authenticated user has no custom:user_id attribute');
          setIsValidating(false);
          return;
        }

        setAuthenticatedUserId(authUserId);
        setUserAttributes(fetchedUserAttributes);

        // Check if URL userId matches authenticated user
        const matches = authUserId === urlUserId;
        setIsValid(matches);

        if (!matches) {
          console.warn(`URL userId (${urlUserId}) does not match authenticated user (${authUserId})`);

          if (redirectOnMismatch) {
            // Redirect to the correct URL with the authenticated user's ID
            const currentPath = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);

            // Update the userId parameter
            searchParams.set('userId', authUserId);

            // Navigate to the corrected URL
            navigate(`${currentPath}?${searchParams.toString()}`, { replace: true });
          }
        }

      } catch (err) {
        console.error('Error validating userId:', err);
        setError(err.message || 'Failed to validate user ID');

        if (redirectOnMismatch) {
          navigate(redirectPath, { replace: true });
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateUserId();
  }, [urlUserId, redirectOnMismatch, redirectPath, navigate]);

  return {
    isValidating,
    isValid,
    authenticatedUserId,
    userAttributes,
    error
  };
};

export default useAuthorizeUser;
