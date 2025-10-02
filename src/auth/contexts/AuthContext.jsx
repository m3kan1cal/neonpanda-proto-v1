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
import { getUserProfile } from '../../utils/apis/userProfileApi';

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
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuthState();
      } catch (error) {
        // This should rarely happen now, but just in case
        console.error('🚨 Uncaught error in checkAuthState on mount:', error);
      }
    };

    initializeAuth();
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
      setLoading(false);

    } catch (error) {
      console.error("❌ checkAuthState error:", error);
      console.error("❌ checkAuthState error name:", error.name);
      console.error("❌ checkAuthState error message:", error.message);

      // Check if this is a specific auth failure that indicates inconsistent state
      if (error.message?.includes('User does not exist') ||
          error.message?.includes('NotAuthorizedException') ||
          error.name === 'NotAuthorizedException') {
        console.warn('🔄 Detected inconsistent auth state - user may need to be signed out');
      }

      // Batch state updates for unauthenticated state
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);

      // Only throw errors when explicitly requested
      if (throwOnMissingUserId && error.name === "IncompleteAccountSetupException") {
        throw error;
      }

      // For normal auth checking (like on mount), don't throw errors
      // The state has already been set to unauthenticated above
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

      console.info('🔄 About to confirm signup for:', email);

      await confirmSignUp({
        username: email,
        confirmationCode
      });

      console.info('✅ Signup confirmed successfully');

      // Check if user was automatically signed in after confirmation
      try {
        console.info('🔍 Checking if user was auto-signed in after confirmation...');
        const currentUser = await getCurrentUser();
        console.info('🔍 User state after confirmSignUp:', currentUser);

        if (currentUser) {
          console.info('⚠️ User was automatically signed in after confirmation!');
          console.info('🔍 Now testing if we can fetch user attributes...');

          // Test fetching attributes with retry logic to handle race condition with post-confirmation trigger
          let attributesFetched = false;
          const maxRetries = 5;
          const baseDelay = 1000; // Start with 1 second

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.info(`🔍 Attempt ${attempt}/${maxRetries}: Fetching user attributes...`);
              const testAttributes = await fetchUserAttributes();
              console.info('✅ Successfully fetched attributes after auto-signin:', Object.keys(testAttributes));
              console.info('🆔 Custom User ID found:', testAttributes['custom:user_id'] || 'NOT_SET');

              // If we can fetch attributes, proceed with normal auth state update
              await checkAuthState();
              console.info('✅ Successfully updated auth state after auto-signin');
              attributesFetched = true;
              break;

            } catch (attributeError) {
              console.warn(`❌ Attempt ${attempt}/${maxRetries} failed:`, attributeError.message);

              if (attempt === maxRetries) {
                console.error('❌ FINAL ATTEMPT FAILED to fetch attributes after auto-signin:', attributeError);
                console.error('❌ Attribute error name:', attributeError.name);
                console.error('❌ Attribute error message:', attributeError.message);
                console.warn('🚨 This could be a race condition with post-confirmation trigger or a real failure!');
                console.info('🔄 Signing user out to fix inconsistent state');

                // If we can't get the user's attributes properly, sign them out
                // This prevents the "UserAlreadyAuthenticatedException" issue
                try {
                  await signOut();
                  console.info('✅ Successfully signed out user with broken auth state');
                } catch (signOutError) {
                  console.error('❌ Failed to sign out user:', signOutError);
                }
                break;
              } else {
                // Wait with exponential backoff before retrying
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.info(`⏳ Waiting ${delay}ms before retry ${attempt + 1} (race condition with post-confirmation trigger)...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          if (!attributesFetched) {
            console.error('❌ Failed to fetch attributes after all retry attempts');
          }
        } else {
          console.info('ℹ️ User not automatically signed in - normal flow');
        }
      } catch (checkError) {
        console.info('ℹ️ User not signed in after confirmation (expected):', checkError.message);
      }

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
      setUserProfile(null); // Clear profile on sign out
      setIsAuthenticated(false);

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  // Fetch user profile from DynamoDB when user is authenticated
  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && user?.attributes?.['custom:user_id']) {
        try {
          const userId = user.attributes['custom:user_id'];
          const response = await getUserProfile(userId);
          setUserProfile(response.profile);
        } catch (error) {
          console.error('❌ Error fetching user profile:', error);
          // Don't block app if profile fetch fails - user can still use Cognito attributes
          setUserProfile(null);
        }
      } else {
        // Clear profile when user logs out or is not authenticated
        setUserProfile(null);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user]);

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
    userProfile, // Add profile to context
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
