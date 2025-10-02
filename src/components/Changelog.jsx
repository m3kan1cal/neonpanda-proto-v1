import React, { useState, useEffect } from 'react';
import { containerPatterns, layoutPatterns, typographyPatterns, formPatterns } from '../utils/uiPatterns';
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
          <h3 className="font-russo font-bold text-white text-base uppercase">
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
  },
  {
    version: "Release v1.0.20250930-beta",
    date: "2025-09-30",
    changes: {
      added: [
        "User Settings page accessible at /settings with profile management, password changes, preferences, and account management",
        "FormInput component for general form inputs (split from AuthInput for better separation of concerns)",
        "InfoIcon component to SynthwaveComponents for helper text indicators with cyan styling",
        "Backend Lambda functions (get-user-profile, update-user-profile) with HttpUserPoolAuthorizer protection",
        "Cognito sync utility (libs/user/cognito.ts) for syncing profile attributes to Cognito User Pool",
        "User profile fetching in AuthContext with automatic loading on authentication",
        "Display name support allowing users to customize how they appear across the platform",
        "Skeleton loading structure for Settings page with proper form field placeholders and helper text skeletons",
        "Helper text with info icons for form inputs providing contextual guidance to users",
        "API documentation with cURL examples for user profile endpoints in docs/api-examples/",
        "createdAt and updatedAt timestamps in get-user-profile and update-user-profile API responses",
        "Conditional coach_id field inclusion in Pinecone metadata to comply with null value restrictions",
        "Smarter safety validation that only warns when injuries exist without contraindicated exercises"
      ],
      changed: [
        "AuthContext now fetches and provides userProfile from DynamoDB on authentication",
        "Navigation component now displays userProfile.displayName instead of Cognito preferred_username",
        "CoachConversations and CoachCreator components now use userProfile.displayName for avatar displays",
        "Settings page renamed to 'Your Settings' in navigation for clarity",
        "FormInput and AuthInput components now have consistent styling for disabled states",
        "Form input descriptions styled with cyan InfoIcon for better visibility and modern UI design",
        "Username field disabled in Settings with guidance to use Display Name instead",
        "Email field disabled in Settings as email cannot be changed after registration",
        "Save/Cancel buttons in Settings forms now take 50% width each with centered alignment",
        "Settings page auto-scrolls to top on page load for better UX",
        "Form input descriptions now end with periods for grammatical consistency",
        "Standardized streaming agent loading state management using only isLoadingItem property",
        "Coach config safety validation now checks for actual injuries before warning about missing contraindications",
        "Pinecone memory metadata construction updated to omit undefined coach_id fields instead of sending null",
        "Removed legacy isLoading check from resetStreamingState in favor of standardized isLoadingItem"
      ],
      fixed: [
        "Username field appearing editable in Settings but not saving changes (now properly disabled)",
        "Inconsistent vertical spacing in ContactForm between name fields and email field",
        "401 Unauthorized errors in user profile API calls due to incorrect cURL syntax (--data '' on GET requests)",
        "Missing createdAt and updatedAt fields in get-user-profile and update-user-profile API responses",
        "Disabled input styling inconsistency between AuthInput and FormInput components",
        "Info icon in Danger Zone showing as gray instead of cyan (icon now cyan, text remains gray)",
        "Form input descriptions not having consistent punctuation across Settings page",
        "Frontend displaying Cognito preferred_username instead of user-controlled displayName from profile",
        "CoachCreator streaming blocked after first message due to isLoadingItem flag not being reset in resetStreamingState",
        "Pinecone storage errors when saving global memories with 'Invalid type for field coach_id... got null'",
        "False positive safety warnings appearing on every conversation message for users with no injuries",
        "CloudWatch logs cluttered with unnecessary contraindicated exercises warnings for healthy users",
        "Second message submission failing in coach creator sessions due to validation thinking isLoadingItem was still true"
      ]
    }
  },
  {
    version: "Release v1.0.20250929-beta",
    date: "2025-09-29",
    changes: {
      added: [
        "Real-time Server-Sent Events (SSE) streaming for coach conversations using AWS Lambda Function URLs",
        "Smart Request Router system reducing AI API calls by 85% through intelligent routing decisions",
        "Creative contextual updates with energetic coach language ('Scouting your training data...', 'Going beast mode on your data...')",
        "Natural coach acknowledgments with random selection from 9 authentic phrases ('Alright, let's work.', 'I hear you.', 'Got it, let's go.')",
        "Comprehensive streaming utilities library (libs/streaming/) with SSE formatters, authentication middleware, and path utilities",
        "Lambda Function URL configuration with RESPONSE_STREAM mode for true real-time streaming",
        "Progressive contextual updates showing AI analysis stages (initial greeting, workout analysis, memory analysis, pattern analysis, insights brewing)",
        "Chunk optimization system with intelligent buffering for smooth streaming delivery through Lambda Function URLs",
        "Complete streaming authentication middleware with JWT validation and user authorization",
        "Advanced error handling with graceful fallback from streaming to non-streaming API",
        "Streaming state management with real-time UI updates using React flushSync for immediate rendering",
        "Consolidated memory analysis functions combining detectMemoryRetrievalNeed and detectMemoryCharacteristics",
        "Smart router integration with Nova Micro and Claude Haiku models for fast, accurate routing decisions"
      ],
      changed: [
        "Coach conversation streaming now prioritizes Lambda Function URL over API Gateway for real-time performance",
        "Contextual updates system enhanced with creative, energetic language replacing corporate speak",
        "AI detection functions consolidated into single smart router call (analyzeRequestCapabilities) for 60-70% faster processing",
        "Streaming handler refactored to use AWS pipeline approach with async generators for true concurrent streaming",
        "Console logging dramatically reduced from 42,000+ logs to essential error/completion logs for optimal browser performance",
        "Contextual updates now properly accumulated in final saved messages with identical formatting to streaming display",
        "Coach acknowledgments changed from robotic 'Processing your message...' to authentic coach responses",
        "Memory processing optimized with consolidated analyzeMemoryNeeds function replacing separate detection calls",
        "Streaming chunks now include proper line breaks (\\n\\n) for consistent formatting between streaming and final messages",
        "Complete event handling updated to use aiMessage.content from Lambda response for proper message finalization",
        "Frontend streaming integration enhanced with optimized chunk processing and seamless UI transitions"
      ],
      fixed: [
        "Browser performance issues caused by excessive console logging (42,000+ log entries) during streaming",
        "Contextual updates not being saved in final conversation messages despite appearing during streaming",
        "Empty chat bubble issue when streaming completed due to race condition in onComplete handler",
        "Unwanted quotes appearing around contextual updates during streaming but not in final messages",
        "Contextual updates running together as one sentence during streaming instead of proper line spacing",
        "Race condition between streamingMsg.update() and resetStreamingState() causing UI to go empty",
        "SSE parsing duplication bug in test script causing exponential event accumulation",
        "Memory characteristics detection errors due to AI returning compound types instead of single types",
        "Lambda permission errors for buildWorkout and buildConversationSummary function invocations",
        "Streaming method selection logic now properly handles Lambda Function URL availability",
        "Unknown chunk type 'start' errors in streaming agent helper resolved with proper event handling",
        "Content-type validation in test script updated to accept application/octet-stream for Lambda Function URLs"
      ]
    }
  },
  {
    version: "Release v1.0.20250926-beta",
    date: "2025-09-26",
    changes: {
      added: [
        "Streaming chat implementation alignment between CoachCreator and CoachConversations components",
        "Advanced React state management with flushSync for real-time streaming UI updates",
        "Memoized MessageItem component for optimized streaming message rendering",
        "Streaming-aware content display with progressive message building",
        "Enhanced streaming state management in CoachCreatorAgent with detailed logging",
        "Input validation using validateStreamingInput helper for consistent error handling",
        "messageTimestamp field support in coach creator session updates for improved accuracy",
        "Network-level streaming debug logging with timestamps for troubleshooting",
        "Streaming debug test utilities for isolating streaming implementation issues",
        "Conditional complexityIndicators handling in conversation summary metadata to prevent DynamoDB serialization warnings"
      ],
      changed: [
        "CoachCreator component streaming implementation aligned with CoachConversations reference implementation",
        "CoachCreatorAgent streaming state management upgraded to match CoachConversationAgent patterns",
        "CoachCreator API request structure updated to include messageTimestamp for consistency",
        "CoachCreator header layout spacing adjusted to match WeeklyReports pattern (h1 mb-6, description mb-4)",
        "ChatInput skeleton loading button shapes updated from rounded-full to rounded-lg/rounded-2xl to match real buttons",
        "CoachCreator messages area bottom padding increased from pb-36 to pb-40 for proper ChatInput clearance",
        "CoachConversations messages area bottom padding increased from pb-24 to pb-28 for consistent spacing",
        "Backend Lambda handler updated to accept and process messageTimestamp in coach creator session updates",
        "Streaming API helper enhanced with comprehensive network-level logging for debugging",
        "Conversation summary parsing now conditionally includes complexityIndicators only when defined and non-empty"
      ],
      fixed: [
        "Vertical spacing issue where last AI chat message bubble would go behind ChatInput in CoachCreator",
        "Header layout inconsistencies between CoachCreator and WeeklyReports components",
        "ChatInput skeleton loading showing circular buttons instead of rounded square/rectangle shapes",
        "DynamoDB serialization warnings caused by undefined complexityIndicators in conversation summaries",
        "Streaming implementation inconsistencies between CoachCreator and CoachConversations components",
        "Missing messageTimestamp field in coach creator session API requests",
        "Insufficient bottom padding in chat message areas causing UI overlap issues",
        "Skeleton loading state not accurately representing real component button shapes",
        "Header spacing inconsistencies affecting visual hierarchy and component alignment"
      ]
    }
  },
  {
    version: "Release v1.0.20250925-beta",
    date: "2025-09-25",
    changes: {
      added: [
        "Calendar heat map visualization for weekly training intensity based on RPE and workout intensity",
        "Interactive heat map squares with click navigation to daily workout details",
        "Weekly training intensity statistics showing total workouts, training days, and average RPE",
        "Color-coded intensity legend with purple (highest), neon pink (high), orange (medium), and yellow (low)",
        "Enhanced AI-powered memory tagging system with exercise-specific tag detection",
        "Exercise tag categories including exercise names, body parts, equipment, and movement patterns",
        "Dynamic memory tagging based on usage patterns and context (frequently_used, recently_accessed, etc.)",
        "Tag-enhanced semantic search in Pinecone for better memory retrieval",
        "Standardized tooltip patterns across the application for consistent UI/UX",
        "Collapsible section integration for weekly training intensity heat map",
        "Enhanced memory characteristics detection with exercise-specific analysis"
      ],
      changed: [
        "Weekly Reports page now includes calendar heat map positioned below weekly summary",
        "Memory creation now includes AI-suggested exercise tags (lunge, lower_body, functional, etc.)",
        "Pinecone memory storage now includes tags in searchable text content for better semantic matching",
        "Memory display in ManageMemories.jsx now strips technical tag artifacts for clean user experience",
        "Tooltip styling standardized across ChatInput, WeeklyHeatMap, and IconButton components",
        "Memory update operations now include usage-based and context-based tag enhancement",
        "AI memory analysis prompt enhanced with comprehensive exercise detection guidelines",
        "Memory characteristics result interface updated to include exerciseTags field",
        "Weekly training intensity container styling matches other report sections using uiPatterns"
      ],
      fixed: [
        "Memory content display showing technical 'tag: value' artifacts to users",
        "Inconsistent tooltip styling and positioning across different components",
        "Weekly training intensity container positioning and styling inconsistencies",
        "Memory tagging system not leveraging tags for semantic search improvements",
        "Exercise-specific memories lacking proper categorization and retrieval",
        "Tooltip positioning issues where tooltips appeared in center instead of top of buttons",
        "Memory display confusion where users saw internal tagging system artifacts"
      ]
    }
  },
  {
    version: "Release v1.0.20250921-beta",
    date: "2025-09-21",
    changes: {
      added: [
        "Inter font integration to Tailwind CSS configuration for modern web typography",
        "Dynamic browser tab titles that reflect current page/route using usePageTitle hook",
        "Centralized route mapping utility (routeUtils.js) for consistent breadcrumbs and page titles",
        "Critical mathematical accuracy guidelines for AI coach with precise conversion factors (1 mile = 1,609.34 meters)",
        "Partner workout interpretation system for alternating vs synchronized volume calculations",
        "withAuth middleware for centralized Lambda function authentication and authorization",
        "Comprehensive error monitoring system with CloudWatch Logs → Lambda → SNS architecture",
        "Email notifications to developers@neonpanda.ai for all Lambda function errors and warnings",
        "Lambda bridge function (forward-logs-to-sns) for CloudWatch to SNS integration",
        "Support for internal Lambda-to-Lambda invocations without JWT authentication",
        "Automatic log group creation with 30-day retention policy for all monitored functions",
        "High-level CDK constructs (SubscriptionFilter, LambdaDestination) for error monitoring infrastructure"
      ],
      changed: [
        "Application base title updated from 'NeonPanda/AI' to 'NeonPanda' for cleaner branding",
        "All 27 Lambda handlers migrated from manual authorizeUser to withAuth middleware pattern",
        "AI coach prompt enhanced with step-by-step mathematical calculation examples and unit conversion guidelines",
        "Workout extraction AI updated with partner WOD interpretation rules and volume calculation logic",
        "Error monitoring excludes log forwarder function from self-monitoring to prevent circular references",
        "ContactForm layout restructured with proper flexbox to prevent footer positioning issues",
        "All Lambda functions now monitored at the same level with consistent error alerting",
        "SNS topic naming standardized and simplified across error monitoring and contact form systems"
      ],
      fixed: [
        "API endpoints returning 500 Internal Server Error when userId in URL doesn't match JWT (now returns 403 Forbidden)",
        "Mathematical inaccuracies in AI coach responses (6 rounds × 400m incorrectly calculated as 2.4 miles instead of ~1.5 miles)",
        "Partner workout volume miscalculation where users were credited with full reps instead of half for alternating WODs",
        "CloudFormation deployment failures due to circular reference in error monitoring log groups",
        "ContactForm footer jumping up after successful submission due to content height changes",
        "CloudWatch Logs subscription filters requiring Lambda bridge instead of direct SNS integration",
        "Missing path parameters (conversationId) in internal Lambda-to-Lambda calls",
        "Authorization function throwing generic errors causing improper HTTP status codes",
        "Log group references failing during deployment before Lambda functions were invoked"
      ]
    }
  },
  {
    version: "Release v1.0.20250920-beta",
    date: "2025-09-20",
    changes: {
      added: [
        "Branch-aware conditional authentication flows for enhanced production security",
        "Comprehensive Postman authentication automation guide with USER_PASSWORD_AUTH flow",
        "camelCase environment variable naming convention for modern API testing workflows",
        "Enhanced glassmorphism container pattern (mainContentEnhanced) for improved UI depth",
        "Automatic idToken extraction and storage in Postman pre-request scripts",
        "Branch-aware resource naming utility functions for consistent infrastructure deployment",
        "Exponential backoff retry mechanism for post-confirmation Lambda race conditions",
        "Enhanced debug logging for DynamoDB table name resolution and branch detection",
        "Consolidated getTableName() utility function for consistent table name management",
        "Custom IncompleteAccountSetupException for better user error messaging in authentication flow"
      ],
      changed: [
        "Navigation component padding reduced from px-8 py-4 to px-6 py-3 for more compact design",
        "Breadcrumbs component padding reduced from px-8 py-2 to px-6 py-2 for visual consistency",
        "API endpoint resolution now properly handles sandbox mode using endpoint instead of customEndpoint",
        "Cognito User Pool Client auth flows now conditional: production uses only secure flows, dev/sandbox includes API testing flows",
        "AuthContext handleConfirmSignUp now includes retry logic with exponential backoff for fetchUserAttributes",
        "useEffect in AuthContext updated to use try/catch await pattern instead of .catch() for better error handling",
        "LoginForm now syncs AuthContext state with Amplify internal state for UserAlreadyAuthenticatedException scenarios",
        "AuthRouter redirect logic updated to handle users with missing custom:user_id more gracefully",
        "Post-confirmation function environment variables simplified using DYNAMODB_BASE_TABLE_NAME and BRANCH_NAME",
        "Branch naming logic consolidated into reusable utility functions for consistency across all resources"
      ],
      fixed: [
        "API endpoint resolution bug where sandbox mode incorrectly used 'https://null' as endpoint",
        "CloudFormation deployment failure due to incorrect enum values in explicitAuthFlows (ALLOW_SRP_AUTH → ALLOW_USER_SRP_AUTH)",
        "Race condition between fetchUserAttributes and post-confirmation Lambda trigger during email verification",
        "Authentication state synchronization mismatch causing users to get stuck on login page after verification",
        "Uncaught promise rejections in checkAuthState function when called during component mount",
        "Post-confirmation Lambda failures due to circular dependency in DynamoDB table name resolution",
        "Duplicate getTableName() functions causing inconsistencies in throughput-scaling.ts and operations.ts",
        "Missing custom user_id error not being displayed in LoginForm UI notification section",
        "Breadcrumbs and Navigation component padding inconsistencies causing misaligned layout elements",
        "Production security vulnerability where API testing authentication flows were enabled in all environments"
      ]
    }
  },
  {
    version: "Release v1.0.20250916-beta",
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
    version: "Release v1.0.20250910-beta",
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
    version: "Release v1.0.20250906-beta",
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
    version: "Release v1.0.20250905-beta",
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
    version: "Release v1.0.20250904-beta",
    date: "2025-09-04",
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
    version: "Release v1.0.20250903-beta",
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
    version: "Release v1.0.20250902-beta",
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
    version: "Release v1.0.20250828-beta",
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
                  <h3 className={formPatterns.subsectionHeader}>
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
                  <h3 className={formPatterns.subsectionHeader}>
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
                  <h3 className={formPatterns.subsectionHeader}>
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
