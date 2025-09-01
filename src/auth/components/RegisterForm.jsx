import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { getErrorMessage, validateEmail, validatePassword, validateUsername, validateName } from '../utils/authHelpers';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import AuthErrorMessage from './AuthErrorMessage';

const RegisterForm = ({ onSwitchToLogin, onRegistrationSuccess }) => {
  const { signUp } = useAuth();
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
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');

    // Validate form
    const validationRules = {
      email: {
        required: true,
        email: true,
        label: 'Email'
      },
      username: {
        required: true,
        label: 'Username'
      },
      firstName: {
        required: false,
        label: 'First Name'
      },
      lastName: {
        required: false,
        label: 'Last Name'
      },
      password: {
        required: true,
        password: true,
        label: 'Password'
      },
      confirmPassword: {
        required: true,
        confirmPassword: true,
        originalPassword: formData.password,
        label: 'Confirm Password'
      }
    };

    if (!validateForm(validationRules)) {
      return;
    }

    // Additional validations
    const emailError = !validateEmail(formData.email) ? 'Please enter a valid email address' : null;
    const usernameError = validateUsername(formData.username);
    const firstNameError = formData.firstName ? validateName(formData.firstName, 'First name') : null;
    const lastNameError = formData.lastName ? validateName(formData.lastName, 'Last name') : null;
    const passwordErrors = validatePassword(formData.password);
    const confirmPasswordError = formData.password !== formData.confirmPassword ? 'Passwords do not match' : null;

    if (emailError) setFieldError('email', emailError);
    if (usernameError) setFieldError('username', usernameError);
    if (firstNameError) setFieldError('firstName', firstNameError);
    if (lastNameError) setFieldError('lastName', lastNameError);
    if (passwordErrors.length > 0) setFieldError('password', passwordErrors[0]);
    if (confirmPasswordError) setFieldError('confirmPassword', confirmPasswordError);

    if (emailError || usernameError || firstNameError || lastNameError || passwordErrors.length > 0 || confirmPasswordError) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp(
        formData.email.trim(),
        formData.password,
        formData.username.trim(),
        formData.firstName.trim(),
        formData.lastName.trim()
      );

      // Call success callback with email for verification form
      onRegistrationSuccess(formData.email.trim());

    } catch (error) {
      console.error('Sign up error:', error);
      const errorMessage = getErrorMessage(error);

      // Handle specific error cases
      if (error.name === 'UsernameExistsException' || error.name === 'AliasExistsException') {
        setFieldError('email', 'An account with this email already exists');
      } else if (error.name === 'InvalidPasswordException') {
        setFieldError('password', 'Password does not meet security requirements');
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
            Create Account
          </h1>
        </div>

        {globalError && (
          <AuthErrorMessage error={globalError} className="text-center p-3 bg-synthwave-neon-cyan/10 rounded-lg" />
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
          label="Username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleInputChange}
          placeholder="Choose a username (e.g., fitness_warrior)"
          error={errors.username}
          required
          disabled={isSubmitting}
        />

        <AuthInput
          label="First Name"
          name="firstName"
          type="text"
          value={formData.firstName}
          onChange={handleInputChange}
          placeholder="Your first name"
          error={errors.firstName}
          disabled={isSubmitting}
        />

        <AuthInput
          label="Last Name"
          name="lastName"
          type="text"
          value={formData.lastName}
          onChange={handleInputChange}
          placeholder="Your last name"
          error={errors.lastName}
          disabled={isSubmitting}
        />

        <AuthInput
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Create a secure password"
          error={errors.password}
          required
          disabled={isSubmitting}
        />

        <AuthInput
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirm your password"
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
            Create Account
          </AuthButton>
        </div>

        <div className="text-center pt-4 border-t border-synthwave-neon-pink/20">
          <p className="font-rajdhani text-synthwave-text-secondary mb-3">
            Already have an account?
          </p>
          <AuthButton
            type="button"
            variant="secondary"
            onClick={onSwitchToLogin}
            disabled={isSubmitting}
          >
            Sign In
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  );
};

export default RegisterForm;
