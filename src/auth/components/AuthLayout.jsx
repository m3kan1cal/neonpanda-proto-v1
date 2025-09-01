import React from 'react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Full-page modal mask with diagonal dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-synthwave-bg-primary via-synthwave-bg-tertiary to-synthwave-bg-purple"></div>

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

        {/* Auth Form Container - elevated with stronger styling */}
        <div className="bg-synthwave-bg-tertiary/80 border-2 border-synthwave-neon-pink/40 rounded-xl p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-synthwave-neon-pink hover:-translate-y-1 hover:shadow-neon-pink/20">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
