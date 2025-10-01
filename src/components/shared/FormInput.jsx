import React, { forwardRef } from 'react';
import { inputPatterns, formPatterns } from '../../utils/uiPatterns';

const FormInput = forwardRef(({
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
  rows, // For textarea
  ...props
}, ref) => {
  const isTextarea = type === 'textarea';
  const InputComponent = isTextarea ? 'textarea' : 'input';

  const getInputPattern = () => {
    if (error) {
      return isTextarea ? inputPatterns.textareaError : inputPatterns.error;
    }
    return isTextarea ? inputPatterns.textarea : inputPatterns.standard;
  };

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
        <InputComponent
          ref={ref}
          type={isTextarea ? undefined : type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={isTextarea ? rows : undefined}
          className={`
            ${getInputPattern()}
            text-base
            hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50
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
      </div>
      {error && (
        <p className={formPatterns.errorText}>{error}</p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
