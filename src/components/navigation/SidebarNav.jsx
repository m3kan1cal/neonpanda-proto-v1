// SidebarNav.jsx - Desktop Left Sidebar Navigation
// Floating icon rail (collapsed) with hover-expansion overlay.
// Pinned mode (expanded) behaves as a traditional sidebar that pushes content.

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
import { logger } from "../../utils/logger";

// Quick Actions Popover Component with Floating UI positioning
const QuickActionsPopover = ({
  quickActionItems,
  isSidebarCollapsed,
  context,
  handleItemClick,
  getItemColorClasses,
  popoverRefs,
}) => {
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
    return {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: chatInputRect.top - 16,
      width: window.innerWidth,
      height: chatInputRect.top - 16,
      x: 0,
      y: 0,
    };
  };

  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    middleware: [
      offset(0),
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
        const getHoverClasses = () =>
          "hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-pink/50";

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
                focus:outline-none active:outline-none
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
              {/* Icon — pill container in rail mode */}
              <div
                className={`
                  relative
                  ${
                    isSidebarCollapsed
                      ? `${navigationPatterns.desktop.navItemIconRail} ${open ? navigationPatterns.desktop.navItemIconRailActivePink : ""}`
                      : "w-5 h-5 shrink-0 flex items-center justify-center"
                  }
                  ${open ? colorClasses.glow : ""}
                  transition-all duration-200
                `}
              >
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
                <div className={navigationPatterns.utilityFlyout.header}>
                  <h3 className={navigationPatterns.utilityFlyout.headerTitle}>
                    Quick Actions
                  </h3>
                </div>
                <div className={navigationPatterns.utilityFlyout.itemsContainer}>
                  {quickActionItems.map((item) => {
                    const Icon = item.icon;
                    const itemColorClasses = getItemColorClasses(
                      item.color || "pink",
                      false,
                    );
                    return (
                      <button
                        key={item.id}
                        ref={
                          item.popoverType
                            ? popoverRefs.current[item.id]
                            : null
                        }
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
                          focus:outline-none active:outline-none w-full
                        `}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        {Icon && (
                          <div className={navigationPatterns.desktop.navItemIcon}>
                            <Icon className="w-5 h-5" />
                          </div>
                        )}
                        <span className={navigationPatterns.desktop.navItemLabel}>
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
    return {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: chatInputRect.top - 16,
      width: window.innerWidth,
      height: chatInputRect.top - 16,
      x: 0,
      y: 0,
    };
  };

  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    middleware: [
      offset(0),
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
        const getHoverClasses = () =>
          "hover:border-synthwave-neon-cyan/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-cyan/50";

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
                focus:outline-none active:outline-none
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
              {/* Icon — pill container in rail mode */}
              <div
                className={`
                  relative
                  ${
                    isSidebarCollapsed
                      ? `${navigationPatterns.desktop.navItemIconRail} ${open ? navigationPatterns.desktop.navItemIconRailActiveCyan : ""}`
                      : "w-5 h-5 shrink-0 flex items-center justify-center"
                  }
                  ${open ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" : ""}
                  transition-all duration-200
                `}
              >
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
                  <div className={navigationPatterns.utilityFlyout.header}>
                    <h3 className={navigationPatterns.utilityFlyout.headerTitle}>
                      More Resources
                    </h3>
                  </div>
                  <div className={navigationPatterns.utilityFlyout.itemsContainer}>
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
                            focus:outline-none active:outline-none w-full
                          `}
                          style={{ WebkitTapHighlightColor: "transparent" }}
                        >
                          {Icon && (
                            <div className={navigationPatterns.desktop.navItemIcon}>
                              <Icon className="w-5 h-5" />
                            </div>
                          )}
                          <span className={navigationPatterns.desktop.navItemLabel}>
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

  const [activePopover, setActivePopover] = useState(null);
  // True when the user is hovering over the rail in collapsed mode
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const popoverRefs = useRef({});

  // effectivelyCollapsed: controls label/section visibility
  // true  → show icon-only (rail view)
  // false → show full labels (pinned or hover-expanded)
  const effectivelyCollapsed = isSidebarCollapsed && !isHoverExpanded;

  const toggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsHoverExpanded(false);
  };

  const handleMouseEnter = () => {
    if (isSidebarCollapsed) setIsHoverExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsHoverExpanded(false);
  };

  // Pick the right container class for current state
  const getContainerClass = () => {
    if (!isSidebarCollapsed) return navigationPatterns.desktop.containerPinned;
    if (isHoverExpanded) return navigationPatterns.desktop.containerRailExpanded;
    return navigationPatterns.desktop.containerRail;
  };

  const handleItemClick = (item) => {
    if (item.popoverType) {
      setActivePopover(
        activePopover === item.popoverType ? null : item.popoverType,
      );
      return;
    }
    if (item.action) {
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
        logger.info(
          `Quick action clicked: ${item.action} - Command palette not available`,
        );
      }
      return;
    }
    if (item.onClick) {
      item.onClick(context);
      return;
    }
    const route = getItemRoute(item, context);
    if (route === "#") return;
    navigate(route);
  };

  const isActive = (item) => {
    const route = getItemRoute(item, context);
    return isRouteActive(route, location.pathname, context.currentSearchParams);
  };

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

  quickAccessItems.forEach((item) => {
    if (item.popoverType && !popoverRefs.current[item.id]) {
      popoverRefs.current[item.id] = React.createRef();
    }
  });

  const getDisplayName = () =>
    userProfile?.displayName ||
    user?.attributes?.preferred_username ||
    user?.attributes?.email ||
    user?.email ||
    "User";

  // Render a single navigation item
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

    if (item.popoverType && !popoverRefs.current[item.id]) {
      popoverRefs.current[item.id] = React.createRef();
    }

    // Active background: pill in rail mode, top/bottom border tint in expanded mode
    const getActiveClasses = () => {
      if (effectivelyCollapsed) return ""; // icon pill handles rail active state
      if (item.color === "pink")
        return "bg-synthwave-bg-primary/30 border-t-synthwave-neon-pink/30 border-b-synthwave-neon-pink/30";
      if (item.color === "cyan")
        return "bg-synthwave-bg-primary/30 border-t-synthwave-neon-cyan/30 border-b-synthwave-neon-cyan/30";
      if (item.color === "purple")
        return "bg-synthwave-bg-primary/30 border-t-synthwave-neon-purple/30 border-b-synthwave-neon-purple/30";
      return "";
    };

    const getHoverClasses = () => {
      if (item.color === "pink")
        return "hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-pink/50";
      if (item.color === "cyan")
        return "hover:border-synthwave-neon-cyan/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-cyan/50";
      if (item.color === "purple")
        return "hover:border-synthwave-neon-purple/50 hover:bg-synthwave-bg-primary/20 focus:ring-2 focus:ring-synthwave-neon-purple/50";
      return "";
    };

    // Pill fill class for active icon in rail mode
    const getRailIconPillClass = () => {
      if (item.color === "pink")
        return navigationPatterns.desktop.navItemIconRailActivePink;
      if (item.color === "cyan")
        return navigationPatterns.desktop.navItemIconRailActiveCyan;
      if (item.color === "purple")
        return navigationPatterns.desktop.navItemIconRailActivePurple;
      return "bg-white/10";
    };

    return (
      <button
        key={item.id}
        ref={item.popoverType ? popoverRefs.current[item.id] : null}
        onClick={() => handleItemClick(item)}
        disabled={isDisabled}
        className={`
          ${navigationPatterns.desktop.navItem}
          ${effectivelyCollapsed ? navigationPatterns.desktop.navItemCollapsed : ""}
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
        title={effectivelyCollapsed ? item.label : undefined}
        data-tooltip-id={
          effectivelyCollapsed ? "sidebar-nav-tooltip" : undefined
        }
        data-tooltip-content={effectivelyCollapsed ? item.label : undefined}
      >
        {/* Icon — pill container in rail mode, plain wrapper in expanded mode */}
        <div
          className={`
            relative
            ${
              effectivelyCollapsed
                ? `${navigationPatterns.desktop.navItemIconRail} ${active ? getRailIconPillClass() : ""}`
                : "w-5 h-5 shrink-0 flex items-center justify-center"
            }
            ${active ? colorClasses.glow : ""}
            transition-all duration-200
          `}
        >
          <Icon className="w-5 h-5" />

          {/* Badge dot indicator in rail mode */}
          {badge !== null && badge !== undefined && effectivelyCollapsed && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-synthwave-neon-pink shadow-[0_0_5px_rgba(255,0,128,0.7)]" />
          )}
        </div>

        {/* Label */}
        <span
          className={`
            ${navigationPatterns.desktop.navItemLabel}
            ${effectivelyCollapsed ? navigationPatterns.desktop.navItemLabelCollapsed : ""}
          `}
        >
          {item.label}
        </span>

        {/* Badge count — only in expanded mode */}
        {badge !== null && badge !== undefined && !effectivelyCollapsed && (
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

  // Render a section of navigation items with optional title
  const renderSection = (items, title, isQuickAccess = false) => {
    if (items.length === 0) return null;
    return (
      <div>
        {title && effectivelyCollapsed && !isQuickAccess && (
          <div className={navigationPatterns.sectionSpacing.top} />
        )}
        {isQuickAccess && (
          <div
            className={`${navigationPatterns.sectionSpacing.bottom} ${navigationPatterns.dividers.gradientCyan}`}
          />
        )}
        {title && !effectivelyCollapsed && (
          <div className={navigationPatterns.desktop.sectionHeader}>
            <h3 className={navigationPatterns.desktop.sectionTitle}>{title}</h3>
          </div>
        )}
        <div className={navigationPatterns.sectionSpacing.bottom}>
          {items.map((item) => renderNavItem(item))}
        </div>
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
      className={getContainerClass()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="navigation"
      aria-label="Desktop sidebar navigation"
    >
      <div className={navigationPatterns.desktop.innerContainer}>
        {/* Pin Button — appears on hover (rail mode) or always when pinned */}
        {(isHoverExpanded || !isSidebarCollapsed) && (
          <button
            onClick={toggleCollapse}
            className={
              isSidebarCollapsed
                ? navigationPatterns.desktop.pinButton
                : navigationPatterns.desktop.pinButtonPinned
            }
            aria-label={
              isSidebarCollapsed ? "Pin sidebar open" : "Unpin sidebar"
            }
            title={isSidebarCollapsed ? "Pin sidebar open" : "Unpin sidebar"}
          >
            {/* Pushpin icon — filled when pinned, outline-style when not */}
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              {isSidebarCollapsed ? (
                // Unpin outline (click to pin)
                <path d="M17 4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1h1v7l-2 2v1h5v5h2v-5h5v-1l-2-2V5h1V4zm-3 8H10V5h4v7z" />
              ) : (
                // Pinned fill (click to unpin)
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              )}
            </svg>
          </button>
        )}

        {/* Brand/Logo Section */}
        <Link
          to="/"
          className={`
            ${navigationPatterns.desktop.brandSection}
            ${effectivelyCollapsed ? navigationPatterns.desktop.brandSectionCollapsed : ""}
            hover:opacity-80 transition-opacity duration-200 cursor-pointer
          `}
          title="Go to NeonPanda home"
        >
          {effectivelyCollapsed ? (
            <img
              src="/images/logo-dark-sm-head.webp"
              alt="NeonPanda"
              className={`${navigationPatterns.desktop.brandLogoCollapsed} object-contain`}
            />
          ) : (
            <img
              src="/images/logo-dark-sm.webp"
              alt="NeonPanda"
              className="h-8 w-auto object-contain"
            />
          )}
        </Link>

        {/* Navigation Section — Scrollable */}
        <nav className={navigationPatterns.desktop.navSection}>
          {/* Coaches + Quick Actions */}
          <div className={navigationPatterns.sectionSpacing.bottom}>
            {primaryItems.length > 0 &&
              primaryItems.find((item) => item.id === "coaches") &&
              renderNavItem(primaryItems.find((item) => item.id === "coaches"))}

            {quickAccessItems.length > 0 && (
              <QuickActionsPopover
                quickActionItems={quickAccessItems}
                isSidebarCollapsed={effectivelyCollapsed}
                context={context}
                handleItemClick={handleItemClick}
                getItemColorClasses={getItemColorClasses}
                popoverRefs={popoverRefs}
              />
            )}
          </div>

          {/* Divider before Your Training */}
          {contextualItems.length > 0 && (
            <div
              className={`${navigationPatterns.sectionSpacing.both} ${navigationPatterns.dividers.gradientCyan}`}
            />
          )}

          {/* Your Training Section */}
          {contextualItems.length > 0 && (
            <>
              {!effectivelyCollapsed && (
                <div className={navigationPatterns.desktop.sectionHeader}>
                  <h3 className={navigationPatterns.desktop.sectionTitle}>
                    Your Training
                  </h3>
                </div>
              )}
              <div className={navigationPatterns.sectionSpacing.bottom}>
                {contextualItems.map((item) => renderNavItem(item))}
              </div>
              <div
                className={`${navigationPatterns.sectionSpacing.top} ${navigationPatterns.dividers.gradientCyan}`}
              />
            </>
          )}

          {/* Account (Settings, Sign Out) */}
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

          {/* More Resources popover */}
          {utilityItems.length > 0 && (
            <UtilityPopover
              utilityItems={utilityItems}
              isSidebarCollapsed={effectivelyCollapsed}
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
                ${effectivelyCollapsed ? navigationPatterns.desktop.profileButtonCollapsed : ""}
              `}
              onClick={() => {
                const userId =
                  user?.attributes?.["custom:user_id"] || context.userId;
                navigate(userId ? `/settings?userId=${userId}` : "/settings");
              }}
              aria-label="User settings"
              title={effectivelyCollapsed ? getDisplayName() : undefined}
            >
              <div
                className={`shrink-0 ${effectivelyCollapsed ? "w-8 h-8" : "w-10 h-10"}`}
              >
                <UserAvatar
                  email={user?.attributes?.email || user?.email}
                  username={getDisplayName()}
                  size={effectivelyCollapsed ? 32 : 40}
                />
              </div>

              <div
                className={`
                  ${navigationPatterns.desktop.profileInfo}
                  ${effectivelyCollapsed ? navigationPatterns.desktop.profileInfoCollapsed : ""}
                `}
              >
                <div className={navigationPatterns.desktop.profileName}>
                  {getDisplayName()}
                </div>
                <div className={navigationPatterns.desktop.profileEmail}>
                  {user?.attributes?.email || user?.email}
                </div>
              </div>

              <svg
                className={`
                  ${navigationPatterns.desktop.profileChevron}
                  ${effectivelyCollapsed ? navigationPatterns.desktop.profileChevronCollapsed : ""}
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
