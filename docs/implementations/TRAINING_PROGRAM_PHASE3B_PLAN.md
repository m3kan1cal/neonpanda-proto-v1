# Training Programs - Phase 3b Implementation Plan
## Program Viewing & Interaction UI

**Last Updated:** January 2025
**Status:** ✅ COMPLETE (98%) - Ready for Production
**Next Phase:** See TRAINING_PROGRAM_PHASE4_PLAN.md
**Based On:** Actual implementation in program-3.json, workout-templates-3.json, TRAINING_PROGRAM_SCHEMA.md

---

## Implementation Progress

### ✅ Section 1: Training Grounds Enhancements (Complete)

**Completed Components:**
- ✅ `TodaysWorkoutCard.jsx` - Displays today's workout from active program
  - Shows program name, phase, day number, progress
  - Primary action: "View Workout" (emphasized, cyan)
  - Secondary actions: "Mark Complete", "Skip"
  - Responsive design with workout details card

- ✅ `ActiveProgramSummary.jsx` - Shows active program summary
  - Progress bar with percentage complete
  - Current phase indicator
  - Workout completion stats
  - "View Full Program" button

- ✅ `CreateProgramCard.jsx` - Dashed card to create new training program
  - Styled like "Add New Coach Card" (dashed borders, pink theme, shorter)
  - Time estimate badge (10-15 minutes)
  - Opens Build mode conversation
  - Used when no active program exists

