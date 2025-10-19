import React from 'react';
import { useNavigate } from 'react-router-dom';
import { themeClasses } from '../../utils/synthwaveThemeClasses';
import { containerPatterns, buttonPatterns } from '../../utils/ui/uiPatterns';

/**
 * Standardized Access Denied component for consistent styling across the app
 */
export const AccessDenied = ({
  title = "Access Denied",
  message,
  buttonText = "Back to Coaches",
  redirectPath = "/coaches",
  userId = null
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (userId && redirectPath === "/coaches") {
      navigate(`/coaches?userId=${userId}`);
    } else {
      navigate(redirectPath);
    }
  };

  return (
    <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-4xl mx-auto px-8 py-12 flex justify-center">
        <div className={`${containerPatterns.errorState} w-full max-w-4xl`}>
          <div className="flex items-center space-x-3 mb-4">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h5 className="font-russo text-lg text-red-400 uppercase">{title}</h5>
          </div>
          <p className="text-red-300 font-rajdhani text-sm mb-6">
            {message}
          </p>
          <button
            onClick={handleNavigate}
            className={buttonPatterns.primary}
          >
            {buttonText}
          </button>
        </div>
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
