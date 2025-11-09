import React from 'react';
import { containerPatterns, badgePatterns, messagePatterns } from '../../utils/ui/uiPatterns';

export default function PhaseBreakdown({ program }) {
  if (!program.phases || program.phases.length === 0) {
    return null;
  }

  // Find current phase
  const currentPhase = program.phases.find(phase =>
    program.currentDay >= phase.startDay && program.currentDay <= phase.endDay
  );

  if (!currentPhase) {
    return null;
  }

  // Calculate days remaining in phase
  const daysRemainingInPhase = currentPhase.endDay - program.currentDay;
  const daysIntoPhase = program.currentDay - currentPhase.startDay + 1;
  const totalPhaseDays = currentPhase.endDay - currentPhase.startDay + 1;
  const phaseProgressPercentage = Math.round((daysIntoPhase / totalPhaseDays) * 100);

  return (
    <div className={`${containerPatterns.cardMedium} p-6`}>
      {/* Section Header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className={`${messagePatterns.statusDotPrimary} ${messagePatterns.statusDotPurple} flex-shrink-0 mt-2`}></div>
        <h3 className="font-russo font-bold text-white text-lg uppercase">
          Current Phase
        </h3>
      </div>

      {/* Phase Name */}
      <div className="mb-4">
        <div className="font-rajdhani text-lg text-white">
          {currentPhase.name || 'Phase 1'}
        </div>
      </div>

      {/* Phase Intel */}
      <div className="mb-4">
        <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
          Phase Intel
        </h4>
        <div className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg p-4">
          {/* Progress info */}
          <div className="mb-3">
            <div className="font-rajdhani text-sm text-synthwave-text-secondary mb-2">
              Day {daysIntoPhase} of {totalPhaseDays} • {phaseProgressPercentage}% Complete
            </div>

            {/* Progress bar */}
            <div className="relative w-full h-2 bg-synthwave-bg-primary/50 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-synthwave-neon-purple to-synthwave-neon-pink rounded-full transition-all duration-500"
                style={{ width: `${phaseProgressPercentage}%` }}
              />
            </div>
          </div>

          {/* Phase Stats */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {/* Days Remaining */}
            <div className="col-span-2 flex items-center gap-1.5 font-rajdhani text-sm">
              <span className="text-synthwave-text-secondary">Days Remaining:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {daysRemainingInPhase} day{daysRemainingInPhase !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Start Day */}
            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
              <span className="text-synthwave-text-secondary">Start Day:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {currentPhase.startDay}
              </span>
            </div>

            {/* End Day */}
            <div className="flex items-center gap-1.5 font-rajdhani text-sm">
              <span className="text-synthwave-text-secondary">End Day:</span>
              <span className="text-synthwave-neon-cyan font-medium">
                {currentPhase.endDay}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Phase description */}
      {currentPhase.description && (
        <div className="mb-4">
          <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
            Phase Strategy
          </h4>
          <div className={containerPatterns.coachNotesSection}>
            <div className="font-rajdhani text-sm text-synthwave-text-secondary">
              {currentPhase.description}
            </div>
          </div>
        </div>
      )}

      {/* Focus areas */}
      {currentPhase.focusAreas && currentPhase.focusAreas.length > 0 && (
        <div className="mb-4">
          <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
            Phase Focus
          </h4>
          <div className="flex flex-wrap gap-2">
            {currentPhase.focusAreas.map((area, idx) => (
              <span key={idx} className={badgePatterns.workoutDetail}>
                {area.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Phase goals if available */}
      {currentPhase.goals && currentPhase.goals.length > 0 && (
        <div>
          <h4 className="font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-2">
            Phase Targets
          </h4>
          <div className={containerPatterns.coachNotesSection}>
            <ul className="space-y-2">
              {currentPhase.goals.map((goal, idx) => (
                <li key={idx} className="text-sm text-synthwave-text-secondary flex items-start font-rajdhani">
                  <span className="text-synthwave-neon-cyan mr-2 font-medium">•</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}


