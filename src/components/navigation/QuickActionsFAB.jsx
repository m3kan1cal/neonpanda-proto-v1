// QuickActionsFAB.jsx - Floating Action Button for Mobile Quick Actions
// Bottom-right FAB with speed dial menu for quick actions

import React, { useState } from "react";
import { useNavigationContext } from "../../contexts/NavigationContext";
import { navigationPatterns } from "../../utils/ui/uiPatterns";
import { triggerHaptic } from "../../utils/navigation";
import {
  WorkoutIconTiny,
  ChatIconSmall,
  MemoryIconTiny,
  CoachIconTiny,
  ProgramIconTiny,
} from "../themes/SynthwaveComponents";

const QuickActionsFAB = () => {
  const context = useNavigationContext();
  const [isOpen, setIsOpen] = useState(false);

  // Toggle speed dial menu
  const handleToggle = () => {
    triggerHaptic(10);
    setIsOpen(!isOpen);
  };

  // Close menu
  const handleClose = () => {
    triggerHaptic(10);
    setIsOpen(false);
  };

  // Close menu on escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Don't show FAB if no coach context or command palette handler not available
  if (!context.hasCoachContext || !context.onCommandPaletteToggle) return null;

  // Don't show FAB if More Menu is open (avoid overlap)
  if (context.isMoreMenuOpen) return null;

  // Quick action handlers - trigger command palette with prefilled commands
  const handleAction = (action) => {
    triggerHaptic(10);
    setIsOpen(false);

    // Map action to command palette commands (matches SidebarNav.jsx)
    const commandMap = {
      "log-workout": "/log-workout ",
      "start-conversation": "/start-conversation ",
      "save-memory": "/save-memory ",
      "create-coach": "/create-coach",
      "design-program": "/design-program",
    };

    if (context.onCommandPaletteToggle && commandMap[action]) {
      context.onCommandPaletteToggle(commandMap[action]);
    }
  };

  // Quick actions configuration (matches navigationConfig.js quickAccess items order)
  // All actions use pink accent for consistent styling
  const quickActions = [
    {
      id: "create-coach",
      label: "Create Coach",
      icon: CoachIconTiny,
    },
    {
      id: "start-conversation",
      label: "Start Conversation",
      icon: ChatIconSmall,
    },
    {
      id: "log-workout",
      label: "Log Workout",
      icon: WorkoutIconTiny,
    },
    {
      id: "save-memory",
      label: "Save Memory",
      icon: MemoryIconTiny,
    },
    {
      id: "design-program",
      label: "Design Program",
      icon: ProgramIconTiny,
    },
  ];

  return (
    <>
      {/* Backdrop when open */}
      {isOpen && (
        <div
          className={navigationPatterns.fab.backdrop}
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* FAB Container */}
      <div
        className={navigationPatterns.fab.container}
        style={navigationPatterns.fab.containerStyle}
      >
        {/* Speed Dial Menu */}
        {isOpen && (
          <div className={navigationPatterns.fab.speedDial}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className={navigationPatterns.fab.speedDialItem}
                  aria-label={action.label}
                >
                  {/* Label - clickable with hover effects */}
                  <span className={navigationPatterns.fab.speedDialLabel}>
                    {action.label}
                  </span>

                  {/* Action Icon */}
                  <span className={navigationPatterns.fab.speedDialButton}>
                    <Icon className={navigationPatterns.fab.speedDialIcon} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={handleToggle}
          className={navigationPatterns.fab.button}
          aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            // Close icon (X)
            <svg
              className={navigationPatterns.fab.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            // Plus icon
            <svg
              className={navigationPatterns.fab.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          )}
        </button>
      </div>
    </>
  );
};

export default QuickActionsFAB;
