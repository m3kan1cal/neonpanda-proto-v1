# Training Programs Phase 3 - Frontend Integration Plan

**Date:** October 21, 2025
**Status:** Phase 2 Complete, Ready to Begin Phase 3
**Timeline:** 7-10 days for MVP, 3-5 days for polish

---

## Executive Summary

Phase 3 focuses on **Frontend Integration** - building the user-facing components that let users create, view, and interact with their training programs. This phase connects the backend infrastructure (Phase 1) and AI generation (Phase 2) to a beautiful, intuitive user experience.

---

## Phase 3 Scope

### Phase 3A: Core UI (Days 1-5) - **MUST HAVE**
1. Mode toggle in chat interface
2. Program list and detail views
3. Today's workout display
4. Basic program controls (pause/resume/complete)
5. Workout logging integration

### Phase 3B: Enhanced UX (Days 6-8) - **SHOULD HAVE**
1. FloatingMenuManager integration
2. Program calendar visualization
3. Training Grounds program section
4. Polish and responsive design

### Phase 3C: Advanced Features (Days 9-14) - **NICE TO HAVE**
1. Workout regeneration detection
2. Adaptation intelligence (future phase)
3. Check-in system (future phase)

---

## What Backend Provides (Already Built)

### Phase 1 & 2 Infrastructure ✅

**API Endpoints:**
- ✅ `POST /users/{userId}/coaches/{coachId}/programs` - Create program
- ✅ `GET /users/{userId}/coaches/{coachId}/programs` - List programs
- ✅ `GET /users/{userId}/coaches/{coachId}/programs/{programId}` - Get program details
- ✅ `PUT /users/{userId}/coaches/{coachId}/programs/{programId}` - Update status (pause/resume/complete)
- ✅ `GET /users/{userId}/coaches/{coachId}/programs/{programId}/templates?today=true` - Get today's workouts
- ✅ `POST /users/{userId}/coaches/{coachId}/programs/{programId}/templates/{templateId}/log` - Log workout

**Conversation System:**
- ✅ Mode parameter in create-conversation (`mode: 'chat' | 'build'`)
- ✅ Build mode system prompt with structured guidance
- ✅ Streaming response with contextual events
- ✅ Program generation trigger detection
- ✅ Program ID in message metadata

**Data Models:**
- ✅ `TrainingProgram` - Full program entity
- ✅ `TrainingProgramPhase` - Phase structure
- ✅ `WorkoutTemplate` - Daily workout templates
- ✅ `TrainingProgramSummary` - Lightweight list view
- ✅ `TodaysWorkoutTemplates` - Today's workout response

---

## Phase 3A: Core UI Components (Days 1-5)

### 1. Mode Toggle Component

**Location:** `src/components/chat/CoachConversationModeToggle.jsx`

**Purpose:** Allow users to switch between Chat and Build modes

**Design:**
```jsx
import React from 'react';
import { CONVERSATION_MODES } from '../../constants/conversationModes';

export const CoachConversationModeToggle = ({ mode, onModeChange, disabled }) => {
  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => onModeChange(CONVERSATION_MODES.CHAT)}
        disabled={disabled}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all
          ${mode === CONVERSATION_MODES.CHAT
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        💬 Chat
      </button>
      <button
        onClick={() => onModeChange(CONVERSATION_MODES.BUILD)}
        disabled={disabled}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all
          ${mode === CONVERSATION_MODES.BUILD
            ? 'bg-cyan-500 text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        🏗️ Build
      </button>
    </div>
  );
};
```

**Integration:**
- Add to `CoachConversations.jsx` above chat input
- Persist mode in conversation state
- Show "Program created! Switch back to Chat?" after generation
- Disable during streaming

---

### 2. ProgramAgent (State Management)

**Location:** `src/agents/ProgramAgent.js`

**Purpose:** Manage program state and API calls

