import React, { forwardRef, useEffect } from 'react';
import { inputPatterns, injectAutofillStyles } from '../../utils/uiPatterns';

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

  const getInputClassName = () => {
    const basePattern = error
      ? (isTextarea ? inputPatterns.textareaError : inputPatterns.error)
      : (isTextarea ? inputPatterns.textarea : inputPatterns.standard);

    return `${basePattern} focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-card/40 ${className}`;
  };

  const handleFocus = (e) => {
    e.target.style.outline = 'none';
    e.target.style.boxShadow = 'none';
  };

  // Inject autofill override styles on component mount
  useEffect(() => {
    injectAutofillStyles();
  }, []);

  return (
    <div className={error ? 'input-error' : ''}>
      {label && (
        <label
          htmlFor={name}
          className="block font-rajdhani text-lg text-synthwave-text-primary mb-2 font-medium uppercase tracking-wide"
        >
          {label} {required && <span className="text-synthwave-neon-pink">*</span>}
        </label>
      )}
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
        className={getInputClassName()}
        style={{
          boxShadow: 'none',
          outline: 'none'
        }}
        onFocus={handleFocus}
        {...props}
      />
      {error && (
        <p className="mt-2 text-red-400 font-rajdhani text-sm">{error}</p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
