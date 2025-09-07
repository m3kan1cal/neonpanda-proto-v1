import React, { useState, useRef } from 'react';

const SimpleTooltip = ({ children, text, position = 'bottom' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const showTooltip = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      let x, y;

      switch (position) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 8;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 8;
          break;
        case 'left':
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
          break;
        default:
          x = rect.left + rect.width / 2;
          y = rect.bottom + 8;
      }

      setTooltipPosition({ x, y });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>

      {/* Fixed positioned tooltip that escapes any container clipping */}
      {isVisible && (
        <div
          className="fixed z-[99999] pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: position === 'top' || position === 'bottom'
              ? 'translateX(-50%)'
              : position === 'left'
                ? 'translateX(-100%) translateY(-50%)'
                : position === 'right'
                  ? 'translateY(-50%)'
                  : 'translateX(-50%)'
          }}
        >
          <div className="bg-synthwave-bg-card/95 backdrop-blur-sm border border-synthwave-neon-pink/30 rounded-lg px-3 py-2 shadow-lg shadow-synthwave-neon-pink/20">
            <div className="font-rajdhani text-sm text-synthwave-text-primary">
              {text}
            </div>
          </div>

          {/* Arrow */}
          <div className={`
            absolute w-2 h-2 bg-synthwave-bg-card/95 border-synthwave-neon-pink/30 transform rotate-45
            ${position === 'top'
              ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-r'
              : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-t border-l'
                : position === 'left'
                  ? 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2 border-t border-r'
                  : position === 'right'
                    ? 'right-full top-1/2 translate-x-1/2 -translate-y-1/2 border-b border-l'
                    : 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-t border-l' // default to bottom
            }
          `} />
        </div>
      )}
    </>
  );
};

export default SimpleTooltip;
