import React from 'react';
import { containerPatterns, layoutPatterns } from '../../utils/uiPatterns';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Full-page modal mask with diagonal dark gradient */}
      <div className={`absolute inset-0 ${layoutPatterns.authBackground}`}></div>

      {/* Auth form container */}
      <div className="relative w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/images/logo-light-sm.png"
              alt="NeonPanda Logo"
              className="h-12 w-auto"
            />
          </div>

          {/* Always show tagline under logo */}
          <p className="font-rajdhani text-synthwave-text-secondary mb-3">
            Where intelligent coaching meets grit, sweat, dreams, and science
          </p>

          {title && (
            <h1 className="font-orbitron font-bold text-2xl text-white mb-2 uppercase">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="font-rajdhani text-synthwave-text-secondary mb-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Auth Form Container - using uiPatterns mainContent */}
        <div className={`${containerPatterns.mainContent} p-8`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
