/**
 * Changelog Data - Centralized version history for NeonPanda platform
 *
 * This file contains all release version information used across the application.
 * Import this to display changelog information consistently.
 *
 * Usage:
 * import { changelogEntries, getLatestVersions, getTotalChanges } from '../utils/changelogData';
 */

export const changelogEntries = [
  {
    version: "Release v1.0.20251019-beta",
    date: "2025-10-19",
    changes: {
      added: [
        "PublicHeader component providing minimal navigation for marketing/public pages with logo, sign in/user avatar, and hamburger menu",
        "Clear separation between public marketing pages and authenticated app pages with distinct navigation systems",
        "Mobile-optimized bottom navigation bar (BottomNav) with Training, Progress, and Coaches quick access",
        "Floating Action Button (QuickActionsFAB) with speed dial menu for Log Workout, Start Conversation, and Save Memory actions integrated with CommandPalette",
        "Mobile logo display in breadcrumbs (panda head icon) for consistent branding on small screens with tooltip",
        "Coach count badges in navigation menus showing total number of custom coaches created",
        "New get-coach-configs-count Lambda function and API endpoint for fetching total coach counts per user",
        "NavigationContext for centralized navigation state management including coach counts and menu visibility",
        "Two-tier responsive system: 640px (sm) for progressive refinements, 768px (md) for mobile/desktop paradigm shifts",
        "Skeleton loading states for avatar and username in PublicHeader during authentication",
        "Escape key handler for closing QuickActionsFAB speed dial menu",
        "Platform-aware keyboard shortcut display in PublicHeader links",
        "Timezone-aware date conversion utilities (convertUTCToUserDate, getUserTimezoneOrDefault) in analytics/date-utils.ts for accurate date aggregation across timezones",
        "userTimezone field to WorkoutSummary interface for proper timezone context during analytics processing",
        "Workout date validation in build-workout handler to detect and correct dates with incorrect years (more than 1 year off from completedAt)",
        "queryWorkoutSummaries DynamoDB function for efficient workout data retrieval using ProjectionExpression (fetches only summary fields instead of full workout objects)"
      ],
      changed: [
        "Navigation system completely redesigned with SidebarNav for desktop, BottomNav/MoreMenu/QuickActionsFAB for mobile",
        "Navigation configuration centralized in navigationConfig.js with sections: primary, contextual, quickAccess, account, and utility",
        "Settings and Sign Out menu items moved to dedicated 'Account & Settings' section with neon pink styling",
        "Technology menu item icon updated to modern 3D cube SVG design",
        "Section dividers in SidebarNav positioned below their respective sections with increased vertical spacing",
        "QuickStats now use Rajdhani font instead of Russo for numeric values across all total counts",
        "BottomNav active state background changed to darker contrast color (bg-synthwave-bg-primary/30) for better visibility",
        "BottomNav height increased from 56px to 64px for improved touch targets",
        "QuickActionsFAB main button styled with hero gradient (pink to purple) matching Theme.jsx patterns",
        "QuickActionsFAB menu items use neon pink color and right-aligned layout with full clickable areas",
        "QuickActionsFAB backdrop opacity reduced to 25% for less intrusive overlay",
        "ChatInput breakpoint for consolidating action buttons changed from 640px (sm) to 768px (md) for consistency",
        "ChatInput delete button label now dynamically displays 'Delete Session' or 'Delete Conversation' based on context",
        "Quick Prompts popup in ChatInput repositioned for mobile: fixed positioning, 90% width, horizontally centered, click-to-toggle",
        "Quick Prompts popup height increased and text size bumped to base for better readability",
        "Skeleton loading chat bubbles in CoachConversations and CoachCreator resized for proper mobile display (65vw min-width)",
        "Footer links updated to include all navigation items from PublicHeader for consistency",
        "All instances of 'About Us' standardized to 'About' across site (Footer, routeUtils, uiPatterns comments)",
        "LandingPage hero header line-height standardized to leading-tight across all breakpoints",
        "LandingPage hero content layout adjusted: full-width header with narrower subtitle and CTA buttons",
        "PublicHeader avatar skeleton size increased from 32px to 36px for better visibility",
        "PublicHeader 'Go to App' and 'Settings' menu items now use consistent py-2.5 padding",
        "BottomNav and QuickActionsFAB conditionally hidden on chat pages (CoachConversations, CoachCreator) for mobile only",
        "QuickActionsFAB now hidden when MoreMenu is open to prevent overlap",
        "Breadcrumbs pointer events fixed: nav container set to pointer-events-none, inner content to pointer-events-auto",
        "Weekly and monthly analytics now convert UTC completedAt timestamps to user's local timezone before date aggregation (defaults to America/Los_Angeles if no timezone preference set)",
        "WeeklyHeatMap date parsing updated to use timezone-safe method (parsing YYYY-MM-DD at local midnight) preventing off-by-one day display errors",
        "Workout ID generation updated from workout_summary_ prefix to workout_ prefix (e.g., workout_userId_timestamp_shortId) for clearer data model consistency",
        "Analytics data fetching refactored to use queryWorkoutSummaries for ~70-90% reduction in data transfer by fetching only necessary fields (completedAt, workoutId, summary, workoutName, discipline, coachIds)",
        "AI prompt guidance in workout extraction simplified to include concise date field instruction in temporal context section for more natural AI interpretation",
        "Non-streaming coach conversation handler now passes only new messages (user + assistant) to sendCoachConversationMessage instead of all messages"
      ],
      fixed: [
        "AWS EventBridge cron schedule for build-weekly-analytics corrected from Saturday (weekDay: 7) to Sunday (weekDay: 1)",
        "Horizontal scrollbar on LandingPage at intermediate widths fixed with overflow-x-hidden and adjusted negative margins",
        "Skeleton loading chat bubbles bleeding beyond container on mobile in CoachConversations and CoachCreator pages",
        "Quick Prompts popup in ChatInput disappearing too quickly on mobile, now uses click-to-toggle instead of hover",
        "Quick Prompts popup not horizontally centered on mobile, now uses fixed positioning with left-1/2 -translate-x-1/2",
        "Coach avatar and keyboard shortcut buttons in breadcrumbs not reacting to hover/click on mobile due to pointer event blocking",
        "React Hooks order error in QuickActionsFAB (useEffect called after conditional return), moved hooks to component top",
        "Coaches badge not showing total count due to missing coachesCount in navigationUtils badge calculation",
        "Console warnings and unnecessary console.info logs removed from main.jsx, MoreMenu.jsx, and ReportAgent.js",
        "React warning for <style jsx> tag in MoreMenu.jsx, changed to <style>",
        "Weekly heat map displaying workouts on incorrect days (off by one) due to timezone-naive date parsing in WeeklyHeatMap.jsx when hovering over workout squares",
        "Analytics aggregating workouts on wrong calendar days by using UTC dates instead of user's local timezone for date grouping (e.g., Tuesday ET workout showing as Wednesday in reports)",
        "Workout date field in DynamoDB having incorrect year (e.g., 2024 instead of 2025) due to AI extraction errors, now validated and corrected to match completedAt year",
        "Critical message duplication bug in coach conversations where messages exponentially doubled each turn (2→4→10→22) due to non-streaming handler passing all messages instead of only new ones to DynamoDB save operation",
        "Analytics flows pulling entire workout objects from DynamoDB instead of just summary properties, causing unnecessary data transfer and processing overhead",
        "Confusing workout ID naming convention (workout#workout_summary_...) inconsistent with actual data structure (workouts contain summaries, not summaries of workouts)"
      ],
      removed: [
        "NavigationTest.jsx component and related test navigation configuration files",
        "uiPatterns.js from root src/utils directory (consolidated to src/utils/ui/uiPatterns.js)",
        "Seven duplicate logo image files (logo-light-sm-1.png through logo-light-sm-6.png, logo-light-sm-cf.png)"
      ]
    }
  },
  {
    version: "Release v1.0.20251016-beta",
    date: "2025-10-16",
    changes: {
      added: [
        "requiresDeepReasoning flag to SmartRequestRouter interface for intelligent model selection based on conversation complexity",
        "selectModelBasedOnReasoning() helper function for dynamic Sonnet 4.5 vs Haiku 4.5 routing based on deep reasoning requirements",
        "Comprehensive deep reasoning detection guidelines in smart router prompt distinguishing complex multi-variable scenarios from straightforward questions",
        "Smart model selection logging showing selected model (Sonnet/Haiku) and reasoning flag in CloudWatch for monitoring and optimization"
      ],
      changed: [
        "Coach conversation streaming now uses Haiku 4.5 by default (90-95% of traffic) with Sonnet 4.5 reserved for complex reasoning (5-10% of traffic)",
        "generateAIResponseStream() updated to accept routerAnalysis parameter and dynamically select model based on requiresDeepReasoning flag",
        "generateAIResponse() updated to accept routerAnalysis parameter for consistent model selection across streaming and non-streaming paths",
        "Coach creator sessions now use Haiku 4.5 for all Q&A interactions (structured questionnaire doesn't require deep reasoning capabilities)",
        "Smart router now distinguishes between complexity (hasComplexity) and deep reasoning requirements (requiresDeepReasoning) for more selective model routing",
        "Model selection criteria optimized: Haiku for standard chat, acknowledgments, simple questions, clarifications; Sonnet for multi-variable program design, complex injury scenarios, methodology debates, performance analysis",
        "Cost optimization achieving ~5-10x reduction for standard conversations while maintaining quality for complex scenarios requiring sophisticated reasoning",
        "Contextual updates in CoachConversations.jsx and CoachCreator.jsx now trigger automatic scroll-to-bottom for better real-time UX during AI processing stages"
      ],
      fixed: [
        "Contextual update indicators not triggering scrollToBottom behavior in chat windows, causing updates to appear off-screen during AI processing",
        "Missing contextualUpdate dependency in useEffect scroll hooks preventing automatic scrolling when processing stages display",
        "Cost inefficiency where all conversations used expensive Sonnet 4.5 regardless of complexity level or reasoning requirements"
      ]
    }
  },
  {
    version: "Release v1.0.20251015-beta",
    date: "2025-10-15",
    changes: {
      added: [
        "Monthly Reports system with automatic generation for months with 4+ workouts",
        "Monthly report cards with YYYY-MM format (e.g., '2025-10') for easy date parsing and sorting",
        "Monthly report display page with comprehensive analytics, insights, and performance trends",
        "Tab switcher on ViewReports page for toggling between Weekly and Monthly reports",
        "QuickStats for monthly reports showing total reports, current month, qualified months (4+ workouts), and high-confidence analysis",
        "Monthly report metadata including workoutCount, conversationCount, memoryCount, analysisConfidence, and dataCompleteness",
        "Monthly report preview tooltips showing top priority insights on hover",
        "NEW badge on current month reports to highlight the most recent analysis",
        "Monthly report empty states with clear messaging about 4+ workout threshold",
        "ReportAgent.loadAllMonthlyReports() method for fetching and managing monthly report data",
        "Monthly report grid layout matching weekly reports design with purple theme accents",
        "Separated keyboard shortcut display with individual containers for modifier key (⌘/Ctrl) and letter key (K) in CommandPaletteButton",
        "Flexbox layout with gap spacing between keyboard shortcut containers for improved visual clarity",
        "Platform-aware keyboard shortcut display showing ⌘ + K on macOS and Ctrl + K on Windows/Linux"
      ],
      changed: [
        "ViewReports page refactored to support both weekly and monthly report types with tabbed interface",
        "QuickStats dynamically switch between weekly and monthly metrics based on active tab",
        "Monthly report cards styled with purple accent color (synthwave-neon-purple) to differentiate from weekly (pink)",
        "Report cards updated with consistent 3-column performance stats grid (workouts, AI confidence, data completeness)",
        "Empty states now specify workout thresholds: 2+ for weekly, 4+ for monthly reports",
        "CommandPaletteButton component refactored from single kbd element to dual kbd elements wrapped in flex container",
        "Command palette skeleton loading structure width increased from w-16 to w-20 across all 10 pages for better accommodation of dual-key display",
        "Skeleton loading updated on: ViewReports, ManageCoachConversations, ManageMemories, ManageWorkouts, TrainingGrounds, CoachCreator, WeeklyReports, Workouts, CoachConversations, and Coaches pages",
        "Tab buttons on ViewReports page changed from neon pink to neon cyan for consistent color scheme",
        "Empty state patterns standardized across management pages (ViewReports, ManageWorkouts, ManageMemories, ManageCoachConversations) to minimal text-only design",
        "Empty state titles changed to cyan color (text-synthwave-neon-cyan) with muted descriptions (text-synthwave-text-muted)",
        "QuickStats tooltips shortened to 2-4 word phrases for reduced cognitive load on ViewReports page",
        "Monthly report summaries now display formatted month names (e.g., 'October 2025') instead of raw YYYY-MM format"
      ],
      fixed: [
        "Visual inconsistency where keyboard shortcut appeared as single container instead of separate key containers",
        "Tab button styling inconsistency on ViewReports page with mixed color schemes",
        "Empty state pattern inconsistency across management pages with some using borders/buttons and others using minimal text-only approach",
        "Verbose QuickStats tooltips creating information overload for users",
        "Missing monthly analytics causing users to only see weekly breakdowns of their training"
      ],
      removed: [
        "NeonBorder wrappers and action buttons from empty states on management pages for cleaner, minimal design",
        "Plus (+) separator between keyboard shortcut keys, replaced with flexbox gap for cleaner visual spacing"
      ]
    }
  },
  {
    version: "Release v1.0.20251012-beta",
    date: "2025-10-12",
    changes: {
      added: [
        "Compact horizontal header design system standardized across 10 pages (TrainingGrounds, ManageCoachConversations, CoachConversations, ViewReports, WeeklyReports, Workouts, ManageWorkouts, ManageMemories, Coaches, CoachCreator)",
        "CompactCoachCard shared component for consistent coach display with 24px avatar and online status indicator",
        "CommandPaletteButton shared component for consistent Cmd/Ctrl + K shortcut access across all pages",
        "Vesper coach integration on Coaches.jsx and CoachCreator.jsx as static guide coach for coach creation workflow",
        "Two-phase scroll restoration system (mount + post-loading) preventing unwanted scroll position retention on page refresh",
        "Keyboard shortcut handler (Cmd/Ctrl + K) for command palette across all 10 pages",
        "Standardized skeleton loading structures matching compact header design with w-72 width for title skeletons",
        "Coach pill tooltip system with customizable tooltipContent prop supporting page-specific messaging",
        "Unified coach pill navigation routing all main pages to training grounds and special pages to coaches dashboard",
        "Page title tooltips with hover information explaining page purpose and functionality",
        "Command palette button tooltips providing keyboard shortcut hints to users"
      ],
      changed: [
        "Page headers refactored from centered/large layouts to compact horizontal design with title + coach card + command button",
        "Skeleton header width standardized to w-72 (288px) across 9 pages for visual consistency",
        "ManageMemories.jsx skeleton header width set to w-64 (256px) per user preference for slightly different visual weight",
        "Coaches.jsx 'Your In-Progress Coaches' section header reduced from text-3xl md:text-4xl to text-xl md:text-2xl",
        "Coaches.jsx 'Start Fast with Templates' section header reduced from text-3xl md:text-4xl to text-xl md:text-2xl",
        "Coaches.jsx page description removed from header area for cleaner, more compact presentation",
        "CoachCreator.jsx page description removed from header area aligning with coaches page design",
        "Vesper coach card tooltip changed from 'Work with Vesper' to 'Go to Your Coaches' for clearer navigation intent",
        "Vesper coach card navigation simplified to always route to /coaches page instead of smart session-based routing",
        "CompactCoachCard component updated to accept tooltipContent prop with default value 'Go to the Training Grounds'",
        "CoachCreatorHeader component deprecated and replaced with compact horizontal header matching other pages",
        "Visual hierarchy improved with page titles (text-2xl md:text-3xl) larger than section headers (text-xl md:text-2xl)",
        "Section headers on Coaches.jsx kept center-aligned for modern gallery-style presentation matching card grid layouts"
      ],
      fixed: [
        "Scroll position retention issue where pages remembered scroll position after refresh instead of resetting to top",
        "Skeleton loading structure vertical positioning misalignment on ManageCoachConversations.jsx page",
        "Inconsistent skeleton header widths across pages causing visual layout shifts during loading",
        "Coach pill navigation inconsistency where some pages navigated differently than others",
        "Coach pill tooltips showing incorrect text ('Go to the Training Grounds') on Coaches and CoachCreator pages",
        "Page header visual hierarchy issue where section headers (text-3xl md:text-4xl) were larger than main page title (text-2xl md:text-3xl)",
        "CompactCoachCard hardcoded tooltip not respecting custom tooltipContent prop passed from parent components",
        "Command palette delay perception on ManageWorkouts.jsx (investigation revealed 300ms CSS animation is standard, not a bug)"
      ]
    }
  },
  {
    version: "Release v1.0.20251011-beta",
    date: "2025-10-11",
    changes: {
      added: [
        "Centralized changelog data system with exportable helper functions (changelogData.js) for application-wide version history access",
        "Changelog UI patterns (changelogListPatterns) in uiPatterns.js with 7 pattern properties for consistent version display",
        "HTML anchor navigation system for changelog with simplified version IDs (v1.0.20251011-beta format)",
        "React Router hash navigation for direct linking to specific changelog version sections",
        "Last 5 versions display in TrainingGrounds Messages & Notifications section with interactive version list",
        "GitHub-style tag icon on changelog version items for visual release indicators",
        "NEW badge system for releases 3 days old or newer to highlight recent updates",
        "Version list integration with date display and change count statistics in TrainingGrounds",
        "Centralized icon library with 4 new reusable icons (ProgramIcon, ResourcesIcon, MessagesIcon, BarChartIcon) in SynthwaveComponents.jsx",
        "getLatestVersions(count) helper function for retrieving N most recent changelog entries",
        "getTotalChanges(entry) helper function for calculating change statistics (added, changed, fixed, total)",
        "generateVersionAnchor(version) helper function using regex to extract clean version numbers from release strings"
      ],
      changed: [
        "Changelog.jsx now imports centralized changelogEntries and generateVersionAnchor from changelogData.js instead of local definitions",
        "Changelog CollapsibleSection components now accept id prop and use scroll-mt-24 class for proper anchor positioning",
        "Changelog scroll behavior changed from querySelector to getElementById to properly handle dots in CSS selectors",
        "Changelog anchor format simplified from 'version-Release-v1.0.20251010-beta' to just 'v1.0.20251010-beta' for cleaner URLs",
        "TrainingGrounds Messages & Notifications section styling updated to match Reports & Insights with pink borders (border-synthwave-neon-pink/20)",
        "TrainingGrounds version item styling updated with consistent hover effects (hover:border-synthwave-neon-pink/40)",
        "TrainingGrounds section text styling updated to match Reports section exactly for visual consistency",
        "Icon definitions moved from local TrainingGrounds.jsx declarations to centralized SynthwaveComponents.jsx for application-wide reusability",
        "TrainingGrounds.jsx now imports ProgramIcon, ResourcesIcon, MessagesIcon, and BarChartIcon from SynthwaveComponents instead of local definitions",
        "Changelog page padding reduced by removing pb-8 to eliminate gap above footer"
      ],
      fixed: [
        "Critical querySelector CSS selector bug where dots in anchor IDs (#version-Release-v1.0.20251005-beta) caused browser console errors",
        "Anchor navigation failing due to invalid CSS selectors treating dots as class separators instead of ID literals",
        "Footer gap on Changelog page caused by unnecessary pb-8 padding creating navy blue band below footer",
        "Icon duplication where TrainingGrounds.jsx defined local versions of icons instead of importing from shared library",
        "Inconsistent styling between Messages & Notifications and Reports & Insights sections in TrainingGrounds",
        "Missing visual indicators for recent releases making new versions blend in with older ones"
      ]
    }
  },
  {
    version: "Release v1.0.20251010-beta",
    date: "2025-10-10",
    changes: {
      added: [
        "Amazon Bedrock Prompt Caching with static/dynamic prompt separation achieving 100% cache hit rates and 90-135% cost reduction per request",
        "Parallel data loading for coach conversations with Router + Conversation + Config operations executing concurrently in 5-6 seconds",
        "Parallel data loading for coach creator sessions with Router + Session + Profile operations executing concurrently",
        "Cache optimization system with static prompts (coach config, methodology, safety constraints) cached at 2,982 tokens per request",
        "Cache performance monitoring showing consistent $0.008051 savings per request with negative costs (reading cached tokens cheaper than new tokens)",
        "Comprehensive cache hit rate logging with inputTokens, outputTokens, cacheRead, and cacheCreated metrics in CloudWatch",
        "Parallel pattern/insights generation overlapped with memory saving operations for maximum throughput",
        "Smart Router intelligent decision making with confidence-based context retrieval (0.3 low → skip expensive ops, 0.8 high → full context)",
        "Consolidated Memory Analysis system combining retrieval need detection and characteristics analysis in single AI call (60-70% faster)",
        "Promise.all() parallelization pattern for Router analysis, conversation loading, and config fetching",
        "Auto-discovery mode (--all flag) for migrate-pinecone-ids.js script to find and migrate all namespaces automatically",
        "listAllNamespaces() function using describeIndexStats() API for namespace discovery with record counts",
        "Final summary reporting for bulk migrations showing total namespaces, success/failure counts, and aggregate statistics",
        "Per-namespace migration tracking with individual success/failure status and resilient error handling",
        "Enhanced Pinecone query logging with match counts, processing times, and relevance score distributions",
        "Memory usage tracking with enhanced tagging (workout_planning, form_analysis, injury_management, etc.)"
      ],
      changed: [
        "Coach conversation streaming handler refactored to use parallel Promise.all() for Router + Conversation + Config loading (5-6 second total vs 15+ sequential)",
        "Coach creator streaming handler refactored to use parallel Promise.all() for Router + Session + Profile loading",
        "Bedrock API calls now use static prompt caching blocks for coach configuration, methodology context, and safety constraints",
        "System prompt structure split into static (cached) and dynamic (per-request) sections for optimal cache utilization",
        "Cache configuration now tracks and logs detailed metrics: cacheRead, cacheCreated, inputTokens, outputTokens, and cost savings",
        "Response generation functions updated to support cache_control blocks for efficient token reuse across requests",
        "Pinecone reranking score filtering now uses correct threshold (0.3) for reranked results instead of semantic search threshold (0.7)",
        "Pinecone metadata field naming standardized to camelCase (userId) across all record types (conversation summaries, memories, workouts, coach creator)",
        "Memory text content enhanced with tag keywords (tag: workout_planning tag: form_analysis) for improved semantic search matching",
        "Smart Router now skips unnecessary Pinecone/Memory queries for simple acknowledgments (confidence < 0.5)",
        "Memory retrieval logic now queries across all coaches (null coachId) for broader context availability",
        "Reranking configuration optimized with minScore: 0.3 for reranked results and fallbackMinScore: 0.5 for semantic search",
        "migrate-pinecone-ids.js script enhanced to support both single namespace and bulk migration modes with progress tracking",
        "Conversation summary Pinecone storage no longer includes redundant userId field (automatically added by storePineconeContext)"
      ],
      fixed: [
        "Critical Pinecone reranking bug where all 34 matches were filtered out due to mismatched score scales (0.7 threshold applied to 0.3-scale reranked scores)",
        "Performance bottleneck in data loading where Router + Conversation + Config operations were sequential (15+ seconds) instead of parallel (5-6 seconds)",
        "Cache inefficiency where entire system prompt was regenerated on every request instead of caching static sections",
        "Bedrock API costs unnecessarily high due to re-reading static coach configuration tokens on every message",
        "Reranking minScore logic incorrectly prioritizing caller's minScore parameter instead of RERANKING_CONFIG.minScore for reranked results",
        "Inconsistent metadata field naming in Pinecone records with both userId (camelCase) and user_id (snake_case) causing duplicate storage",
        "Conversation summaries creating duplicate user identification fields in Pinecone metadata",
        "Pinecone query results being discarded after reranking due to incompatible score threshold validation",
        "Memory retrieval potentially missing relevant context due to coach-specific scoping instead of global search",
        "Migration script failing to continue when single namespace encountered errors (now resilient with per-namespace error handling)"
      ]
    }
  },
  {
    version: "Release v1.0.20251005-beta",
    date: "2025-10-05",
    changes: {
      added: [
        "NeonPanda brand philosophy and mission integrated into coach creator (Vesper) personality prompt",
        "WHAT IS NEONPANDA section explaining platform's purpose: tracking workouts, measuring progress, and AI coach guidance",
        "Brand positioning statement: 'electric intelligence meets approachable excellence' for consistent voice",
        "Platform context emphasizing NeonPanda as bridge between cutting-edge AI and genuine human connection",
        "Left-aligned contextual update indicators with coach avatar for improved visual flow and consistency",
        "Empty streaming placeholder message filtering to prevent empty AI chat bubbles from displaying",
        "Consistent contextual update implementation across both CoachCreator and CoachConversations pages"
      ],
      changed: [
        "Contextual update formatting in streaming handlers removed extra linebreaks (\\n\\n) for cleaner display",
        "Contextual update UI simplified to text-only display without emoji decorations in CoachCreator and CoachConversations",
        "Coach creator prompt enhanced to emphasize Vesper is building coaches for the NeonPanda platform",
        "Vesper personality description updated to include NeonPanda's mission of creating relationships that transform lives",
        "Platform messaging updated to highlight NeonPanda creates a new category in fitness technology",
        "Contextual update text size increased from text-sm to text-base for improved readability",
        "Quick acknowledgments converted from chunk events to contextual events (ephemeral, not saved to conversation history)",
        "Emoji picker repositioned to anchor bottom edge just above emoji button for better visual alignment",
        "Contextual updates now display with coach avatar in left-aligned format matching message bubbles"
      ],
      fixed: [
        "Extra spacing in contextual updates causing unnecessary whitespace between updates and AI responses",
        "Emoji decorations in contextual update indicators conflicting with text-only design system",
        "Inconsistent spacing in chat display during streaming contextual updates",
        "Empty pulsing AI chat bubble appearing before first chunk arrives during streaming",
        "Quick acknowledgments being unnecessarily saved to conversation history as permanent messages",
        "Inconsistent contextual update display and behavior between CoachCreator and CoachConversations pages"
      ]
    }
  },
  {
    version: "Release v1.0.20251004-beta",
    date: "2025-10-04",
    changes: {
      added: [
        "Emoji picker integration in ChatInput component using emoji-picker-react library",
        "Fitness & Activities emoji category prioritized as 2nd position for quick access to workout-related emojis",
        "Comprehensive emoji picker styling matching synthwave theme with custom CSS overrides",
        "Cyan-themed scrollbar in emoji picker matching uiPatterns.js design system",
        "Search input in emoji picker styled to match ChatInput text input with focus and blur effects",
        "Toast notification system (ToastContext) for non-intrusive error and success messages",
        "Retry build functionality for failed coach creator sessions via 'Create Coach from Session' API",
        "AI-generated contextual updates to coach creator flow using 'Vesper' personality (mysterious, intuitive female guide)",
        "Five strategic contextual update points in coach creator: initial greeting, session review, methodology search, memory check, and response crafting",
        "SharedPolicies class for centralized IAM policy management across Lambda functions",
        "Dynamic LOG_GROUP_PREFIX generation for sync-log-subscriptions based on deployment type",
        "DashedCard UI pattern variants (dashedCard, dashedCardPinkBold, dashedCardCyan, dashedCardPurple) in uiPatterns.js",
        "SuccessModal pattern in uiPatterns.js for cyan-themed success modals",
        "SubcontainerEnhanced pattern in uiPatterns.js matching Theme.jsx glassmorphism design",
        "Bangers Google Font integration for creative text styling with sans-serif fallback",
        "create-coach-config Lambda function for manual coach creation from completed sessions",
        "Nested configGeneration object in CoachCreatorSession TypeScript interface for better data modeling"
      ],
      changed: [
        "Coach creator session deletions now perform hard deletes when user-initiated from Coaches page",
        "Coach config build process now performs soft deletes (isDeleted: true) on successful completion",
        "In-progress coach creator session cards styling updated to use dashedCard variants from uiPatterns.js",
        "Status display for in-progress sessions refactored to use icons and consistent text format matching metadata display",
        "Completion modal styling updated to cyan theme with inline icon, successModal pattern, and subcontainerEnhanced style",
        "Completion modal messaging enhanced to be more contextual and avoid 'AI' terminology",
        "Retry build functionality moved from CoachCreatorAgent to CoachAgent for proper API organization",
        "Coach creator flow now uses maximum of 11 questions (0-10, with question 10 optional for beginners)",
        "CoachCreatorAgent immediate streaming acknowledgement and isTyping state for faster visual feedback",
        "Coach creator prompt updated to align with 'NeonPanda' branding (electric, vibrant, playful)",
        "coachConfigId pattern changed from user_${userId}_coach_main to user_${userId}_coach_${Date.now()} for uniqueness",
        "created_date in coach config metadata now set programmatically instead of AI-generated to ensure accuracy",
        "personality_blending object now JSON.stringify'd before storing in Pinecone metadata",
        "Backend Lambda functions excluded from allFunctions array (forwardLogsToSns, syncLogSubscriptions) to prevent IAM policy size limits",
        "postConfirmation Lambda now uses inline IAM policies to resolve circular dependency issues",
        "Emoji picker category order optimized: Recently Used, Fitness & Activities, Smileys & People, Food & Drink, Objects",
        "Chat message spacing increased from pb-32 to pb-48 (192px) for better breathing room between messages and input",
        "Data extraction functions updated to align with new 11-question structure (questions 0-10)",
        "Session summary generation updated to reflect new 11-question flow and mapping",
        "Frontend fallback estimates corrected for all sophistication levels (BEGINNER: 10, INTERMEDIATE/ADVANCED: 11 questions)",
        "Gender preference selection added as first question (question 0) in coach creator flow"
      ],
      fixed: [
        "Browser alert popups and on-screen errors replaced with toast notifications for better UX",
        "Failed coach creator sessions not being returned to frontend due to old configGenerationStatus data structure",
        "Create custom coach card hover effects inconsistent with other coach cards on Coaches page",
        "Missing DynamoDB environment variables in create-coach-config Lambda causing failures",
        "CloudFormation circular dependency error related to auth stack and DynamoDB table grants",
        "IAM policy size limit exceeded (20,612 > 20,480 bytes) for forwardLogsToSns Lambda role",
        "Pinecone storage error due to personality_blending being stored as object instead of stringified JSON",
        "coachConfigId overwrites due to static '_main' suffix instead of unique timestamp-based pattern",
        "created_date showing incorrect AI-generated date (2025-01-04) instead of actual creation timestamp",
        "Completion modal showing by default instead of only when session is actually complete",
        "Completion modal subcontainer border style not matching Theme.jsx glassmorphism design",
        "Coach creator slower initial acknowledgement compared to coach conversation flow",
        "LOG_GROUP_PREFIX for sync-log-subscriptions using static value instead of dynamic branch-aware naming",
        "Linting errors in contextual-updates.ts related to MODEL_IDS.HAIKU and bedrockResponse.content",
        "INTERMEDIATE sophistication level showing estimated total of 9 questions instead of 10",
        "Unused data extraction functions (extractSessionDuration, extractCoachingStylePreferences) cluttering codebase",
        "Emoji picker internal CSS classes overriding custom synthwave styling for category labels",
        "Emoji picker placeholder text overlapping with search icon due to insufficient left padding",
        "Emoji sizes too large (28px) in picker, reduced to 24px for better density and scanning"
      ]
    }
  },
  {
    version: "Release v1.0.20251003-beta",
    date: "2025-10-03",
    changes: {
      added: [
        "Centralized JSON formatting instructions utility (libs/prompt-helpers.ts) for consistent AI prompt engineering",
        "Reusable getJsonFormattingInstructions() function with options for minified and standard variants",
        "Comprehensive JSON structure validation rules (brace/bracket counting, trailing comma prevention)",
        "JSON_FORMATTING_INSTRUCTIONS_STANDARD constant for general use cases",
        "JSON_FORMATTING_INSTRUCTIONS_MINIFIED constant for large payloads (workouts with 20+ rounds)",
        "Explicit markdown formatting prohibition in all AI prompts to prevent ```json wrapper issues",
        "Battle-tested JSON formatting rules applied across 15 backend functions for consistency",
        "AI-powered finish intent detection in coach creator using Claude Haiku for natural conversation flow",
        "JSON formatting instructions to 6 critical detection functions (checkUserWantsToFinish, detectConversationComplexity, detectMemoryRetrievalNeed, detectMemoryRequest, shouldUsePineconeSearch, extractCompletedAtTime)"
      ],
      changed: [
        "Coach config generation now uses standardized JSON instructions from prompt-helpers",
        "Workout extraction now uses minified variant of JSON instructions for large payloads",
        "Analytics generation now uses standardized JSON instructions from prompt-helpers",
        "Smart request router (analyzeRequestCapabilities) now uses standardized JSON instructions",
        "Memory analysis (analyzeMemoryNeeds) now uses comprehensive JSON formatting rules",
        "Pinecone methodology intent analysis now uses standardized JSON instructions",
        "Workout detection functions now use standardized JSON instructions",
        "Conversation summary generation now uses comprehensive JSON formatting rules",
        "All AI prompts generating JSON now follow identical, comprehensive formatting guidelines",
        "Dates stored in UTC and automatically converted to user's local timezone for display",
        "Migrated 11 critical detection/decision tasks from Nova Micro to Claude Haiku for superior reliability (workout detection, memory analysis, conversation complexity, Pinecone search decisions, time extraction, discipline classification)",
        "checkUserWantsToFinish() converted from synchronous keyword matching to async AI-powered intent detection",
        "stream-coach-creator-session and update-coach-creator-session handlers updated to await async checkUserWantsToFinish()",
        "Nova Micro now only used for low-stakes tasks (contextual UI messages and simple binary classifications)"
      ],
      fixed: [
        "Coach config generation JSON parsing failures when Bedrock returns markdown-wrapped JSON (```json...```)",
        "lastActivity timestamp not updating in coach creator session cards on Coaches page",
        "lastActivity field not being saved in stream-coach-creator-session handler",
        "lastActivity field not being saved in update-coach-creator-session handler (both streaming and non-streaming paths)",
        "Inconsistent JSON formatting instructions across different AI functions causing parsing variability",
        "Missing fallback parsing logic (cleanResponse/fixMalformedJson) in coach config generation",
        "JSON parsing errors from AI responses with markdown code blocks or structural issues",
        "Trailing comma errors in AI-generated JSON responses due to insufficient validation rules",
        "Coach creator '3 times to finish' bug where users needed to respond multiple times before coach creation triggered",
        "Keyword-based finish detection missing natural affirmative responses ('yep', 'sounds good', 'okay', 'sure')",
        "Nova Micro reliability issues with critical decision-making tasks requiring nuanced understanding",
        "Potential JSON parsing errors in 6 detection functions due to missing formatting instructions"
      ]
    }
  },
  {
    version: "Release v1.0.20251002-beta",
    date: "2025-10-02",
    changes: {
      added: [
        "Image upload functionality for both CoachConversations and CoachCreator pages with drag-and-drop and paste support",
        "Private S3 bucket (midgard-apps) with branch-aware naming for secure image storage",
        "Presigned URL generation for secure client-side image uploads (generate-upload-urls Lambda)",
        "Presigned URL generation for secure image downloads from private S3 bucket (generate-download-urls Lambda)",
        "ImageWithPresignedUrl shared component for consistent image display across pages",
        "Multimodal AI vision support using Claude Sonnet 4.5 via AWS Bedrock Converse API",
        "Image hydration system (image-hydration.ts) to download images from S3 and format for Claude API",
        "Client-side image processing utilities (imageProcessing.js) with HEIC conversion and compression",
        "useImageUpload React hook for managing image selection, preview, and upload state",
        "Per-image upload progress indicators with loading spinners on each image preview",
        "Copy-paste image functionality directly into ChatInput on desktop browsers",
        "Image preview display within message bubbles for both user and AI messages",
        "Inline image display with 128x128px thumbnails using neon maroon styling",
        "Support for up to 5 images per message with automatic validation",
        "S3 bucket lifecycle policy for automatic cleanup of old images after 90 days",
        "Dynamic S3 bucket name injection into amplify_outputs.json for frontend access"
      ],
      changed: [
        "CoachConversationAgent and CoachCreatorAgent now accept imageS3Keys parameter in message sending",
        "ChatInput component extended with image upload UI and file selection capabilities",
        "update-coach-creator-session handler now uses multimodal Bedrock API when images are present",
        "send-coach-conversation-message and stream-coach-conversation handlers updated for image support",
        "CoachMessage interface extended with messageType and imageS3Keys properties",
        "Backend validation ensures S3 keys are user-scoped (must start with user-uploads/{userId}/)",
        "Message submission now clears images immediately after upload for better UX",
        "Image previews styled with imagePreviewPatterns from uiPatterns.js for consistency",
        "Inline images display with neon maroon borders (border-synthwave-neon-maroon/80) and backgrounds",
        "authenticatedFetch now prepends API base URL to relative URLs for correct routing",
        "Image preview thumbnails reduced from 80px to 64px for more compact display"
      ],
      fixed: [
        "Missing APPS_BUCKET_NAME environment variable in update-coach-creator-session Lambda",
        "Missing S3 read permissions for update-coach-creator-session Lambda function",
        "Missing messageType property causing buildMultimodalContent to skip image processing in CoachCreator",
        "Frontend making API calls to localhost instead of deployed API Gateway for image downloads",
        "Image remove button being cut off on top due to overflow-hidden on parent container",
        "Images not disappearing from ChatInput after message submission",
        "ImageWithPresignedUrl component duplicated in CoachCreator.jsx and CoachConversations.jsx",
        "CoachCreatorAgent and CoachConversationAgent not loading imageS3Keys from DynamoDB into frontend state",
        "Image borders and styling not standing out against user message container backgrounds"
      ]
    }
  }
];

