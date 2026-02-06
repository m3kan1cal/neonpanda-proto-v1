# ProgramAgent State Management Refactor

## ViewWorkouts & ProgramDashboard - Agent as Data Service

**Created:** 2026-02-05
**Status:** Proposed
**Priority:** Medium
**Related Fix:** ViewWorkouts polling flicker fix (v1.0.20260205-beta)

---

## Problem Statement

`ViewWorkouts.jsx` suffers from split ownership of `workoutData` state. The `ProgramAgent` pushes `todaysWorkout` through its `onStateChange` callback, while the component also manages `workoutData` locally with optimistic updates (marking templates as "completed" or "skipped" immediately after user action). These two sources of truth conflict during polling cycles, causing visible UI flicker.

### Root Cause

`ProgramAgent._updateState()` spreads the full `programState` on every call and invokes `onStateChange(this.programState)`. Because `todaysWorkout` persists in the agent's internal state after the initial load, **every** `_updateState` call (even for unrelated properties like `isLoadingTodaysWorkout: true`) causes the callback to fire with stale `todaysWorkout` data. This overwrites the component's locally-maintained optimistic state.

### Current Workaround

A ref-based reference check (`prevTodaysWorkoutRef`) was added to the callback to skip updates when the `todaysWorkout` object reference hasn't actually changed. This prevents stale data from overwriting local state, but it's a band-aid over the architectural issue.

---

## Current Architecture (ViewWorkouts)

```
┌─────────────────────────────────┐
│         ViewWorkouts            │
│                                 │
│  workoutData (useState)  ◄──────┼─── ProgramAgent callback pushes todaysWorkout
│       │                         │         (on EVERY _updateState call)
│       │                         │
│       ├── optimistic update     │    ProgramAgent also polls for linkedWorkoutId
│       │   (mark "completed")    │         (overwrites workoutData every 3s)
│       │                         │
│       └── setWorkoutData()      │
│           (component manages)   │
└─────────────────────────────────┘

Problem: Two writers to workoutData → flicker when they disagree
```

---

## Proposed Architecture

Move ViewWorkouts to the "agent as data service" pattern, consistent with how `ManageWorkouts.jsx`, `ManageExercises.jsx`, and `ManageMemories.jsx` already work. The component becomes the single source of truth for `workoutData`.

```
┌─────────────────────────────────┐
│         ViewWorkouts            │
│                                 │
│  workoutData (useState)  ◄──────┼─── Component is SOLE owner
│       │                         │
│       ├── initial load          │    const data = await agent.loadWorkoutTemplates()
│       │   (from agent method)   │    setWorkoutData(data)
│       │                         │
│       ├── optimistic update     │    setWorkoutData(prev => mark "completed")
│       │   (local state only)    │
│       │                         │
│       └── polling update        │    Component-managed polling:
│           (component controls)  │    const fresh = await agent.loadWorkoutTemplates()
│                                 │    setWorkoutData(prev => merge(prev, fresh))
└─────────────────────────────────┘

Solution: Single writer → no conflicts
```

---

## Implementation Steps

### 1. Remove `todaysWorkout` from ProgramAgent callback in ViewWorkouts

The callback currently handles both `selectedProgram` and `todaysWorkout`. Remove the `todaysWorkout` branch:

```javascript
// Before
programAgentRef.current = new ProgramAgent(userId, coachId, (newState) => {
  if (newState.selectedProgram) setProgram(newState.selectedProgram);
  if (
    newState.todaysWorkout &&
    newState.todaysWorkout !== prevTodaysWorkoutRef.current
  ) {
    prevTodaysWorkoutRef.current = newState.todaysWorkout;
    setWorkoutData(newState.todaysWorkout);
  }
});

// After
programAgentRef.current = new ProgramAgent(userId, coachId, (newState) => {
  if (newState.selectedProgram) setProgram(newState.selectedProgram);
  // todaysWorkout is now fully component-managed
});
```

### 2. Component-managed initial load (already in place)

The current `loadData()` function already calls `loadWorkoutTemplates()` and sets `workoutData` directly. No change needed here.

### 3. Move polling into the component

Replace the ProgramAgent's internal `_startPollingForLinkedWorkout` with component-managed polling using `useEffect` and `useRef` for interval tracking.

