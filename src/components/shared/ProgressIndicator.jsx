import React from 'react';

/**
 * Shared Progress Indicator Component
 *
 * Can be used for:
 * - Coach Creator session progress
 * - Conversation context window usage
 * - Any other progress tracking needs
 */
function ProgressIndicator({
  // Progress data
  current = 0,
  total = 100,
  percentage = null, // If provided, overrides calculated percentage

  // Labels and text
  label = "Progress",
  currentLabel = null, // e.g., "questions completed", "tokens used"
  remainingLabel = null, // e.g., "questions remaining", "tokens available"

  // Additional info
  subtitle = null, // e.g., "(beginner level)", "(approaching limit)"

  // Styling options
  color = "cyan", // cyan, pink, purple, green, orange
  size = "normal", // small, normal, large
  showPercentage = true,
  showRemaining = true,

  // Layout
  className = ""
}) {
  // Calculate percentage if not provided
  const calculatedPercentage = percentage !== null ? percentage : Math.min(100, Math.round((current / total) * 100));
  const remaining = Math.max(0, total - current);

  // Color variants
  const colorClasses = {
    cyan: {
      text: "text-synthwave-neon-cyan",
      bg: "from-synthwave-neon-cyan/60 to-synthwave-neon-cyan",
      border: "border-synthwave-neon-cyan/20",
      shadow: "shadow-synthwave-neon-cyan/10" // Reduced glow
    },
    pink: {
      text: "text-synthwave-neon-pink",
      bg: "from-synthwave-neon-pink/60 to-synthwave-neon-pink",
      border: "border-synthwave-neon-pink/20",
      shadow: "shadow-synthwave-neon-pink/10"
    },
    purple: {
      text: "text-synthwave-neon-purple",
      bg: "from-synthwave-neon-purple/60 to-synthwave-neon-purple",
      border: "border-synthwave-neon-purple/20",
      shadow: "shadow-synthwave-neon-purple/10"
    },
    green: {
      text: "text-green-400",
      bg: "from-green-400/60 to-green-400",
      border: "border-green-400/20",
      shadow: "shadow-green-400/10"
    },
    orange: {
      text: "text-orange-400",
      bg: "from-orange-400/60 to-orange-400",
      border: "border-orange-400/20",
      shadow: "shadow-orange-400/10"
    }
  };

  // Size variants
  const sizeClasses = {
    small: {
      container: "mb-2",
      text: "text-xs",
      percentage: "text-xs",
      bar: "h-1.5",
      spacing: "mb-1"
    },
    normal: {
      container: "mb-4",
      text: "text-sm",
      percentage: "text-sm",
      bar: "h-2",
      spacing: "mb-2"
    },
    large: {
      container: "mb-6",
      text: "text-base",
      percentage: "text-base",
      bar: "h-3",
      spacing: "mb-3"
    }
  };

  const colors = colorClasses[color] || colorClasses.cyan;
  const sizes = sizeClasses[size] || sizeClasses.normal;

  return (
    <div className={`${sizes.container} ${className}`}>
      <div className={`flex items-center justify-between ${sizes.spacing}`}>
        <span className={`font-rajdhani ${sizes.text} text-synthwave-text-secondary`}>
          {label}: {current} {currentLabel}
          {subtitle && (
            <span className="ml-2 text-xs text-synthwave-text-muted">
              {subtitle}
            </span>
          )}
        </span>
        {showPercentage && (
          <span className={`font-rajdhani ${sizes.percentage} ${colors.text} font-semibold`}>
            {calculatedPercentage}%
          </span>
        )}
      </div>

      <div className={`w-full bg-synthwave-bg-primary/50 rounded-full ${sizes.bar} border ${colors.border}`}>
        <div
          className={`bg-gradient-to-r ${colors.bg} h-full rounded-full transition-all duration-500 ${colors.shadow}`}
          style={{ width: `${calculatedPercentage}%` }}
        ></div>
      </div>

      {showRemaining && remainingLabel && remaining > 0 && (
        <p className={`font-rajdhani text-xs text-synthwave-text-muted mt-2 text-center`}>
          {remaining} {remainingLabel}
        </p>
      )}
    </div>
  );
}

export default ProgressIndicator;
