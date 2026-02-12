import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthForm } from "../hooks/useAuthForm";
import { getErrorMessage, validateEmail } from "../utils/authHelpers";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import AuthErrorMessage from "./AuthErrorMessage";
import { logger } from "../../utils/logger";

const LoginForm = ({
  onSwitchToRegister,
  onSwitchToForgotPassword,
  onSwitchToVerification,
  showVerificationSuccess,
  showPasswordResetSuccess,
}) => {
  const { signIn, checkAuthState } = useAuth();
  const [globalError, setGlobalError] = useState("");
  const [showVerificationOption, setShowVerificationOption] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");

  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      logger.error("Unhandled promise rejection:", event.reason);
      if (event.reason && event.reason.name === "UserNotConfirmedException") {
        logger.info("Caught UserNotConfirmedException in global handler");
        setShowVerificationOption(true);
        setGlobalError(
          "Account not confirmed. Please verify your email address to continue."
        );
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  const {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateForm,
    setFieldError,
  } = useAuthForm({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setShowVerificationOption(false);
    setUnconfirmedEmail("");

    // Validate form
    const validationRules = {
      email: {
        required: true,
        email: true,
        label: "Email",
      },
      password: {
        required: true,
        label: "Password",
      },
    };

    if (!validateForm(validationRules)) {
      return;
    }

    // Additional email validation
    if (!validateEmail(formData.email)) {
      setFieldError("email", "Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      logger.info("About to call signIn with email:", formData.email.trim());
      const result = await signIn(formData.email.trim(), formData.password);
      logger.info("SignIn result:", result);
      logger.info("SignIn result type:", typeof result);
      logger.info("SignIn result keys:", Object.keys(result || {}));
      logger.info("SignIn result JSON:", JSON.stringify(result, null, 2));
      // Navigation will be handled by the AuthProvider state change
    } catch (error) {
      logger.error("LoginForm sign in error:", error);
      logger.error("LoginForm error name:", error.name);
      logger.error("LoginForm error message:", error.message);
      logger.error("LoginForm error __type:", error.__type);
      logger.error(
        "LoginForm full error object:",
        JSON.stringify(error, null, 2)
      );

      const errorMessage = getErrorMessage(error);

      // Handle specific error cases - check name, __type, and message
      if (
        error.name === "UserNotConfirmedException" ||
        error.__type === "UserNotConfirmedException" ||
        error.message === "UserNotConfirmedException"
      ) {
        logger.info(
          "UserNotConfirmedException detected, redirecting to verification with email:",
          formData.email.trim()
        );
        setUnconfirmedEmail(formData.email.trim());

        // Try automatic redirect first
        if (onSwitchToVerification) {
          onSwitchToVerification(formData.email.trim());
          return; // Don't show error, just redirect
        } else {
          logger.error("onSwitchToVerification callback not provided");
          setShowVerificationOption(true);
          setGlobalError(
            "Account not confirmed. Please verify your email address to continue."
          );
        }
      } else if (error.name === "IncompleteAccountSetupException") {
        logger.info("IncompleteAccountSetupException detected - showing user-friendly error");
        setGlobalError(error.userFriendlyMessage || error.message);
      } else if (error.name === "UserAlreadyAuthenticatedException") {
        logger.warn("🚨 State mismatch detected: Amplify says user is signed in, but AuthContext shows null");
        logger.info("🔄 Attempting to sync AuthContext state with Amplify...");

        try {
          // Try to update our AuthContext state to match Amplify's internal state
          await checkAuthState();
          logger.info("✅ Successfully synced AuthContext state with Amplify - should redirect now");
          // The AuthRouter will handle the redirect automatically once state is synced
          return;
        } catch (syncError) {
          logger.error("❌ Failed to sync AuthContext state:", syncError);
          logger.info("🔄 This indicates a deeper authentication issue...");
          setGlobalError("Authentication state error detected. Please sign out and sign in again, or refresh the page.");
          return;
        }
      } else if (error.name === "NotAuthorizedException") {
        setFieldError("password", "Incorrect email or password");
      } else if (error.name === "UserNotFoundException") {
        setFieldError("email", "No account found with this email");
      } else {
        // Check if the error message contains the UserNotConfirmedException text
        if (error.message && error.message.includes("User is not confirmed")) {
          logger.info(
            "UserNotConfirmedException detected via message, redirecting to verification"
          );
          setUnconfirmedEmail(formData.email.trim());
          setShowVerificationOption(true);
          setGlobalError(
            "Account not confirmed. Please verify your email address to continue."
          );
        } else {
          setGlobalError(errorMessage);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {showVerificationSuccess && (
          <div className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg">
            <p className="font-rajdhani text-synthwave-neon-cyan text-sm">
              Email verified! Your account has been successfully confirmed. You can now sign in with your credentials.
            </p>
          </div>
        )}

        {showPasswordResetSuccess && (
          <div className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg">
            <p className="font-rajdhani text-synthwave-neon-cyan text-sm">
              Password reset successful! Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
        )}

        {globalError && (
          <AuthErrorMessage
            error={globalError}
            className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg"
          />
        )}

        {showVerificationOption && (
          <div className="text-center p-4 bg-synthwave-neon-pink/10 rounded-lg border border-synthwave-neon-pink/30">
            <p className="font-rajdhani text-synthwave-text-secondary mb-3">
              Need to verify your email address?
            </p>
            <AuthButton
              type="button"
              variant="secondary"
              onClick={() =>
                onSwitchToVerification &&
                onSwitchToVerification(unconfirmedEmail)
              }
              disabled={isSubmitting}
            >
              Go to Email Verification
            </AuthButton>
          </div>
        )}

        <AuthInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email address"
          error={errors.email}
          required
          disabled={isSubmitting}
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Enter your password"
          error={errors.password}
          required
          disabled={isSubmitting}
        />

        <div className="space-y-4">
          <AuthButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Sign In
          </AuthButton>

          <AuthButton
            type="button"
            variant="link"
            onClick={onSwitchToForgotPassword}
            disabled={isSubmitting}
          >
            Forgot your password?
          </AuthButton>
        </div>

        <div className="text-center pt-4 border-t border-synthwave-neon-pink/20">
          <p className="font-rajdhani text-synthwave-text-secondary mb-3">
            Don't have an account?
          </p>
          <AuthButton
            type="button"
            variant="secondary"
            onClick={onSwitchToRegister}
            disabled={isSubmitting}
          >
            Create Account
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginForm;
