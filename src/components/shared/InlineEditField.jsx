import React from "react";
import { Tooltip } from "react-tooltip";
import { useInlineEdit } from "../../hooks/useInlineEdit";
import { inputPatterns, inlineEditPatterns } from "../../utils/ui/uiPatterns";

// Icon components (inline to keep component self-contained)
const EditIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const SaveIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const CancelIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

/**
 * InlineEditField Component
 *
 * A reusable component for inline editing with consistent styling and behavior.
 * Follows modern UI/UX patterns used by Notion, Linear, GitHub, etc.
 *
 * @param {string} value - The current value to display
 * @param {Function} onSave - Async function called when saving (receives new value)
 * @param {Object} options - Configuration options
 * @param {string} options.placeholder - Placeholder text for input
 * @param {number} options.maxLength - Maximum character length
 * @param {boolean} options.showCharacterCount - Whether to show character counter
 * @param {Function} options.validate - Custom validation function
 * @param {string} options.size - Size variant: 'small' | 'medium' | 'large'
 * @param {string} options.displayClassName - Custom class for display mode text
 * @param {string} options.containerClassName - Custom class for display mode container (overrides internal padding/spacing)
 * @param {string} options.buttonClassName - Custom class for edit button (overrides size-based button styling)
 * @param {string} options.inputClassName - Custom class for input field
 * @param {boolean} options.disabled - Whether editing is disabled
 * @param {string} options.tooltipPrefix - Prefix for tooltip IDs (to avoid conflicts)
 * @param {Function} options.renderDisplay - Custom render function for display mode
 * @param {Function} options.onSuccess - Callback after successful save
 * @param {Function} options.onError - Callback on save error
 * @param {boolean} options.startInEditMode - Whether to start in edit mode immediately
 * @param {Function} options.onCancel - Callback when cancel is clicked
 */
export function InlineEditField({
  value,
  onSave,
  placeholder = "Enter value...",
  maxLength,
  showCharacterCount = false,
  validate,
  size = "medium",
  displayClassName = "",
  containerClassName = "",
  buttonClassName = "",
  inputClassName = "",
  disabled = false,
  tooltipPrefix = "inline-edit",
  renderDisplay,
  onSuccess,
  onError,
  startInEditMode = false,
  onCancel,
}) {
  const {
    isEditing,
    editValue,
    isSaving,
    error,
    isValid,
    characterCount,
    handleEdit,
    handleSave,
    handleCancel,
    handleKeyPress,
    handleChange,
  } = useInlineEdit(value, onSave, {
    maxLength,
    validate,
    onSuccess,
    onError,
    startInEditMode,
    onCancel,
  });

  // Size-based styling from uiPatterns
  const sizeStyles = {
    small: {
      input: inlineEditPatterns.inputSize.small,
      button: inlineEditPatterns.editButton.small,
      text: inlineEditPatterns.displayTextSize.small,
      editIcon: inlineEditPatterns.iconSize.edit.small,
      actionIcon: inlineEditPatterns.iconSize.action.small,
    },
    medium: {
      input: inlineEditPatterns.inputSize.medium,
      button: inlineEditPatterns.editButton.medium,
      text: inlineEditPatterns.displayTextSize.medium,
      editIcon: inlineEditPatterns.iconSize.edit.medium,
      actionIcon: inlineEditPatterns.iconSize.action.medium,
    },
    large: {
      input: inlineEditPatterns.inputSize.large,
      button: inlineEditPatterns.editButton.large,
      text: inlineEditPatterns.displayTextSize.large,
      editIcon: inlineEditPatterns.iconSize.edit.large,
      actionIcon: inlineEditPatterns.iconSize.action.large,
    },
  };

  const styles = sizeStyles[size] || sizeStyles.medium;

  // Tooltip IDs (unique per instance)
  const saveTooltipId = `${tooltipPrefix}-save-tooltip`;
  const cancelTooltipId = `${tooltipPrefix}-cancel-tooltip`;
  const editTooltipId = `${tooltipPrefix}-edit-tooltip`;

  // Display mode
  if (!isEditing) {
    return (
      <div
        className={containerClassName || inlineEditPatterns.displayContainer}
      >
        {renderDisplay ? (
          renderDisplay(value)
        ) : (
          <span className={displayClassName || `${styles.text} text-white`}>
            {value || (
              <span className="text-synthwave-text-secondary italic">
                No value set
              </span>
            )}
          </span>
        )}

        {!disabled && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className={buttonClassName || styles.button}
              data-tooltip-id={editTooltipId}
              data-tooltip-content="Edit"
              aria-label="Edit"
            >
              <EditIcon className={styles.editIcon} />
            </button>

            <Tooltip
              id={editTooltipId}
              place="top"
              offset={inlineEditPatterns.tooltip.offset.edit}
              delayShow={0}
              style={{
                ...inlineEditPatterns.tooltip.style,
                transform: inlineEditPatterns.tooltip.transform,
              }}
            />
          </>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div
      className="flex flex-col space-y-1 w-full"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className={inlineEditPatterns.editContainer}>
        <input
          type="text"
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          className={`${inputPatterns.inlineEdit} ${styles.input} ${inputClassName}`}
          placeholder={placeholder}
          autoFocus
          disabled={isSaving}
          maxLength={maxLength}
          aria-label="Edit field"
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          disabled={isSaving || !isValid}
          className={inlineEditPatterns.saveButton[size]}
          data-tooltip-id={saveTooltipId}
          data-tooltip-content="Save (Enter)"
          data-tooltip-place="bottom"
          aria-label="Save"
        >
          {isSaving ? (
            <div
              className={`${styles.actionIcon} flex items-center justify-center`}
            >
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <SaveIcon className={styles.actionIcon} />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
          disabled={isSaving}
          className={inlineEditPatterns.cancelButton[size]}
          data-tooltip-id={cancelTooltipId}
          data-tooltip-content="Cancel (Esc)"
          data-tooltip-place="bottom"
          aria-label="Cancel"
        >
          <CancelIcon className={styles.actionIcon} />
        </button>

        <Tooltip
          id={saveTooltipId}
          place="bottom"
          offset={inlineEditPatterns.tooltip.offset.action}
          delayShow={0}
          style={{
            ...inlineEditPatterns.tooltip.style,
            transform: inlineEditPatterns.tooltip.transform,
          }}
        />
        <Tooltip
          id={cancelTooltipId}
          place="bottom"
          offset={inlineEditPatterns.tooltip.offset.action}
          delayShow={0}
          style={{
            ...inlineEditPatterns.tooltip.style,
            transform: inlineEditPatterns.tooltip.transform,
          }}
        />
      </div>

      {/* Character count and error messages */}
      <div className="flex items-center justify-between text-xs font-rajdhani">
        {showCharacterCount && maxLength && (
          <span
            className={`${characterCount > maxLength * 0.9 ? "text-synthwave-neon-pink" : "text-synthwave-text-secondary"}`}
          >
            {characterCount}/{maxLength} characters
          </span>
        )}

        {error && <span className="text-synthwave-neon-pink">{error}</span>}
      </div>
    </div>
  );
}

export default InlineEditField;