/**
 * Get the latest N versions from changelog
 * @param {number} count - Number of versions to return
 * @returns {Array} - Array of changelog entries
 */
export const getLatestVersions = (count = 5) => {
  return changelogEntries.slice(0, count);
};

/**
 * Get total count of changes for a version entry
 * @param {Object} entry - Changelog entry object
 * @returns {Object} - Object with counts {added, changed, fixed, total}
 */
export const getTotalChanges = (entry) => {
  const addedCount = entry.changes.added?.length || 0;
  const changedCount = entry.changes.changed?.length || 0;
  const fixedCount = entry.changes.fixed?.length || 0;

  return {
    added: addedCount,
    changed: changedCount,
    fixed: fixedCount,
    total: addedCount + changedCount + fixedCount
  };
};

/**
 * Generate anchor ID from version string
 * Extracts just the version number portion (e.g., "v1.0.20251010-beta")
 * @param {string} version - Version string (e.g., "Release v1.0.20251010-beta")
 * @returns {string} - Anchor ID (e.g., "v1.0.20251010-beta")
 */
export const generateVersionAnchor = (version) => {
  // Extract version number: "Release v1.0.20251010-beta" -> "v1.0.20251010-beta"
  const match = version.match(/v[\d.]+(?:-\w+)?/);
  return match ? match[0] : version.replace(/\s+/g, '-');
};
