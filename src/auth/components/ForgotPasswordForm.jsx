import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAuthForm } from "../hooks/useAuthForm";
import { getErrorMessage, validateEmail } from "../utils/authHelpers";
import AuthLayout from "./AuthLayout";
import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import AuthErrorMessage from "./AuthErrorMessage";
import { logger } from "../../utils/logger";

const ForgotPasswordForm = ({ onSwitchToLogin, onResetCodeSent }) => {
  const { resetPassword } = useAuth();
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

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
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setSuccessMessage("");

    // Validate form
    const validationRules = {
      email: {
        required: true,
        email: true,
        label: "Email",
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
      await resetPassword(formData.email.trim());

      setSuccessMessage(
        "Password reset code sent! Check your email for instructions.",
      );
      setCountdown(4);

      // Start countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            onResetCodeSent(formData.email.trim());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      logger.error("Reset password error:", error);
      const errorMessage = getErrorMessage(error);

      // Handle specific error cases
      if (error.name === "UserNotFoundException") {
        setFieldError("email", "No account found with this email address");
      } else if (error.name === "InvalidParameterException") {
        // Cognito returns this when the user has no password (e.g. Google-only account)
        setGlobalError(
          "This account uses Google sign-in and does not have a password. " +
            "Please sign in with Google instead, or set a password in Settings.",
        );
      } else if (error.name === "LimitExceededException") {
        setGlobalError("Too many requests. Please wait before trying again.");
      } else {
        setGlobalError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="font-body text-sm font-semibold uppercase tracking-widest text-synthwave-text-muted mb-3">
            Forgot Password
          </p>
          <p className="font-body text-synthwave-text-secondary">
            Enter the email address associated with your account and we'll send
            you a code to reset your password.
          </p>
        </div>

        {globalError && (
          <AuthErrorMessage
            error={globalError}
            className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-xl"
          />
        )}

        {successMessage && (
          <div className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-xl">
            <p className="font-body text-synthwave-neon-cyan text-sm">
              {successMessage}
            </p>
            {countdown > 0 && (
              <p className="font-body text-synthwave-neon-cyan text-sm mt-2 opacity-80">
                Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
              </p>
            )}
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

        <div className="space-y-4">
          <AuthButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || successMessage}
          >
            Send Reset Code
          </AuthButton>
        </div>

        <div className="text-center pt-1">
          <div className="h-px bg-gradient-to-r from-transparent via-synthwave-neon-cyan/25 to-transparent mb-4" />
          <p className="font-body text-synthwave-text-secondary mb-3">
            Remember your password?
          </p>
          <AuthButton
            type="button"
            variant="secondary"
            onClick={onSwitchToLogin}
            disabled={isSubmitting}
          >
            Back to Sign In
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordForm;
