// BottomNav.jsx - Mobile Bottom Navigation Bar
// 4-tab thumb-friendly navigation for mobile devices (< 768px)

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { navigationPatterns } from '../../utils/ui/uiPatterns';
import {
  navigationItems,
  isItemVisible,
  getItemRoute,
  getItemBadge,
  getItemColorClasses,
  isRouteActive,
  triggerHaptic,
  getItemAriaLabel,
} from '../../utils/navigation';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useNavigationContext();

  // Get bottom nav items: Coaches, Training, Progress
  const bottomNavItems = [];

  // Always show Coaches (from primary) - Remove badge for mobile
  const coachesItem = navigationItems.primary?.find((item) => item.id === 'coaches');
  if (coachesItem && isItemVisible(coachesItem, context)) {
    bottomNavItems.push({ ...coachesItem, badge: undefined }); // Remove badge count for mobile
  }

  // Show Training (training-grounds from contextual)
  const trainingItem = navigationItems.contextual?.find((item) => item.id === 'training-grounds');
  if (trainingItem && isItemVisible(trainingItem, context)) {
    bottomNavItems.push({ ...trainingItem, label: 'Training' }); // Shorten label for mobile
  }

  // Show Progress (from contextual) - Remove badge for mobile
  const progressItem = navigationItems.contextual?.find((item) => item.id === 'progress');
  if (progressItem && isItemVisible(progressItem, context)) {
    bottomNavItems.push({ ...progressItem, badge: undefined }); // Remove badge count for mobile
  }

  const displayItems = bottomNavItems;

  // More menu toggle
  const handleMoreClick = () => {
    triggerHaptic([10, 50, 10]); // Double tap pattern
    context.setIsMoreMenuOpen(true);
  };

  // Navigate to item
  const handleItemClick = (item) => {
    const route = getItemRoute(item, context);
    if (route === '#') return; // Disabled item

    triggerHaptic(10);
    navigate(route);
  };

  // Check if item is active
  const isActive = (item) => {
    const route = getItemRoute(item, context);
    return isRouteActive(route, location.pathname, context.currentSearchParams);
  };

  // Render navigation item
  const renderNavItem = (item) => {
    const badge = getItemBadge(item, context);
    const active = isActive(item);
    const colorClasses = getItemColorClasses(item.color, active);
    const Icon = item.icon;
    const ariaLabel = getItemAriaLabel(item, context);

      return (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className={`
            ${navigationPatterns.mobile.item}
            ${active ? `${colorClasses.active} focus:ring-${item.color} ${navigationPatterns.mobile.itemActiveBg}` : colorClasses.inactive}
            ${active ? 'font-semibold' : 'font-medium'}
          `}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label={ariaLabel}
          aria-current={active ? 'page' : undefined}
        >
        {/* Icon with glow effect when active */}
        <div className={`relative ${active ? colorClasses.glow : ''}`}>
          <Icon className="w-6 h-6" />

          {/* Badge indicator */}
          {badge > 0 && (
            <div className={`${navigationPatterns.mobile.badge} ${colorClasses.shadow}`}>
              {badge > 99 ? '99+' : badge}
            </div>
          )}
        </div>

        {/* Label */}
        <span className={navigationPatterns.mobile.label}>
          {item.label}
        </span>

        {/* Active indicator bar */}
        {active && (
          <div className={`${navigationPatterns.mobile.activeBar} ${colorClasses.bg} ${colorClasses.shadow}`} />
        )}
      </button>
    );
  };

  // Render "More" button
  const renderMoreButton = () => {
    const isMoreActive = context.isMoreMenuOpen;
    const purpleClasses = getItemColorClasses('purple', isMoreActive);

    return (
      <button
        onClick={handleMoreClick}
        className={`
          ${navigationPatterns.mobile.item}
          ${isMoreActive ? `text-synthwave-neon-purple font-semibold ${navigationPatterns.mobile.itemActiveBg}` : 'text-synthwave-text-muted hover:text-synthwave-neon-purple font-medium'}
          focus:ring-synthwave-neon-purple/50
        `}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="More options"
        aria-expanded={isMoreActive}
      >
        {/* Menu icon */}
        <div className={`relative ${isMoreActive ? purpleClasses.glow : ''}`}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </div>

        {/* Label */}
        <span className={navigationPatterns.mobile.label}>
          More
        </span>

        {/* Active indicator bar */}
        {isMoreActive && (
          <div className={`${navigationPatterns.mobile.activeBar} ${purpleClasses.bg} ${purpleClasses.shadow}`} />
        )}
      </button>
    );
  };

  return (
    <nav
      className={navigationPatterns.mobile.container}
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className={navigationPatterns.mobile.itemsContainer}>
        {/* Primary navigation items (3-4 items) */}
        {displayItems.map((item) => renderNavItem(item))}

        {/* More menu button */}
        {renderMoreButton()}
      </div>

      {/* Safe area padding for iPhone notch */}
      <div className={navigationPatterns.mobile.safeArea} />
    </nav>
  );
};

export default BottomNav;

