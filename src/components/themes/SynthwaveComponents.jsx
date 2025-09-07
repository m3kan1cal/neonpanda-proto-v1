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
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 512 512">
    <path d="m151.34 436.82c13.66 15.52 33.418 24.281 54.078 23.98h101.12c20.578 0.32031 40.301-8.3594 53.938-23.781 54.199-53.5 63.684-115.48 28.16-184.22-2.9414-5.6016-3.2188-12.238-0.76172-18.078 7.9219-20.52 12.801-42.102 14.5-64.039 1.4609-13.059 0.5-26.281-2.8008-39-14.539-50.66-61.441-76.98-143.82-80.48-81.961 3.5-128.88 29.82-143.36 80.48-3.3008 12.719-4.2617 25.941-2.8008 39 1.6797 21.941 6.5586 43.5 14.5 64 2.4414 5.8594 2.1602 12.5-0.76172 18.141-35.5 68.719-26 130.7 28 184zm37.918-313.8c14.441-9.0391 35.719-13.18 66.738-12.98h0.058594c31.059-0.19922 52.219 3.9414 66.68 12.98h-0.019531c13.199 8.8008 20.781 23.941 19.879 39.801-0.80078 19.039-5.8984 33.762-15.078 43.699-1.5586 1.7188-4 2.3008-6.1602 1.4609-20.781-8.3594-42.84-13.039-65.219-13.82-0.058594 0-0.10156 0.058594-0.16016 0.058594-0.058594 0-0.039063-0.058594-0.10156-0.058594-22.379 0.78125-44.461 5.4609-65.238 13.82-2.1406 0.83984-4.6016 0.26172-6.1406-1.4609-9.1992-9.9414-14.281-24.68-15.078-43.699-0.89844-15.84 6.6406-30.98 19.82-39.801z"/>
  </svg>
);

export const LightningIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export const LightningIconSmall = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export const ConversationIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const ReportIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export const ReportIconSmall = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export const ChatIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const ChatIconSmall = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const WorkoutIconSmall = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="32 32 448 448">
    <path d="m151.34 436.82c13.66 15.52 33.418 24.281 54.078 23.98h101.12c20.578 0.32031 40.301-8.3594 53.938-23.781 54.199-53.5 63.684-115.48 28.16-184.22-2.9414-5.6016-3.2188-12.238-0.76172-18.078 7.9219-20.52 12.801-42.102 14.5-64.039 1.4609-13.059 0.5-26.281-2.8008-39-14.539-50.66-61.441-76.98-143.82-80.48-81.961 3.5-128.88 29.82-143.36 80.48-3.3008 12.719-4.2617 25.941-2.8008 39 1.6797 21.941 6.5586 43.5 14.5 64 2.4414 5.8594 2.1602 12.5-0.76172 18.141-35.5 68.719-26 130.7 28 184zm37.918-313.8c14.441-9.0391 35.719-13.18 66.738-12.98h0.058594c31.059-0.19922 52.219 3.9414 66.68 12.98h-0.019531c13.199 8.8008 20.781 23.941 19.879 39.801-0.80078 19.039-5.8984 33.762-15.078 43.699-1.5586 1.7188-4 2.3008-6.1602 1.4609-20.781-8.3594-42.84-13.039-65.219-13.82-0.058594 0-0.10156 0.058594-0.16016 0.058594-0.058594 0-0.039063-0.058594-0.10156-0.058594-22.379 0.78125-44.461 5.4609-65.238 13.82-2.1406 0.83984-4.6016 0.26172-6.1406-1.4609-9.1992-9.9414-14.281-24.68-15.078-43.699-0.89844-15.84 6.6406-30.98 19.82-39.801z"/>
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

export const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

export const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export const MemoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