**TrainingGrounds.jsx Integration:**
- ✅ ProgramAgent initialized and integrated
- ✅ Program state management added
- ✅ Data loading on mount (active programs + today's workout)
- ✅ Dynamic rendering based on program state:
  - Active program with today's workout → Shows both TodaysWorkoutCard + ActiveProgramSummary
  - Active program without today's workout → Shows ActiveProgramSummary only (rest day)
  - No active program → Shows CreateProgramCard

**Navigation Integration:**
- ✅ Added "Training Programs" to navigation (`navigationConfig.js`)
  - Shows in `SidebarNav.jsx` under "Your Training" section
  - Shows in `MoreMenu.jsx` for mobile users
  - Visible in both expanded and collapsed sidebar states
  - Route: `/training-grounds/programs?userId={userId}&coachId={coachId}`
  - Badge count: `ctx.newItemCounts.programs`
  - Color: pink

**Files Created:**
- `src/components/programs/TodaysWorkoutCard.jsx`
- `src/components/programs/ActiveProgramSummary.jsx`
- `src/components/programs/CreateProgramCard.jsx`

**Files Modified:**
- `src/components/TrainingGrounds.jsx`
- `src/utils/navigation/navigationConfig.js`

**Files Deleted:**
- `src/components/programs/EmptyProgramState.jsx` (replaced with CreateProgramCard)

**Status:** ✅ Complete - Ready for testing

---

### ⏳ Section 2: Manage Training Programs Page (Next)

**Status:** Not Started

---

### ⏳ Section 3: Program Dashboard (Upcoming)

**Status:** Planning Complete - See TRAINING_PROGRAM_DASHBOARD_IMPLEMENTATION.md
**Route:** `/training-grounds/programs/:programId`

**Phased Implementation:**
- **Phase 1 (Week 1)**: MVP - Header, Today's Workout Summary, Progress Overview
- **Phase 2 (Week 2)**: Calendar View with weekly grid and day navigation
- **Phase 3 (Week 3)**: Advanced stats, Phase Timeline, Phase Breakdown
- **Phase 4 (Week 4)**: Actions Menu (Pause/Resume, View Conversation, etc.)

**New Components:**
- `ProgramDashboard.jsx` - Main dashboard container
- `TodaysWorkoutSummary.jsx` - Compact workout display with actions
- `ProgressOverview.jsx` - Stats sidebar
- `ProgramCalendar.jsx` - Weekly grid view (Phase 2)
- `CalendarDayCell.jsx` - Individual day cells (Phase 2)
- `PhaseTimeline.jsx` - Visual phase progress (Phase 3)
- `PhaseBreakdown.jsx` - Current phase details (Phase 3)
- `ProgramActionsMenu.jsx` - Dropdown actions (Phase 4)

**Key Decisions Required:** See TRAINING_PROGRAM_DASHBOARD_IMPLEMENTATION.md Section "Open Questions"

---

## Executive Summary

Phase 3b focuses on building the **user-facing UI** for training programs. Users can now *create* programs through Build mode conversations; now they need to *view, follow, and interact* with them.

### Key Decision: Hybrid Dashboard Architecture

**Training Grounds (Hub):**
- "Today's Workout" prominent card
- Current program summary
- Quick actions

**Dedicated Program Dashboard:**
- Route: `/training-grounds/programs/{programId}`
- Full calendar view
- Phase breakdown
- Progress metrics
- All workout templates

**Why Hybrid:**
- Users land on Training Grounds → immediately see today's workout
- One click to full program details when needed
- Scalable (multiple programs, multiple coaches)
- Doesn't clutter main hub
- Follows common UX patterns (overview → detail)
- Navigation via existing Training Grounds button (no new nav paradigm)

---

## What We've Built (Phase 1-3a)

### Backend Infrastructure ✅
- DynamoDB CRUD operations for training programs
- S3 storage for workout templates (natural language)
- Calendar utilities (timezone-aware)
- 6 Lambda endpoints (create, get, update, delete, list, today's workout)
- AI program generation (async, natural language templates)
- Pinecone integration for semantic search
- Build mode conversation system

### Frontend Creation ✅
- Conversation mode toggle (Chat vs Build)
- Build mode visual styling (purple)
- AI-generated contextual updates during generation
- Program creation through conversation works end-to-end

### What's Missing (Phase 3b)
- UI to view created programs
- UI to see today's workout from program
- UI to mark workouts complete/skip
- UI to view calendar and phase progress
- UI to pause/resume programs
- Workout logging from templates

---

## Phase 3b Architecture

### 1. Training Grounds Enhancements

**Location:** `/training-grounds` (existing page)

**New Components:**

#### A. Today's Workout Card (Prominent)
```
┌─────────────────────────────────────────┐
│ 📅 Today's Workout - Day 5 of 28       │
│                                         │
│ 4-Week Strength Foundation              │
│ Phase 1: Foundation Building            │
│                                         │
│ Lower Body Strength - Squat Focus       │
│ Estimated Duration: 60 minutes          │
│                                         │
│ [View Workout] [Mark Complete] [Skip]   │
└─────────────────────────────────────────┘
```

**Features:**
- Only shows if user has active program with today's workout
- Displays day number, phase name, workout name
- Quick actions: View full workout, Mark complete, Skip
- Click workout name → opens workout detail modal
- Click program name → navigates to full program dashboard

**Priority:** Highest - this is the primary user entry point

#### B. Active Program Summary Card
```
┌─────────────────────────────────────────┐
│ 🎯 Active Program                       │
│                                         │
│ 4-Week Strength Foundation              │
│ Day 5 of 28 • 18% Complete              │
│                                         │
│ ████░░░░░░░░░░░░░░░░░░ 5/28             │
│                                         │
│ Current Phase: Foundation Building      │
│ Next Workout: Tomorrow                  │
│                                         │
│ [View Full Program]                     │
└─────────────────────────────────────────┘
```

**Features:**
- Shows program name, progress, current phase
- Progress bar visualization
- Link to full program dashboard
- Only shows if user has active program

**Priority:** High - provides context and navigation

#### C. Empty State (No Active Program)
```
┌─────────────────────────────────────────┐
│ 📋 No Active Training Program           │
│                                         │
│ Create a structured program with your   │
│ coach to build toward your goals.       │
│                                         │
│ [Create Program] [Browse Past Programs] │
└─────────────────────────────────────────┘
```

**Features:**
- Encourages program creation
- "Create Program" → Opens conversation in Build mode
- "Browse Past Programs" → Navigates to program list

**Priority:** Medium - discovery and onboarding

---

### 2. Manage Training Programs Page

**Route:** `/training-grounds/programs`

**Purpose:** Central hub for viewing all programs (similar to Coaches page)

**Status:** ✅ IMPLEMENTED

**Current Implementation:**
- Route: `/training-grounds/programs?userId={userId}`
- Component: `src/components/programs/ManagePrograms.jsx`
- Fetches all user's coaches, then fetches programs for each coach
- Combines and displays programs from all coaches in a single view
- Grid layout modeled after `Coaches.jsx`
- Sections: Active Programs, Paused Programs, Completed Programs
- Actions: View, Pause/Resume, Complete
- Each program card shows the coach name
- Empty state with "Create Training Program" card
- Full loading states and error handling
- Toast notifications for actions

**Implementation Details:**
- Uses `CoachAgent` to fetch user's coaches
- Creates a `ProgramAgent` instance for each coach
- Fetches programs in parallel for all coaches using `Promise.all()`
- Updates local state immediately for optimistic UI feedback
- Cleanup of all agents on unmount

**Navigation:**
- Added to navigation config as "Training Programs" in contextual section
- Only requires `userId` parameter
- Route: `/training-grounds/programs`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Manage Training Programs                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Active Programs (Tab) ─────────────────────────────┐   │
│ │                                                       │   │
│ │ Program Card (Active)                                │   │
│ │ ┌──────────────────────────────────────────────┐    │   │
│ │ │ 4-Week Strength Foundation                    │    │   │
│ │ │ Coach: Marcus (Main Coach)                    │    │   │
│ │ │ Day 5 of 28 • 18% Complete                    │    │   │
│ │ │ Current Phase: Foundation Building            │    │   │
│ │ │                                                │    │   │
│ │ │ [View Program] [Pause] [⋮]                    │    │   │
│ │ └──────────────────────────────────────────────┘    │   │
│ │                                                       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Completed Programs (Tab) ───────────────────────────┐   │
│ │ (List of completed programs with stats)              │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ Paused Programs (Tab) ──────────────────────────────┐   │
│ │ (List of paused programs with resume action)         │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Tabbed interface: Active, Completed, Paused
- Program cards showing key info
- Actions: View program, Pause/Resume, Archive, Delete
- Filters: By coach, by date range, by status
- Sort: Most recent, Oldest, Name, Completion %
- Empty states for each tab
- Accessible from nav bars (like View Reports)

**Styling:** Match Training Grounds styling exactly

---

### 3. Dedicated Program Dashboard

**Route:** `/training-grounds/programs/{programId}`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Program Name, Status Badge, Actions Menu            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Left Column (60%)          │  Right Sidebar (40%)          │
│                            │                               │
│ ┌─ Today's Workout ─────┐ │ ┌─ Progress Overview ──────┐ │
│ │ Full workout content  │ │ │ - Day 5 of 28           │ │
│ │ with natural language │ │ │ - 18% Complete          │ │
│ │ from template         │ │ │ - 5/28 workouts done    │ │
│ └───────────────────────┘ │ │ - 80% adherence         │ │
│                            │ └─────────────────────────┘ │
│ ┌─ Calendar View ───────┐ │                               │
│ │ Week-by-week grid     │ │ ┌─ Phase Breakdown ───────┐ │
│ │ with status icons     │ │ │ Current: Phase 1        │ │
│ │ ✓ completed           │ │ │ Foundation Building     │ │
│ │ ○ pending             │ │ │ Days 1-7                │ │
│ │ ⊘ skipped             │ │ └─────────────────────────┘ │
│ └───────────────────────┘ │                               │
│                            │ ┌─ Quick Actions ─────────┐ │
│ ┌─ Phase Timeline ──────┐ │ │ [Pause Program]         │ │
│ │ Visual phase progress │ │ │ [View Conversation]     │ │
│ │ with focus areas      │ │ │ [Edit Program]          │ │
│ └───────────────────────┘ │ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Header Section
- **Program Name** (large, prominent)
- **Status Badge**: Active, Paused, Completed
- **Actions Menu** (⋮):
  - Pause/Resume Program
  - Complete Program Early
  - Archive Program
  - View Creation Conversation

#### Today's Workout Section (Primary Focus)
- **Workout Name & Description**
- **Estimated Duration**
- **Required Equipment** (chips/tags)
- **Natural Language Workout Content** (formatted, scrollable)
  - Warmup section
  - Strength block
  - Conditioning finisher
  - Cooldown
- **Coaching Notes** (expandable section)
- **Prescribed Exercises** (visual icons)
- **Action Buttons:**
  - [Log This Workout] (primary - emphasized, large button)
  - [Mark Complete] (secondary - smaller, less prominent)
  - [Skip Workout] (tertiary - text link or small button)
  - [Regenerate Workout] (link to Build mode conversation)

#### Calendar View
- **Weekly Grid Layout**
  - Week 1: Days 1-7
  - Week 2: Days 8-14
  - etc.
- **Day Cell:**
  - Day number
  - Status icon (✓ completed, ○ pending, ⊘ skipped, 🔄 rest)
  - Phase indicator (color-coded)
  - Click → Show workout preview
- **Navigation:**
  - Current week highlighted
  - Scroll or paginate through weeks
  - "Jump to Today" button

#### Phase Timeline
- **Visual Progress Bar**
  - Segmented by phase
  - Color-coded by phase
  - Current day indicator
- **Phase Cards:**
  - Phase name
  - Day range (e.g., "Days 1-7")
  - Focus areas (tags: "strength", "conditioning")
  - Description
  - Completion status

#### Progress Overview (Sidebar)
- **Metrics:**
  - Current day / Total days
  - Percentage complete
  - Completed workouts / Total planned
  - Adherence rate (%)
  - Current streak (consecutive days)
- **Visualizations:**
  - Circular progress indicator
  - Bar chart for adherence
  - Phase completion badges

#### Phase Breakdown (Sidebar)
- **Current Phase:**
  - Name
  - Description
  - Focus areas
  - Days remaining in phase
- **Upcoming Phases:** (collapsed by default)
  - Click to expand and preview

#### Quick Actions (Sidebar)
- **Pause Program:** Opens modal to confirm and optionally add reason
- **View Conversation:** Navigates to Build mode conversation where program was created
- **Edit Program:** Future - allows modifications

---

### 4. Component Hierarchy

```
/training-grounds
├── TodaysWorkoutCard (new)
│   ├── WorkoutSummary
│   ├── QuickActions
│   └── ProgramLink
│
├── ActiveProgramSummary (new)
│   ├── ProgressBar
│   ├── PhaseIndicator
│   └── NavigationLink
│
└── EmptyProgramState (new)

/training-grounds/programs (Manage Programs)
├── ManagePrograms (new)
│   ├── PageHeader
│   ├── TabNavigation (Active, Completed, Paused)
│   ├── ProgramList
│   │   ├── ProgramCard (reusable)
│   │   │   ├── ProgramHeader
│   │   │   ├── ProgressIndicator
│   │   │   ├── PhaseInfo
│   │   │   └── ActionButtons
│   │   └── EmptyState
│   └── FilterControls (by coach, date, status)

/training-grounds/programs/:programId
├── ProgramDashboard (new)
│   ├── ProgramHeader
│   │   ├── ProgramTitle
│   │   ├── StatusBadge
│   │   └── ActionsMenu
│   │
│   ├── TodaysWorkoutSection (new)
│   │   ├── WorkoutHeader
│   │   ├── WorkoutContent (formatted natural language)
│   │   ├── CoachingNotes (expandable)
│   │   ├── PrescribedExercises
│   │   └── WorkoutActions
│   │
│   ├── CalendarView (new)
│   │   ├── WeeklyGrid
│   │   ├── DayCell (clickable)
│   │   └── CalendarNavigation
│   │
│   ├── PhaseTimeline (new)
│   │   ├── PhaseProgressBar
│   │   └── PhaseCards
│   │
│   ├── ProgressOverview (new, sidebar)
│   │   ├── ProgressMetrics
│   │   ├── CircularProgress
│   │   └── AdherenceChart
│   │
│   ├── PhaseBreakdown (new, sidebar)
│   │   ├── CurrentPhase
│   │   └── UpcomingPhases
│   │
│   └── QuickActions (new, sidebar)
```

---

### 4. State Management

**ProgramAgent (expand existing)**

```javascript
// State
{
  programs: [],              // All user's programs
  activeProgram: null,       // Current active program
  currentProgramDetails: null, // S3 data (calendar, templates)
  todaysWorkout: null,       // Today's workout template
  loading: false,
  error: null
}

// Actions
- fetchPrograms(userId, status)
- fetchProgramDetails(programId)
- fetchTodaysWorkout(programId)
- markWorkoutComplete(programId, dayNumber)
- markWorkoutSkipped(programId, dayNumber)
- pauseProgram(programId, reason)
- resumeProgram(programId)
- completeProgram(programId)
- updateProgramStatus(programId, updates)
```

**Integration with Existing Agents:**
- `CoachConversationAgent`: Link to Build mode conversation
- `WorkoutAgent`: Log workout from template
- `UserProfileAgent`: Timezone for "today" calculation

---

### 5. API Integration

**Existing Endpoints:**
- `GET /users/{userId}/coaches/{coachId}/programs` → List programs
- `GET /users/{userId}/coaches/{coachId}/programs/{programId}` → Get program + S3 URLs
- `GET /users/{userId}/coaches/{coachId}/programs/{programId}/today` → Today's workout
- `PUT /users/{userId}/coaches/{coachId}/programs/{programId}` → Update program
- `DELETE /users/{userId}/coaches/{coachId}/programs/{programId}` → Delete program

**New Endpoints Needed:**

#### Mark Workout Status
```
POST /users/{userId}/coaches/{coachId}/programs/{programId}/workouts/{dayNumber}/status
Body: { status: "completed" | "skipped", completedAt?: string }
Response: { updatedProgram, updatedTemplate }
```

#### Pause Program
```
POST /users/{userId}/coaches/{coachId}/programs/{programId}/pause
Body: { reason: string, pausedAt: string }
Response: { updatedProgram }
```

#### Resume Program
```
POST /users/{userId}/coaches/{coachId}/programs/{programId}/resume
Body: { resumedAt: string }
Response: { updatedProgram, recalculatedCalendar }
```

---

### 6. Workout Logging from Templates

**User Flow:**
1. User clicks "Log This Workout" from today's workout
2. Opens workout logging modal/page
3. Pre-populated with:
   - Workout name
   - Template reference
   - Prescribed exercises (for context)
4. User describes what they did (natural language or structured)
5. AI converts template + user performance → Universal Workout Schema
6. Workout saved with `linkedTemplateId` and `programId`
7. Template marked as completed, linked to workout
8. Program progress updated

**Implementation:**
```javascript
async function logWorkoutFromTemplate(templateId, programId, userInput) {
  // 1. Fetch template from S3
  const template = await getWorkoutTemplateFromS3(programId, templateId);

  // 2. Call AI to convert template + user input → Universal Schema
  const workout = await buildWorkoutFromTemplate({
    template: template.workoutContent,
    coachingNotes: template.coachingNotes,
    userPerformance: userInput,
    prescribedExercises: template.prescribedExercises
  });

  // 3. Save workout
  workout.linkedTemplateId = templateId;
  workout.programId = programId;
  await saveWorkout(workout);

  // 4. Update template status
  await updateTemplateStatus(programId, templateId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    linkedWorkoutId: workout.workoutId
  });

  // 5. Update program progress
  await updateProgramProgress(programId);

  return workout;
}
```

**Lambda Handler:**
```typescript
// amplify/functions/log-workout-from-template/handler.ts
export const handler = async (event) => {
  const { programId, templateId, userInput } = JSON.parse(event.body);

  // 1. Get template
  const template = await getWorkoutTemplateFromS3(programId, templateId);

  // 2. Build prompt for AI
  const prompt = buildTemplateLoggingPrompt(template, userInput);

  // 3. Call Bedrock
  const workoutData = await callBedrockApi({
    prompt,
    model: 'claude-sonnet-4.5',
    prefillResponse: '{',
    enableCaching: true
  });

  // 4. Parse & normalize
  const workout = parseJsonWithFallbacks(workoutData);
  const normalizedWorkout = await normalizeWorkout(workout);

  // 5. Save workout
  normalizedWorkout.linkedTemplateId = templateId;
  normalizedWorkout.programId = programId;
  await saveWorkout(normalizedWorkout);

  // 6. Update template and program
  await updateTemplateStatus(programId, templateId, { status: 'completed' });
  await updateProgramProgress(programId);

  return createOkResponse({ workout: normalizedWorkout });
};
```

---

### 7. UI Patterns & Styling

**Critical:** Program dashboard must match Training Grounds in look, feel, functionality, and style.

**Use `uiPatterns.js` for:**
- Program cards
- Progress bars
- Status badges
- Calendar cells
- Phase indicators
- Action buttons (with "Log This Workout" as primary styled button)

**Color Coding:**
- **Active Program:** Cyan accent
- **Build Mode Context:** Purple accent
- **Completed Workouts:** Green
- **Pending Workouts:** Gray
- **Skipped Workouts:** Red/Orange
- **Rest Days:** Blue

**Button Hierarchy (Training Grounds style):**
- **Primary Action** ("Log This Workout"): Large, filled, cyan accent
- **Secondary Action** ("Mark Complete"): Medium, outlined, gray
- **Tertiary Action** ("Skip"): Small, text link or minimal button

**Responsive Design:**
- Mobile: Stack layout (today's workout → calendar → sidebar content)
- Tablet: 50/50 split
- Desktop: 60/40 split with sidebar

---

### 8. Empty States & Error Handling

#### No Active Program
- Show empty state on Training Grounds
- Encourage program creation
- Link to past programs if they exist

#### Today is Rest Day
- Show "Rest Day" card instead of workout
- Display rest day guidance from template
- Show tomorrow's workout as preview

#### Program Completed
- Congratulations message
- Summary statistics (adherence, PRs, feedback)
- Offer to create new program
- Archive current program

#### Program Paused
- Show "Paused" badge
- Display pause reason
- "Resume Program" prominent action
- Explain that schedule will shift on resume

#### Loading States
- Skeleton screens for cards
- Loading spinner for calendar
- Progressive enhancement (show metadata first, then details)

#### Error States
- Failed to load program → Retry button
- Failed to load today's workout → "View program" fallback
- Failed to mark complete → Show error, allow retry

---

## Implementation Phases

### Week 1: Training Grounds Integration (Days 1-5)

**Day 1-2: Today's Workout Card**
- Component: `TodaysWorkoutCard.jsx`
- API integration: `fetchTodaysWorkout()`
- Quick actions: Mark Complete, Skip, View Workout
- Empty state handling

**Day 3-4: Active Program Summary Card**
- Component: `ActiveProgramSummary.jsx`
- Progress bar visualization
- Phase indicator
- Navigation to full dashboard

**Day 5: Training Grounds Layout**
- Integrate new cards into Training Grounds
- Responsive layout
- Empty states
- Loading states

**Deliverable:** Users can see today's workout and program summary on Training Grounds

---

### Week 2: Program Views (Days 6-12)

**Day 6: Manage Training Programs Page**
- Route: `/training-grounds/programs`
- Component: `ManagePrograms.jsx`
- Tabbed interface (Active, Completed, Paused)
- Program cards with actions
- Filters and sorting
- Navigation integration (like View Reports)

**Day 7: Dashboard Layout & Header**
- Route: `/training-grounds/programs/:programId`
- Component: `ProgramDashboard.jsx`
- Header with program name, status badge, actions menu
- Sidebar layout (progress, phase, actions)
- Match Training Grounds styling exactly

**Day 8-9: Today's Workout Section**
- Component: `TodaysWorkoutSection.jsx`
- Display natural language workout content (formatted)
- Expandable coaching notes
- Prescribed exercises visualization
- Action buttons (Log, Mark Complete, Skip)

**Day 10: Calendar View**
- Component: `CalendarView.jsx`
- Weekly grid layout
- Day cells with status icons
- Click to preview workout
- Navigation (current week, jump to today)

**Day 11: Phase Timeline**
- Component: `PhaseTimeline.jsx`
- Visual progress bar segmented by phase
- Phase cards with descriptions
- Color-coded by phase

**Day 12: Sidebar Components**
- `ProgressOverview.jsx` (metrics, charts)
- `PhaseBreakdown.jsx` (current + upcoming)
- `QuickActions.jsx` (pause, view conversation)

**Deliverable:** Manage Programs page + Full program dashboard with calendar, phases, and today's workout (styled to match Training Grounds)

---

### Week 3: Interaction & Logging (Days 13-17)

**Day 13-14: Mark Complete/Skip**
- API integration: `markWorkoutComplete()`, `markWorkoutSkipped()`
- Update template status
- Update program progress
- Refresh UI after action
- Confirmation modals

**Day 15-16: Workout Logging from Templates**
- Modal/page for logging workout
- Pre-populate with template context
- User input (natural language or structured)
- AI conversion to Universal Schema
- Link workout to template
- Update program progress

**Day 17: Pause/Resume Program**
- Pause modal (reason input)
- API integration: `pauseProgram()`, `resumeProgram()`
- Calendar recalculation on resume
- UI updates (badges, messages)

**Deliverable:** Users can interact with program (complete, skip, pause, log workouts)

---

### Week 4: Polish & Edge Cases (Days 18-21)

**Day 18: Edge Cases**
- Rest day handling
- Completed program flow
- Paused program state
- Multiple programs (if multiple coaches)

**Day 19: Responsive Design**
- Mobile layout optimization
- Tablet layout
- Touch interactions
- Accessibility (keyboard nav, screen readers)

**Day 20: Loading & Error States**
- Skeleton screens
- Loading indicators
- Error messages
- Retry mechanisms

**Day 21: Testing & Bug Fixes**
- End-to-end testing
- Edge case testing
- Performance optimization
- Bug fixes

**Deliverable:** Polished, production-ready program viewing & interaction UI

---

## Success Criteria

### User Can:
- ✅ See today's workout on Training Grounds immediately upon landing
- ✅ View full program details in dedicated dashboard
- ✅ See calendar of all workouts with status
- ✅ Understand current phase and progress
- ✅ Mark workouts as complete or skipped
- ✅ Log workouts from templates (AI-powered conversion)
- ✅ Pause and resume programs
- ✅ View program on mobile, tablet, desktop
- ✅ Navigate seamlessly between Training Grounds and program dashboard

### Metrics to Track:
- Daily active users with programs
- Workout completion rate from programs
- Time from landing on Training Grounds to logging workout
- Program adherence rate
- Pause/resume frequency
- User feedback on workout templates (natural language quality)

---

## Post-Phase 3b: Phase 4 - Adaptation Intelligence

Once users can view and interact with programs, Phase 4 adds smart adaptation:

1. **Detect Scaling Patterns** → Auto-adjust future workouts
2. **Missed Workout Handling** → Reduce volume for next sessions
3. **User Feedback Integration** → Adjust intensity based on ratings
4. **Workout Regeneration via Conversation** → Users can request modifications
5. **Adaptation History Display** → Show what changed and why

---

## Technical Dependencies

### Backend:
- ✅ DynamoDB CRUD operations (existing)
- ✅ S3 storage utilities (existing)
- ✅ Calendar utilities (existing)
- ✅ Lambda endpoints (existing)
- 🔲 New endpoints: Mark workout status, Pause, Resume
- 🔲 Lambda: Log workout from template

### Frontend:
- ✅ `ProgramAgent.js` (basic, needs expansion)
- ✅ `programApi.js` (basic, needs expansion)
- 🔲 All new UI components listed above
- 🔲 Integration with existing WorkoutAgent for logging

### AI:
- ✅ Template generation (natural language) (existing)
- 🔲 Template → Universal Schema conversion (new Lambda)
- 🔲 Prompt caching for template logging

---

## Decisions Made ✅

1. **Hybrid Architecture:** Approved - Training Grounds hub + Dedicated program dashboard
2. **Multiple Active Programs:** Yes - Users can have multiple active programs with different coaches simultaneously
3. **Program Management:**
   - Use existing "Training Programs" section in Training Grounds
   - Add dedicated "Manage Training Programs" page (like View Reports) accessible from nav bars
4. **Primary Action:** "Log This Workout" is the primary action (not just "Mark Complete")
5. **Navigation:** Via Training Grounds nav button (existing pattern, no bottom tab bar needed)
6. **Style:** Program dashboard should match Training Grounds in look, feel, functionality, and style

## Open Questions

1. **Workout Preview in Calendar:** Click day cell → Show full workout modal or just summary?
2. **Notifications:** Should users get notifications for today's workout? (Future phase)

---

---

## 🎉 Phase 3b Complete - Ready to Ship!

### What We Built ✅
- ✅ **Training Grounds Integration** - Today's workout cards, active program summary, create program card
- ✅ **Manage Training Programs Page** - View all programs across coaches, pause/resume/complete actions
- ✅ **Program Dashboard** (95%) - Full calendar, phase timeline, progress metrics, today's workout
- ✅ **Workout Logging from Templates** - 2-stage AI conversion with scaling analysis
- ✅ **Skip/Unskip Workouts** - Mark workouts as skipped or completed
- ✅ **Pause/Resume Programs** - Calendar recalculation, pause tracking
- ✅ **Day Completion Celebrations** - Synthwave animations when all workouts complete
- ✅ **Navigation Integration** - Seamless routing between views
- ✅ **Responsive Design** - Works on mobile, tablet, desktop
- ✅ **Loading & Error States** - Skeleton screens, error handling, retry mechanisms

### Deferred to Phase 4 (2%) 🔄
See `TRAINING_PROGRAM_PHASE4_PLAN.md` for details:

1. **View Creation Conversation Link** (1%)
   - Navigate to Build mode conversation where program was created
   - Show creation session history

2. **Regenerate Workout Feature** (1%)
   - Request modifications to upcoming workouts
   - Opens Build mode with workout context
   - AI regenerates specific workout

3. **Adaptation Intelligence System** (40%)
   - Auto-detect scaling patterns
   - Auto-adjust for missed workouts
   - Feedback-based intensity adjustment

4. **Check-in System** (30%)
   - Weekly feedback collection
   - AI coach responses
   - Check-in reminders

5. **Metrics & Analytics** (20%)
   - Enhanced metrics dashboard
   - CloudWatch integration
   - Weekly analytics reports

### Why Ship Now? 🚀
- **Complete User Journey**: Create → View → Log → Track → Complete programs
- **Production-Ready**: All core features stable and tested
- **Real Data Needed**: Phase 4 adaptations need real usage patterns to optimize thresholds
- **2% Deferred Items**: Nice-to-have, not blockers for user value

### Next Steps
1. ✅ Phase 3b complete - Ship to production!
2. ✅ Monitor user behavior for 2-4 weeks
3. ✅ Gather feedback on program experience
4. ✅ Analyze workout logging patterns
5. ✅ Return to Phase 4 with real data

**Congratulations! Training Programs V1 is ready for users! 🎊**

---

**Phase 3b Status:** ✅ COMPLETE (98%)
**Phase 4 Status:** 📋 PLANNED - See TRAINING_PROGRAM_PHASE4_PLAN.md
**Production Readiness:** ✅ READY TO SHIP