**Pattern:** Follow existing Agent pattern (like `CoachAgent`, `WorkoutAgent`)

```javascript
import { useState, useCallback } from 'react';
import { programApi } from '../utils/api/programApi';

export const useProgramAgent = (userId, coachId) => {
  const [programs, setPrograms] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // List programs
  const loadPrograms = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await programApi.listPrograms(userId, coachId, options);
      setPrograms(data.programs);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, coachId]);

  // Get program details
  const loadProgram = useCallback(async (programId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await programApi.getProgram(userId, coachId, programId);
      setActiveProgram(data.program);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, coachId]);

  // Get today's workout
  const loadTodaysWorkout = useCallback(async (programId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await programApi.getTodaysWorkout(userId, coachId, programId);
      setTodaysWorkout(data.todaysWorkoutTemplates);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, coachId]);

  // Update program status
  const updateProgramStatus = useCallback(async (programId, action) => {
    setLoading(true);
    setError(null);
    try {
      const data = await programApi.updateProgram(userId, coachId, programId, { action });
      if (activeProgram?.programId === programId) {
        setActiveProgram(data.program);
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, coachId, activeProgram]);

  // Log workout
  const logWorkout = useCallback(async (programId, templateId, workoutData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await programApi.logWorkout(userId, coachId, programId, templateId, workoutData);
      // Refresh today's workout and active program
      await loadTodaysWorkout(programId);
      await loadProgram(programId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, coachId, loadTodaysWorkout, loadProgram]);

  return {
    // State
    programs,
    activeProgram,
    todaysWorkout,
    loading,
    error,

    // Actions
    loadPrograms,
    loadProgram,
    loadTodaysWorkout,
    updateProgramStatus,
    logWorkout,
  };
};
```

---

### 3. Program List Component

**Location:** `src/components/programs/ProgramList.jsx`

**Purpose:** Display user's programs with filtering

```jsx
export const ProgramList = ({ userId, coachId, onSelectProgram }) => {
  const { programs, loading, error, loadPrograms } = useProgramAgent(userId, coachId);
  const [filter, setFilter] = useState('active'); // active, completed, archived, all

  useEffect(() => {
    loadPrograms({ status: filter === 'all' ? undefined : filter });
  }, [loadPrograms, filter]);

  return (
    <div className="program-list">
      {/* Filter tabs */}
      <div className="filter-tabs">
        {['active', 'completed', 'archived', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'active' : ''}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Program cards */}
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      <div className="program-grid">
        {programs.map(program => (
          <ProgramCard
            key={program.programId}
            program={program}
            onSelect={() => onSelectProgram(program.programId)}
          />
        ))}
      </div>
    </div>
  );
};
```

---

### 4. Program Detail View

**Location:** `src/components/programs/ProgramDetail.jsx`

**Purpose:** Full program view with phases, workouts, progress

```jsx
export const ProgramDetail = ({ userId, coachId, programId }) => {
  const { activeProgram, loading, error, loadProgram } = useProgramAgent(userId, coachId);

  useEffect(() => {
    loadProgram(programId);
  }, [loadProgram, programId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!activeProgram) return null;

  return (
    <div className="program-detail">
      {/* Header */}
      <ProgramHeader program={activeProgram} />

      {/* Progress bar */}
      <ProgressBar
        current={activeProgram.currentDay}
        total={activeProgram.totalDays}
        completed={activeProgram.completedWorkouts}
        adherence={activeProgram.adherenceRate}
      />

      {/* Phases timeline */}
      <PhasesTimeline phases={activeProgram.phases} currentDay={activeProgram.currentDay} />

      {/* Program controls */}
      <ProgramControls
        program={activeProgram}
        userId={userId}
        coachId={coachId}
        programId={programId}
      />

      {/* Workout calendar (optional) */}
      <WorkoutCalendar program={activeProgram} />
    </div>
  );
};
```

---

### 5. Today's Workout Component

