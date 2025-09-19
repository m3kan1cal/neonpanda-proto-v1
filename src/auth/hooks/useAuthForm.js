import { useState } from 'react';

export const useAuthForm = (initialValues = {}) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateField = (name, value, rules = {}) => {
    const fieldErrors = [];

    if (rules.required && !value?.trim()) {
      fieldErrors.push(`${rules.label || name} is required`);
    }

    if (rules.email && value && !isValidEmail(value)) {
      fieldErrors.push('Please enter a valid email address');
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      fieldErrors.push(`${rules.label || name} must be at least ${rules.minLength} characters`);
    }

    if (rules.password && value) {
      const passwordErrors = validatePassword(value);
      fieldErrors.push(...passwordErrors);
    }

    if (rules.confirmPassword && value && rules.originalPassword && value !== rules.originalPassword) {
      fieldErrors.push('Passwords do not match');
    }

    return fieldErrors;
  };

  const validateForm = (validationRules) => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const fieldValue = formData[fieldName];
      const fieldRules = validationRules[fieldName];
      const fieldErrors = validateField(fieldName, fieldValue, fieldRules);

      if (fieldErrors.length > 0) {
        newErrors[fieldName] = fieldErrors[0]; // Show first error
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const resetForm = (newInitialValues = {}) => {
    setFormData(newInitialValues);
    setErrors({});
    setIsSubmitting(false);
  };

  const setFieldError = (fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const clearErrors = () => {
    setErrors({});
  };

  return {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateForm,
    resetForm,
    setFieldError,
    clearErrors,
    setFormData
  };
};

// Validation utilities
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};
