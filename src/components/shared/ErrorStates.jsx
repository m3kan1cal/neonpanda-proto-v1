import React from 'react';
import { themeClasses } from '../../utils/synthwaveThemeClasses';

// Standardized loading spinner component
export const LoadingSpinner = ({ size = 'large', text = 'Loading...' }) => {
  const spinnerSize = size === 'large' ? 'h-12 w-12' : size === 'medium' ? 'h-8 w-8' : 'h-4 w-4';
  const textSize = size === 'large' ? 'text-base' : size === 'medium' ? 'text-base' : 'text-sm';

  return (
    <div className="text-center">
      <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 border-synthwave-neon-cyan mx-auto mb-4`}></div>
      <p className={`text-synthwave-text-secondary font-rajdhani ${textSize}`}>
        {text}
      </p>
    </div>
  );
};

// Standardized full-screen loading state
export const FullPageLoader = ({ text = 'Loading...' }) => (
  <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
    <LoadingSpinner size="large" text={text} />
  </div>
);

// Standardized error state component
export const ErrorState = ({
  title = 'Error',
  message = 'Something went wrong',
  buttonText = 'Go Back',
  onButtonClick,
  variant = 'error' // 'error', 'warning', 'info'
}) => {
  const getColorClass = () => {
    switch (variant) {
      case 'warning':
        return 'text-synthwave-neon-orange';
      case 'info':
        return 'text-synthwave-neon-cyan';
      case 'error':
      default:
        return 'text-synthwave-neon-pink';
    }
  };

  return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-4xl mx-auto px-8 py-12 text-center">
        <h1 className={`font-russo font-black text-3xl text-white mb-6 uppercase tracking-wide`}>
          {title}
        </h1>
        <p className={`font-rajdhani text-lg ${getColorClass()} mb-8 leading-relaxed`}>
          {message}
        </p>
        {onButtonClick && (
          <button
            onClick={onButtonClick}
            className={`${themeClasses.neonButton} text-lg px-8 py-3`}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

// Standardized centered error state (for smaller areas)
export const CenteredErrorState = ({
  title = 'Error',
  message = 'Something went wrong',
  buttonText = 'Go Back',
  onButtonClick,
  variant = 'error'
}) => {
  const getColorClass = () => {
    switch (variant) {
      case 'warning':
        return 'text-synthwave-neon-orange';
      case 'info':
        return 'text-synthwave-neon-cyan';
      case 'error':
      default:
        return 'text-synthwave-neon-pink';
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center`}>
      <div className="text-center max-w-lg mx-auto px-6">
        <div className="mb-6">
          <div className={`font-russo text-2xl ${getColorClass()} mb-4 uppercase tracking-wide`}>
            {title}
          </div>
          <p className="text-synthwave-text-secondary font-rajdhani text-lg leading-relaxed">
            {message}
          </p>
        </div>
        {onButtonClick && (
          <button
            onClick={onButtonClick}
            className={`${themeClasses.neonButton} px-6 py-3`}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

// Inline error component for smaller sections
export const InlineError = ({
  title = 'Error',
  message = 'Something went wrong',
  variant = 'error',
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const getColorClass = () => {
    switch (variant) {
      case 'warning':
        return 'text-synthwave-neon-orange';
      case 'info':
        return 'text-synthwave-neon-cyan';
      case 'error':
      default:
        return 'text-synthwave-neon-pink';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'py-4',
          title: 'text-sm',
          message: 'text-xs'
        };
      case 'large':
        return {
          container: 'py-8',
          title: 'text-lg',
          message: 'text-base'
        };
      case 'medium':
      default:
        return {
          container: 'py-6',
          title: 'text-base',
          message: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`text-center ${sizeClasses.container}`}>
      <div className={`font-rajdhani ${getColorClass()} ${sizeClasses.title} font-bold mb-2`}>
        {title}
      </div>
      <div className={`font-rajdhani text-synthwave-text-muted ${sizeClasses.message}`}>
        {message}
      </div>
    </div>
  );
};

// Empty state component
export const EmptyState = ({
  title = 'No Data',
  message = 'Nothing to show here',
  size = 'medium'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'py-4',
          title: 'text-sm',
          message: 'text-xs'
        };
      case 'large':
        return {
          container: 'py-8',
          title: 'text-lg',
          message: 'text-base'
        };
      case 'medium':
      default:
        return {
          container: 'py-6',
          title: 'text-base',
          message: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`text-center ${sizeClasses.container}`}>
      <div className={`font-rajdhani text-synthwave-text-muted ${sizeClasses.title}`}>
        {title}
      </div>
      {message && (
        <div className={`font-rajdhani text-synthwave-text-muted ${sizeClasses.message} mt-1`}>
          {message}
        </div>
      )}
    </div>
  );
};