**Location:** `src/components/programs/TodaysWorkout.jsx`

**Purpose:** Prominent display of current day's workout

```jsx
export const TodaysWorkout = ({ userId, coachId, programId }) => {
  const { todaysWorkout, loading, error, loadTodaysWorkout, logWorkout } = useProgramAgent(userId, coachId);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    loadTodaysWorkout(programId);
  }, [loadTodaysWorkout, programId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!todaysWorkout) return <NoWorkoutToday />;

  const primaryTemplate = todaysWorkout.templates.find(t => t.templateType === 'primary');
  const optionalTemplates = todaysWorkout.templates.filter(t => t.templateType !== 'primary');

  return (
    <div className="todays-workout">
      {/* Header */}
      <div className="workout-header">
        <h2>Today's Workout</h2>
        <p>Day {todaysWorkout.dayNumber} of {todaysWorkout.totalDays}</p>
        <p className="phase-name">{todaysWorkout.phaseName}</p>
      </div>

      {/* Primary workout */}
      {primaryTemplate && (
        <WorkoutTemplateCard
          template={primaryTemplate}
          onLog={() => setShowLogModal(true)}
        />
      )}

      {/* Optional workouts */}
      {optionalTemplates.length > 0 && (
        <div className="optional-workouts">
          <h3>Optional Add-Ons</h3>
          {optionalTemplates.map(template => (
            <WorkoutTemplateCard
              key={template.templateId}
              template={template}
              onLog={() => setShowLogModal(true)}
            />
          ))}
        </div>
      )}

      {/* Next workout preview */}
      {todaysWorkout.nextWorkout && (
        <NextWorkoutPreview workout={todaysWorkout.nextWorkout} />
      )}

      {/* Log workout modal */}
      {showLogModal && (
        <LogWorkoutModal
          template={primaryTemplate}
          onClose={() => setShowLogModal(false)}
          onLog={(workoutData) => {
            logWorkout(programId, primaryTemplate.templateId, workoutData);
            setShowLogModal(false);
          }}
        />
      )}
    </div>
  );
};
```

---

## API Utility Functions

**Location:** `src/utils/api/programApi.js`

```javascript
import { API_BASE_URL, getAuthHeaders } from './apiHelpers';

export const programApi = {
  // List programs
  async listPrograms(userId, coachId, options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);

    const url = `${API_BASE_URL}/users/${userId}/coaches/${coachId}/programs?${params}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error('Failed to load programs');
    return response.json();
  },

  // Get program details
  async getProgram(userId, coachId, programId) {
    const url = `${API_BASE_URL}/users/${userId}/coaches/${coachId}/programs/${programId}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error('Failed to load program');
    return response.json();
  },

  // Get today's workout
  async getTodaysWorkout(userId, coachId, programId) {
    const url = `${API_BASE_URL}/users/${userId}/coaches/${coachId}/programs/${programId}/templates?today=true`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error('Failed to load today\'s workout');
    return response.json();
  },

  // Update program (pause/resume/complete)
  async updateProgram(userId, coachId, programId, body) {
    const url = `${API_BASE_URL}/users/${userId}/coaches/${coachId}/programs/${programId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Failed to update program');
    return response.json();
  },

  // Log workout
  async logWorkout(userId, coachId, programId, templateId, workoutData) {
    const url = `${API_BASE_URL}/users/${userId}/coaches/${coachId}/programs/${programId}/templates/${templateId}/log`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workoutData),
    });

    if (!response.ok) throw new Error('Failed to log workout');
    return response.json();
  },
};
```

---

## Constants File

**Location:** `src/constants/conversationModes.js`

```javascript
export const CONVERSATION_MODES = {
  CHAT: 'chat',
  BUILD: 'build',
};

export const PROGRAM_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};
```

---

## Integration Points

### 1. CoachConversations.jsx Updates

```jsx
import { CoachConversationModeToggle } from './CoachConversationModeToggle';
import { CONVERSATION_MODES } from '../../constants/conversationModes';

