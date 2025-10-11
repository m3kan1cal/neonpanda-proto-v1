import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for inline editing functionality
 * Provides consistent state management and handlers for inline editing across the app
 *
 * @param {string} initialValue - The initial value to display/edit
 * @param {Function} onSave - Async function called when saving (receives trimmed value)
 * @param {Object} options - Configuration options
 * @param {number} options.maxLength - Maximum character length (optional)
 * @param {Function} options.validate - Custom validation function (optional)
 * @param {boolean} options.trimOnSave - Whether to trim whitespace on save (default: true)
 * @param {Function} options.onCancel - Callback when edit is cancelled (optional)
 * @param {Function} options.onEditStart - Callback when edit mode starts (optional)
 * @param {Function} options.onSuccess - Callback after successful save (optional)
 * @param {Function} options.onError - Callback on save error (optional)
 *
 * @returns {Object} - State and handlers for inline editing
 */
export function useInlineEdit(initialValue, onSave, options = {}) {
  const {
    maxLength,
    validate,
    trimOnSave = true,
    onCancel,
    onEditStart,
    onSuccess,
    onError,
  } = options;

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const previousValueRef = useRef(initialValue);

  // Update previous value when initialValue changes
  useEffect(() => {
    previousValueRef.current = initialValue;
  }, [initialValue]);

  /**
   * Start editing mode
   */
  const handleEdit = useCallback(() => {
    setEditValue(initialValue || '');
    setIsEditing(true);
    setError(null);

    if (onEditStart) {
      onEditStart();
    }
  }, [initialValue, onEditStart]);

  /**
   * Cancel editing and revert changes
   */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
    setError(null);

    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  /**
   * Save the edited value
   */
  const handleSave = useCallback(async () => {
    // Get the value to save
    const valueToSave = trimOnSave ? editValue.trim() : editValue;

    // Validation: empty check
    if (!valueToSave) {
      setError('Value cannot be empty');
      return;
    }

    // Validation: max length check
    if (maxLength && valueToSave.length > maxLength) {
      setError(`Value cannot exceed ${maxLength} characters`);
      return;
    }

    // Validation: custom validator
    if (validate) {
      const validationError = validate(valueToSave);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Check if value actually changed
    if (valueToSave === previousValueRef.current) {
      setIsEditing(false);
      setEditValue('');
      return;
    }

    // Save
    setIsSaving(true);
    setError(null);

    try {
      await onSave(valueToSave);

      // Success
      setIsEditing(false);
      setEditValue('');
      previousValueRef.current = valueToSave;

      if (onSuccess) {
        onSuccess(valueToSave);
      }
    } catch (err) {
      console.error('Error saving inline edit:', err);
      setError(err.message || 'Failed to save');

      if (onError) {
        onError(err);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editValue, trimOnSave, maxLength, validate, onSave, onSuccess, onError]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((event) => {
    const newValue = event.target.value;

    // Enforce max length during typing
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    setEditValue(newValue);
    setError(null);
  }, [maxLength]);

  return {
    // State
    isEditing,
    editValue,
    isSaving,
    error,

    // Computed values
    isValid: editValue.trim().length > 0 && (!maxLength || editValue.length <= maxLength),
    hasChanged: editValue.trim() !== previousValueRef.current,
    characterCount: editValue.length,

    // Handlers
    handleEdit,
    handleSave,
    handleCancel,
    handleKeyPress,
    handleChange,
    setEditValue,
  };
}

export default useInlineEdit;
