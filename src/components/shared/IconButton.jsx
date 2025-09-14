import React from 'react';
import { Tooltip } from 'react-tooltip';
import { iconButtonPatterns } from '../../utils/uiPatterns';

const IconButton = ({
  children,
  tooltip,
  tooltipPosition = 'bottom',
  onClick,
  disabled = false,
  className = '',
  variant = 'default',
  type = 'button',
  ...props
}) => {
  // Map old variants to new standardized iconButtonPatterns
  const getButtonClass = (variant) => {
    const variantMap = {
      // Legacy variant mappings
      'default': iconButtonPatterns.floating, // Keep floating style for existing usage
      'cyan': iconButtonPatterns.bordered,    // Cyan border style maps to bordered
      'active': iconButtonPatterns.solid,     // Active state maps to solid
      'small': iconButtonPatterns.softBg,     // Small maps to soft background

      // New standardized variants (direct mapping)
      'minimal': iconButtonPatterns.minimal,
      'softBg': iconButtonPatterns.softBg,
      'bordered': iconButtonPatterns.bordered,
      'solid': iconButtonPatterns.solid,
      'solidCyan': iconButtonPatterns.solidCyan,
      'floating': iconButtonPatterns.floating,
      'glow': iconButtonPatterns.glow
    };

    return variantMap[variant] || iconButtonPatterns.solid; // Default to solid
  };

  const baseClass = getButtonClass(variant);
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  const buttonClass = `${baseClass} ${disabledClass} ${className}`;

  // Generate unique ID for tooltip
  const tooltipId = tooltip ? `tooltip-${Math.random().toString(36).substr(2, 9)}` : undefined;

  return (
    <>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={buttonClass}
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltip}
        data-tooltip-place={tooltipPosition}
        {...props}
      >
        {children}
      </button>
      {tooltip && (
        <Tooltip
          id={tooltipId}
          offset={8}
          delayShow={0}
          style={{
            backgroundColor: '#000000',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'Rajdhani, sans-serif',
            padding: '8px 12px',
            zIndex: 99999,
            transform: 'translateX(-8px)'
          }}
          anchorSelect={`[data-tooltip-id="${tooltipId}"]`}
        />
      )}
    </>
  );
};

export default IconButton;
