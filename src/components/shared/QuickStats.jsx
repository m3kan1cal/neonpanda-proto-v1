import React from 'react';
import { Tooltip } from 'react-tooltip';
import { quickStatsPatterns, tooltipPatterns } from '../../utils/uiPatterns';

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
 *       isLoading: false,
 *       ariaLabel: "42 total chats",
 *       id: "stat-chats"
 *     }
 *   ]}
 * />
 */
function QuickStats({ stats = [] }) {
  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <div className={quickStatsPatterns.container}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const iconColor = stat.color || 'cyan';
        const tooltipId = stat.id || `quick-stat-${index}`;

        // If loading, show skeleton
        if (stat.isLoading) {
          return (
            <div key={`skeleton-${index}`} className={quickStatsPatterns.skeleton.item}>
              <div className={quickStatsPatterns.skeleton.icon} />
              <div className={quickStatsPatterns.skeleton.value} />
            </div>
          );
        }

        return (
          <div
            key={stat.id || `stat-${index}`}
            className={quickStatsPatterns.item}
            data-tooltip-id={tooltipId}
            data-tooltip-html={`<strong>${stat.tooltip?.title || ''}</strong><br/>${stat.tooltip?.description || ''}`}
            aria-label={stat.ariaLabel || `${stat.value} ${stat.tooltip?.title || 'items'}`}
            role="status"
            aria-live="polite"
          >
            {/* Icon Container */}
            <div className={quickStatsPatterns.iconContainer[iconColor]}>
              {Icon && (
                <div className={quickStatsPatterns.icon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: '100%', height: '100%' }} />
                </div>
              )}
            </div>

            {/* Value */}
            <div className={quickStatsPatterns.value}>
              {stat.value !== undefined && stat.value !== null ? stat.value : 0}
            </div>

            {/* Tooltip */}
            <Tooltip
              id={tooltipId}
              {...tooltipPatterns.standard}
            />
          </div>
        );
      })}
    </div>
  );
}

export default QuickStats;
