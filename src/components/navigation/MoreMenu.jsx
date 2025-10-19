// MoreMenu.jsx - Mobile Slide-Up Menu for Overflow Navigation
// Bottom sheet style menu for secondary navigation items

import React, { useEffect } from 'react';
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

const MoreMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useNavigationContext();
  const { isMoreMenuOpen, setIsMoreMenuOpen } = context;

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMoreMenuOpen) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMoreMenuOpen, setIsMoreMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMoreMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMoreMenuOpen]);

  // Close menu
  const handleClose = () => {
    triggerHaptic(10);
    setIsMoreMenuOpen(false);
  };

  // Navigate to item and close menu (or handle onClick/actions)
  const handleItemClick = (item) => {
    triggerHaptic(10);
    setIsMoreMenuOpen(false);

    // Handle Quick Actions items (log workout, start conversation, save memory)
    if (item.action) {
      // Map action to command palette commands
      const commandMap = {
        'log-workout': '/log-workout ',
        'start-conversation': '/start-conversation ',
        'save-memory': '/save-memory ',
      };

      if (context.onCommandPaletteToggle && commandMap[item.action]) {
        context.onCommandPaletteToggle(commandMap[item.action]);
      } else {
        console.info(`Quick action clicked: ${item.action} - Command palette not available`);
      }
      return;
    }

    // Handle Quick Access items with popovers (coach details)
    // Note: Popovers don't work well in mobile menu, so navigate to coaches page instead
    if (item.popoverType === 'coach') {
      navigate(`/coaches?userId=${context.userId}`);
      return;
    }

    // Handle onClick function (e.g., Sign Out)
    if (item.onClick) {
      item.onClick(context);
      return;
    }

    // Handle navigation
    const route = getItemRoute(item, context);
    if (route === '#') return; // Disabled item
    navigate(route);
  };

  // Check if item is active
  const isActive = (item) => {
    const route = getItemRoute(item, context);
    return isRouteActive(route, location.pathname, context.currentSearchParams);
  };

  // Get all menu items (primary + contextual + quickAccess + account + utility)
  const primaryItems = navigationItems.primary?.filter((item) =>
    isItemVisible(item, context)
  ) || [];

  const contextualItems = navigationItems.contextual?.filter((item) =>
    isItemVisible(item, context)
  ) || [];

  const quickAccessItems = navigationItems.quickAccess?.filter((item) =>
    isItemVisible(item, context)
  ) || [];

  const accountItems = navigationItems.account?.filter((item) =>
    isItemVisible(item, context)
  ) || [];

  const utilityItems = navigationItems.utility?.filter((item) =>
    isItemVisible(item, context)
  ) || [];

  // Render menu item
  const renderMenuItem = (item) => {
    const badge = getItemBadge(item, context);
    const active = isActive(item);
    const colorClasses = getItemColorClasses(item.color, active);
    const Icon = item.icon;
    const ariaLabel = getItemAriaLabel(item, context);
    const route = getItemRoute(item, context);
    const isDisabled = !item.onClick && !item.action && !item.popoverType && route === '#';

    // Get color-specific classes for active state
    const getActiveClasses = () => {
      if (item.color === 'pink') {
        return 'bg-synthwave-neon-pink/10 border-t-2 border-b-2 border-synthwave-neon-pink/60';
      } else if (item.color === 'cyan') {
        return 'bg-synthwave-neon-cyan/10 border-t-2 border-b-2 border-synthwave-neon-cyan/60';
      } else if (item.color === 'purple') {
        return 'bg-synthwave-neon-purple/10 border-t-2 border-b-2 border-synthwave-neon-purple/60';
      }
      return '';
    };

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        disabled={isDisabled}
        className={`
          ${navigationPatterns.moreMenu.item}
          ${isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : active
              ? `${colorClasses.active} ${getActiveClasses()} focus:outline-none active:outline-none`
              : `${colorClasses.inactive} hover:bg-synthwave-bg-card/40 focus:outline-none active:outline-none`
          }
          ${active ? 'font-semibold' : 'font-medium'}
        `}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={ariaLabel}
        aria-current={active ? 'page' : undefined}
      >
        {/* Icon */}
        <div className={`${active ? colorClasses.glow : ''}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Label */}
        <span className={navigationPatterns.moreMenu.itemLabel}>
          {item.label}
        </span>

        {/* Badge indicator - QuickStats style with Rajdhani font - Show if badge exists (including 0) */}
        {badge !== null && badge !== undefined && (
          <div className={`
            ml-auto min-w-[32px] h-[32px] px-2 rounded-lg flex items-center justify-center
            font-rajdhani font-bold text-sm
            transition-all duration-150
            ${item.color === 'pink' ? 'bg-synthwave-neon-pink/10 text-synthwave-neon-pink' : ''}
            ${item.color === 'cyan' ? 'bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan' : ''}
            ${item.color === 'purple' ? 'bg-synthwave-neon-purple/10 text-synthwave-neon-purple' : ''}
          `}>
            {badge > 99 ? '99+' : badge}
          </div>
        )}

        {/* Chevron for non-disabled items */}
        {!isDisabled && (
          <svg
            className={navigationPatterns.moreMenu.itemChevron}
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
        )}
      </button>
    );
  };

  if (!isMoreMenuOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={navigationPatterns.moreMenu.backdrop}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-up menu */}
      <div
        className={navigationPatterns.moreMenu.container}
        role="dialog"
        aria-label="More navigation options"
        aria-modal="true"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-2">
          <div className={navigationPatterns.moreMenu.handleBar} />
        </div>

        {/* Menu header */}
        <div className={navigationPatterns.moreMenu.header}>
          <div className="flex items-center justify-between">
            <h2 className={navigationPatterns.moreMenu.headerTitle}>
              More Options
            </h2>
            <button
              onClick={handleClose}
              className={navigationPatterns.moreMenu.headerCloseButton}
              aria-label="Close menu"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Primary navigation (Coaches) */}
        {primaryItems.length > 0 && (
          <div className={navigationPatterns.moreMenu.sectionContainer}>
            <div className="space-y-1">
              {primaryItems.map((item) => renderMenuItem(item))}
            </div>
          </div>
        )}

        {/* Coach-specific navigation */}
        {contextualItems.length > 0 && (
          <div className={`${navigationPatterns.moreMenu.sectionContainer} ${primaryItems.length > 0 ? 'border-t border-synthwave-neon-cyan/10' : ''}`}>
            <div className={navigationPatterns.moreMenu.sectionHeader}>
              <h3 className={navigationPatterns.moreMenu.sectionTitle}>
                Your Training
              </h3>
            </div>
            <div className="space-y-1">
              {contextualItems.map((item) => renderMenuItem(item))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {quickAccessItems.length > 0 && (
          <div className={`${navigationPatterns.moreMenu.sectionContainer} border-t border-synthwave-neon-cyan/10`}>
            <div className={navigationPatterns.moreMenu.sectionHeader}>
              <h3 className={navigationPatterns.moreMenu.sectionTitle}>
                Quick Actions
              </h3>
            </div>
            <div className="space-y-1">
              {quickAccessItems.map((item) => renderMenuItem(item))}
            </div>
          </div>
        )}

        {/* Account navigation */}
        {accountItems.length > 0 && (
          <div className={`${navigationPatterns.moreMenu.sectionContainer} border-t border-synthwave-neon-cyan/10`}>
            <div className={navigationPatterns.moreMenu.sectionHeader}>
              <h3 className={navigationPatterns.moreMenu.sectionTitle}>
                Account & Settings
              </h3>
            </div>
            <div className="space-y-1">
              {accountItems.map((item) => renderMenuItem(item))}
            </div>
          </div>
        )}

        {/* Utility navigation */}
        {utilityItems.length > 0 && (
          <div className={`${navigationPatterns.moreMenu.sectionContainer} border-t border-synthwave-neon-cyan/10`}>
            <div className={navigationPatterns.moreMenu.sectionHeader}>
              <h3 className={navigationPatterns.moreMenu.sectionTitle}>
                Help & Info
              </h3>
            </div>
            <div className="space-y-1">
              {utilityItems.map((item) => renderMenuItem(item))}
            </div>
          </div>
        )}

        {/* Safe area padding for iPhone notch */}
        <div className={navigationPatterns.moreMenu.safeArea} />
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default MoreMenu;

