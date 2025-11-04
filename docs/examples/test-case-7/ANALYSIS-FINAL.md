# Test Case 7 Analysis: Textarea Edits Not Captured

**Date**: November 2, 2025
**Test**: Deficit Deadlift powerlifting workout (Mortis Posterior)
**Issue**: User edited workout from 185# → 205# and added RPE 8, but backend received original 185# with no RPE

---

## 🔍 Executive Summary

**Root Cause**: Frontend bug in `ViewWorkouts.jsx` - A `useEffect` hook was clearing the `textareaRefs` Map on every `workoutData` change, causing a race condition where textarea refs were not reliably available when the "Log Workout" button was clicked.

**Impact**: User's edited workout descriptions were never sent to the backend, resulting in logged workouts that didn't reflect actual performance.

**Status**: ✅ **FIXED** - Removed the problematic `useEffect` and added comprehensive debug logging.

---

## 📊 Data Flow Analysis

### 1. Frontend Sent (`cloudwatch-log-workout.txt`, line 7)
```json
{
  "userPerformance": "Deficit Deadlift (2\" deficit)\n4x6 @ 185lbs (65% of estimated max)..."
}
```
☠️ **This was the ORIGINAL template description, NOT the user's edited version**

### 2. Backend Processing (`log-workout-template/handler.ts`)
- Received `userPerformance`: 185lbs (original)
- Scaling analysis correctly determined: `wasScaled: false` (because actual matched prescribed)
- Invoked `build-workout` lambda with original description

### 3. AI Extraction (`workout-extraction-prompt.json`)
```
PRESCRIBED WORKOUT: 185lbs
ACTUAL PERFORMANCE: 185lbs (same as prescribed)
```
The AI was given **identical** prescribed and actual performance, so it correctly extracted:
- `weight: 185`
- `reps: 6`
- `rpe: null`
- `intensity: 7` (default)
- `perceived_exertion: 7` (default)

### 4. Saved Workout (`workout-created.json`)
```json
{
  "discipline_specific": {
    "powerlifting": {
      "exercises": [{
        "exercise_name": "Deficit Deadlift",
        "equipment": ["deficit_platform"],
        "sets": [
          {"weight": 185, "reps": 6, "rpe": null},
          {"weight": 185, "reps": 6, "rpe": null},
          {"weight": 185, "reps": 6, "rpe": null},
          {"weight": 185, "reps": 6, "rpe": null}
        ]
      }]
    }
  }
}
```

**Conclusion**: The backend pipeline worked correctly with the data it received. The bug was entirely in the frontend.

---

## 🐛 Issues Found

### **CRITICAL BUG #1: Textarea Refs Not Captured**

**File**: `src/components/training-programs/ViewWorkouts.jsx`
**Lines**: 99-102 (removed)

**Problematic Code**:
```javascript
// Clean up textarea refs when workouts change
useEffect(() => {
  // Clear the refs map when workoutData changes to prevent stale refs
  textareaRefs.current.clear();
}, [workoutData]);
```

**Why This Broke**:
1. User loads page → `workoutData` is set → `useEffect` clears refs (Map is empty)
2. Textareas render → ref callbacks add textareas to the Map
3. **ANY state change that updates `workoutData` clears the refs again**
4. User edits textarea content
5. User clicks "Log Workout"
6. `textareaRefs.current.get(template.templateId)` returns `undefined`
7. Code falls back to `template.description` (original, unedited)
8. Original description sent to backend

**Race Condition**: If `workoutData` changed between steps 2 and 5 (e.g., from polling, state updates, or async operations), the refs would be cleared and the textarea edits lost.

---

### **Minor Bug #2: Equipment Snake Case**

**File**: Backend normalization utilities
**Issue**: `equipment: ["deficit_platform"]` should display as "Deficit Platform"
**Priority**: Low (cosmetic)

---

## 🔧 Fixes Applied

### ✅ Fix #1: Removed Problematic `useEffect`

**Changed**:
```diff
  }, []);

- // Clean up textarea refs when workouts change
- useEffect(() => {
-   // Clear the refs map when workoutData changes to prevent stale refs
-   textareaRefs.current.clear();
- }, [workoutData]);
-
  // Load program and workout data
```

**Rationale**: React's ref callbacks handle updates automatically. Clearing refs on every `workoutData` change is unnecessary and creates race conditions.

