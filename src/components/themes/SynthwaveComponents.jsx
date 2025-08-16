// components/SynthwaveComponents.jsx
import React from 'react';

// Neon Border Component
export function NeonBorder({ children, color = 'pink', className = '' }) {
  const borderColor = {
    pink: 'border-synthwave-neon-pink shadow-neon-pink',
    cyan: 'border-synthwave-neon-cyan shadow-neon-cyan',
    purple: 'border-synthwave-neon-purple shadow-neon-purple',
  };

  return (
    <div className={`border-2 ${borderColor[color]} rounded-lg transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

// Glitch Text Component
export function GlitchText({ children, className = '' }) {
  return (
    <span className={`animate-glitch ${className}`}>
      {children}
    </span>
  );
}

// Neon Input Component
export function NeonInput({ placeholder, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`
        bg-synthwave-bg-card border-2 border-synthwave-neon-pink/50
        text-synthwave-text-primary placeholder-synthwave-text-muted
        px-4 py-3 rounded-lg font-rajdhani
        focus:border-synthwave-neon-pink focus:shadow-neon-pink focus:outline-none
        transition-all duration-300
        ${className}
      `}
    />
  );
}

// Progress Bar Component
export function NeonProgressBar({ progress, color = 'pink' }) {
  const colors = {
    pink: 'bg-synthwave-neon-pink shadow-neon-pink',
    cyan: 'bg-synthwave-neon-cyan shadow-neon-cyan',
    purple: 'bg-synthwave-neon-purple shadow-neon-purple',
  };

  return (
    <div className="w-full bg-synthwave-bg-card rounded-full h-2 border border-synthwave-neon-pink/30">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
}

// Icon Components
export const WorkoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export const LightningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export const ConversationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
