// Navigation System - Barrel Export
// Central export point for all navigation components and utilities

// Context
export { NavigationProvider, useNavigationContext } from '../../contexts/NavigationContext';

// Configuration & Utilities (re-exported from utils folder for convenience)
export * from '../../utils/navigation';

// Components

// Phase 2: Mobile Bottom Navigation (✅ Complete)
export { default as BottomNav } from './BottomNav';
export { default as MoreMenu } from './MoreMenu';

// Phase 3: Desktop Sidebar Navigation (✅ Complete)
export { default as SidebarNav } from './SidebarNav';

// Phase 4: Enhanced Quick Actions (✅ Complete)
export { default as QuickActionsFAB } from './QuickActionsFAB';

// Phase 5+: Future Enhancements (Coming soon)
// export { default as FloatingMenuDesktop } from './FloatingMenuDesktop';
// export { default as NavItem } from './NavItem';
// export { default as NavBadge } from './NavBadge';

