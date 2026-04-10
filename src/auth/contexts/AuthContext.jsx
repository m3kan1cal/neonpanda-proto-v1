import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  signInWithRedirect,
} from "aws-amplify/auth";
import { getUserProfile } from "../../utils/apis/userProfileApi";
import { logger } from "../../utils/logger";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
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
        logger.error("🚨 Uncaught error in checkAuthState on mount:", error);
      }
    };

    initializeAuth();
  }, []);

  const checkAuthState = async (throwOnMissingUserId = false) => {
    try {
      setLoading(true);
      setAuthError(null);

      const currentUser = await getCurrentUser();
      let attributes = await fetchUserAttributes();

      const userWithAttributes = {
        ...currentUser,
        // Override username with preferred_username if available
        username: attributes?.preferred_username || currentUser.username,
        attributes,
      };

      // Check if custom user ID is missing.
      // Only retry for federated (Google) sign-ins — those have a genuine race condition
      // with the post-confirmation trigger. Email/password sign-ins always have the
      // attribute set immediately, so retrying wastes 1-6 seconds showing a spinner.
      const isFederatedSignIn =
        currentUser.signInDetails?.authFlowType === "FEDERATED" ||
        currentUser.username?.startsWith("google_");

      if (!attributes?.["custom:user_id"]) {
        if (isFederatedSignIn) {
          logger.warn(
            "⚠️ Custom User ID not yet set — federated sign-in race condition. Retrying...",
          );

          let resolved = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            try {
              const retryAttributes = await fetchUserAttributes();
              if (retryAttributes?.["custom:user_id"]) {
                attributes = retryAttributes;
                userWithAttributes.attributes = retryAttributes;
                userWithAttributes.username =
                  retryAttributes.preferred_username || currentUser.username;
                resolved = true;
                logger.info(
                  `✅ custom:user_id resolved on retry attempt ${attempt}`,
                );
                break;
              }
            } catch (retryErr) {
              logger.warn(
                `Retry ${attempt} fetch attributes failed:`,
                retryErr,
              );
            }
          }

          if (!resolved) {
            logger.warn(
              "⚠️ Custom User ID is missing after retries. This user may need manual setup.",
            );

            if (throwOnMissingUserId) {
              const error = new Error(
                "Account setup incomplete. Your account registration did not complete properly. Please contact support or try registering again.",
              );
              error.name = "IncompleteAccountSetupException";
              error.userFriendlyMessage =
                "Account setup incomplete. Your account registration did not complete properly. Please contact support or try registering again.";
              throw error;
            }
          }
        } else {
          logger.warn(
            "⚠️ Custom User ID is missing for email/password user. This user may need manual setup.",
          );

          if (throwOnMissingUserId) {
            const error = new Error(
              "Account setup incomplete. Your account registration did not complete properly. Please contact support or try registering again.",
            );
            error.name = "IncompleteAccountSetupException";
            error.userFriendlyMessage =
              "Account setup incomplete. Your account registration did not complete properly. Please contact support or try registering again.";
            throw error;
          }
        }
      }

      // Batch state updates to prevent race condition
      setUser(userWithAttributes);
      setIsAuthenticated(true);
      setLoading(false);
    } catch (error) {
      logger.error("❌ checkAuthState error:", error);
      logger.error("❌ checkAuthState error name:", error.name);
      logger.error("❌ checkAuthState error message:", error.message);

      // When the session is expired or invalid, clear stale tokens so the next
      // sign-in attempt doesn't hit UserAlreadyAuthenticatedException.
      if (
        error.message?.includes("User does not exist") ||
        error.message?.includes("NotAuthorizedException") ||
        error.name === "NotAuthorizedException"
      ) {
        logger.warn(
          "🔄 Detected inconsistent auth state - clearing stale session",
        );
        try {
          await signOut();
        } catch (signOutError) {
          logger.warn(
            "🔄 Cleanup signOut error (ignored):",
            signOutError.message,
          );
        }
      }

      // Batch state updates for unauthenticated state
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);

      // Only throw errors when explicitly requested
      if (
        throwOnMissingUserId &&
        error.name === "IncompleteAccountSetupException"
      ) {
        throw error;
      }

      // For normal auth checking (like on mount), don't throw errors
      // The state has already been set to unauthenticated above
    }
  };

  const handleSignUp = async (
    email,
    password,
    username,
    firstName,
    lastName,
  ) => {
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
            family_name: lastName,
          },
        },
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

      logger.info("🔄 About to confirm signup for:", email);

      await confirmSignUp({
        username: email,
        confirmationCode,
      });

      logger.info("✅ Signup confirmed successfully");

      // Check if user was automatically signed in after confirmation
      try {
        logger.info(
          "🔍 Checking if user was auto-signed in after confirmation...",
        );
        const currentUser = await getCurrentUser();
        logger.info("🔍 User state after confirmSignUp:", currentUser);

        if (currentUser) {
          logger.info(
            "⚠️ User was automatically signed in after confirmation!",
          );
          logger.info("🔍 Now testing if we can fetch user attributes...");

          // Test fetching attributes with retry logic to handle race condition with post-confirmation trigger
          let attributesFetched = false;
          const maxRetries = 5;
          const baseDelay = 1000; // Start with 1 second

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              logger.info(
                `🔍 Attempt ${attempt}/${maxRetries}: Fetching user attributes...`,
              );
              const testAttributes = await fetchUserAttributes();
              logger.info(
                "✅ Successfully fetched attributes after auto-signin:",
                Object.keys(testAttributes),
              );
              logger.info(
                "🆔 Custom User ID found:",
                testAttributes["custom:user_id"] || "NOT_SET",
              );

              // If we can fetch attributes, proceed with normal auth state update
              await checkAuthState();
              logger.info(
                "✅ Successfully updated auth state after auto-signin",
              );
              attributesFetched = true;
              break;
            } catch (attributeError) {
              logger.warn(
                `❌ Attempt ${attempt}/${maxRetries} failed:`,
                attributeError.message,
              );

              if (attempt === maxRetries) {
                logger.error(
                  "❌ FINAL ATTEMPT FAILED to fetch attributes after auto-signin:",
                  attributeError,
                );
                logger.error("❌ Attribute error name:", attributeError.name);
                logger.error(
                  "❌ Attribute error message:",
                  attributeError.message,
                );
                logger.warn(
                  "🚨 This could be a race condition with post-confirmation trigger or a real failure!",
                );
                logger.info("🔄 Signing user out to fix inconsistent state");

                // If we can't get the user's attributes properly, sign them out
                // This prevents the "UserAlreadyAuthenticatedException" issue
                try {
                  await signOut();
                  logger.info(
                    "✅ Successfully signed out user with broken auth state",
                  );
                } catch (signOutError) {
                  logger.error("❌ Failed to sign out user:", signOutError);
                }
                break;
              } else {
                // Wait with exponential backoff before retrying
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.info(
                  `⏳ Waiting ${delay}ms before retry ${attempt + 1} (race condition with post-confirmation trigger)...`,
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }

          if (!attributesFetched) {
            logger.error(
              "❌ Failed to fetch attributes after all retry attempts",
            );
          }
        } else {
          logger.info("ℹ️ User not automatically signed in - normal flow");
        }
      } catch (checkError) {
        logger.info(
          "ℹ️ User not signed in after confirmation (expected):",
          checkError.message,
        );
      }

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleSignIn = async (email, password) => {
    const attemptSignIn = async () => {
      const signInResult = await signIn({ username: email, password });

      if (signInResult.isSignedIn) {
        await checkAuthState(true);
        return { success: true };
      }

      if (
        signInResult.nextStep &&
        signInResult.nextStep.signInStep === "CONFIRM_SIGN_UP"
      ) {
        throw new Error("UserNotConfirmedException");
      }

      return { success: false, nextStep: signInResult.nextStep };
    };

    try {
      setAuthError(null);
      logger.info("AuthContext: About to call Amplify signIn");
      return await attemptSignIn();
    } catch (error) {
      // Stale session survived the checkAuthState cleanup — clear it and retry once
      if (error.name === "UserAlreadyAuthenticatedException") {
        logger.warn(
          "AuthContext: Stale session detected during signIn — signing out and retrying",
        );
        try {
          await signOut();
          return await attemptSignIn();
        } catch (retryError) {
          logger.error(
            "AuthContext: Sign-in retry after signOut failed:",
            retryError,
          );
          setAuthError(retryError.message);
          throw retryError;
        }
      }

      logger.error("AuthContext signIn error:", error);
      logger.error("Error name:", error.name);
      logger.error("Error message:", error.message);
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
      if (isAuthenticated && user?.attributes?.["custom:user_id"]) {
        try {
          const userId = user.attributes["custom:user_id"];
          const response = await getUserProfile(userId);
          setUserProfile(response.profile);
        } catch (error) {
          logger.error("❌ Error fetching user profile:", error);
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
        username: email,
      });

      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleConfirmResetPassword = async (
    email,
    confirmationCode,
    newPassword,
  ) => {
    try {
      setAuthError(null);

      await confirmResetPassword({
        username: email,
        confirmationCode,
        newPassword,
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
      throw new Error(
        "Resend functionality temporarily unavailable. Please try signing up again.",
      );
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      setAuthError(null);
      await signInWithRedirect({ provider: "Google" });
      // Browser redirects to Cognito Hosted UI -> Google -> callbackUrl.
      // On return, checkAuthState (called on mount) picks up the session.
    } catch (error) {
      logger.error("Google sign-in error:", error);
      setAuthError(error.message);
      throw error;
    }
  };

  // Returns an array of external provider names linked to this account (e.g. ['Google'])
  const getIdentityProviders = () => {
    if (!user?.attributes?.identities) return [];
    try {
      const identities = JSON.parse(user.attributes.identities);
      return identities.map((id) => id.providerName);
    } catch {
      return [];
    }
  };

  const getAuthHeaders = async (forceRefresh = false) => {
    try {
      const session = await fetchAuthSession({ forceRefresh });
      return {
        Authorization: `Bearer ${session.tokens.idToken.toString()}`,
      };
    } catch (error) {
      logger.error("Error getting auth headers:", error);
      return {};
    }
  };

  const identityProviders = getIdentityProviders();
  const isGoogleLinked = identityProviders.includes("Google");
  // A user has password auth if: they have no external identities (email-only),
  // or if they have a Cognito (native) identity alongside social ones.
  const hasPasswordAuth =
    identityProviders.length === 0 ||
    identityProviders.includes("Cognito") ||
    !user?.attributes?.identities;

  const value = {
    // State
    isAuthenticated,
    user,
    userProfile,
    loading,
    authError,

    // Actions
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendSignUpCode: handleResendSignUpCode,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    confirmResetPassword: handleConfirmResetPassword,
    checkAuthState,
    getAuthHeaders,

    // Identity provider helpers
    getIdentityProviders,
    isGoogleLinked,
    hasPasswordAuth,

    // Utilities
    clearError: () => setAuthError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