// Add state
const [conversationMode, setConversationMode] = useState(
  conversation?.mode || CONVERSATION_MODES.CHAT
);

// Add mode toggle above chat input
<CoachConversationModeToggle
  mode={conversationMode}
  onModeChange={setConversationMode}
  disabled={isStreaming}
/>

// Pass mode to create conversation
await createConversation(userId, coachId, {
  mode: conversationMode,
  title: conversationMode === CONVERSATION_MODES.BUILD ? "New Training Program" : undefined
});

// Detect program creation in streamed events
if (event.eventType === 'training_program_generation_complete') {
  // Show success notification
  // Prompt to switch back to chat mode
  setConversationMode(CONVERSATION_MODES.CHAT);
}
```

---

### 2. FloatingMenuManager Integration

Add "Programs" section:

```jsx
{activeProgram && (
  <FloatingMenuItem
    icon={<CalendarIcon />}
    label="Today's Workout"
    onClick={() => navigate(`/training-grounds/programs/${activeProgram.programId}/today`)}
    badge={`Day ${activeProgram.currentDay}`}
  />
)}
```

---

### 3. Training Grounds Integration

Add programs tab/section showing active program and today's workout prominently.

---

## Styling Guidelines

**Colors (from brand strategy):**
- Primary: Cyan-500 (#06b6d4) - for Build mode, active states
- Success: Green-500 - for completed workouts
- Warning: Orange-500 - for paused programs
- Error: Red-500 - for overdue/missed workouts

**Typography:**
- Program names: font-bold text-xl
- Phase names: font-semibold text-lg text-cyan-600
- Workout names: font-medium text-base

**Spacing:**
- Use consistent padding (p-4, p-6)
- Gap between sections: gap-6
- Card spacing: space-y-4

---

## Success Metrics

**User Experience:**
- ✅ Mode toggle loads instantly (<100ms)
- ✅ Program list loads in <1s
- ✅ Today's workout visible in 2 clicks
- ✅ Workout logging completes in <2s

**Functionality:**
- ✅ Users can switch modes seamlessly
- ✅ Build mode conversations work naturally
- ✅ Programs display correctly after generation
- ✅ Today's workout updates after logging
- ✅ Pause/resume updates calendar dates

---

## Phase 3 Deliverables Checklist

### Phase 3A (Days 1-5)
- [ ] `CoachConversationModeToggle.jsx` component
- [ ] `useProgramAgent.js` hook
- [ ] `programApi.js` utility
- [ ] `ProgramList.jsx` component
- [ ] `ProgramDetail.jsx` component
- [ ] `TodaysWorkout.jsx` component
- [ ] `WorkoutTemplateCard.jsx` component
- [ ] `ProgramControls.jsx` component
- [ ] Integration with `CoachConversations.jsx`
- [ ] Constants file for modes

### Phase 3B (Days 6-8)
- [ ] FloatingMenuManager program section
- [ ] Program calendar visualization
- [ ] Training Grounds program tab
- [ ] Responsive design polish
- [ ] Loading states and error handling
- [ ] Success/confirmation modals

---

## Next Steps

1. ✅ **Start with Phase 3A Day 1-2**: Mode toggle + ProgramAgent
2. ✅ **Days 3-4**: Program list and detail views
3. ✅ **Day 5**: Today's workout + logging integration
4. ✅ **Days 6-7**: FloatingMenu + Training Grounds integration
5. ✅ **Day 8**: Polish, responsive design, edge cases
6. ⏸️ **Phase 3C (Future)**: Adaptation intelligence, workout regeneration

---

**Status**: ✅ **READY TO BEGIN PHASE 3**
**Backend**: ✅ **100% COMPLETE**
**Blockers**: ✅ **NONE**

**Let's build the frontend! 🚀**

---

**Document Version**: 1.0
**Date**: October 21, 2025

