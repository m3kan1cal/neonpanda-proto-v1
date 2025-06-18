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