```javascript
// Component-managed polling for linkedWorkoutId
const pollingIntervalRef = useRef(null);

const startPollingForLinkedWorkout = (templateId) => {
  // Clear any existing poll
  if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

  let pollCount = 0;
  const maxPolls = 60;

  pollingIntervalRef.current = setInterval(async () => {
    pollCount++;
    try {
      const freshData = await programAgentRef.current.loadWorkoutTemplates(
        programId,
        isViewingToday ? { today: true } : { day: parseInt(dayParam) },
      );

      if (!freshData?.templates) {
        clearInterval(pollingIntervalRef.current);
        return;
      }

      // Merge fresh data with local state (preserving local optimistic status)
      setWorkoutData((prevData) => {
        if (!prevData?.templates) return freshData;
        const mergedTemplates = prevData.templates.map((localT) => {
          const serverT = freshData.templates.find(
            (t) => t.templateId === localT.templateId,
          );
          if (!serverT) return localT;
          // Server has linkedWorkoutId → use server data (it's newer)
          if (serverT.linkedWorkoutId) return serverT;
          // Preserve local optimistic status if server hasn't caught up
          if (localT.status === "completed" && serverT.status !== "completed") {
            return {
              ...serverT,
              status: localT.status,
              completedAt: localT.completedAt,
            };
          }
          return serverT;
        });
        return { ...freshData, templates: mergedTemplates };
      });

      // Check if linkedWorkoutId is available → stop polling
      const updatedTemplate = freshData.templates.find(
        (t) => t.templateId === templateId,
      );
      if (updatedTemplate?.linkedWorkoutId || pollCount >= maxPolls) {
        clearInterval(pollingIntervalRef.current);
      }
    } catch (err) {
      if (pollCount >= maxPolls) clearInterval(pollingIntervalRef.current);
    }
  }, 3000);
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
  };
}, []);
```

### 4. Call component polling from handleSubmitWorkout

```javascript
// In handleSubmitWorkout, after success:
setEditingWorkoutId(null);
setEditedPerformance("");
setWorkoutData((prevData) => {
  /* mark template completed */
});

// Start component-managed polling (replaces ProgramAgent's internal polling)
setTimeout(() => startPollingForLinkedWorkout(template.templateId), 3000);
```

### 5. Prevent ProgramAgent's internal polling from firing

Either:

- **Option A**: Don't call `logWorkoutFromTemplate()` (which starts internal polling). Instead, call a lower-level `logWorkout()` API directly and manage the response in the component.
- **Option B**: Add an option to `logWorkoutFromTemplate()` to skip internal polling: `logWorkoutFromTemplate(programId, templateId, data, { skipPolling: true })`.

Option B is less invasive and doesn't break other consumers.

### 6. Remove `prevTodaysWorkoutRef` workaround

Once the component fully owns `workoutData`, the ref-based change detection is no longer needed.

### 7. Apply same pattern to ProgramDashboard.jsx (optional)

`ProgramDashboard.jsx` uses the same callback pattern for `todaysWorkout`. If it also performs optimistic updates or experiences similar issues, apply the same refactor.

---

## Affected Files

| File                                           | Change                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/components/programs/ViewWorkouts.jsx`     | Remove todaysWorkout from callback, add component-managed polling, remove prevTodaysWorkoutRef |
| `src/utils/agents/ProgramAgent.js`             | Add `skipPolling` option to `logWorkoutFromTemplate`                                           |
| `src/components/programs/ProgramDashboard.jsx` | Optional: same callback cleanup                                                                |

---

## Benefits

- **Single source of truth** for `workoutData` eliminates race conditions
- **Optimistic updates preserved** without workarounds (no ref tracking needed)
- **Merge strategy** during polling prevents stale data from regressing local state
- **Consistent with codebase patterns** (ManageWorkouts, ManageExercises, ManageMemories)
- **Easier to reason about** - component owns state, agent is a data service

## Risks

- Polling logic moves from agent to component (more code in ViewWorkouts, but more explicit)
- Need to ensure ProgramAgent's internal polling doesn't conflict if other consumers still use it
- ProgramDashboard may need the same treatment if it has similar issues

---

## Reference Implementations

- `src/components/ManageWorkouts.jsx` - Selective merging pattern with WorkoutAgent
- `src/components/ManageExercises.jsx` - Selective merging pattern with ExerciseAgent
- `src/components/ManageMemories.jsx` - Selective merging pattern with MemoryAgent
- `docs/strategy/REACT_PATTERNS.md` - AbortController and loading state patterns
