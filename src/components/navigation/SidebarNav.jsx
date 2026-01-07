// SidebarNav.jsx - Desktop Left Sidebar Navigation
// Persistent vertical navigation for desktop devices (≥ 768px)

import React, { useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Popover } from "@headlessui/react";
import {
  useFloating,
  flip,
  shift,
  offset,
  autoUpdate,
  size,
  limitShift,
} from "@floating-ui/react";
import { useAuth } from "../../auth";
import { useNavigationContext } from "../../contexts/NavigationContext";
import {
  navigationPatterns,
  tooltipPatterns,
  badgePatterns,
} from "../../utils/ui/uiPatterns";
import UserAvatar from "../shared/UserAvatar";
import {
  navigationItems,
  isItemVisible,
  getItemRoute,
  getItemBadge,
  getItemColorClasses,
  isRouteActive,
  getItemAriaLabel,
} from "../../utils/navigation";
import { Tooltip } from "react-tooltip";
import QuickAccessPopover from "./QuickAccessPopover";

// Quick Actions Popover Component with Floating UI positioning
const QuickActionsPopover = ({
  quickActionItems,
  isSidebarCollapsed,
  context,
  handleItemClick,
  getItemColorClasses,
}) => {
  // Create a custom boundary function that excludes the chat input area
  const getBoundary = () => {
    const chatInput = document.querySelector("[data-chat-input-container]");
    if (!chatInput) {
      return {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
        x: 0,
        y: 0,
      };
    }

    const chatInputRect = chatInput.getBoundingClientRect();

    // Create a virtual boundary that ends where chat input begins
    return {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: chatInputRect.top - 16, // Stop 16px above chat input
      width: window.innerWidth,
      height: chatInputRect.top - 16,
      x: 0,
      y: 0,
    };
  };

  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    middleware: [
      offset(0), // No gap between button and popover
      flip({
        fallbackPlacements: ["right-end", "right", "left-start", "left-end"],
        boundary: getBoundary(),
      }),
      shift({
        padding: 8,
        boundary: getBoundary(),
        limiter: limitShift(),
      }),
      size({
        boundary: getBoundary(),
        apply({ availableHeight, elements }) {
          // Apply max height and enable scrolling
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(200, availableHeight)}px`,
            overflowY: "auto",
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  return (
    <Popover>
      {({ open, close }) => {
        const colorClasses = getItemColorClasses("pink", false);
        const getHoverClasses = () => {
          return "hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-pink/50";
        };

        return (
          <>
            <Popover.Button
              ref={refs.setReference}
              className={`
                ${navigationPatterns.desktop.navItem}
                ${isSidebarCollapsed ? navigationPatterns.desktop.navItemCollapsed : ""}
                ${open ? "text-synthwave-neon-pink" : colorClasses.inactive}
                ${
                  open
                    ? "border-t-synthwave-neon-pink/50 border-b-synthwave-neon-pink/50 bg-synthwave-bg-primary/20"
                    : getHoverClasses()
                }
                focus:outline-none
                active:outline-none
              `}
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label="Quick actions"
              title={isSidebarCollapsed ? "Quick Actions" : undefined}
              data-tooltip-id={
                isSidebarCollapsed ? "sidebar-nav-tooltip" : undefined
              }
              data-tooltip-content={
                isSidebarCollapsed ? "Quick Actions" : undefined
              }
            >
              {/* Icon */}
              <div
                className={`
                ${isSidebarCollapsed ? navigationPatterns.desktop.navItemIconCollapsed : navigationPatterns.desktop.navItemIcon}
                flex items-center justify-center
              `}
              >
                <svg
                  className={isSidebarCollapsed ? "w-6 h-6" : "w-5 h-5"}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              {/* Label */}
              <span
                className={`
                ${navigationPatterns.desktop.navItemLabel}
                ${isSidebarCollapsed ? navigationPatterns.desktop.navItemLabelCollapsed : ""}
              `}
              >
                Quick Actions
              </span>
            </Popover.Button>

            <Popover.Panel
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-[60]"
            >
              <div className={navigationPatterns.utilityFlyout.container}>
                {/* Header Section */}
                <div className={navigationPatterns.utilityFlyout.header}>
                  <h3 className={navigationPatterns.utilityFlyout.headerTitle}>
                    Quick Actions
                  </h3>
                </div>

                {/* Menu Items */}
                <div
                  className={navigationPatterns.utilityFlyout.itemsContainer}
                >
                  {quickActionItems.map((item) => {
                    const Icon = item.icon;
                    const itemColorClasses = getItemColorClasses(
                      item.color || "pink",
                      false,
                    );

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleItemClick(item);
                          close();
                        }}
                        className={`
                          ${navigationPatterns.desktop.navItem}
                          ${itemColorClasses.inactive}
                          hover:border-synthwave-neon-pink/50
                          hover:bg-synthwave-bg-primary/20
                          focus:ring-2 focus:ring-synthwave-neon-pink/50
                          focus:outline-none
                          active:outline-none
                          w-full
                        `}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        {/* Icon */}
                        {Icon && (
                          <div
                            className={navigationPatterns.desktop.navItemIcon}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                        )}

                        {/* Label */}
                        <span
                          className={navigationPatterns.desktop.navItemLabel}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Popover.Panel>
          </>
        );
      }}
    </Popover>
  );
};

// Utility Popover Component with Floating UI positioning
const UtilityPopover = ({
  utilityItems,
  isSidebarCollapsed,
  navigate,
  context,
  getItemRoute,
  getItemColorClasses,
}) => {
  // Create a custom boundary function that excludes the chat input area
  const getBoundary = () => {
    const chatInput = document.querySelector("[data-chat-input-container]");
    if (!chatInput) {
      return {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
        x: 0,
        y: 0,
      };
    }

    const chatInputRect = chatInput.getBoundingClientRect();

    // Create a virtual boundary that ends where chat input begins
    return {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: chatInputRect.top - 16, // Stop 16px above chat input
      width: window.innerWidth,
      height: chatInputRect.top - 16,
      x: 0,
      y: 0,
    };
  };

  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    middleware: [
      offset(0), // No gap between button and popover
      flip({
        fallbackPlacements: ["right-end", "right", "left-start", "left-end"],
        boundary: getBoundary(),
      }),
      shift({
        padding: 8,
        boundary: getBoundary(),
        limiter: limitShift(),
      }),
      size({
        boundary: getBoundary(),
        apply({ availableHeight, elements }) {
          // Apply max height and enable scrolling
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(200, availableHeight)}px`,
            overflowY: "auto",
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  return (
    <Popover className={navigationPatterns.sectionSpacing.both}>
      {({ open }) => {
        const colorClasses = getItemColorClasses("default", false);
        const getHoverClasses = () => {
          return "hover:border-synthwave-neon-cyan/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-cyan/50";
        };

        return (
          <>
            {!isSidebarCollapsed && (
              <div className={navigationPatterns.desktop.sectionHeader}>
                <h3 className={navigationPatterns.desktop.sectionTitle}>
                  More Resources
                </h3>
              </div>
            )}

            <Popover.Button
              ref={refs.setReference}
              className={`
                ${navigationPatterns.desktop.navItem}
                ${isSidebarCollapsed ? navigationPatterns.desktop.navItemCollapsed : ""}
                ${open ? "text-synthwave-neon-cyan" : colorClasses.inactive}
                ${
                  open
                    ? "border-t-synthwave-neon-cyan/50 border-b-synthwave-neon-cyan/50 bg-synthwave-bg-primary/20"
                    : getHoverClasses()
                }
                focus:outline-none
                active:outline-none
              `}
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label="More resources"
              title={isSidebarCollapsed ? "More Resources" : undefined}
              data-tooltip-id={
                isSidebarCollapsed ? "sidebar-nav-tooltip" : undefined
              }
              data-tooltip-content={
                isSidebarCollapsed ? "More Resources" : undefined
              }
            >
              {/* Icon */}
              <div
                className={`
                ${isSidebarCollapsed ? navigationPatterns.desktop.navItemIconCollapsed : navigationPatterns.desktop.navItemIcon}
                flex items-center justify-center
              `}
              >
                <svg
                  className={isSidebarCollapsed ? "w-6 h-6" : "w-5 h-5"}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              {/* Label */}
              <span
                className={`
                ${navigationPatterns.desktop.navItemLabel}
                ${isSidebarCollapsed ? navigationPatterns.desktop.navItemLabelCollapsed : ""}
              `}
              >
                More Resources
              </span>
            </Popover.Button>

            <Popover.Panel
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-[60]"
            >
              {({ close }) => (
                <div className={navigationPatterns.utilityFlyout.container}>
                  {/* Header Section */}
                  <div className={navigationPatterns.utilityFlyout.header}>
                    <h3
                      className={navigationPatterns.utilityFlyout.headerTitle}
                    >
                      More Resources
                    </h3>
                  </div>

                  {/* Menu Items */}
                  <div
                    className={navigationPatterns.utilityFlyout.itemsContainer}
                  >
                    {utilityItems.map((item) => {
                      const Icon = item.icon;
                      const itemColorClasses = getItemColorClasses(
                        item.color || "default",
                        false,
                      );

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            const route = getItemRoute(item, context);
                            if (route && route !== "#") {
                              navigate(route);
                              close();
                            }
                          }}
                          className={`
                            ${navigationPatterns.desktop.navItem}
                            ${itemColorClasses.inactive}
                            hover:border-synthwave-neon-cyan/50
                            hover:bg-synthwave-bg-primary/20
                            focus:ring-2 focus:ring-synthwave-neon-cyan/50
                            focus:outline-none
                            active:outline-none
                            w-full
                          `}
                          style={{ WebkitTapHighlightColor: "transparent" }}
                        >
                          {/* Icon */}
                          {Icon && (
                            <div
                              className={navigationPatterns.desktop.navItemIcon}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                          )}

                          {/* Label */}
                          <span
                            className={navigationPatterns.desktop.navItemLabel}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Popover.Panel>
          </>
        );
      }}
    </Popover>
  );
};

const SidebarNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const context = useNavigationContext();
  const { isSidebarCollapsed, setIsSidebarCollapsed } = context;

  // Quick Access popover state
  const [activePopover, setActivePopover] = useState(null);
  const popoverRefs = useRef({});

  // Toggle collapse state
  const toggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Navigate to item or handle onClick
  const handleItemClick = (item) => {
    // Handle Quick Access items (open popovers)
    if (item.popoverType) {
      setActivePopover(
        activePopover === item.popoverType ? null : item.popoverType,
      );
      return;
    }

    // Handle Quick Actions items (log workout, start conversation, save memory, create coach, design program)
    if (item.action) {
      // Map action to command palette commands
      const commandMap = {
        "log-workout": "/log-workout ",
        "start-conversation": "/start-conversation ",
        "save-memory": "/save-memory ",
        "create-coach": "/create-coach",
        "design-program": "/design-program",
      };

      if (context.onCommandPaletteToggle && commandMap[item.action]) {
        context.onCommandPaletteToggle(commandMap[item.action]);
      } else {
        console.info(
          `Quick action clicked: ${item.action} - Command palette not available`,
        );
      }
      return;
    }

    // Handle onClick function (e.g., Sign Out)
    if (item.onClick) {
      item.onClick(context);
      return;
    }

    // Handle navigation
    const route = getItemRoute(item, context);
    if (route === "#") return; // Disabled item
    navigate(route);
  };

  // Check if item is active
  const isActive = (item) => {
    const route = getItemRoute(item, context);
    return isRouteActive(route, location.pathname, context.currentSearchParams);
  };

  // Get visible items by section
  const primaryItems =
    navigationItems.primary?.filter((item) => isItemVisible(item, context)) ||
    [];

  const contextualItems =
    navigationItems.contextual?.filter((item) =>
      isItemVisible(item, context),
    ) || [];

  const quickAccessItems =
    navigationItems.quickAccess?.filter((item) =>
      isItemVisible(item, context),
    ) || [];

  const accountItems =
    navigationItems.account?.filter((item) => isItemVisible(item, context)) ||
    [];

  const utilityItems =
    navigationItems.utility?.filter((item) => isItemVisible(item, context)) ||
    [];

  // Get display name from userProfile or fallback to email
  const getDisplayName = () => {
    return (
      userProfile?.displayName ||
      user?.attributes?.preferred_username ||
      user?.attributes?.email ||
      user?.email ||
      "User"
    );
  };

  // Get username for settings route
  const getUsername = () => {
    return (
      user?.attributes?.preferred_username ||
      user?.email?.split("@")[0] ||
      "user"
    );
  };

  // Render navigation item
  const renderNavItem = (item) => {
    const badge = getItemBadge(item, context);
    const active = item.popoverType
      ? activePopover === item.popoverType
      : isActive(item);
    const colorClasses = getItemColorClasses(item.color, active);
    const Icon = item.icon;
    const ariaLabel = getItemAriaLabel(item, context);
    const route = getItemRoute(item, context);
    const isDisabled =
      !item.onClick && !item.popoverType && !item.action && route === "#";

    // Create ref for Quick Access items (for popover positioning)
    if (item.popoverType && !popoverRefs.current[item.id]) {
      popoverRefs.current[item.id] = React.createRef();
    }

    // Get color-specific classes for active state (only top/bottom borders)
    const getActiveClasses = () => {
      if (item.color === "pink") {
        return "bg-synthwave-bg-primary/30 border-t-synthwave-neon-pink/30 border-b-synthwave-neon-pink/30";
      } else if (item.color === "cyan") {
        return "bg-synthwave-bg-primary/30 border-t-synthwave-neon-cyan/30 border-b-synthwave-neon-cyan/30";
      } else if (item.color === "purple") {
        return "bg-synthwave-bg-primary/30 border-t-synthwave-neon-purple/30 border-b-synthwave-neon-purple/30";
      }
      return "";
    };

    // Get color-specific hover classes for inactive state (FloatingMenu-inspired)
    const getHoverClasses = () => {
      if (item.color === "pink") {
        return "hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-pink/50";
      } else if (item.color === "cyan") {
        return "hover:border-synthwave-neon-cyan/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-cyan/50";
      } else if (item.color === "purple") {
        return "hover:border-synthwave-neon-purple/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-purple/50";
      }
      return "";
    };

    return (
      <button
        key={item.id}
        ref={item.popoverType ? popoverRefs.current[item.id] : null}
        onClick={() => handleItemClick(item)}
        disabled={isDisabled}
        className={`
          ${navigationPatterns.desktop.navItem}
          ${isSidebarCollapsed ? navigationPatterns.desktop.navItemCollapsed : ""}
          ${
            isDisabled
              ? "opacity-50 cursor-not-allowed"
              : active
                ? `${colorClasses.active} ${getActiveClasses()} focus:outline-none active:outline-none`
                : `${colorClasses.inactive} ${getHoverClasses()} focus:outline-none active:outline-none`
          }
        `}
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
        title={isSidebarCollapsed ? item.label : undefined}
        data-tooltip-id={isSidebarCollapsed ? "sidebar-nav-tooltip" : undefined}
        data-tooltip-content={isSidebarCollapsed ? item.label : undefined}
      >
        {/* Icon */}
        <div
          className={`
          ${isSidebarCollapsed ? navigationPatterns.desktop.navItemIconCollapsed : navigationPatterns.desktop.navItemIcon}
          ${active ? colorClasses.glow : ""}
          ${item.icon.name === "WorkoutIconTiny" || item.icon.name === "NetworkIconTiny" || item.icon.name === "ChatIconSmall" || item.icon.name === "CoachIconSmall" || item.icon.name === "MemoryIconTiny" || item.icon.name === "ProgramIconTiny" || item.icon.name === "MenuIcon" ? "flex items-center justify-center" : ""} // Center icons that need alignment
        `}
        >
          <Icon
            className={
              isSidebarCollapsed
                ? "w-6 h-6" // All icons w-6 h-6 when collapsed
                : "w-5 h-5"
            }
          />
        </div>

        {/* Label */}
        <span
          className={`
          ${navigationPatterns.desktop.navItemLabel}
          ${isSidebarCollapsed ? navigationPatterns.desktop.navItemLabelCollapsed : ""}
        `}
        >
          {item.label}
        </span>

        {/* Badge indicator - QuickStats style with Rajdhani font - Only show when expanded */}
        {badge !== null && badge !== undefined && !isSidebarCollapsed && (
          <div
            className={`
            ml-auto ${badgePatterns.countBase}
            ${item.color === "pink" ? badgePatterns.countPink : ""}
            ${item.color === "cyan" ? badgePatterns.countCyan : ""}
            ${item.color === "purple" ? badgePatterns.countPurple : ""}
          `}
          >
            {badge}
          </div>
        )}
      </button>
    );
  };

  // Render navigation section
  const renderSection = (items, title, isQuickAccess = false) => {
    if (items.length === 0) return null;

    return (
      <div>
        {/* Add top margin for titled sections in collapsed mode (except Quick Access which has divider) */}
        {title && isSidebarCollapsed && !isQuickAccess && (
          <div className={navigationPatterns.sectionSpacing.top} />
        )}

        {/* Show divider above Quick Actions - gradient fade effect */}
        {isQuickAccess && (
          <div
            className={`${navigationPatterns.sectionSpacing.bottom} ${navigationPatterns.dividers.gradientCyan}`}
          />
        )}

        {title && !isSidebarCollapsed && (
          <div className={navigationPatterns.desktop.sectionHeader}>
            <h3 className={navigationPatterns.desktop.sectionTitle}>{title}</h3>
          </div>
        )}
        <div className={navigationPatterns.sectionSpacing.bottom}>
          {items.map((item) => renderNavItem(item))}
        </div>

        {/* Show divider below Quick Actions - gradient fade effect */}
        {isQuickAccess && (
          <div
            className={`${navigationPatterns.sectionSpacing.top} ${navigationPatterns.dividers.gradientCyan}`}
          />
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        ${navigationPatterns.desktop.container}
        ${isSidebarCollapsed ? navigationPatterns.desktop.containerCollapsed : navigationPatterns.desktop.containerExpanded}
      `}
      role="navigation"
      aria-label="Desktop sidebar navigation"
    >
      <div className={navigationPatterns.desktop.innerContainer}>
        {/* Collapse/Expand Toggle Button */}
        <button
          onClick={toggleCollapse}
          className={`${navigationPatterns.desktop.collapseButton} pointer-events-auto`}
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ pointerEvents: "auto" }}
        >
          <svg
            className={`
              ${navigationPatterns.desktop.collapseIcon}
              ${isSidebarCollapsed ? navigationPatterns.desktop.collapseIconRotated : ""}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Brand/Logo Section */}
        <Link
          to="/"
          className={`
            ${navigationPatterns.desktop.brandSection}
            ${isSidebarCollapsed ? navigationPatterns.desktop.brandSectionCollapsed : ""}
            hover:opacity-80 transition-opacity duration-200 cursor-pointer
          `}
          title="Go to NeonPanda home"
        >
          {isSidebarCollapsed ? (
            // Collapsed: Show just the panda head
            <img
              src="/images/logo-dark-sm-head.webp"
              alt="NeonPanda"
              className={`${navigationPatterns.desktop.brandLogoCollapsed} object-contain`}
            />
          ) : (
            // Expanded: Show full logo (smaller size)
            <img
              src="/images/logo-dark-sm.webp"
              alt="NeonPanda"
              className="h-8 w-auto object-contain"
            />
          )}
        </Link>

        {/* Navigation Section - Scrollable */}
        <nav className={navigationPatterns.desktop.navSection}>
          {/* Coaches and Quick Actions */}
          <div className={navigationPatterns.sectionSpacing.bottom}>
            {/* Coaches - Standalone (from primary navigation) */}
            {primaryItems.length > 0 &&
              primaryItems.find((item) => item.id === "coaches") &&
              renderNavItem(primaryItems.find((item) => item.id === "coaches"))}

            {/* Quick Actions - Standalone (directly under Coaches) */}
            {quickAccessItems.length > 0 && (
              <QuickActionsPopover
                quickActionItems={quickAccessItems}
                isSidebarCollapsed={isSidebarCollapsed}
                context={context}
                handleItemClick={handleItemClick}
                getItemColorClasses={getItemColorClasses}
              />
            )}
          </div>

          {/* Divider before Your Training Section */}
          {contextualItems.length > 0 && (
            <div
              className={`${navigationPatterns.sectionSpacing.both} ${navigationPatterns.dividers.gradientCyan}`}
            />
          )}

          {/* Your Training Section (includes Training Grounds and all other contextual items) */}
          {contextualItems.length > 0 && (
            <>
              {/* Section header */}
              {!isSidebarCollapsed && (
                <div className={navigationPatterns.desktop.sectionHeader}>
                  <h3 className={navigationPatterns.desktop.sectionTitle}>
                    Your Training
                  </h3>
                </div>
              )}

              {/* All Your Training items (including Training Grounds) */}
              <div className={navigationPatterns.sectionSpacing.bottom}>
                {contextualItems.map((item) => renderNavItem(item))}
              </div>

              {/* Divider after Your Training section */}
              <div
                className={`${navigationPatterns.sectionSpacing.top} ${navigationPatterns.dividers.gradientCyan}`}
              />
            </>
          )}

          {/* Account Navigation (Settings, Sign Out) */}
          {accountItems.length > 0 && (
            <div className={navigationPatterns.sectionSpacing.top}>
              {renderSection(accountItems, "Account & Settings")}
            </div>
          )}

          {/* Divider before More Resources */}
          {utilityItems.length > 0 && (
            <div
              className={`${navigationPatterns.sectionSpacing.top} ${navigationPatterns.dividers.gradientCyan}`}
            />
          )}

          {/* Help & Info - Single button that opens popover */}
          {utilityItems.length > 0 && (
            <UtilityPopover
              utilityItems={utilityItems}
              isSidebarCollapsed={isSidebarCollapsed}
              navigate={navigate}
              context={context}
              getItemRoute={getItemRoute}
              getItemColorClasses={getItemColorClasses}
            />
          )}
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className={navigationPatterns.desktop.profileSection}>
            <button
              className={`
                ${navigationPatterns.desktop.profileButton}
                ${isSidebarCollapsed ? navigationPatterns.desktop.profileButtonCollapsed : ""}
              `}
              onClick={() => {
                const userId =
                  user?.attributes?.["custom:user_id"] || context.userId;
                navigate(userId ? `/settings?userId=${userId}` : "/settings");
              }}
              aria-label="User settings"
              title={isSidebarCollapsed ? getDisplayName() : undefined}
            >
              {/* Avatar - using UserAvatar component */}
              <div
                className={`
                flex-shrink-0
                ${isSidebarCollapsed ? "w-8 h-8" : "w-10 h-10"}
              `}
              >
                <UserAvatar
                  email={user?.attributes?.email || user?.email}
                  username={getDisplayName()}
                  size={isSidebarCollapsed ? 32 : 40}
                />
              </div>

              {/* User Info */}
              <div
                className={`
                ${navigationPatterns.desktop.profileInfo}
                ${isSidebarCollapsed ? navigationPatterns.desktop.profileInfoCollapsed : ""}
              `}
              >
                <div className={navigationPatterns.desktop.profileName}>
                  {getDisplayName()}
                </div>
                <div className={navigationPatterns.desktop.profileEmail}>
                  {user?.attributes?.email || user?.email}
                </div>
              </div>

              {/* Chevron */}
              <svg
                className={`
                  ${navigationPatterns.desktop.profileChevron}
                  ${isSidebarCollapsed ? navigationPatterns.desktop.profileChevronCollapsed : ""}
                `}
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
            </button>
          </div>
        )}
      </div>
      <Tooltip
        id="sidebar-nav-tooltip"
        place="right"
        {...tooltipPatterns.standard}
      />

      {/* Quick Access Popovers */}
      {quickAccessItems.map((item) => (
        <QuickAccessPopover
          key={item.id}
          isOpen={activePopover === item.popoverType}
          onClose={() => setActivePopover(null)}
          popoverType={item.popoverType}
          userId={context.userId}
          coachId={context.coachId}
          anchorRef={popoverRefs.current[item.id]}
          onCommandPaletteToggle={context.onCommandPaletteToggle}
          coachData={context.coachData}
        />
      ))}
    </aside>
  );
};

export default SidebarNav;
