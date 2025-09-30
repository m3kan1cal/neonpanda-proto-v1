import React, { forwardRef, useState } from 'react';
import AuthErrorMessage from './AuthErrorMessage';
import { inputPatterns, formPatterns } from '../../utils/uiPatterns';

const AuthInput = forwardRef(({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Eye icon SVG components
  const EyeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {/* Complete eye shape */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      {/* Diagonal line through the eye */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
  );

  return (
    <div className="mb-6">
      {label && (
        <label
          htmlFor={name}
          className={formPatterns.label}
        >
          {label} {required && <span className="text-synthwave-neon-pink">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            auth-input
            ${error ? inputPatterns.error : inputPatterns.standard}
            ${isPasswordField ? 'pr-12' : ''}
            text-base
            hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-card/40
            disabled:cursor-not-allowed disabled:text-synthwave-text-muted disabled:border-synthwave-neon-pink/20
            focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
            ${className}
          `}
          style={{
            boxShadow: 'none',
            outline: 'none',
            pointerEvents: 'auto'
          }}
          onFocus={(e) => {
            e.target.style.outline = 'none';
            e.target.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            // Workaround for autofill overlay: Force focus before click completes
            setTimeout(() => {
              e.target.focus();
            }, 0);
          }}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-200 focus:outline-none"
            disabled={disabled}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      <AuthErrorMessage error={error} />
    </div>
  );
});

AuthInput.displayName = 'AuthInput';

export default AuthInput;
