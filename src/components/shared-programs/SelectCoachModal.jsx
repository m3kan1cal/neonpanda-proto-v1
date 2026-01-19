/**
 * SelectCoachModal - Select a coach when copying a shared program
 *
 * Displays when a user has multiple coaches and wants to copy a shared program.
 * Allows selection of which coach should manage the copied program.
 */

import React, { useEffect } from "react";
import {
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
  avatarPatterns,
} from "../../utils/ui/uiPatterns.js";
import { CloseIcon } from "../themes/SynthwaveComponents";

function SelectCoachModal({
  coaches,
  onSelectCoach,
  onClose,
  isLoading = false,
  programName = "this program",
}) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isLoading, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 p-4 flex items-center justify-center animate-fade-in"
        onClick={() => !isLoading && onClose()}
      >
        <div
          className={`${containerPatterns.successModal} p-6 relative w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {!isLoading && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <h3 className={`${typographyPatterns.cardTitle} mb-2`}>
              Select a Coach
            </h3>
            <p className="font-rajdhani text-synthwave-text-secondary text-sm">
              Choose which coach should manage "{programName}". Your coach will
              adapt the program to your fitness level, personalize the workouts,
              and guide you through each session.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-synthwave-neon-cyan/20 border-t-synthwave-neon-cyan rounded-full animate-spin mb-4"></div>
              <p className="text-synthwave-text-secondary font-rajdhani text-sm">
                Copying program...
              </p>
            </div>
          )}

          {/* Coach List */}
          {!isLoading && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
              {coaches.map((coach) => (
                <button
                  key={coach.coach_id}
                  onClick={() => onSelectCoach(coach.coach_id)}
                  className="w-full p-4 bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-xl
                    hover:border-synthwave-neon-cyan/50 hover:bg-synthwave-bg-primary/50
                    transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    {/* Coach Avatar - matches CoachHeader.jsx */}
                    <div className={avatarPatterns.coachLarge}>
                      {coach.coach_name?.charAt(0) || "C"}
                    </div>

                    {/* Coach Info - font styles match CoachHeader.jsx */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-rajdhani font-semibold text-white text-lg truncate group-hover:text-synthwave-neon-cyan transition-colors">
                        {coach.coach_name || "Unnamed Coach"}
                      </h4>
                      {coach.coach_description && (
                        <p className="text-sm text-synthwave-text-secondary font-rajdhani truncate">
                          {coach.coach_description}
                        </p>
                      )}
                    </div>

                    {/* Arrow Icon */}
                    <div className="text-synthwave-text-muted group-hover:text-synthwave-neon-cyan transition-colors">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Cancel Button */}
          {!isLoading && (
            <div className="pt-4 mt-4 border-t border-synthwave-neon-cyan/10">
              <button
                onClick={onClose}
                className={`${buttonPatterns.secondaryMedium} w-full`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default SelectCoachModal;