export const CoachIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 512 512">
    <path d="m341.33 282.67h-170.66c-5.7188 0-11 3.0469-13.859 8-2.8555 4.9492-2.8555 11.047 0 16 2.8594 4.9492 8.1406 8 13.859 8h170.67-0.003907c5.7188 0 11-3.0508 13.859-8 2.8555-4.9531 2.8555-11.051 0-16-2.8594-4.9531-8.1406-8-13.859-8z"/>
    <path d="m341.33 368h-170.66c-5.7188 0-11 3.0508-13.859 8-2.8555 4.9492-2.8555 11.051 0 16 2.8594 4.9492 8.1406 8 13.859 8h170.67-0.003907c5.7188 0 11-3.0508 13.859-8 2.8555-4.9492 2.8555-11.051 0-16-2.8594-4.9492-8.1406-8-13.859-8z"/>
    <path d="m341.33 197.33h-170.66c-5.7188 0-11 3.0508-13.859 8-2.8555 4.9531-2.8555 11.051 0 16 2.8594 4.9531 8.1406 8 13.859 8h170.67-0.003907c5.7188 0 11-3.0469 13.859-8 2.8555-4.9492 2.8555-11.047 0-16-2.8594-4.9492-8.1406-8-13.859-8z"/>
    <path d="m384 48h-30.422c-3.0117-6.3633-7.7656-11.742-13.707-15.52-5.9414-3.7734-12.832-5.7891-19.871-5.8125h-128c-7.0391 0.023437-13.93 2.0391-19.871 5.8125-5.9414 3.7773-10.695 9.1562-13.707 15.52h-30.422c-15.555 0.011719-30.473 6.1953-41.473 17.195s-17.184 25.914-17.195 41.473v320c0.011719 15.555 6.1953 30.469 17.195 41.469s25.918 17.184 41.473 17.195h256c15.555-0.011719 30.473-6.1953 41.473-17.195s17.184-25.914 17.195-41.469v-320c-0.011719-15.559-6.1953-30.473-17.195-41.473s-25.918-17.184-41.473-17.195zm-192 10.668h128c1.4141 0 2.7695 0.5625 3.7695 1.5625s1.5625 2.3555 1.5625 3.7695v42.668c0 1.4141-0.5625 2.7695-1.5625 3.7695s-2.3555 1.5625-3.7695 1.5625h-128c-2.9453 0-5.332-2.3867-5.332-5.332v-42.668c0-2.9453 2.3867-5.332 5.332-5.332zm218.67 368c-0.011719 7.0664-2.8242 13.844-7.8242 18.844-5 4.9961-11.773 7.8086-18.844 7.8203h-256c-7.0703-0.011719-13.844-2.8242-18.844-7.8203-5-5-7.8125-11.777-7.8242-18.844v-320c0.011719-7.0703 2.8242-13.848 7.8242-18.844 5-5 11.773-7.8125 18.844-7.8242h26.668v26.668c0.011719 9.8984 3.9453 19.387 10.945 26.387 7 6.9961 16.488 10.934 26.387 10.945h128c9.8984-0.011719 19.387-3.9492 26.387-10.945 7-7 10.934-16.488 10.945-26.387v-26.668h26.668c7.0703 0.011719 13.844 2.8242 18.844 7.8242 5 4.9961 7.8125 11.773 7.8242 18.844z"/>
  </svg>
);

// Chat Interface Icons - Modern 2025 UI
export const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

export const PaperclipIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

export const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const SmileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const XIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

export const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

// NEW Badge Component - Used for reports, templates, and other new items
export const NewBadge = () => (
  <div className="absolute -top-2 -right-2 z-10">
    <div className="relative">
      {/* Pulsing glow effect */}
      <div className="absolute inset-0 bg-synthwave-neon-pink rounded-full animate-pulse opacity-75 blur-sm scale-110"></div>
      {/* Main badge */}
      <div className="relative bg-gradient-to-r from-synthwave-neon-pink to-synthwave-neon-purple text-black font-russo font-black text-xs px-2 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-synthwave-neon-pink/50 animate-pulse">
        NEW
      </div>
    </div>
  </div>
);
