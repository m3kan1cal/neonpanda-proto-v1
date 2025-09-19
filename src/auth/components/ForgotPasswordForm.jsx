import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { getErrorMessage, validateEmail } from '../utils/authHelpers';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import AuthErrorMessage from './AuthErrorMessage';

const ForgotPasswordForm = ({ onSwitchToLogin, onResetCodeSent }) => {
  const { resetPassword } = useAuth();
  const [globalError, setGlobalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  const {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateForm,
    setFieldError
  } = useAuthForm({
    email: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setSuccessMessage('');

    // Validate form
    const validationRules = {
      email: {
        required: true,
        email: true,
        label: 'Email'
      }
    };

    if (!validateForm(validationRules)) {
      return;
    }

    // Additional email validation
    if (!validateEmail(formData.email)) {
      setFieldError('email', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(formData.email.trim());

      setSuccessMessage('Password reset code sent! Check your email for instructions.');
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
      console.error('Reset password error:', error);
      const errorMessage = getErrorMessage(error);

      // Handle specific error cases
      if (error.name === 'UserNotFoundException') {
        setFieldError('email', 'No account found with this email address');
      } else if (error.name === 'LimitExceededException') {
        setGlobalError('Too many requests. Please wait before trying again.');
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
          <h1 className="font-rajdhani font-bold text-2xl text-white mb-4 uppercase">
            Forgot Password
          </h1>
          <p className="font-rajdhani text-synthwave-text-secondary">
            Enter the email address associated with your account and we'll send you a code to reset your password.
          </p>
        </div>

        {globalError && (
          <AuthErrorMessage error={globalError} className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg" />
        )}

        {successMessage && (
          <div className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg">
            <p className="font-rajdhani text-synthwave-neon-cyan text-sm">
              {successMessage}
            </p>
            {countdown > 0 && (
              <p className="font-rajdhani text-synthwave-neon-cyan text-sm mt-2 opacity-80">
                Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
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

        <div className="text-center pt-4 border-t border-synthwave-neon-pink/20">
          <p className="font-rajdhani text-synthwave-text-secondary mb-3">
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