### ✅ Fix #2: Enhanced Debug Logging

**Added to `handleLogWorkout`**:
```javascript
console.log('📝 Logging workout - DEBUG:', {
  templateId: template.templateId,
  hasTextarea: !!textarea,
  textareaValue: textarea?.value,
  originalDescription: template.description,
  originalLength: template.description?.length,
  editedLength: editedDescription?.length,
  editedPreview: editedDescription?.substring(0, 100),
  usedFallback: !textarea,
  refsMapSize: textareaRefs.current.size,
  allRefKeys: Array.from(textareaRefs.current.keys()),
});
```

**Added to textarea ref callback**:
```javascript
ref={(el) => {
  if (el) {
    // Set initial height
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";

    // Map textarea to templateId for reliable lookups
    textareaRefs.current.set(template.templateId, el);
    console.log('✅ Textarea ref set:', {
      templateId: template.templateId,
      currentValue: el.value,
      totalRefs: textareaRefs.current.size,
    });
  } else {
    // Cleanup when element is unmounted
    textareaRefs.current.delete(template.templateId);
    console.log('🗑️ Textarea ref removed:', template.templateId);
  }
}}
```

---

## 🧪 Testing Instructions

### **Test Case 7 - Retry**

1. **Navigate** to "Today's Workouts" page (or Day 3 of your training program)
2. **Open browser DevTools** → Console tab
3. **Edit** the workout description:
   - Change weight from 185# → 205#
   - Add "RPE: 8" or "Intensity: 8"
   - Add any other performance notes
4. **Click** "Log Workout"
5. **Check console logs**:
   - Look for `✅ Textarea ref set:` - confirms ref was registered
   - Look for `📝 Logging workout - DEBUG:` - check these values:
     - `hasTextarea: true` ✅
     - `usedFallback: false` ✅
     - `textareaValue` should show your edited content ✅
     - `refsMapSize` should be > 0 ✅
6. **Wait** for backend processing (~5-10 seconds)
7. **Navigate** to the logged workout details page
8. **Verify**:
   - Weight shows 205# (not 185#) ✅
   - RPE shows 8 (not null) ✅
   - Intensity shows 8 (not 7) ✅

### **Expected Console Output** (Success):
```
✅ Textarea ref set: {
  templateId: "template_63gocaz-j-AYRsb0094ik_1735000007_g7h8i9j0k",
  currentValue: "Deficit Deadlift...",
  totalRefs: 1
}

📝 Logging workout - DEBUG: {
  templateId: "template_63gocaz-j-AYRsb0094ik_1735000007_g7h8i9j0k",
  hasTextarea: true,
  textareaValue: "Deficit Deadlift (2\" deficit)\n4x6 @ 205lbs...\n\nRPE: 8\nIntensity: 8",
  usedFallback: false,
  refsMapSize: 1,
  allRefKeys: ["template_63gocaz-j-AYRsb0094ik_1735000007_g7h8i9j0k"]
}
```

---

## 📝 Remaining Tasks

### 🔴 High Priority
- [ ] **User Testing**: Deploy changes and retest with edited workouts (see Testing Instructions above)
- [ ] **Equipment Normalization**: Fix `deficit_platform` → `Deficit Platform` in backend

### 🟡 Medium Priority
- [ ] **Remove Debug Logs**: After confirming fix works, remove verbose console logs from production

### 🟢 Low Priority
- [ ] **Consider React 19**: Upgrade to React 19 for improved ref handling (future enhancement)

---

## 📚 Lessons Learned

1. **Don't Clear Refs Unnecessarily**: React's ref callbacks handle cleanup automatically
2. **Race Conditions with useEffect**: Clearing refs in a `useEffect` with dependencies can create timing issues
3. **Debug Logging is Critical**: Without comprehensive logging, this bug would be very difficult to diagnose
4. **Test Textarea Interactions**: Form field interactions (especially dynamic refs) require thorough testing

---

## 🎯 Confidence

**Fix Confidence**: 95%
**Rationale**: The problematic `useEffect` that cleared refs has been removed. React will now manage textarea refs naturally through the ref callback, eliminating the race condition.

**Next Steps**: User must deploy and test the fix. If the issue persists, the debug logs will provide clear evidence of where the ref lookup is failing.

