import React, { useRef, useEffect } from "react";
import { CloseIcon } from "../themes/SynthwaveComponents";
import { containerPatterns } from "../../utils/ui/uiPatterns";

// Modern Popover Component
export const ModernPopover = ({
  isOpen,
  onClose,
  anchorRef,
  children,
  title,
  className = "",
  positionClass = "",
}) => {
  const popoverRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    // ESC key to close
    const handleEscKey = (event) => {
      if (isOpen && event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
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
          fixed z-50 ${containerPatterns.cardMediumOpaque} flex flex-col
          ${className}

          /* Mobile positioning - bottom sheet style */
          inset-x-4 bottom-4 top-20

          /* Desktop positioning - to the right of the floating icons (dynamic based on sidebar state) */
          ${positionClass || "lg:left-[324px]"} lg:top-1/2 lg:-translate-y-1/2
          lg:w-96 lg:h-[32rem]
          lg:inset-auto
          transition-all duration-300
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-synthwave-neon-cyan/20 shrink-0">
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
        <div className={`flex-1 ${containerPatterns.scrollableCyan}`}>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </>
  );
};
