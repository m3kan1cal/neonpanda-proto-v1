// Navigation Configuration
// Central route and navigation item definitions for NeonPanda

import {
  HomeIcon,
  HomeIconTiny,
  WorkoutIcon,
  WorkoutIconTiny,
  ReportIcon,
  ReportsIconTiny,
  ChatIconSmall,
  MemoryIcon,
  MemoryIconTiny,
  SettingsIconTiny,
  FAQIconTiny,
  AboutIconTiny,
  TechnologyIconTiny,
  ChangelogIconTiny,
  SupportIconTiny,
  CollaborateIconTiny,
  SignOutIconTiny,
  WaitlistIconTiny,
} from '../themes/SynthwaveComponents';

/**
 * Navigation items configuration
 * Each item can have:
 * - id: unique identifier
 * - label: display text
 * - icon: component from SynthwaveComponents
 * - route: static route string
 * - getRoute: function that generates route from context
 * - requiresAuth: boolean - requires authentication
 * - requiresCoach: boolean - requires coach context (userId + coachId)
 * - badge: function that returns badge count from context
 * - color: 'pink', 'cyan', or 'purple' (for UI theming)
 * - onClick: function for non-navigation actions
 * - alwaysVisible: boolean - show even when not authenticated
 */

export const navigationItems = {
  // ==========================================
  // PRIMARY NAVIGATION
  // Always visible to authenticated users
  // These are the main 3 tabs on mobile bottom nav
  // ==========================================
  primary: [
    {
      id: 'home',
      label: 'Home',
      icon: HomeIconTiny,
      getRoute: (ctx) => {
        if (!ctx.isAuthenticated) return '/';
        if (!ctx.coachId) return `/coaches?userId=${ctx.userId}`;
        return `/training-grounds?userId=${ctx.userId}&coachId=${ctx.coachId}`;
      },
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'training',
      label: 'Training',
      icon: WorkoutIcon,
      getRoute: (ctx) => `/training-grounds?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => {
        const total = (ctx.newItemCounts.workouts || 0) + (ctx.newItemCounts.conversations || 0);
        return total > 0 ? total : null;
      },
      color: 'cyan',
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: ReportIcon,
      getRoute: (ctx) => `/training-grounds/reports?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => (ctx.newItemCounts.reports || 0) > 0 ? '•' : null,
      color: 'purple',
    },
  ],

  // ==========================================
  // CONTEXTUAL NAVIGATION
  // Only show when coach context exists
  // These appear in sidebar (desktop) and More menu (mobile)
  // ==========================================
  contextual: [
    {
      id: 'workouts',
      label: 'Workouts',
      icon: WorkoutIconTiny,
      getRoute: (ctx) => `/training-grounds/manage-workouts?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => (ctx.newItemCounts.workouts || 0) > 0 ? ctx.newItemCounts.workouts : null,
      color: 'cyan',
    },
    {
      id: 'conversations',
      label: 'Conversations',
      icon: ChatIconSmall,
      getRoute: (ctx) => `/training-grounds/manage-conversations?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => (ctx.newItemCounts.conversations || 0) > 0 ? ctx.newItemCounts.conversations : null,
      color: 'pink',
    },
    {
      id: 'memories',
      label: 'Memories',
      icon: MemoryIconTiny,
      getRoute: (ctx) => `/training-grounds/manage-memories?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      color: 'cyan',
    },
  ],

  // ==========================================
  // UTILITY NAVIGATION
  // Settings, help, public pages
  // Available to all users
  // ==========================================
  utility: [
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIconTiny,
      getRoute: (ctx) => `/settings?userId=${ctx.userId}`,
      requiresAuth: true,
      color: 'cyan',
    },
    {
      id: 'faqs',
      label: 'FAQs',
      icon: FAQIconTiny,
      route: '/faqs',
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'about',
      label: 'About',
      icon: AboutIconTiny,
      route: '/about',
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'technology',
      label: 'Technology',
      icon: TechnologyIconTiny,
      route: '/technology',
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'changelog',
      label: 'Changelog',
      icon: ChangelogIconTiny,
      route: '/changelog',
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'waitlist',
      label: 'Get Early Access',
      icon: WaitlistIconTiny,
      route: '/contact?type=waitlist',
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'support',
      label: 'Support',
      icon: SupportIconTiny,
      route: '/contact?type=support',
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'collaborate',
      label: 'Collaborate',
      icon: CollaborateIconTiny,
      route: '/contact?type=collaborate',
      alwaysVisible: true,
      color: 'cyan',
    },
    {
      id: 'signout',
      label: 'Sign Out',
      icon: SignOutIconTiny,
      onClick: (ctx) => ctx.signOut(),
      requiresAuth: true,
      color: 'purple',
    },
  ],
};

// ==========================================
// CONFIGURATION CONSTANTS
// ==========================================

// Navigation breakpoint (matches Tailwind 'md')
export const NAV_BREAKPOINT = 768;

// Mobile bottom nav tab limit (including More tab)
export const MOBILE_TAB_LIMIT = 4;

// Badge refresh interval (milliseconds)
export const BADGE_REFRESH_INTERVAL = 30000; // 30 seconds

