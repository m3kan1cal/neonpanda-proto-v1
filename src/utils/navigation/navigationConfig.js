// Navigation Configuration
// Central route and navigation item definitions for NeonPanda

import {
  HomeIcon,
  HomeIconTiny,
  SparkleIconTiny,
  CoachIconTiny,
  WorkoutIcon,
  WorkoutIconTiny,
  ReportIcon,
  ReportsIconTiny,
  ChatIconSmall,
  MemoryIcon,
  MemoryIconTiny,
  SettingsIconTiny,
  CoachesIconTiny,
  FAQIconTiny,
  AboutIconTiny,
  TechnologyIconTiny,
  ChangelogIconTiny,
  SupportIconTiny,
  NetworkIconTiny,
  CollaborateIconTiny,
  SignOutIconTiny,
  WaitlistIconTiny,
  MenuIcon,
  LightningIconSmall,
  CoachIconSmall,
  ProgramIconTiny,
} from '../../components/themes/SynthwaveComponents';

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
      id: 'coaches',
      label: 'Coaches',
      icon: CoachIconTiny,
      getRoute: (ctx) => {
        if (!ctx.isAuthenticated) return '/';
        // Always go to coaches page for authenticated users (their coach hub)
        return `/coaches?userId=${ctx.userId}`;
      },
      alwaysVisible: true,
      badge: (ctx) => ctx.coachesCount || 0, // Total coaches count
      color: 'pink',
    },
  ],

  // ==========================================
  // CONTEXTUAL NAVIGATION
  // Only show when coach context exists
  // These appear in sidebar (desktop) and More menu (mobile)
  // ==========================================
  contextual: [
    {
      id: 'training-grounds',
      label: 'Training Grounds',
      icon: NetworkIconTiny,
      getRoute: (ctx) => `/training-grounds?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      color: 'pink',
    },
    {
      id: 'programs',
      label: 'Training Programs',
      icon: ProgramIconTiny,
      getRoute: (ctx) => `/training-grounds/programs?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true, // Requires coachId to show contextual nav items
      badge: (ctx) => ctx.newItemCounts.programs || 0, // Always show count
      color: 'pink',
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: ReportsIconTiny,
      getRoute: (ctx) => `/training-grounds/reports?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => ctx.newItemCounts.reports || 0, // Always show count
      color: 'pink',
    },
    {
      id: 'workouts',
      label: 'Workouts',
      icon: WorkoutIconTiny,
      getRoute: (ctx) => `/training-grounds/manage-workouts?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => ctx.newItemCounts.workouts || 0, // Always show count
      color: 'pink',
    },
    {
      id: 'conversations',
      label: 'Conversations',
      icon: ChatIconSmall,
      getRoute: (ctx) => `/training-grounds/manage-conversations?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => ctx.newItemCounts.conversations || 0, // Always show count
      color: 'pink',
    },
    {
      id: 'memories',
      label: 'Memories',
      icon: MemoryIconTiny,
      getRoute: (ctx) => `/training-grounds/manage-memories?userId=${ctx.userId}&coachId=${ctx.coachId}`,
      requiresAuth: true,
      requiresCoach: true,
      badge: (ctx) => ctx.newItemCounts.memories || 0, // Always show count
      color: 'pink',
    },
  ],

  // ==========================================
  // QUICK ACTIONS
  // Quick creation actions and coach details
  // Only show when coach context exists
  // Pink buttons for creation, coach details for info
  // ==========================================
  quickAccess: [
    {
      id: 'quick-access-log-workout',
      label: 'Log Workout',
      icon: WorkoutIconTiny,
      requiresAuth: true,
      requiresCoach: true,
      color: 'pink',
      action: 'log-workout', // Special flag for command palette action
    },
    {
      id: 'quick-access-start-conversation',
      label: 'Start Conversation',
      icon: ChatIconSmall,
      requiresAuth: true,
      requiresCoach: true,
      color: 'pink',
      action: 'start-conversation', // Special flag for command palette action
    },
    {
      id: 'quick-access-save-memory',
      label: 'Save Memory',
      icon: MemoryIconTiny,
      requiresAuth: true,
      requiresCoach: true,
      color: 'pink',
      action: 'save-memory', // Special flag for command palette action
    },
    {
      id: 'quick-access-coach',
      label: 'Coach Details',
      icon: CoachIconSmall,
      requiresAuth: true,
      requiresCoach: true,
      color: 'pink',
      popoverType: 'coach', // Opens coach details popover
    },
  ],

  // ==========================================
  // ACCOUNT NAVIGATION
  // Settings and sign out
  // Only visible to authenticated users
  // ==========================================
  account: [
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIconTiny,
      getRoute: (ctx) => `/settings?userId=${ctx.userId}`,
      requiresAuth: true,
      color: 'pink',
    },
    {
      id: 'signout',
      label: 'Sign Out',
      icon: SignOutIconTiny,
      onClick: (ctx) => ctx.signOut(),
      requiresAuth: true,
      color: 'pink',
    },
  ],

  // ==========================================
  // UTILITY NAVIGATION
  // Help, public pages, support
  // Available to all users
  // ==========================================
  utility: [
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

