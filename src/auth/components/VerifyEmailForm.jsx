import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { getErrorMessage, validateConfirmationCode } from '../utils/authHelpers';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import AuthErrorMessage from './AuthErrorMessage';

const VerifyEmailForm = ({ email, onVerificationSuccess, onSwitchToLogin }) => {
  const { confirmSignUp, resendSignUpCode } = useAuth();
  const [globalError, setGlobalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  const {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateForm,
    setFieldError
  } = useAuthForm({
    confirmationCode: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setSuccessMessage('');

    // Validate form
    const validationRules = {
      confirmationCode: {
        required: true,
        label: 'Confirmation Code'
      }
    };

    if (!validateForm(validationRules)) {
      return;
    }

    // Additional validation
    const codeError = validateConfirmationCode(formData.confirmationCode);
    if (codeError) {
      setFieldError('confirmationCode', codeError);
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmSignUp(email, formData.confirmationCode.trim());
      onVerificationSuccess();

    } catch (error) {
      console.error('Confirmation error:', error);
      const errorMessage = getErrorMessage(error);

      // Handle specific error cases
      if (error.name === 'CodeMismatchException') {
        setFieldError('confirmationCode', 'Invalid confirmation code. Please check and try again.');
      } else if (error.name === 'ExpiredCodeException') {
        setGlobalError('Confirmation code has expired. Please request a new one.');
      } else if (error.name === 'UserAlreadyConfirmedException') {
        setGlobalError('This account has already been confirmed. You can sign in now.');
      } else {
        setGlobalError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setGlobalError('');
    setSuccessMessage('');

    try {
      await resendSignUpCode(email);
      setSuccessMessage('A new confirmation code has been sent to your email.');
    } catch (error) {
      console.error('Resend code error:', error);
      const errorMessage = getErrorMessage(error);

      // Handle specific error cases
      if (error.name === 'UserAlreadyConfirmedException') {
        setGlobalError('This account has already been confirmed. You can sign in now.');
      } else if (error.name === 'LimitExceededException') {
        setGlobalError('Too many requests. Please wait before requesting another code.');
      } else {
        setGlobalError(errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-rajdhani font-bold text-2xl text-white mb-4 uppercase">
            Verify Email
          </h1>
          <p className="font-rajdhani text-synthwave-text-secondary mb-2">
            Check your email for a 6-digit confirmation code. We sent it to:{' '}
            <span className="font-semibold text-synthwave-neon-cyan">{email}</span>
          </p>
        </div>

        {globalError && (
          <AuthErrorMessage error={globalError} className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg" />
        )}

        {successMessage && (
          <div className="text-center p-3 bg-synthwave-neon-pink/10 rounded-lg">
            <p className="font-rajdhani text-synthwave-neon-pink text-sm">
              {successMessage}
            </p>
          </div>
        )}

        <AuthInput
          label="Confirmation Code"
          name="confirmationCode"
          type="text"
          value={formData.confirmationCode}
          onChange={handleInputChange}
          placeholder="Enter the 6-digit code"
          error={errors.confirmationCode}
          required
          disabled={isSubmitting}
          maxLength={6}
        />

        <div className="space-y-4">
          <AuthButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Verify Email
          </AuthButton>

          <AuthButton
            type="button"
            variant="link"
            onClick={handleResendCode}
            disabled={isSubmitting || isResending}
            loading={isResending}
          >
            Didn't receive the code? Resend
          </AuthButton>
        </div>

        <div className="text-center pt-4 border-t border-synthwave-neon-pink/20">
          <p className="font-rajdhani text-synthwave-text-secondary mb-3">
            Wrong email address?
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

export default VerifyEmailForm;
