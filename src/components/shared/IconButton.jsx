import React from 'react';
import SimpleTooltip from './SimpleTooltip';

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
  // Define button style variants
  const variants = {
    // Default floating menu style (pink)
    default: "p-3 rounded-xl transition-all duration-200 backdrop-blur-sm border bg-synthwave-bg-card/40 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 hover:border-synthwave-neon-pink/50 hover:shadow-md focus:outline-none focus:ring-0 focus:border-synthwave-neon-pink/50 focus:bg-synthwave-neon-pink/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center",

    // Cyan variant
    cyan: "p-3 rounded-xl transition-all duration-200 backdrop-blur-sm border bg-synthwave-bg-card/40 border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/50 hover:shadow-md focus:outline-none focus:ring-0 focus:border-synthwave-neon-cyan/50 focus:bg-synthwave-neon-cyan/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center",

    // Active state (for floating menu)
    active: "p-3 rounded-xl transition-all duration-200 backdrop-blur-sm border bg-synthwave-neon-pink/20 border-synthwave-neon-pink text-synthwave-neon-pink shadow-lg shadow-synthwave-neon-pink/30 focus:outline-none focus:ring-0 focus:border-synthwave-neon-pink focus:shadow-lg focus:shadow-synthwave-neon-pink/30 flex items-center justify-center",

    // Small variant (for compact spaces)
    small: "p-2 rounded-lg transition-all duration-200 backdrop-blur-sm border bg-synthwave-bg-card/40 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 hover:border-synthwave-neon-pink/50 hover:shadow-md focus:outline-none focus:ring-0 focus:border-synthwave-neon-pink/50 focus:bg-synthwave-neon-pink/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
  };

  const buttonClass = `${variants[variant]} ${className}`;

  const ButtonComponent = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClass}
      {...props}
    >
      {children}
    </button>
  );

  // If tooltip is provided, wrap with SimpleTooltip component
  if (tooltip) {
    return (
      <SimpleTooltip text={tooltip} position={tooltipPosition}>
        {ButtonComponent}
      </SimpleTooltip>
    );
  }

  // Otherwise return plain button
  return ButtonComponent;
};

export default IconButton;
