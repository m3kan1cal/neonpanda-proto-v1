import React, { useState } from "react";
import { Tooltip } from "react-tooltip";
import { quickStatsPatterns, tooltipPatterns } from "../../utils/ui/uiPatterns";

/**
 * QuickStats Component
 *
 * Compact metrics display following Linear/Figma design patterns.
 * Icon-only + number format with rich tooltips for context.
 *
 * @param {Object} props
 * @param {Array} props.stats - Array of stat objects
 * @param {React.Component} props.stats[].icon - SVG icon component
 * @param {number} props.stats[].value - Numeric value to display
 * @param {Object} props.stats[].tooltip - Tooltip configuration
 * @param {string} props.stats[].tooltip.title - Bold title in tooltip
 * @param {string} props.stats[].tooltip.description - Supporting description text
 * @param {string} props.stats[].color - Color variant: 'pink' | 'cyan' | 'purple'
 * @param {boolean} props.stats[].isLoading - Show skeleton loader if true
 * @param {string} props.stats[].ariaLabel - Accessibility label for screen readers
 * @param {string} props.stats[].id - Unique ID for tooltip targeting
 * @param {'primary' | 'secondary'} [props.stats[].priority='primary'] - 'primary' always renders; 'secondary' is hidden on mobile (<sm)
 *
 * @example
 * <QuickStats
 *   stats={[
 *     {
 *       icon: ConversationIcon,
 *       value: 42,
 *       tooltip: {
 *         title: "42 Chats",
 *         description: "Total coach conversations you've started"
 *       },
 *       color: "pink",
 *       priority: "primary",
 *       isLoading: false,
 *       ariaLabel: "42 total chats",
 *       id: "stat-chats"
 *     }
 *   ]}
 * />
 */
function QuickStatItem({ stat, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const Icon = stat.icon;
  const iconColor = stat.color || "cyan";
  const tooltipId = stat.id || `quick-stat-${index}`;
  const iconAnchorId = `${tooltipId}-icon-anchor`;
  const isSecondary = stat.priority === "secondary";
  // Secondary stats are hidden below sm so mobile stays on one line.
  // The base patterns in `quickStatsPatterns.item` / `.skeleton.item`
  // are intentionally display-class-free (see uiPatterns.js); we own
  // the display class here so "flex" and "hidden sm:flex" don't fight.
  const displayClass = isSecondary ? "hidden sm:flex" : "flex";

  if (stat.isLoading) {
    return (
      <div className={`${displayClass} ${quickStatsPatterns.skeleton.item}`}>
        <div className={quickStatsPatterns.skeleton.icon} />
        <div className={quickStatsPatterns.skeleton.value} />
      </div>
    );
  }

  return (
    <>
      <div
        className={`${displayClass} ${quickStatsPatterns.item}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        tabIndex={0}
        aria-label={
          stat.ariaLabel || `${stat.value} ${stat.tooltip?.title || "items"}`
        }
        role="status"
        aria-live="polite"
      >
        {/* Icon Container — also serves as the tooltip anchor so the arrow centers on the icon */}
        <div
          id={iconAnchorId}
          className={quickStatsPatterns.iconContainer[iconColor]}
        >
          {Icon && (
            <div
              className={quickStatsPatterns.icon}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon style={{ width: "100%", height: "100%" }} />
            </div>
          )}
        </div>

        {/* Value */}
        <div className={quickStatsPatterns.value}>
          {stat.value !== undefined && stat.value !== null ? stat.value : 0}
        </div>
      </div>

      {/* Tooltip — anchored to the icon, opened by hover/focus on the whole row */}
      <Tooltip
        {...tooltipPatterns.standard}
        id={tooltipId}
        anchorSelect={`#${iconAnchorId}`}
        isOpen={isHovered || isFocused}
      >
        <strong>{stat.tooltip?.title || ""}</strong>
        <br />
        {stat.tooltip?.description || ""}
      </Tooltip>
    </>
  );
}

function QuickStats({ stats = [] }) {
  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <div className={quickStatsPatterns.container}>
      {stats.map((stat, index) => (
        <QuickStatItem
          key={stat.id || `stat-${index}`}
          stat={stat}
          index={index}
        />
      ))}
    </div>
  );
}

export default QuickStats;
