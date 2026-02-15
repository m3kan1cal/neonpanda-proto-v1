import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { inputPatterns, formPatterns } from '../../utils/ui/uiPatterns';
import TiptapEditor from './TiptapEditor';

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
  rows, // For textarea height estimation
  ...props
}, ref) => {
  const isTextarea = type === 'textarea';
  const editorRef = useRef(null);

  // Forward ref for both input and editor
  useImperativeHandle(ref, () => {
    if (isTextarea && editorRef.current) {
      return editorRef.current;
    }
    return ref?.current;
  });

  const getInputPattern = () => {
    if (error) {
      return isTextarea ? inputPatterns.textareaError : inputPatterns.error;
    }
    return isTextarea ? inputPatterns.textarea : inputPatterns.standard;
  };

  // Estimate min height from rows (approx 24px per row)
  const minHeight = isTextarea ? `${Math.max(60, (rows || 4) * 24)}px` : undefined;

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
        {isTextarea ? (
          <TiptapEditor
            ref={editorRef}
            content={value || ''}
            onUpdate={(html, text) => {
              if (onChange) {
                // Simulate a standard onChange event shape
                onChange({ target: { name, value: text } });
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            mode="plain"
            className={`
              ${getInputPattern()}
              text-base
              hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50
              disabled:cursor-not-allowed disabled:text-synthwave-text-muted disabled:border-synthwave-neon-pink/20
              ${className}
            `}
            minHeight={minHeight}
            maxHeight="300px"
          />
        ) : (
          <input
            ref={ref}
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
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
        )}
      </div>
      {error && (
        <p className={formPatterns.errorText}>{error}</p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
