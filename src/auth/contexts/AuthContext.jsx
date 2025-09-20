import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession
} from 'aws-amplify/auth';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async (throwOnMissingUserId = false) => {
    try {
      setLoading(true);
      setAuthError(null);

      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      const userWithAttributes = {
        ...currentUser,
        // Override username with preferred_username if available
        username: attributes?.preferred_username || currentUser.username,
        attributes
      };

      // Debug logging to match existing App.jsx pattern
      console.info("🔐 Authenticated user:", userWithAttributes);
      console.info("🆔 Custom User ID:", attributes?.["custom:user_id"]);

      // Check if custom user ID is missing and create one if needed
      if (!attributes?.["custom:user_id"]) {
        const errorMessage = "⚠️ Custom User ID is missing. This user may need manual setup.";
        console.warn(errorMessage);

        if (throwOnMissingUserId) {
          // Create a custom error that LoginForm can catch and display
          const error = new Error("Account setup incomplete. Your account registration did not complete properly. Please contact support or try registering again.");
          error.name = "IncompleteAccountSetupException";
          error.userFriendlyMessage = "Account setup incomplete. Your account registration did not complete properly. Please contact support or try registering again.";
          throw error;
        }

        // TODO: Call an API endpoint to create the missing user profile and custom ID
        // For now, we'll let the user continue but they may have limited functionality
      }

      // Batch state updates to prevent race condition
      setUser(userWithAttributes);
      setIsAuthenticated(true);
      console.info("🔄 AuthContext: Setting loading to false (authenticated)");
      setLoading(false);

    } catch (error) {
      console.info("User not authenticated:", error.message);
      // Batch state updates for unauthenticated state
      setUser(null);
      setIsAuthenticated(false);
      console.info("🔄 AuthContext: Setting loading to false (not authenticated)");
      setLoading(false);
    }
  };

  const handleSignUp = async (email, password, username, firstName, lastName) => {
    try {
      setAuthError(null);

      const { user } = await signUp({
        username: email, // Use email as Cognito username
        password,
        options: {
          userAttributes: {
            email,
            preferred_username: username,
            given_name: firstName,
            family_name: lastName
          }
        }
      });

      return { success: true, user };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleConfirmSignUp = async (email, confirmationCode) => {
    try {
      setAuthError(null);

      await confirmSignUp({
        username: email,
        confirmationCode
      });

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      setAuthError(null);

      console.info('AuthContext: About to call Amplify signIn');
      const signInResult = await signIn({
        username: email,
        password
      });

      console.info('AuthContext: Amplify signIn result:', signInResult);
      console.info('AuthContext: signInResult.isSignedIn:', signInResult.isSignedIn);
      console.info('AuthContext: signInResult.nextStep:', signInResult.nextStep);

      if (signInResult.isSignedIn) {
        await checkAuthState(true); // Refresh user state and throw error if user ID missing
        return { success: true };
      } else {
        // Handle cases where sign in didn't complete
        console.info('AuthContext: Sign in not completed, nextStep:', signInResult.nextStep);
        if (signInResult.nextStep && signInResult.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
          throw new Error('UserNotConfirmedException');
        }
        return { success: false, nextStep: signInResult.nextStep };
      }
    } catch (error) {
      console.error('AuthContext signIn error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      setAuthError(error.message);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthError(null);

      await signOut();
      setUser(null);
      setIsAuthenticated(false);

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleResetPassword = async (email) => {
    try {
      setAuthError(null);

      await resetPassword({
        username: email
      });

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleConfirmResetPassword = async (email, confirmationCode, newPassword) => {
    try {
      setAuthError(null);

      await confirmResetPassword({
        username: email,
        confirmationCode,
        newPassword
      });

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleResendSignUpCode = async (email) => {
    try {
      setAuthError(null);

      // Temporarily disabled - will implement with direct Cognito call later
      throw new Error('Resend functionality temporarily unavailable. Please try signing up again.');

    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const getAuthHeaders = async (forceRefresh = false) => {
    try {
      const session = await fetchAuthSession({ forceRefresh });
      return {
        'Authorization': `Bearer ${session.tokens.idToken.toString()}`
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {};
    }
  };

  const value = {
    // State
    isAuthenticated,
    user,
    loading,
    authError,

    // Actions
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendSignUpCode: handleResendSignUpCode,
    signIn: handleSignIn,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    confirmResetPassword: handleConfirmResetPassword,
    checkAuthState,
    getAuthHeaders,

    // Utilities
    clearError: () => setAuthError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
