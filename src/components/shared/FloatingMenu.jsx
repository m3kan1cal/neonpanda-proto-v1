import React, { useRef, useEffect } from 'react';

// Icons used across floating menus
export const WorkoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const LightningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Modern Floating Icon Button Component
export const FloatingIconButton = React.forwardRef(({ icon, isActive, onClick, title, className = "" }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className={`
      p-3 rounded-xl transition-all duration-200 backdrop-blur-sm border
      ${isActive
        ? 'bg-synthwave-neon-pink/20 border-synthwave-neon-pink text-synthwave-neon-pink shadow-lg shadow-synthwave-neon-pink/30'
        : 'bg-synthwave-bg-card/40 border-synthwave-neon-pink/30 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 hover:border-synthwave-neon-pink/50 hover:shadow-md'
      }
      ${className}
    `}
    title={title}
  >
    {icon}
  </button>
));

// Modern Popover Component
export const ModernPopover = ({ isOpen, onClose, anchorRef, children, title, className = "" }) => {
  const popoverRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen &&
          popoverRef.current &&
          !popoverRef.current.contains(event.target) &&
          anchorRef.current &&
          !anchorRef.current.contains(event.target)) {
        onClose();
      }
    };

    // ESC key to close
    const handleEscKey = (event) => {
      if (isOpen && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

      {/* Popover */}
      <div
        ref={popoverRef}
        className={`
          fixed z-50 bg-synthwave-bg-card/95 backdrop-blur-md
          border-2 border-synthwave-neon-pink/30 rounded-xl shadow-2xl
          shadow-synthwave-neon-pink/20 flex flex-col
          ${className}

          /* Mobile positioning - bottom sheet style */
          inset-x-4 bottom-4 top-20

          /* Desktop positioning - to the right of the floating icons */
          lg:left-20 lg:top-1/2 lg:-translate-y-1/2
          lg:w-96 lg:h-[32rem]
          lg:inset-auto
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-synthwave-neon-pink/30 flex-shrink-0">
          <h3 className="font-russo font-bold text-white text-sm uppercase">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-synthwave-text-secondary hover:text-synthwave-neon-pink transition-colors duration-300 p-1"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto synthwave-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#ff007f40 transparent'
          }}
        >
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

// Floating Icon Bar Container Component
export const FloatingIconBar = ({ children }) => (
  <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
    <div className="flex flex-col space-y-3">
      {children}
    </div>
  </div>
);