import React from 'react';
import { compactCardPatterns, avatarPatterns } from '../../utils/ui/uiPatterns';

/**
 * CompactCoachCard - Horizontal compact coach display for Training Grounds header
 *
 * Features:
 * - 24px avatar with gradient background
 * - Online status indicator with pulse animation
 * - Coach first name only (more conversational and space-efficient)
 * - Clickable with hover effects (glow, border, background changes)
 * - Synthwave theme styling via uiPatterns
 *
 * @param {Object} coachData - Coach information (name, specialty, config)
 * @param {boolean} isOnline - Whether coach is online (default: true)
 * @param {Function} onClick - Click handler for navigation
 * @param {string} tooltipContent - Custom tooltip text (default: "Go to the Training Grounds")
 */

// Utility function to get first name from full name
const getFirstName = (name) => {
  if (!name) return '';
  return name.split(' ')[0];
};

const CompactCoachCard = ({ coachData, isOnline = true, onClick, tooltipContent = "Go to the Training Grounds" }) => {
  if (!coachData) return null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Go to the Training Grounds`}
      data-tooltip-id="coach-card-tooltip"
      data-tooltip-content={tooltipContent}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={compactCardPatterns.coachPill}
    >
      {/* Avatar with Status Indicator */}
      <div className={compactCardPatterns.coachPillAvatar}>
        <div className={avatarPatterns.coachCompact}>
          {coachData.name?.charAt(0)?.toUpperCase() || 'C'}
        </div>

        {/* Online Status Indicator */}
        {isOnline && (
          <div className={compactCardPatterns.coachPillStatusBadge}>
            <div className={compactCardPatterns.coachPillStatusDot}></div>
          </div>
        )}
      </div>

      {/* Coach Info - Horizontal Layout */}
      <div className={compactCardPatterns.coachPillInfo}>
        <div className={compactCardPatterns.coachPillName}>
          {getFirstName(coachData.name)}
        </div>
      </div>
    </div>
  );
};

export default CompactCoachCard;
