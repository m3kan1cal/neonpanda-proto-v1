import React from 'react';
import { avatarPatterns } from '../../utils/uiPatterns';

const CoachHeader = ({ coachData, isOnline = true }) => {
  if (!coachData) return null;

  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <div className="relative">
        <div className={avatarPatterns.coachLarge}>
          {coachData.name?.charAt(0) || "C"}
        </div>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-synthwave-bg-primary rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      <div className="text-left">
        <div className="flex items-center gap-2">
          <h3 className="font-rajdhani font-semibold text-white text-lg">
            {coachData.name}
          </h3>
          {isOnline && (
            <span className="px-2 py-0.5 bg-green-400/20 text-green-300 rounded-full text-xs font-medium font-rajdhani">
              Online
            </span>
          )}
        </div>
        <p className="text-sm text-synthwave-text-secondary font-rajdhani">
          {(() => {
            const config = coachData.rawCoach?.coachConfig;

            // First priority: Use the new coach_description if available
            if (config?.coach_description) {
              return config.coach_description;
            }

            // Fallback: Use existing specialty
            if (coachData.specialty) {
              return coachData.specialty;
            }

            // Fallback: Build from technical config (simplified)
            const parts = [];

            if (config?.technical_config?.specializations?.length > 0) {
              parts.push(
                ...config.technical_config.specializations.map((s) =>
                  s.replace(/_/g, " ")
                )
              );
            }

            if (
              parts.length === 0 &&
              config?.technical_config?.programming_focus?.length > 0
            ) {
              parts.push(
                ...config.technical_config.programming_focus.map((f) =>
                  f.replace(/_/g, " ")
                )
              );
            }

            return parts.length > 0
              ? parts.slice(0, 2).join(" & ")
              : "Fitness Coach";
          })()}
        </p>
      </div>
    </div>
  );
};

export default CoachHeader;
