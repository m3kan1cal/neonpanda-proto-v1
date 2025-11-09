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
    version: "Release v1.0.20251109-beta",
    date: "2025-11-09",
    changes: {
      added: [
        "Complete Training Program Dashboard with comprehensive program overview, calendar view, phase timeline, and progress tracking",
        "TrainingProgramDashboard.jsx main container component with dedicated route at /training-grounds/training-programs/:programId/dashboard",
        "TrainingProgramCalendar.jsx week-by-week grid layout showing all program days with visual status indicators",
        "CalendarDayCell.jsx clickable day cells with color-coded status (done: pink, skipped: cyan, pending: muted gray, rest: dark)",
        "ProgramOverview.jsx section displaying program metadata (name, description, status, coach, type, focus areas, stats)",
        "ProgressOverview.jsx section showing adherence rate, completed/skipped workouts, current phase, and progress metrics",
        "PhaseTimeline.jsx visual progress bar with phase segments, current day indicator, and phase breakdown cards",
        "Training program calendar legend showing status indicators (Done, Partial, Skipped, Pending, Rest) with color-coded dots",
        "Week-by-week calendar navigation with 'Current' and 'All Weeks' filter buttons for focused vs full program view",
        "Current day highlighting in calendar with 'Day X' badge below the timeline progress bar",
        "Clickable day cells navigating to specific day workouts at /training-grounds/training-programs/workouts?day=X",
        "Calendar day cells showing workout count badges (1, 2, 3+ workouts per day) styled like sidebar count badges",
        "Phase Timeline with proportional visual segments (50% phase 1, 25% phase 2, 25% phase 3) matching actual program structure",
        "Phase breakdown cards with phase name, duration, description, current/completed badges, and focus area tags",
        "Program Intel subcontainer in Program Overview showing status and coach metadata in 2-column layout",
        "Program Stats subcontainer showing total days, workouts/week, created date, and start date in 2-column metadata layout",
        "Program Focus tags displayed as badges (strength, conditioning, mobility, etc.) using consistent badge styling",
        "Metadata display pattern with label (secondary gray) and value (neon cyan) for consistent information presentation",
        "Subcontainer pattern (bg-synthwave-bg-card/30, border-synthwave-neon-cyan/20) for grouped information sections",
        "Three-dot 'More Actions' menu on ManageTrainingPrograms program cards with Rename and Delete options",
        "Three-dot 'More Actions' menu on Coaches page coach cards with Rename Coach and Delete Coach options",
        "Inline edit functionality triggered from More Actions menu for renaming programs and coaches",
        "startInEditMode prop for InlineEditField component allowing immediate edit mode without hover interaction",
        "Escape key handler for canceling inline edit across ManageTrainingPrograms and Coaches pages",
        "Click-outside detection for closing More Actions dropdown menus with mousedown event listeners",
        "Focus outline removal (focus:outline-none, active:outline-none) on three-dot menu buttons preventing white border flash",
        "Tap highlight prevention (WebKitTapHighlightColor: transparent) on three-dot menu buttons for mobile polish",
        "Active state styling for three-dot menu button (text-synthwave-neon-cyan, bg-synthwave-bg-primary/50) when menu open",
        "Menu item hover effects matching SidebarNav styling (hover:text-synthwave-neon-pink, hover:bg-synthwave-neon-pink/10)",
        "Conditional menu hiding when inline edit is active to prevent visual overlap with cancel button",
        "Delete confirmation modals with backdrop click closing (only when not actively deleting)",
        "Escape key handler priority system: inline edit cancel > close delete modal",
        "Shadow styling on dropdown menus (shadow-[4px_4px_16px_rgba(0,255,255,0.06)]) for depth perception",
        "EditIcon SVG component for consistent rename action icon across management pages",
        "EllipsisVerticalIcon SVG component for three-dot menu button across management pages",
        "Pause/Resume/Complete program actions integrated into ManageTrainingPrograms cards",
        "Loading states with spinners for pause/resume/complete actions showing specific action in progress",
        "Disabled state management preventing multiple simultaneous program actions (pause + complete simultaneously)",
        "Program status tracking with real-time updates (active → paused, paused → active, active → completed)",
        "Status badge styling in Program Overview (active: green, paused: purple, completed: cyan) with border and padding",
        "Status badge positioning in top-right of Program Intel subcontainer matching phase timeline badge layout",
        "Today's Workout section on Training Program Dashboard showing current day workouts with full ViewWorkouts integration",
        "Program context display showing phase name, current day, and scheduled workouts for user orientation",
        "Navigation flow from Training Grounds → Manage Programs → Program Dashboard → Day Workouts with seamless routing",
        "Query parameter handling for day selection (?day=X) vs today (?day=undefined) in workout navigation",
        "Current day detection removing ?day parameter when clicking current day in calendar for 'Today's Workout' context",
        "Breadcrumb navigation on Program Dashboard: Home > Training Grounds > Training Programs > Program Dashboard",
        "Breadcrumb navigation on View Workouts: Home > Training Grounds > Training Programs > Workout Details",
        "Responsive calendar layout adapting to mobile, tablet, and desktop screen sizes",
        "Coach compact card integration on Program Dashboard header matching Training Grounds header design"
      ],
      changed: [
        "ManageTrainingPrograms program cards refactored to use three-dot menu instead of direct delete button for cleaner action organization",
        "Coaches page coach cards refactored to use three-dot menu instead of direct delete button for consistent UX across pages",
        "InlineEditField component enhanced to support startInEditMode prop, immediately entering edit mode when triggered from menu",
        "InlineEditField hover-based edit icon completely removed from display mode, requiring explicit 'Rename' action from menu",
        "Program name editing now controlled by editingProgramId state instead of hover-based InlineEditField detection",
        "Coach name editing now controlled by editingCoachId state instead of hover-based InlineEditField detection",
        "Delete confirmation flow updated to prevent Escape key closing modal while deletion is in progress",
        "Three-dot menu positioning changed to absolute positioning in top-right corner of program/coach cards",
        "Menu dropdown width standardized to w-44 (176px) with pl-4 pr-3 padding for balanced spacing",
        "Menu item icons sized to w-4 h-4 for consistency with text (font-rajdhani font-medium text-sm)",
        "Program Dashboard route changed from /training-grounds/training-programs/:programId to /training-grounds/training-programs/dashboard?programId=X",
        "View Workouts route structure unified: /training-grounds/training-programs/workouts?programId=X&day=Y",
        "Training program status badge repositioned from header area to Program Overview Intel subcontainer",
        "Program metadata layout changed from simple list to organized subcontainers (Intel, Stats, Description, Focus)",
        "Progress metrics layout changed from simple list to 2-column metadata grid with subcontainer wrapper",
        "Phase timeline visual changed from simple list to proportional progress bar with gradient segments and phase cards below",
        "Calendar day cell status colors updated: done (neon pink), skipped (cyan/40), pending (muted/30), rest (bg-primary/30)",
        "Calendar day cell styling matches weekly heat map design with consistent border-radius and hover effects",
        "Workout count badges in calendar cells styled like sidebar navigation count badges (bg-synthwave-bg-primary/50, border-synthwave-neon-cyan/30)",
        "Phase names displayed above timeline segments using secondary text color (text-synthwave-text-secondary)",
        "Phase duration text displayed as 'Duration: X days' instead of 'X days' with neon cyan value color",
        "Phase focus areas displayed as badges below phase description in phase cards",
        "Current phase badge styling changed to match logged/skipped badges (bg-color/20, text-color, border) with positioning in top-right",
        "Pause button styling now shows spinner with specific action text 'Pausing...' vs 'Pause'",
        "Complete button styling now shows spinner with specific action text 'Completing...' vs 'Complete'",
        "Resume button styling now shows spinner with specific action text 'Resuming...' vs 'Resume Program'",
        "Program Dashboard main container width matches Training Grounds (max-w-7xl mx-auto px-8 py-8)",
        "Program Dashboard header layout matches Training Grounds compact horizontal header design",
        "Adherence rate now displays with neon cyan color matching other key metrics throughout dashboard",
        "Last activity timestamp now displays with neon cyan color for consistency across program cards",
        "Progress percentage now displays with neon cyan color matching metadata value pattern",
        "Section headers on Program Dashboard use branding-aligned text: 'Program Intel', 'The Mission', 'Your Progress', 'Phase Breakdown', 'Program Calendar'",
        "Program description label changed from 'Description' to 'The Mission' for brand alignment",
        "Program stats label changed from 'Statistics' to 'Program Vitals' for brand voice",
        "Phase Timeline header changed from 'Current Phase' to 'Phase Breakdown' for clarity",
        "Calendar section header changed from 'Training Calendar' to 'Program Calendar' for consistency",
        "Escape key handler logic refactored to prioritize inline edit cancellation before modal closing",
        "useEffect dependencies updated to properly track editingProgramId, editingCoachId, showDeleteModal states",
        "Menu open state management now uses openMenuId (programId or coachId) instead of boolean flag",
        "Loading state tracking now includes both programId and action type ({ programId, action: 'pause' | 'resume' | 'complete' })",
        "Status badge top spacing in Program Overview adjusted from pt-3 to pt-2 matching phase timeline badge alignment",
        "Bottom padding reduced on phase name section (mb-3 → mb-2) to tighten spacing between timeline and phase cards",
        "Timeline shadow styling now uses same depth as subcontainers (shadow-lg shadow-synthwave-neon-cyan/20)",
        "Program focus badges moved to bottom of Program Overview instead of inline with description",
        "Coach metadata display changed from badge to label-value pair matching other metadata",
        "Status metadata display changed from badge to conditional badge-style display (green/purple/cyan)",
        "View Workouts page breadcrumb text simplified to 'Workout Details' instead of dynamic 'Today's Workouts' vs 'View Workouts'",
        "uiPatterns.js extended with sectionHeader pattern for consistent dashboard section headers",
        "uiPatterns.js extended with metadataLabel and metadataValue patterns for consistent information display",
        "uiPatterns.js extended with subcontainerBackground pattern for grouped content sections"
      ],
      fixed: [
        "Critical bug where three-dot menu button showed default white focus ring on click despite focus:outline-none class",
        "Three-dot menu button briefly flashing white border on active state before applying custom styling",
        "Three-dot menu losing active background color when menu is open due to conditional class not applied",
        "Delete icon overlapping with inline edit cancel button when renaming program due to menu not hidden during edit",
        "Escape key not canceling inline edit when user clicks outside card and then presses Escape",
        "Inline edit field not immediately entering edit mode when clicking 'Rename' menu item",
        "Hover edit icon appearing on program/coach names even when three-dot menu provided explicit rename action",
        "Delete modal closing on any Escape key press even while deletion was in progress",
        "Multiple useEffect cleanup issues causing menu not to close properly on outside clicks",
        "Menu dropdown positioning causing clipping at card edges due to overflow-hidden on parent",
        "Both pause and complete buttons showing spinner simultaneously when only one action triggered",
        "Program dashboard not loading due to incorrect route structure with :programId path parameter",
        "Calendar day cells not showing workout counts due to missing template aggregation logic",
        "Phase timeline segments not proportional to actual phase duration (all showing equal width)",
        "Phase timeline start segment missing rounded corners on left edge",
        "Current day indicator (Day X) showing incorrect vertical alignment on timeline",
        "Calendar legend dots not matching same size as dots in day cells",
        "Status badge in Program Overview having inconsistent spacing compared to phase timeline badges",
        "Program Intel subcontainer metadata not left-aligning properly in 2-column grid",
        "Current phase label not wrapping correctly when phase name is long",
        "Phase focus badge styling not matching prescribed exercise badge styling",
        "Today's Workout section on dashboard not integrating full ViewWorkouts component properly",
        "Navigation from Training Grounds 'View Workouts' button going to wrong route",
        "Query parameter handling causing 'day=undefined' to appear in URL instead of clean /today route",
        "Breadcrumb navigation showing incorrect text when navigating from calendar day cell",
        "Calendar weeks starting at Week 0 instead of Week 1 due to 0-based indexing",
        "Escape key handler executing multiple times due to duplicate event listener registrations",
        "Three-dot menu not closing when clicking another program card's menu button",
        "Status badge color not updating in real-time when pause/resume/complete actions triggered",
        "Loading state not clearing properly after action completion causing stuck spinner",
        "Program Dashboard header not matching Training Grounds header layout (fonts, spacing, coach card)",
        "Calendar day cell hover effects not consistent with weekly heat map styling",
        "Phase timeline progress indicator line not properly animating/pulsing on current day marker"
      ],
      removed: [
        "Direct delete button from ManageTrainingPrograms program cards (replaced with three-dot menu)",
        "Direct delete button from Coaches page coach cards (replaced with three-dot menu)",
        "Hover-based edit icon from InlineEditField component in display mode",
        "Status badge from Program Dashboard page header (moved to Program Overview section)",
        "Horizontal dividers (hr elements) from Program Overview and Progress Overview sections",
        "ProgramCalendar.jsx duplicate component (consolidated to TrainingProgramCalendar.jsx)",
        "TrainingProgramActionsMenu.jsx component (actions moved to ManageTrainingPrograms cards)"
      ]
    }
  },
  {
    version: "Release v1.0.20251104-beta",
    date: "2025-11-04",
    changes: {
      added: [
        "Day completion celebration animations with 4 visual styles (Neon Burst, Laser Grid, Lightning Bolts, Starfield Warp) triggering when all workouts for a day are completed",
        "Laser Grid animation as default celebration with animated grid lines, glowing intersections, and flash effects",
        "Separate celebrations.css file for organized animation keyframes (neonBurst, scanLines, laserBeamH, laserBeamV, gridFlash, lightning, electricGlow, warpStar, warpTunnel)",
        "Comprehensive workout template status system with visual indicators: '✓ Logged' badge (cyan), 'Skipped ✕' badge (cyan), and 'Day Complete 🎉' badge (pink)",
        "Continuous polling system for linkedWorkoutId after workout logging with 3-second intervals, 60-poll maximum, and automatic cleanup",
        "Skip workout functionality with full API integration, visual feedback (spinner, badge, dimmed card), and optional skip reason/notes",
        "Unskip workout functionality allowing users to revert skipped workouts back to pending status with single button click",
        "Skipped workouts tracking in training programs with skippedWorkouts field incremented/decremented on skip/unskip actions",
        "Combined workout statistics display on ManageTrainingPrograms cards showing completed, skipped, and total workouts on single line with icons (✓ X / ✕ Y of Z workouts)",
        "SkipAction const enum (SKIP, UNSKIP) in skip-workout-template handler for type-safe action handling",
        "View Workout button for completed templates linking directly to logged workout details page with all captured user edits",
        "Processing Workout spinner state with animated loading indicator on Log Workout button during backend processing",
        "Empty state messaging for rest days on specific day view (No workouts scheduled for day X)",
        "Toast notification system for workout actions (success: logging initiated, template skipped, template unskipped; errors: API failures)",
        "Specific day view functionality allowing navigation to any program day via /training-grounds/training-programs/{programId}/day/{dayNumber} route",
        "Backend Lambda support for ?day=X query parameter in get-workout-templates handler (lines 81-111)",
        "API Gateway route for specific day template retrieval at /users/{userId}/coaches/{coachId}/programs/{programId}/templates?day={dayNumber}",
        "TrainingProgramAgent.loadWorkoutTemplates() { day } option for loading specific day's workout templates",
        "Dynamic breadcrumb text based on route ('Today's Workouts' for /today vs 'View Workouts' for /day/X)",
        "Map-based polling interval management in TrainingProgramAgent with automatic cleanup on component unmount",
        "Exponential backoff retry logic in sync-log-subscriptions handler to prevent CloudWatch API throttling",
        "250ms delays between CloudWatch API calls to stay below 5 requests/second rate limit",
        "Celebration animation state management (showCelebration, celebrationType) in ViewWorkouts component"
      ],
      changed: [
        "ViewWorkouts page refactored to centralize workout actions (log, skip, unskip) in TrainingProgramAgent instead of component-level logic",
        "Workout template cards now display comprehensive status-based UI: pending shows Log/Skip buttons, completed shows View Workout button, skipped shows Unskip Workout button",
        "Workout description textarea now disabled (read-only) for completed and skipped templates preventing accidental edits",
        "Helper text below workout description dynamically updates based on template status: '✓ Workout logged - This is the workout as it was logged...' for completed templates",
        "Workout title text color changes to muted gray (text-synthwave-text-muted) for completed and skipped templates for visual hierarchy",
        "Difficulty badges hidden on completed and skipped workout cards to reduce visual clutter",
        "Day Complete badge repositioned from workout stats line to right of training program name for better visibility",
        "Program context section spacing tightened on ViewWorkouts (mb-8 → mb-4, program name mb-2 → mb-1, metadata py-1 → pb-1)",
        "Program context section displays phase name, current day, and total workouts scheduled for better user orientation",
        "Workout template logging moved to TrainingProgramAgent.logWorkoutFromTemplate() method for cleaner separation of concerns",
        "Skip workout button text changed from 'Skip Workout' to 'Skipped Workout' when in skipped state",
        "Skipped badge styling updated to match logged badge with neon cyan color and ✕ icon (previously purple)",
        "Completed/logged workout cards now show 75% opacity for visual distinction from pending workouts",
        "Training program day advancement logic fixed to only advance when ALL workouts for that day are completed/skipped (not just primary template)",
        "Adherence rate calculation corrected to store as percentage (multiply by 100) instead of decimal in backend",
        "ManageTrainingPrograms workout stats redesigned with color-coded metrics (completed: neon pink, skipped: neon cyan, total: secondary text)",
        "Last activity timestamp on program cards now displays in neon cyan for consistency",
        "Progress percentage on program cards now displays in neon cyan matching other key metrics",
        "Command Palette implementation standardized across 10 management pages to use global instance from App.jsx instead of local duplicates",
        "Keyboard shortcut handlers (Cmd/Ctrl+K) consolidated to single global handler in App.jsx, removing 10 duplicate local handlers",
        "NavigationContext integrated across all management pages for centralized Command Palette state management",
        "Tooltip system standardized across ViewWorkouts, ManageTrainingPrograms, and TrainingGrounds with 'Go to the Training Grounds' message",
        "Textarea refs in ViewWorkouts changed from array to Map keyed by templateId for reliable user edit capture",
        "Skip workout API endpoint enhanced to support both skip and unskip actions via action parameter ('skip' | 'unskip')",
        "Program stats updated to show skipped count even when zero for transparency",
        "Training program creation now initializes skippedWorkouts: 0 for proper stat tracking"
      ],
      fixed: [
        "Critical bug where program day advanced too early when only first workout of day was completed instead of waiting for all workouts",
        "User workout edits not being captured due to textarea ref array indices mismatching template map order (switched to Map keyed by templateId)",
        "Template status showing 'scheduled' on unskip causing TypeScript error (changed to 'pending' to match WorkoutTemplate type)",
        "Adherence rate displaying 0% when should show 14% due to backend storing decimal (0.14) instead of percentage (14)",
        "Skipped workouts not being tracked or displayed in program statistics due to missing increment/decrement logic",
        "CloudWatch ThrottlingException errors in sync-log-subscriptions Lambda due to exceeding 5 requests/second API rate limit",
        "CORS policy error when attempting to unskip workouts due to missing /unskip API endpoint (consolidated to /skip with action param)",
        "Duplicate CommandPalette modals opening simultaneously (local + global) when pressing Cmd/K on 10 management pages",
        "linkedWorkoutId not updating in UI after workout logging due to single-shot polling instead of continuous polling",
        "Skip workout button not showing visual feedback (spinner) or updating card state after API call",
        "Celebration animations not triggering on day completion due to missing status check logic",
        "Polling intervals not being cleared properly, causing memory leaks on component unmount",
        "Template status not reverting correctly on unskip (was set to 'scheduled' instead of 'pending')",
        "Program stats showing '0' for adherence rate even with completed workouts due to backend calculation error"
      ],
      removed: [
        "Local CommandPalette components and state from 10 management pages (TrainingGrounds, ManageWorkouts, WorkoutDetails, Coaches, CoachConversations, CoachCreator, ManageMemories, ViewReports, ManageCoachConversations, WeeklyReports)",
        "Local keyboard shortcut handlers (Cmd/Ctrl+K useEffect hooks) from 10 management pages now using global handler",
        "Temporary celebration test buttons from ViewWorkouts page after implementing automatic trigger",
        "Unskip workout API endpoint (/unskip) consolidated into skip endpoint with action parameter",
        "Verbose debugging artifacts from Phase 3B testing document (244 lines removed)"
      ]
    }
  },
  {
    version: "Release v1.0.20251026-beta",
    date: "2025-10-26",
    changes: {
      added: [
        "Complete Training Programs infrastructure with multi-week/multi-phase program creation, calendar-based scheduling, and adherence tracking",
        "TrainingProgram entity with full CRUD operations (create, read, update, delete) and DynamoDB single-table design integration",
        "Training program calendar generation with start dates, rest days, pause/resume functionality, and 'today' workout identification",
        "Natural language workout templates stored as human-readable coaching instructions instead of rigid JSON structures",
        "AI-powered workout template logging that converts natural language prescriptions to Universal Workout Schema on completion",
        "Conversation mode system (Chat vs Build) enabling context-aware AI interactions for different user intents",
        "Build mode UI with purple gradient styling, mode badges, and visual distinction from standard Chat mode conversations",
        "CoachConversationModeToggle component for seamless switching between Chat and Build modes with persistent mode state",
        "Build mode system prompt with structured guidance for training program creation through conversational Q&A flow",
        "Training program generation from conversational context using AI to extract program structure, phases, and workout templates",
        "Async build-training-program Lambda handler for non-blocking program generation with progress updates",
        "AI normalization and validation for training program structures ensuring data integrity and schema compliance",
        "Pinecone integration for training program summaries with semantic search and coach context retrieval",
        "Training program Pinecone metadata including program name, goal, duration, phase structure, and focus areas for rich semantic search",
        "S3 storage for detailed training program data and daily workout templates with efficient retrieval patterns",
        "Training program types and interfaces (TrainingProgram, TrainingProgramPhase, WorkoutTemplate, TrainingProgramCalendar)",
        "Training program schema definitions with comprehensive field documentation and validation rules",
        "Timezone-aware calendar calculations using user's local timezone (defaults to America/Los_Angeles) for 'today' detection",
        "Message-level mode tracking with metadata.mode property for historical accuracy of Chat vs Build conversations",
        "AI-generated contextual updates for training program generation (start, progress, completion) using Nova Micro",
        "Utility flyout menu patterns in uiPatterns.js (utilityFlyout.container, header, headerTitle, itemsContainer)",
        "Reusable gradient divider patterns in uiPatterns.js (gradientCyan, gradientPink, gradientPurple)",
        "Section spacing patterns in uiPatterns.js (sectionSpacing.top, bottom, both) for consistent navigation layout",
        "'More Resources' hover-based flyout menu in SidebarNav with clean header and aligned positioning",
        "Prompt caching for all 4 Bedrock calls in training program generation flow (structure, phases, workouts, normalization)",
        "Triple focus strategy for command palette input with immediate, requestAnimationFrame, and 100ms timeout attempts ensuring reliable focus on open",
        "autoFocus and autoComplete attributes to command palette input for native browser focus support"
      ],
      changed: [
        "Workout templates now stored as natural language coaching instructions (\"3x5 Back Squat at 80% 1RM, focus on depth and bar speed\") instead of structured JSON",
        "Log workout flow refactored to use AI for converting natural language templates + user performance data to Universal Workout Schema",
        "Training program phases now contain prescribedExercises arrays (exercise name + coaching notes) instead of full structured workout objects",
        "Build mode prompt enhanced with sequential questioning strategy, methodology application, and comprehensive personalization",
        "AI responses in Build mode styled with purple gradient bubbles (aiBuildModeBubble) distinct from cyan Chat mode styling",
        "Message status dots now use dynamic color variants (cyan for Chat, purple for Build) from messagePatterns in uiPatterns.js",
        "CoachConversationAgent updated to preserve metadata.mode when loading messages from DynamoDB",
        "Stream-coach-conversation handler now captures conversation mode in AI response metadata for historical tracking",
        "Update-coach-conversation backend handler enhanced to accept and validate mode field for conversation updates",
        "SidebarNav utility section replaced long list with single 'More Resources' button revealing flyout menu on hover",
        "SidebarNav menu items now span full width with only top/bottom borders (no left/right) for cleaner visual design",
        "SidebarNav gradient dividers and section spacing now use centralized patterns from uiPatterns.js",
        "Navigation icon centering logic extended to include CoachIconSmall and MemoryIconTiny for consistent collapsed sidebar alignment",
        "Training program naming standardized to use 'TrainingProgram' or 'trainingProgram' consistently (not 'Program' or 'program')",
        "Calendar functions renamed for clarity (isProgramActive → isTrainingProgramActive, ProgramCalendarDay → TrainingProgramCalendarDay)",
        "Coach personality integration enhanced in program-generator.ts to match rich prompts used in conversation flow",
        "Training program ID generation pattern simplified to remove coachId (now: trainingProgram_userId_timestamp_shortId)",
        "DynamoDB query function renamed from queryAllTrainingPrograms to queryTrainingPrograms for cleaner naming",
        "Universal Workout Schema Exercise interface expanded with comprehensive field definitions (equipment, intensity, notes, tempo)",
        "Command palette parsing logic refactored from regex pattern to indexOf/substring approach for maximum UTF-8 and multi-line content compatibility",
        "Command detection now uses simple string splitting instead of regex patterns to handle emojis, special characters, and newlines reliably",
        "AGENTS.md documentation updated with 'Streaming Contextual Updates' pattern for AI-generated ephemeral feedback"
      ],
      fixed: [
        "Training program date handling inconsistency where calendar used UTC instead of user's local timezone for 'today' calculation",
        "Create-training-program handler errors due to accessing old property names after interface simplification",
        "Update-training-program handler potential property overwriting by adding atomic ConditionExpression checks",
        "Inconsistent camelCase naming (itemWithGSI corrected from itemWithGSI, convertUtcToUserDate from convertUTCToUserDate)",
        "AI responses in Build mode not showing purple styling during real-time streaming (metadata.mode missing in placeholder message)",
        "Build Mode badge text not vertically centered in message bubbles (added translate-y-px adjustment)",
        "Build-training-program Lambda missing DynamoDB environment variables and Bedrock permissions causing failures",
        "Training program generation sending entire conversation history instead of only latest continuous Build mode section",
        "Pinecone storage failure for training programs due to storing complex phases array in metadata (now stores phaseNames and focusAreas only)",
        "[GENERATE_PROGRAM] trigger text briefly appearing in AI chat bubbles before being removed during streaming",
        "Workout template normalization referencing outdated structured format instead of new natural language approach",
        "400 error when clicking Build mode toggle due to update-coach-conversation not accepting mode field",
        "CoachConversationModeToggle button styling inconsistencies (padding, border-radius, font-weight, vertical alignment)",
        "SidebarNav flyout menu positioning issues (z-index, vertical alignment, gap, border styling)",
        "'Help & Info' menu item text going dark when hovering over flyout (missing text-synthwave-neon-cyan)",
        "'Help & Info' menu item borders not showing neon cyan on hover (needed border-t/border-b specific classes)",
        "SidebarNav flyout menu clipping due to parent overflow-y-auto (moved outside scrollable container with fixed positioning)",
        "Coach Details and Save Memory icons appearing different sizes in collapsed sidebar (added centering for CoachIconSmall and MemoryIconTiny)",
        "Critical command palette bug where multi-line workout data (with newlines) failed to parse due to regex .+ pattern not matching newline characters",
        "Command palette input not receiving focus when opened, causing users to manually click the input field before typing",
        "Long workout logs with line breaks showing 'No commands found' error instead of recognizing /log-workout command"
      ],
      removed: [
        "Structured workout template schemas and normalization utilities (replaced with natural language approach)",
        "libs/training-program/workout-template-utils.ts (consolidated into workout-utils.ts)",
        "Test scripts for manually updating message modes (update-message-modes-for-testing.js, list-conversation-messages.js)"
      ]
    }
  },
  {
    version: "Release v1.0.20251023-beta",
    date: "2025-10-23",
    changes: {
      added: [
        "Pre-validation for workout slash commands (/log-workout) to reject obviously incomplete inputs before AI extraction (minimum 15 characters required)",
        "Comprehensive mobile-responsive positioning system for QuickActionsFAB using calc() with env(safe-area-inset-bottom) for immunity to mobile browser chrome changes",
        "Conversation mode toggle skeleton loading structure in ChatInput matching real UI layout with mode toggle pill shape",
        "Platform-aware mobile keyboard shortcut hiding (⌘ K / Ctrl K badges hidden on touch devices below 768px)",
        "MESSAGE_TYPES constant enum (TEXT, TEXT_WITH_IMAGES, VOICE) for type-safe message content classification across backend and frontend",
        "BuildModeIconTiny SVG component in SynthwaveComponents.jsx for consistent Build mode indicator icon usage",
        "generateAndFormatUpdate() helper function for DRY contextual update generation with consistent error handling",
        "AGENTS.md documentation file with concise best practices for AI prompts, architecture patterns, and stack-specific guidance",
        "AI-generated contextual updates for training program generation using Nova Micro (start, complete, error states)",
        "Message bubble UI patterns in uiPatterns.js (userMessageBubble, aiChatBubble, aiBuildModeBubble) for consistent chat styling",
        "Message status dot patterns in uiPatterns.js (statusDotPrimary, statusDotSecondary, color variants) for visual message state indicators",
        "Build mode badge pattern (modeBadgeBuild) in uiPatterns.js for purple-themed mode indicators on AI messages"
      ],
      changed: [
        "Workout extraction parsing flow refactored to call parseJsonWithFallbacks() before validation checks, allowing proper markdown cleanup of AI responses",
        "cleanResponse() utility enhanced with comprehensive markdown pattern removal supporting all code fence variations (```json, ```, ~~~json, ~~~)",
        "JSON formatting instructions in workout extraction prompt strengthened with explicit 'CRITICAL' emphasis and repetition to prevent markdown wrapping",
        "memory/detection.ts consolidated to use parseJsonWithFallbacks() consistently (replaced 34 lines of manual markdown cleanup in 2 locations)",
        "coach-conversation/summary.ts converted from custom regex-based JSON extraction to parseJsonWithFallbacks() (replaced 22 lines with single utility call)",
        "QuickActionsFAB positioning changed from fixed bottom-20 to calc(80px + env(safe-area-inset-bottom)) preventing overlap with BottomNav during mobile browser chrome transitions",
        "CommandPaletteButton completely hidden on mobile (<768px) and visible on desktop (≥768px) since QuickActionsFAB provides mobile access",
        "ChatInput skeleton loading structure now conditionally renders mode toggle skeleton when conversationMode prop is provided",
        "Conversation mode toggle alignment refined with precise padding calculations (pl-[50px] mobile, pl-[150px] desktop) to align with text input left edge",
        "CoachMessage.messageType now uses MessageType type instead of plain string for improved type safety",
        "Streaming conversation handler optimized with fire-and-forget memory saves using didInitiateMemorySave boolean flag (simplified from promise tracking)",
        "Contextual updates reduced from 5-6 to 2-3 key updates (removed pattern_analysis and insights_brewing for faster AI streaming start)",
        "Training program generation contextual updates converted from hardcoded structured messages to AI-generated ephemeral feedback using Nova Micro",
        "CoachConversations.jsx message bubble styling extracted to uiPatterns.js (userMessageBubble, aiChatBubble, aiBuildModeBubble patterns)",
        "CoachConversations.jsx message status dots refactored to use messagePatterns from uiPatterns.js with dynamic color variants",
        "Build mode AI messages now styled with purple gradient bubble (aiBuildModeBubble) and purple status dots distinct from cyan Chat mode",
        "Build mode indicator badge now uses centralized modeBadgeBuild pattern and BuildModeIconTiny component for consistency",
        "Initial acknowledgment contextual update now uses generateAndFormatUpdate() helper for cleaner code",
        "Training program contextual updates (start, complete, error) now use generateAndFormatUpdate() helper reducing duplication"
      ],
      fixed: [
        "Critical workout extraction failure when Claude returns markdown-wrapped JSON (```json {...} ```) despite explicit instructions not to wrap",
        "Premature validation blocking cleanup where extraction code checked for opening brace BEFORE running parseJsonWithFallbacks() cleanup function",
        "Expensive AI extraction calls triggered by accidental/incomplete slash command inputs (e.g., 'WARM up' 7 characters triggering 34KB prompt)",
        "QuickActionsFAB sliding down and overlapping BottomNav when mobile browser UI chrome hides/shows during scrolling (viewport height changes)",
        "Keyboard shortcut badges (⌘ K / Ctrl K) displaying on mobile touch devices where keyboard shortcuts are unavailable",
        "Empty kbd container taking up space on mobile even when kbd elements were hidden due to visible flex container wrapper",
        "Inconsistent JSON parsing across codebase with some functions using raw JSON.parse() instead of parseJsonWithFallbacks() utility",
        "ChatInput skeleton loading not reflecting conversation mode toggle UI, showing generic status text instead of mode toggle skeleton structure",
        "Hardcoded messageType strings replaced with MESSAGE_TYPES constants preventing typos and improving maintainability",
        "Performance bottleneck where pattern/insights contextual updates blocked AI streaming start by ~300-500ms (now removed)",
        "Code duplication in contextual update generation with repetitive generateContextualUpdate + formatContextualEvent pattern across 4 locations",
        "Inconsistent styling between Build mode messages and Chat mode messages using inline classes instead of centralized patterns",
        "Hardcoded SVG icon for Build mode duplicated in multiple locations instead of using shared component",
        "Messy contextual update implementation with hardcoded structured messages for training programs instead of AI-generated ephemeral feedback"
      ],
      removed: [
        "libs/training-program/messages.ts file (replaced with AI-generated contextual updates for consistency with memory/workout handling)"
      ]
    }
  },
  {
    version: "Release v1.0.20251021-beta",
    date: "2025-10-21",
    changes: {
      added: [
        "Enhanced running workout schema with comprehensive tracking for distance units, elevation loss, structured weather data, equipment, warmup/cooldown, route details, and fueling/hydration",
        "RunningSegment TypeScript interface for detailed segment-based tracking with pace, heart rate, cadence, terrain, and elevation change data",
        "RunningSegmentDisplay component in WorkoutViewer showing individual run segments with color-coded effort levels and performance metrics",
        "RunningDetails component displaying weather conditions, equipment tracking, route information, warmup/cooldown sections, and nutrition/hydration details",
        "Running-specific summary fields in WorkoutViewer (run type, distance with unit, total time, average pace, surface, elevation gain/loss, route name)",
        "Weather tracking with temperature, temperature_unit (F/C), conditions (sunny/cloudy/rainy/etc), wind speed, and humidity percentage",
        "Equipment tracking for running shoes, wearables (GPS watches), and other gear (running belt, sunglasses, etc.)",
        "Route information with name, description, and type classification (out_and_back, loop, point_to_point)",
        "Fueling details tracking pre-run nutrition, during-run fueling items, and total hydration in ounces",
        "Warmup and cooldown sections with distance, time, and text descriptions for each phase",
        "Run type classification supporting 11 types: easy, tempo, interval, long, race, recovery, fartlek, progression, threshold, hill_repeats, speed_work",
        "Segment type classification: warmup, working, interval, recovery, cooldown, main",
        "AI extraction pattern documentation for run type identification, pace/distance extraction, weather conditions, segment analysis, and equipment/route recognition"
      ],
      changed: [
        "RunningWorkout TypeScript interface upgraded from placeholder to fully-typed interface with comprehensive field definitions",
        "UNIVERSAL_WORKOUT_SCHEMA.md running section expanded with design philosophy, detailed examples, and AI extraction patterns",
        "WorkoutViewer component enhanced to display running workouts with collapsible sections for details and segments",
        "Running segments now display with color-coded effort level badges (max: pink, hard: cyan, moderate: secondary, easy: cyan/10)",
        "Universal workout schema running section now includes elevation_loss field alongside elevation_gain for complete elevation profile"
      ],
      fixed: [],
      removed: []
    }
  },
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
        "Non-streaming coach conversation handler now passes only new messages (user + assistant) to sendCoachConversationMessage instead of all messages",
        "Coach creator conversation history instructions enhanced to check ALL previous responses for already-provided information before asking questions, preventing redundant questions",
        "Mobile navigation components (BottomNav, MoreMenu, QuickActionsFAB) now hidden on authentication pages by adding /auth to publicRoutes array with prefix matching logic in App.jsx"
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
        "Confusing workout ID naming convention (workout#workout_summary_...) inconsistent with actual data structure (workouts contain summaries, not summaries of workouts)",
        "Coach creator asking redundant questions about information users already volunteered in previous responses (e.g., re-asking about equipment after user mentioned it 2 questions earlier)"
      ],
      removed: [
        "NavigationTest.jsx component and related test navigation configuration files",
        "uiPatterns.js from root src/utils directory (consolidated to src/utils/ui/uiPatterns.js)",
        "Seven duplicate logo image files (logo-light-sm-1.png through logo-light-sm-6.png, logo-light-sm-cf.png)",
        "Send message and voice record button tooltips from ChatInput component (self-explanatory buttons don't need hints, especially on mobile)"
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
