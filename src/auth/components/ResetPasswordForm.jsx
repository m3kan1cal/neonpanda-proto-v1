import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { getErrorMessage, validatePassword, validateConfirmationCode } from '../utils/authHelpers';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import AuthErrorMessage from './AuthErrorMessage';
import { logger } from "../../utils/logger";

const ResetPasswordForm = ({ email, onResetSuccess, onSwitchToLogin }) => {
  const { confirmResetPassword } = useAuth();
  const [globalError, setGlobalError] = useState('');

  const {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateForm,
    setFieldError
  } = useAuthForm({
    confirmationCode: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');

    // Validate form
    const validationRules = {
      confirmationCode: {
        required: true,
        label: 'Confirmation Code'
      },
      newPassword: {
        required: true,
        password: true,
        label: 'New Password'
      },
      confirmPassword: {
        required: true,
        confirmPassword: true,
        originalPassword: formData.newPassword,
        label: 'Confirm Password'
      }
    };

    if (!validateForm(validationRules)) {
      return;
    }

    // Additional validations
    const codeError = validateConfirmationCode(formData.confirmationCode);
    const passwordErrors = validatePassword(formData.newPassword);
    const confirmPasswordError = formData.newPassword !== formData.confirmPassword ? 'Passwords do not match' : null;

    if (codeError) setFieldError('confirmationCode', codeError);
    if (passwordErrors.length > 0) setFieldError('newPassword', passwordErrors[0]);
    if (confirmPasswordError) setFieldError('confirmPassword', confirmPasswordError);

    if (codeError || passwordErrors.length > 0 || confirmPasswordError) {
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmResetPassword(
        email,
        formData.confirmationCode.trim(),
        formData.newPassword
      );

      onResetSuccess();

    } catch (error) {
      logger.error('Confirm reset password error:', error);
      const errorMessage = getErrorMessage(error);

      // Handle specific error cases
      if (error.name === 'CodeMismatchException') {
        setFieldError('confirmationCode', 'Invalid confirmation code. Please check and try again.');
      } else if (error.name === 'ExpiredCodeException') {
        setGlobalError('Confirmation code has expired. Please request a new password reset.');
      } else if (error.name === 'InvalidPasswordException') {
        setFieldError('newPassword', 'Password does not meet security requirements');
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
        {/* Header moved into form */}
        <div className="text-center mb-6">
          <h1 className="font-rajdhani font-bold text-2xl text-white mb-4 uppercase">
            Reset Password
          </h1>
          <p className="font-rajdhani text-synthwave-text-secondary">
            Enter the confirmation code sent to:
          </p>
          <p className="font-rajdhani font-semibold text-synthwave-neon-cyan mt-1">
            {email}
          </p>
        </div>

        {globalError && (
          <AuthErrorMessage error={globalError} className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg" />
        )}

        <AuthInput
          label="Confirmation Code"
          name="confirmationCode"
          type="text"
          value={formData.confirmationCode}
          onChange={handleInputChange}
          placeholder="Enter the code from your email"
          error={errors.confirmationCode}
          required
          disabled={isSubmitting}
          maxLength={6}
        />

        <AuthInput
          label="New Password"
          name="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={handleInputChange}
          placeholder="Enter your new password"
          error={errors.newPassword}
          required
          disabled={isSubmitting}
        />

        <AuthInput
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirm your new password"
          error={errors.confirmPassword}
          required
          disabled={isSubmitting}
        />

        {/* Password Requirements */}
        <div className="text-xs font-rajdhani text-synthwave-neon-cyan space-y-1">
          <p className="font-medium text-synthwave-neon-cyan">Password must contain:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </div>

        <div className="space-y-4">
          <AuthButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Reset Password
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

export default ResetPasswordForm;
