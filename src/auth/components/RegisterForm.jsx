import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { getErrorMessage, validateEmail, validatePassword, validateUsername, validateName } from '../utils/authHelpers';
import { formPatterns } from '../../utils/ui/uiPatterns';
import { checkUserAvailability } from '../../utils/apis/userApi';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthButton from './AuthButton';
import AuthErrorMessage from './AuthErrorMessage';
import { logger } from "../../utils/logger";

const RegisterForm = ({ onSwitchToLogin, onRegistrationSuccess }) => {
  const { signUp } = useAuth();
  const [globalError, setGlobalError] = useState('');

  // Availability checking state
  const [emailAvailability, setEmailAvailability] = useState({ status: 'idle', available: null }); // idle, checking, available, taken
  const [usernameAvailability, setUsernameAvailability] = useState({ status: 'idle', available: null });

  // Debounce timers
  const emailCheckTimer = useRef(null);
  const usernameCheckTimer = useRef(null);

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

  // Check email availability with debounce
  const checkEmailAvailability = async (email) => {
    if (!email || !validateEmail(email)) {
      setEmailAvailability({ status: 'idle', available: null });
      return;
    }

    setEmailAvailability({ status: 'checking', available: null });

    try {
      const response = await checkUserAvailability('email', email);

      setEmailAvailability({
        status: response.available ? 'available' : 'taken',
        available: response.available
      });
    } catch (error) {
      logger.error('Error checking email availability:', error);
      setEmailAvailability({ status: 'idle', available: null });
    }
  };

  // Check username availability with debounce
  const checkUsernameAvailability = async (username) => {
    const usernameError = validateUsername(username);
    if (!username || usernameError) {
      setUsernameAvailability({ status: 'idle', available: null });
      return;
    }

    setUsernameAvailability({ status: 'checking', available: null });

    try {
      const response = await checkUserAvailability('username', username);

      setUsernameAvailability({
        status: response.available ? 'available' : 'taken',
        available: response.available
      });
    } catch (error) {
      logger.error('Error checking username availability:', error);
      setUsernameAvailability({ status: 'idle', available: null });
    }
  };

  // Effect for email checking with debounce
  useEffect(() => {
    if (emailCheckTimer.current) {
      clearTimeout(emailCheckTimer.current);
    }

    if (formData.email) {
      emailCheckTimer.current = setTimeout(() => {
        checkEmailAvailability(formData.email);
      }, 500);
    } else {
      setEmailAvailability({ status: 'idle', available: null });
    }

    return () => {
      if (emailCheckTimer.current) {
        clearTimeout(emailCheckTimer.current);
      }
    };
  }, [formData.email]);

  // Effect for username checking with debounce
  useEffect(() => {
    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }

    if (formData.username) {
      usernameCheckTimer.current = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);
    } else {
      setUsernameAvailability({ status: 'idle', available: null });
    }

    return () => {
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }
    };
  }, [formData.username]);

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
      logger.error('Sign up error:', error);
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

        <div>
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
          {/* Email Availability Indicator */}
          {emailAvailability.status !== 'idle' && (
            <div className={formPatterns.availabilityContainer}>
              <span className={formPatterns.availabilityIcon}>
                {emailAvailability.status === 'checking' && (
                  <svg className="animate-spin h-4 w-4 text-synthwave-text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {emailAvailability.status === 'available' && (
                  <svg className="h-4 w-4 text-synthwave-neon-cyan" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {emailAvailability.status === 'taken' && (
                  <svg className="h-4 w-4 text-synthwave-neon-pink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className={
                emailAvailability.status === 'checking' ? formPatterns.availabilityChecking :
                emailAvailability.status === 'available' ? formPatterns.availabilityAvailable :
                formPatterns.availabilityTaken
              }>
                {emailAvailability.status === 'checking' && 'Checking availability...'}
                {emailAvailability.status === 'available' && 'Email available'}
                {emailAvailability.status === 'taken' && 'Email already registered'}
              </span>
            </div>
          )}
        </div>

        <div>
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
          {/* Username Availability Indicator */}
          {usernameAvailability.status !== 'idle' && (
            <div className={formPatterns.availabilityContainer}>
              <span className={formPatterns.availabilityIcon}>
                {usernameAvailability.status === 'checking' && (
                  <svg className="animate-spin h-4 w-4 text-synthwave-text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {usernameAvailability.status === 'available' && (
                  <svg className="h-4 w-4 text-synthwave-neon-cyan" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {usernameAvailability.status === 'taken' && (
                  <svg className="h-4 w-4 text-synthwave-neon-pink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className={
                usernameAvailability.status === 'checking' ? formPatterns.availabilityChecking :
                usernameAvailability.status === 'available' ? formPatterns.availabilityAvailable :
                formPatterns.availabilityTaken
              }>
                {usernameAvailability.status === 'checking' && 'Checking availability...'}
                {usernameAvailability.status === 'available' && 'Username available'}
                {usernameAvailability.status === 'taken' && 'Username already taken'}
              </span>
            </div>
          )}
        </div>

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
        <div className="text-sm font-rajdhani text-synthwave-neon-cyan space-y-1">
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
            disabled={
              isSubmitting ||
              emailAvailability.status === 'checking' ||
              emailAvailability.status === 'taken' ||
              usernameAvailability.status === 'checking' ||
              usernameAvailability.status === 'taken'
            }
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
