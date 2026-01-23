// Navigation Utility Functions
// Helper functions for navigation logic and UI

import { navigationPatterns } from "../ui/uiPatterns";

/**
 * Check if navigation item should be visible based on context
 * @param {Object} item - Navigation item from navigationConfig
 * @param {Object} context - Navigation context (auth, coach, etc.)
 * @returns {boolean}
 */
export const isItemVisible = (item, context) => {
  // Hide item when authenticated if specified (e.g., Sign Up)
  if (item.hideWhenAuthenticated && context.isAuthenticated) return false;

  // Always visible items (public pages)
  if (item.alwaysVisible) return true;

  // Requires authentication
  if (item.requiresAuth && !context.isAuthenticated) return false;

  // Requires coach context (userId + coachId)
  if (item.requiresCoach && !context.hasCoachContext) return false;

  return true;
};

/**
 * Get the route for a navigation item
 * @param {Object} item - Navigation item
 * @param {Object} context - Navigation context
 * @returns {string} Route path
 */
export const getItemRoute = (item, context) => {
  // Static route
  if (item.route) return item.route;

  // Dynamic route via function
  if (item.getRoute) {
    return item.getRoute({
      isAuthenticated: context.isAuthenticated,
      userId: context.userId,
      coachId: context.coachId,
      hasCoachContext: context.hasCoachContext,
    });
  }

  // Fallback
  return "#";
};

/**
 * Get badge count/indicator for navigation item
 * @param {Object} item - Navigation item
 * @param {Object} context - Navigation context
 * @returns {number|null} Badge count or null
 */
export const getItemBadge = (item, context) => {
  if (!item.badge) return null;

  // Function badge (e.g., dynamic count from context)
  if (typeof item.badge === "function") {
    return item.badge({
      newItemCounts: context.newItemCounts,
      hasCoachContext: context.hasCoachContext,
      coachesCount: context.coachesCount,
      exercisesCount: context.exercisesCount,
      sharedProgramsCount: context.sharedProgramsCount,
    });
  }

  // Static badge
  return item.badge;
};

/**
 * Check if a route is currently active
 * @param {string} itemRoute - The navigation item's route
 * @param {string} currentPath - Current pathname
 * @param {Object} currentSearchParams - Current URL search params
 * @returns {boolean}
 */
export const isRouteActive = (itemRoute, currentPath, currentSearchParams) => {
  // Exact match for simple routes
  if (itemRoute === currentPath) return true;

  // For routes with query params, check if base path matches
  const itemPath = itemRoute.split("?")[0];
  if (itemPath === currentPath) return true;

  return false;
};

/**
 * Get color classes for navigation item
 * @param {string} color - Color name ('pink', 'cyan', 'purple')
 * @param {boolean} isActive - Whether item is currently active
 * @returns {Object} Color class strings
 */
export const getItemColorClasses = (color, isActive = false) => {
  // Get colors from centralized UI patterns
  const colors = navigationPatterns.colors;

  // Default to cyan if color not found
  return colors[color] || colors.cyan;
};

/**
 * Trigger haptic feedback (mobile only)
 * @param {number|Array} pattern - Vibration pattern (ms or array of [on, off, on, ...])
 */
export const triggerHaptic = (pattern = 10) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

/**
 * Get ARIA label for navigation item
 * @param {Object} item - Navigation item
 * @param {Object} context - Navigation context
 * @returns {string}
 */
export const getItemAriaLabel = (item, context) => {
  const badge = getItemBadge(item, context);
  const baseLabel = item.label;

  if (badge && badge > 0) {
    return `${baseLabel}, ${badge} new item${badge > 1 ? "s" : ""}`;
  }

  return baseLabel;
};

/**
 * Group navigation items by category
 * @param {Array} items - Array of navigation items
 * @param {Object} context - Navigation context
 * @returns {Object} Grouped items { visible: [], hidden: [] }
 */
export const groupItemsByVisibility = (items, context) => {
  const visible = [];
  const hidden = [];

  items.forEach((item) => {
    if (isItemVisible(item, context)) {
      visible.push(item);
    } else {
      hidden.push(item);
    }
  });

  return { visible, hidden };
};

/**
 * Get total badge count across multiple items
 * @param {Array} items - Array of navigation items
 * @param {Object} context - Navigation context
 * @returns {number}
 */
export const getTotalBadgeCount = (items, context) => {
  return items.reduce((total, item) => {
    const badge = getItemBadge(item, context);
    return total + (typeof badge === "number" ? badge : 0);
  }, 0);
};

/**
 * Format route with query parameters
 * @param {string} basePath - Base route path
 * @param {Object} params - Query parameters
 * @returns {string}
 */
export const formatRoute = (basePath, params = {}) => {
  const queryString = Object.entries(params)
    .filter(([_, value]) => value != null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return queryString ? `${basePath}?${queryString}` : basePath;
};
