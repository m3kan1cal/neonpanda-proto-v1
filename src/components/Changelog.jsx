import React, { useState, useEffect } from 'react';
import { containerPatterns, layoutPatterns, typographyPatterns } from '../utils/uiPatterns';
import { ChevronDownIcon } from './themes/SynthwaveComponents';
import Footer from './shared/Footer';

// Release icon
const ReleaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

// Modern collapsible section component using 2025 UI patterns
const CollapsibleSection = ({ title, icon, children, defaultOpen = true, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${containerPatterns.collapsibleSection} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={containerPatterns.collapsibleHeader}
      >
        <div className="flex items-center space-x-3">
          <div className="text-synthwave-neon-pink">
            {icon}
          </div>
          <h3 className="font-russo font-bold text-white text-sm uppercase">
            {title}
          </h3>
        </div>
        <div className={`text-synthwave-neon-pink transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {isOpen && (
        <div className={containerPatterns.collapsibleContent}>
          {children}
        </div>
      )}
    </div>
  );
};


const changelogEntries = [
  {
    version: "Release v1.8.0",
    date: "2025-09-16",
    changes: {
      added: [
        "Dynamic random hero image selection from 7 hero images with modern overlay effects",
        "Modern glassmorphism overlay with backdrop blur for improved hero text readability",
        "Parallax effect with fixed background attachment for hero section",
        "User frustration agitation section with authentic testimonial-style comment boxes",
        "6-step 'Get started in minutes' section with alternating neon pink/cyan numbered circles",
        "Vibrant horizontal gradient bands (thin and thick) as visual section separators",
        "Social proof section using glassmorphism comment boxes with subtle backgrounds",
        "Auto-scroll functionality to top of page for ContactForm component",
        "Centralized scrollbar styling system in uiPatterns.js with cyan and pink variants",
        "Enhanced CTA section messaging focused on beta community and early access exclusivity",
        "Inter font integration for modern web readability with sentence case headers",
        "Footer component refactored into reusable shared component",
        "Ethereal glows behind feature screenshots with adjustable opacity controls",
        "Fading vertical lines between feature content and image placeholders"
      ],
      changed: [
        "Landing page structure completely redesigned with Hero → Agitation → Features → Steps → CTA flow",
        "Hero section updated to use dynamic random images instead of static hero-splash-2.jpg",
        "Header typography changed from Russo (uppercase) to Inter (sentence case) for better readability",
        "All section headers standardized to consistent font sizes (text-5xl md:text-6xl lg:text-7xl)",
        "Feature section spacing increased with mb-48 between features for better visual separation",
        "Feature headers now alternate between neon pink and neon cyan colors",
        "Feature description text size increased to text-xl for better readability",
        "Getting Started section background changed to dark slate-950/90 for visual distinction",
        "CTA section messaging refined to focus on revolutionary impact and OG community benefits",
        "Contact form default messaging updated from 'waitlist' to 'early access' terminology",
        "Navigation dropdown 'Join Waitlist' changed to 'Get Early Access'",
        "Feature glows adjusted from /15 to /14 opacity with blur reduced from blur-3xl to blur-2xl",
        "Landing page footer structure moved from inline to reusable Footer component"
      ],
      fixed: [
        "Feature glow visibility issues with opacity adjustments and blur radius optimization",
        "CTA section content overlap and redundancy in messaging",
        "Inconsistent header font sizes between different landing page sections",
        "Command Palette and ChatInput scrollbar visibility with custom neon styling",
        "Landing page visual hierarchy with proper gradient shadows and section separation",
        "Hero content positioning and text readability with improved overlay system"
      ]
    }
  },
  {
    version: "Release v1.7.0",
    date: "2025-09-10",
    changes: {
      added: [
        "Modern 2025 UI/UX design system with glassmorphism and subtle animations",
        "Comprehensive uiPatterns.js with standardized button, container, and typography patterns",
        "Enhanced skeleton loading states with consistent structure across all management pages",
        "Unified loading state logic combining userId validation and data loading phases",
        "Modern glassmorphism containers replacing heavy neon borders throughout the application",
        "Responsive quick stats bars with centered icon groups and content-driven width",
        "Enhanced hover effects with subtle background changes and shadow animations",
        "Modern toast notification system with gradient backgrounds and glassmorphism",
        "Inline edit input patterns with consistent styling and proper focus states",
        "Collapsible section patterns with modern rounded corners and backdrop blur effects"
      ],
      changed: [
        "All skeleton loading structures standardized across TrainingGrounds, ManageWorkouts, ManageMemories, ManageCoachConversations, and ViewReports",
        "Quick stats containers updated from grid layout to flex with centered alignment and consistent spacing",
        "Quick stats container padding reduced from p-6 to p-4 for more compact appearance",
        "Skeleton quick stats containers use p-6 padding for optimal visual height matching with live content",
        "Quick stats items now have min-w-[120px] for consistent sizing and better responsive behavior",
        "Removed fixed height constraints (h-16) from quick stats items allowing natural content flow",
        "Updated all main content containers to use subtle glassmorphism instead of heavy neon borders",
        "Border radius standardized to 2xl (16px) for cards and xl (12px) for smaller elements",
        "Typography patterns applied consistently across all components for unified text hierarchy",
        "Button patterns updated with modern hover effects including translate and shadow animations",
        "Container patterns enhanced with backdrop-blur effects and subtle color transitions",
        "Collapsible sections updated to use modern containerPatterns with enhanced visual depth"
      ],
      fixed: [
        "Inconsistent skeleton loading heights between different pages now standardized",
        "Quick stats bar alignment issues with icons not properly centered as a group",
        "Skeleton loading width inconsistencies where containers didn't match live content proportions",
        "Missing escape key functionality for workout title editing when input loses focus",
        "Duplicate loading states in ManageCoachConversations causing redundant skeleton displays",
        "Quick stats container width issues where skeleton was wider than live content",
        "Visual inconsistencies in skeleton structure between management pages",
        "Action button skeleton count mismatch (showing 3 buttons instead of actual 2)",
        "Padding inconsistencies between skeleton and live quick stats containers"
      ]
    }
  },
  {
    version: "Release v1.6.0",
    date: "2025-09-06",
    changes: {
      added: [
        "messageTimestamp field to workout completion time extraction for improved accuracy",
        "Enhanced AI prompt with user's browser timestamp as reference point for relative time calculations",
        "Comprehensive context clues including time elapsed since message and user's local time",
        "Critical reasoning rules for AI to handle edge cases like '7pm ET' typed at 11:30pm ET",
        "Validation warnings for suspicious workout completion times (future relative to message time)",
        "Enhanced logging with message timestamp, processing delay, and time difference analysis",
        "coach_description property to coach configuration schema for concise coach specialties",
        "Auto-scroll functionality to chat messages on page load with enhanced timing",
        "User avatar with gradient background and first letter initial from authenticated user data",
        "Modern 2025 UI/UX chat interface with floating input architecture",
        "Voice recording interface with hold-to-record functionality and recording timer",
        "Auto-expanding textarea with keyboard shortcuts (Enter to send, Shift+Enter for new line)",
        "Action buttons for quick actions (Plus, Camera, Paperclip, Trash) with color-coded themes",
        "Online status indicators with animated green dot and coach availability display",
        "Enhanced coach specialty display using dynamic data from coach configuration",
        "Character counter capability for long messages (implementation ready)",
        "Custom SVG icon components for chat interface (MicIcon, SendIcon, PlusIcon, etc.)"
      ],
      changed: [
        "Red Flags section in weekly reports now uses cyan styling to match Quick Wins section",
        "Red Flags values now display without underscores and in bullet list format",
        "Benchmark WODs section now properly displays object data instead of '[Object]'",
        "Benchmark WODs labels now use neon-pink color for consistency",
        "All Benchmark WODs values now display without underscores for better readability",
        "AI time extraction now uses MESSAGE TYPED AT as reference point instead of server processing time",
        "Enhanced time extraction prompt with explicit examples for common edge cases",
        "Chat input architecture moved to fixed positioning outside main container for persistent visibility",
        "Messages area bottom padding reduced from pb-48 to pb-32 for better visual balance",
        "Send button icon color changed from white to black for better contrast on pink background",
        "User chat bubble styling updated to softer pink background with white text and border",
        "AI coach chat bubble styling updated to lighter cyan background with consistent border",
        "useAuthorizeUser hook enhanced to return userAttributes for avatar personalization",
        "Coach generation prompt updated with explicit guidelines for coach_description field",
        "All coach template files updated with appropriate coach_description values",
        "Chat input icons updated to borderless design with subtle hover interactions"
      ],
      fixed: [
        "Workout completion time accuracy issues when user specifies relative times like '7pm ET'",
        "Date calculation errors where workouts were assigned to wrong day due to server time reference",
        "Weekly report Red Flags section inconsistent styling compared to other sections",
        "Benchmark WODs displaying '[Object]' instead of actual workout data",
        "Underscores appearing in weekly report values making them hard to read",
        "AI model confusion about 'today' vs 'yesterday' when processing messages hours after workout completion",
        "Chat input scrolling out of sight when users scroll up through message history",
        "JSX syntax errors and component nesting issues in CoachConversations component",
        "Function name conflicts (formatTime vs formatRecordingTime) causing compilation errors",
        "Text contrast issues with white text on bright pink user chat bubbles",
        "Coach specialty displaying default 'Fitness Coach' instead of dynamic configuration data",
        "Missing scroll-to-bottom functionality on initial page load and message updates",
        "Inconsistent icon styling between chat input buttons and site-wide design system"
      ]
    }
  },
  {
    version: "Release v1.5.0",
    date: "2025-09-05",
    changes: {
      added: [
        "Professional kettlebell SVG icons for all workout-related functionality",
        "Optimized WorkoutIconSmall with custom viewBox for better visual prominence",
        "Conditional popup content rendering to prevent stale data display",
        "Comprehensive agent state clearing on popup close to eliminate content flashing"
      ],
      changed: [
        "All WorkoutIcon and WorkoutIconSmall components now use kettlebell design instead of lightning bolt",
        "Updated WorkoutIconSmall viewBox from '0 0 512 512' to '32 32 448 448' for 14% visual zoom",
        "Reverted ConversationIcon, ChatIcon, and ChatIconSmall to original chat bubble design",
        "FloatingMenuManager popup content now only renders when popup is active",
        "Enhanced handleTogglePopover logic to clear agent states when closing same popup",
        "Improved handleClosePopover to reset all agent states for clean popup transitions"
      ],
      fixed: [
        "Content flashing between popup transitions in FloatingMenuManager",
        "Stale workout/conversation/report data appearing briefly when switching popups",
        "Visual inconsistency where WorkoutIconSmall was larger (24px) than other small icons (20px)",
        "Same-button toggle sequence showing cached data instead of loading spinner",
        "Workout icons still displaying as lightning bolts in FloatingMenuManager and recent lists",
        "Misaligned icons in FloatingMenuManager buttons due to size inconsistencies"
      ]
    }
  },
  {
    version: "Release v1.4.0",
    date: "2025-09-05",
    changes: {
      added: [
        "Dynamic DynamoDB throughput scaling system with automatic retry logic",
        "Comprehensive throughput management utility (throughput-scaling.ts)",
        "Automatic capacity scaling for both main table and Global Secondary Indexes",
        "Intelligent retry mechanism with exponential backoff for throughput exceptions",
        "Environment-based configuration for scaling thresholds and retry limits",
        "Automatic scale-down scheduling to minimize costs after operations complete",
        "IAM permissions for DynamoDB throughput management operations",
        "Comprehensive logging and monitoring for scaling events",
        "Documentation for DynamoDB throughput scaling implementation"
      ],
      changed: [
        "All DynamoDB query and load operations now use automatic throughput scaling",
        "Refactored get-conversations-count to get-coach-conversations-count for naming consistency",
        "Updated queryFromDynamoDB function to wrap operations with throughput scaling",
        "Updated loadFromDynamoDB function to wrap operations with throughput scaling",
        "Updated getUserProfileByEmail function to use throughput scaling",
        "Updated queryAllEntitiesByType function to use throughput scaling",
        "Consolidated two separate throughput scaling files into single unified implementation",
        "Moved throughput scaling utilities to amplify/dynamodb/ folder for better organization",
        "Environment variables added for all Lambda functions to configure scaling behavior",
        "High-volume Lambda functions now have throughput management permissions"
      ],
      fixed: [
        "ProvisionedThroughputExceededException errors that occurred during high-volume operations",
        "DynamoDB capacity limits causing workout query failures",
        "Throughput bottlenecks in analytics and reporting functions",
        "TypeScript compilation errors in throughput scaling wrapper functions",
        "Inconsistent naming convention between get-conversations-count and other Lambda functions"
      ]
    }
  },
  {
    version: "Release v1.3.0",
    date: "2025-09-03",
    changes: {
      added: [
        "Command palette '/start-conversation' command for creating new coach conversations",
        "Optional initial message support for conversation creation via command palette",
        "Synchronous Lambda invocation for initial messages to ensure proper conversation state",
        "NEW badge indicators for coach conversations with recent activity (last 24 hours)",
        "NEW badge indicators for memories created within the past 24 hours",
        "'Coach:' label prefix in Training Grounds header for better context",
        "Automatic WorkoutAgent userId fallback mechanism in CommandPaletteAgent",
        "Enhanced error messaging for WorkoutAgent race condition scenarios"
      ],
      changed: [
        "All 'create-*' Lambda functions now return HTTP 201 (Created) responses for REST compliance",
        "Renamed createSuccessResponse to createOkResponse across all Lambda functions",
        "Updated 27 Lambda functions to use createOkResponse for non-creation operations",
        "Command palette '/start-conversation' now supports trailing space for better UX",
        "Training Grounds 'Start Conversation' button now pre-fills command palette with proper spacing",
        "isRecentConversation helper function for determining conversation activity recency",
        "Enhanced debug logging for WorkoutAgent initialization and userId setting"
      ],
      fixed: [
        "Race condition where CommandPalette tried to use WorkoutAgent before userId was set",
        "Conversation redirect not working after successful creation via command palette",
        "Initial message not appearing in conversations created via command palette",
        "Lambda invocation permissions for create-coach-conversation function",
        "Missing conversation object in API response causing navigation failures",
        "Cursor positioning in command palette after pre-filled commands"
      ]
    }
  },
  {
    version: "Release v1.2.0",
    date: "2025-09-02",
    changes: {
      added: [
        "JWT authorization system with useAuthorizeUser hook for all route components",
        "Shared AccessDenied and LoadingScreen components for consistent UI",
        "User ID validation against authenticated user's custom:user_id claim",
        "Comprehensive backend authorization for all Lambda handlers",
        "HttpUserPoolAuthorizer protection for all protected API Gateway routes",
        "authenticatedFetch utility for automatic JWT token inclusion in API calls",
        "Centralized error handling and loading states across all components",
        "Standardized authorization patterns across 10 route components"
      ],
      changed: [
        "All *Api.js files now use authenticatedFetch instead of native fetch",
        "API functions now use URL constants instead of inline string concatenation",
        "Lambda handlers updated to use APIGatewayProxyEventV2WithJWTAuthorizer type",
        "All route components now validate userId against authenticated user",
        "Loading and error states consolidated into shared components",
        "Authorization logic centralized and standardized across the application",
        "API Gateway routes now enforce JWT validation at the infrastructure level"
      ],
      fixed: [
        "Security vulnerability where users could access other users' data via URL manipulation",
        "Inconsistent loading and error state presentations across components",
        "Missing JWT token validation in API calls",
        "Unauthorized access to protected resources",
        "Inconsistent authorization patterns between different components"
      ]
    }
  },
  {
    version: "Release v1.1.0",
    date: "2025-08-28",
    changes: {
      added: [
        "Save Memory button to Training Grounds and Floating Menu Manager",
        "Widget totals on Manage Workouts page (total, monthly, weekly, recent)",
        "Command Palette integration for Save Memory functionality",
        "Consistent error message styling across all Manage pages",
        "Changelog page with semantic versioning and collapsible release sections",
        "Navigation dropdown link to access changelog",
        "Professional SVG icons replacing emoji icons in changelog sections",
        "Collapsible release sections matching workout metadata styling"
      ],
      changed: [
        "Command Palette now supports dynamic prefilled commands",
        "Error messages now use consistent styling across Manage pages",
        "Removed unused commands from Command Palette (new conversation, search workouts)",
        "Updated ManageWorkouts page layout and widget functionality",
        "Replaced Log Workout button with widget totals on ManageWorkouts page",
        "Changelog now uses collapsible sections with proper WorkoutViewer styling",
        "Section headers in changelog now match Round header styling from Workouts page",
        "Workout metadata and rounds sections now use small workout icons for consistency",
        "Changelog container width now matches Workouts page layout (max-w-7xl)"
      ],
      fixed: [
        "Memory deletion now properly refreshes widget counts",
        "Workout total count displays correctly on Manage Workouts page",
        "State updates now handle empty arrays correctly",
        "WorkoutAgent now properly loads total workout count for accurate statistics",
        "Changelog navigation and routing properly integrated with breadcrumbs"
      ]
    }
  }
];

function Changelog() {
  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={`${layoutPatterns.pageContainer} min-h-screen pb-8`}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col`}>
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className={typographyPatterns.pageTitle}>
            Changelog
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Track the latest updates, improvements, and changes to the platform.
            Stay informed about new features and bug fixes as they're released.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className={`${containerPatterns.mainContent} h-full overflow-hidden`}>
            <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">
              {changelogEntries.map((entry, index) => (
                <CollapsibleSection
                  key={index}
                  title={`${entry.version} - ${entry.date}`}
                  icon={<ReleaseIcon />}
                  defaultOpen={index === 0}
                >
                  <div className="space-y-6">

              {entry.changes.added && (
                <div className="mb-6">
                  <h3 className="font-rajdhani font-bold text-white text-lg mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-synthwave-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Added</span>
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.added.map((item, i) => (
                      <li key={i} className="text-synthwave-text-primary font-rajdhani flex items-start">
                        <span className="text-synthwave-neon-cyan mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.changes.changed && (
                <div className="mb-6">
                  <h3 className="font-rajdhani font-bold text-white text-lg mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-synthwave-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Changed</span>
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.changed.map((item, i) => (
                      <li key={i} className="text-synthwave-text-primary font-rajdhani flex items-start">
                        <span className="text-synthwave-neon-purple mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.changes.fixed && (
                <div className="mb-6">
                  <h3 className="font-rajdhani font-bold text-white text-lg mb-3 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-synthwave-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Fixed</span>
                  </h3>
                  <ul className="space-y-2">
                    {entry.changes.fixed.map((item, i) => (
                      <li key={i} className="text-synthwave-text-primary font-rajdhani flex items-start">
                        <span className="text-synthwave-neon-pink mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Changelog;
