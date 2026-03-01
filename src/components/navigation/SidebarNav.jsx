// SidebarNav.jsx - Desktop Left Sidebar Navigation
// Transparent icon rail (collapsed) with hover-expansion overlay.
// No pin mode — sidebar is always hover-to-expand only.
// Quick Actions and More Resources use hover-triggered floating flyouts.

import React, { useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  useFloating,
  useHover,
  useInteractions,
  useDismiss,
  safePolygon,
  FloatingPortal,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { useAuth } from "../../auth";
import { useNavigationContext } from "../../contexts/NavigationContext";
import { navigationPatterns, badgePatterns } from "../../utils/ui/uiPatterns";
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
import { logger } from "../../utils/logger";

// HoverFlyout — wraps any trigger + panel in a hover-triggered floating portal.
// safePolygon keeps the flyout open while the mouse travels diagonally to the panel.
const HoverFlyout = ({ triggerContent, panelContent }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    strategy: "fixed",
    placement: "right-start",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: 0, close: 150 },
    handleClose: safePolygon(),
  });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
  ]);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {triggerContent}
      </div>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[100]"
            {...getFloatingProps()}
          >
            {panelContent}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const SidebarNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const context = useNavigationContext();

  // isHoverExpanded: drives container width (switches instantly on mouse enter/leave)
  // isContentExpanded: drives icon/label layout (delayed on enter to let container widen first)
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const expandTimer = useRef(null);
  const collapseTimer = useRef(null);

  // effectivelyCollapsed uses isContentExpanded so internal layout only switches
  // after the container has had time to grow, preventing icon/label jitter
  const effectivelyCollapsed = !isContentExpanded;

  const handleMouseEnter = () => {
    // Cancel any pending collapse — mouse returned before the sidebar closed
    clearTimeout(collapseTimer.current);
    clearTimeout(expandTimer.current);
    setIsHoverExpanded(true);
    expandTimer.current = setTimeout(() => setIsContentExpanded(true), 160);
  };

  const handleMouseLeave = () => {
    // Delay collapse so the mouse can travel into a FloatingPortal flyout panel
    // (which lives outside the <aside> DOM) without the sidebar snapping shut
    clearTimeout(expandTimer.current);
    collapseTimer.current = setTimeout(() => {
      setIsContentExpanded(false);
      setIsHoverExpanded(false);
    }, 300);
  };

  const getContainerClass = () =>
    isHoverExpanded
      ? navigationPatterns.desktop.containerRailExpanded
      : navigationPatterns.desktop.containerRail;

  const handleItemClick = (item) => {
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

  const getDisplayName = () =>
    userProfile?.displayName ||
    user?.attributes?.preferred_username ||
    user?.attributes?.email ||
    user?.email ||
    "User";

  // Render a single navigation item button
  const renderNavItem = (item) => {
    const badge = getItemBadge(item, context);
    const active = isActive(item);
    const colorClasses = getItemColorClasses(item.color, active);
    const Icon = item.icon;
    const ariaLabel = getItemAriaLabel(item, context);
    const route = getItemRoute(item, context);
    const isDisabled = !item.onClick && !item.action && route === "#";

    const getActiveClasses = () => {
      if (effectivelyCollapsed) return "";
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
        return "hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-primary/20";
      if (item.color === "cyan")
        return "hover:border-synthwave-neon-cyan/50 hover:bg-synthwave-bg-primary/20";
      if (item.color === "purple")
        return "hover:border-synthwave-neon-purple/50 hover:bg-synthwave-bg-primary/20";
      return "";
    };

    const getRailIconPillClass = () => {
      if (item.color === "pink")
        return navigationPatterns.desktop.navItemIconRailActivePink;
      if (item.color === "cyan")
        return navigationPatterns.desktop.navItemIconRailActiveCyan;
      if (item.color === "purple")
        return navigationPatterns.desktop.navItemIconRailActivePurple;
      return "border-white/20 bg-white/10";
    };

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        disabled={isDisabled}
        className={`
          ${navigationPatterns.desktop.navItem}
          ${effectivelyCollapsed ? navigationPatterns.desktop.navItemCollapsed : "py-1"}
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
      >
        {/* Icon — always the same pill wrapper size; border/bg fade via transition-colors */}
        <div
          className={`
            relative
            ${navigationPatterns.desktop.navItemIconRail}
            transition-colors duration-200
            ${active && effectivelyCollapsed ? getRailIconPillClass() : ""}
            ${active ? colorClasses.glow : ""}
          `}
        >
          <Icon className="w-5 h-5" />

          {/* Badge dot in rail mode */}
          {badge !== null && badge !== undefined && effectivelyCollapsed && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-synthwave-neon-pink shadow-[0_0_5px_rgba(255,0,128,0.7)]" />
          )}
        </div>

        {/* Label — fades in when expanding, hidden (no layout space) when collapsed */}
        <span
          className={`
            ${navigationPatterns.desktop.navItemLabel}
            ${effectivelyCollapsed ? navigationPatterns.desktop.navItemLabelCollapsed : "nav-label-reveal"}
          `}
        >
          {item.label}
        </span>

        {/* Badge count — expanded mode only */}
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

  // Build the trigger button for Quick Actions / More Resources flyouts
  const buildFlyoutTrigger = ({
    color,
    icon: IconComponent,
    label,
    isOpen,
  }) => {
    const colorClasses = getItemColorClasses(color, false);
    const accentHover =
      color === "pink"
        ? "hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-primary/20"
        : "hover:border-synthwave-neon-cyan/50 hover:bg-synthwave-bg-primary/20";
    const accentOpen =
      color === "pink"
        ? `text-synthwave-neon-pink border-t-synthwave-neon-pink/50 border-b-synthwave-neon-pink/50 bg-synthwave-bg-primary/20`
        : `text-synthwave-neon-cyan border-t-synthwave-neon-cyan/50 border-b-synthwave-neon-cyan/50 bg-synthwave-bg-primary/20`;
    const railActiveClass =
      color === "pink"
        ? navigationPatterns.desktop.navItemIconRailActivePink
        : navigationPatterns.desktop.navItemIconRailActiveCyan;

    return (
      <button
        className={`
          ${navigationPatterns.desktop.navItem}
          ${effectivelyCollapsed ? navigationPatterns.desktop.navItemCollapsed : "py-1"}
          ${isOpen ? accentOpen : `${colorClasses.inactive} ${accentHover}`}
          focus:outline-none active:outline-none
        `}
        style={{ WebkitTapHighlightColor: "transparent" }}
        aria-label={label}
      >
        <div
          className={`
            relative
            ${navigationPatterns.desktop.navItemIconRail}
            transition-colors duration-200
            ${effectivelyCollapsed && isOpen ? railActiveClass : ""}
          `}
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <span
          className={`
            ${navigationPatterns.desktop.navItemLabel}
            ${effectivelyCollapsed ? navigationPatterns.desktop.navItemLabelCollapsed : "nav-label-reveal"}
          `}
        >
          {label}
        </span>
      </button>
    );
  };

  // Flyout panel content shared style
  const FlyoutPanel = ({ title, children }) => (
    <div className={navigationPatterns.utilityFlyout.container}>
      <div className={navigationPatterns.utilityFlyout.header}>
        <h3 className={navigationPatterns.utilityFlyout.headerTitle}>
          {title}
        </h3>
      </div>
      <div className={navigationPatterns.utilityFlyout.itemsContainer}>
        {children}
      </div>
    </div>
  );

  // Quick Actions flyout items
  const quickActionsFlyoutPanel = (
    <FlyoutPanel title="Quick Actions">
      {quickAccessItems.map((item) => {
        const Icon = item.icon;
        const itemColorClasses = getItemColorClasses(
          item.color || "pink",
          false,
        );
        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`
              ${navigationPatterns.desktop.navItem}
              py-2.5
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
    </FlyoutPanel>
  );

  // Quick Actions trigger icon
  const QuickActionsIcon = ({ className }) => (
    <svg
      className={className}
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
  );

  // More Resources trigger icon
  const MoreResourcesIcon = ({ className }) => (
    <svg
      className={className}
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
  );

  // More Resources flyout items
  const moreResourcesFlyoutPanel = (
    <FlyoutPanel title="More Resources">
      {utilityItems.map((item) => {
        const Icon = item.icon;
        const itemColorClasses = getItemColorClasses(
          item.color || "cyan",
          false,
        );
        return (
          <button
            key={item.id}
            onClick={() => {
              const route = getItemRoute(item, context);
              if (route && route !== "#") navigate(route);
            }}
            className={`
              ${navigationPatterns.desktop.navItem}
              py-2.5
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
    </FlyoutPanel>
  );

  const renderSection = (items, title) => {
    if (items.length === 0) return null;
    return (
      <div>
        {title && !effectivelyCollapsed && (
          <div className={navigationPatterns.desktop.sectionHeader}>
            <h3 className={navigationPatterns.desktop.sectionTitle}>{title}</h3>
          </div>
        )}
        <div className={navigationPatterns.sectionSpacing.bottom}>
          {items.map((item) => renderNavItem(item))}
        </div>
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
            {primaryItems.find((item) => item.id === "coaches") &&
              renderNavItem(primaryItems.find((item) => item.id === "coaches"))}

            {quickAccessItems.length > 0 && (
              <HoverFlyout
                triggerContent={buildFlyoutTrigger({
                  color: "pink",
                  icon: QuickActionsIcon,
                  label: "Quick Actions",
                  isOpen: false,
                })}
                panelContent={quickActionsFlyoutPanel}
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
              {renderSection(accountItems)}
            </div>
          )}

          {/* Divider before More Resources */}
          {utilityItems.length > 0 && (
            <div
              className={`${navigationPatterns.sectionSpacing.top} ${navigationPatterns.dividers.gradientCyan}`}
            />
          )}

          {/* More Resources flyout */}
          {utilityItems.length > 0 && (
            <div className={navigationPatterns.sectionSpacing.both}>
              <HoverFlyout
                triggerContent={buildFlyoutTrigger({
                  color: "cyan",
                  icon: MoreResourcesIcon,
                  label: "More Resources",
                  isOpen: false,
                })}
                panelContent={moreResourcesFlyoutPanel}
              />
            </div>
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
    </aside>
  );
};

export default SidebarNav;
