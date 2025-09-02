// Example: Using the useAuthorizeUser hook
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthorizeUser } from '../auth';
import { FullPageLoader, CenteredErrorState } from '../components/shared/ErrorStates';

function ExamplePageWithHook() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');

  // Validate userId with custom options
  const {
    isValidating,
    isValid,
    authenticatedUserId,
    error
  } = useAuthorizeUser(userId, {
    redirectOnMismatch: true,  // Auto-redirect if userId doesn't match
    redirectPath: '/dashboard' // Custom redirect path
  });

  // Custom loading state
  if (isValidating) {
    return <FullPageLoader text="Checking permissions..." />;
  }

  // Custom error handling
  if (error || !isValid) {
    return (
      <CenteredErrorState
        title="Access Denied"
        message="You don't have permission to view this page."
        buttonText="Go to Dashboard"
        onButtonClick={() => navigate('/dashboard')}
        variant="error"
      />
    );
  }

  return (
    <div>
      <h1>Protected Content</h1>
      <p>Authenticated user ID: {authenticatedUserId}</p>
      <p>URL user ID: {userId}</p>
    </div>
  );
}

// Example: No auto-redirect, just validation
function ExamplePageNoRedirect() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');

  const { isValidating, isValid, error } = useAuthorizeUser(userId, {
    redirectOnMismatch: false // Don't auto-redirect
  });

  if (isValidating) return <div>Validating...</div>;

  if (!isValid) {
    return <div>Error: {error || 'Invalid user ID'}</div>;
  }

  return <div>Valid user - show content</div>;
}

export { ExamplePageWithHook, ExamplePageNoRedirect };
