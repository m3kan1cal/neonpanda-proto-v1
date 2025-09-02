import React from 'react';
import { useNavigate } from 'react-router-dom';
import { themeClasses } from '../../utils/synthwaveThemeClasses';

/**
 * Standardized Access Denied component for consistent styling across the app
 */
export const AccessDenied = ({
  title = "Access Denied",
  message,
  buttonText = "Back to Coaches",
  redirectPath = "/coaches"
}) => {
  const navigate = useNavigate();

  return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-4xl mx-auto px-8 py-12 text-center">
        <h1 className="font-russo font-black text-3xl text-white mb-6 uppercase">
          {title}
        </h1>
        <p className="font-rajdhani text-synthwave-text-secondary text-lg mb-8">
          {message}
        </p>
        <button
          onClick={() => navigate(redirectPath)}
          className="font-rajdhani bg-synthwave-neon-pink text-black px-6 py-3 rounded-lg font-bold hover:bg-synthwave-neon-pink/80 transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

/**
 * Standardized Loading component for consistent styling across the app
 */
export const LoadingScreen = ({
  message = "Loading...",
  className = ""
}) => {
  return (
    <div className={`min-h-screen ${themeClasses.bgGradient} ${themeClasses.textPrimary} flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-synthwave-neon-cyan mx-auto mb-4"></div>
        <p className="text-synthwave-text-secondary font-rajdhani">{message}</p>
      </div>
    </div>
  );
};

export default { AccessDenied, LoadingScreen };
