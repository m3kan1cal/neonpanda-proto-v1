# Error State Standardization

## Overview
All error, not found, and empty states across the app now use standardized components from `src/components/shared/ErrorStates.jsx`.

## Standardized Components

### 1. **CenteredErrorState** (Full Page Errors)
Use for full-page error states like "not found", "access denied", etc.

**Features:**
- Centered full-page layout
- Icon + title + message
- Optional action button
- Variants: `error` (pink), `warning` (orange), `info` (cyan)

**Example:**
```jsx
import { CenteredErrorState } from '../shared/ErrorStates';

<CenteredErrorState
  title="Program Not Found"
  message="The training program you're looking for doesn't exist or has been removed."
  buttonText="Back to Programs"
  onButtonClick={() => navigate('/programs')}
  variant="error"
/>
```

**Button Styling:**
- Uses `buttonPatterns.primary` from `uiPatterns.js` for consistent neon pink button styling
- Includes proper hover effects, shadows, and transitions
- Matches all other primary action buttons across the app

**Currently Used In:**
- ✅ `TrainingProgramDashboard.jsx` - Program not found, error loading
- ✅ `ViewWorkouts.jsx` - Missing info, error loading workouts
- ✅ `WorkoutDetails.jsx` - Workout not found errors
- ✅ `WeeklyReports.jsx` - Report loading errors
- ✅ `CoachConversations.jsx` - Conversation errors

---

### 2. **InlineError** (Section-Level Errors)
Use for errors within a section or card (not full page).

**Features:**
- Compact inline layout
- Icon + title + message
- No button (parent handles actions)
- Sizes: `small`, `medium`, `large`

**Example:**
```jsx
import { InlineError } from '../shared/ErrorStates';

<InlineError
  title="Failed to Load"
  message="Unable to fetch workout data"
  variant="error"
  size="medium"
/>
```

**Currently Used In:**
- ✅ `TrainingGrounds.jsx` - Various section errors

---

### 3. **EmptyState** (No Data)
Use when there's no data to display (not an error).

**Features:**
- Centered, muted text
- Simple title + message
- No icon or button
- Sizes: `small`, `medium`, `large`

**Example:**
```jsx
import { EmptyState } from '../shared/ErrorStates';

<EmptyState
  title="No Workouts"
  message="You haven't logged any workouts yet"
  size="medium"
/>
```

**Currently Used In:**
- ✅ `TrainingGrounds.jsx` - Empty workout lists

---

### 4. **LoadingSpinner** & **FullPageLoader**
Use for loading states.

**Example:**
```jsx
import { LoadingSpinner, FullPageLoader } from '../shared/ErrorStates';

// In a section
<LoadingSpinner size="medium" text="Loading workouts..." />

// Full page
<FullPageLoader text="Loading your training data..." />
```

---

## Color Coding Guide

### Error Variants
- **`error`** (default): Pink (`text-synthwave-neon-pink`) - For critical errors, not found
- **`warning`**: Orange (`text-synthwave-neon-orange`) - For warnings, deprecation
- **`info`**: Cyan (`text-synthwave-neon-cyan`) - For informational states

### Empty States
- Muted gray (`text-synthwave-text-muted`) - For "no data" scenarios

---

## When to Use Each Component

### Use `CenteredErrorState` when:
- ❌ Page/resource not found
- ❌ Access denied
- ❌ Critical error preventing page render
- ❌ Missing required parameters
- ℹ️ User needs to take action to continue

### Use `InlineError` when:
- ❌ Section fails to load
- ❌ API error for a specific feature
- ❌ Validation error
- ℹ️ Error is part of a larger page that's still functional

### Use `EmptyState` when:
- 📭 No data available (not an error)
- 📭 List/collection is empty
- 📭 Search returns no results
- ℹ️ User hasn't created content yet

---

## Migration Status

### ✅ Fully Standardized
- `TrainingProgramDashboard.jsx`
- `ViewWorkouts.jsx`
- `WorkoutDetails.jsx`
- `WeeklyReports.jsx`
- `CoachConversations.jsx`
- `TrainingGrounds.jsx`

### 🔍 To Review
Check these components for any remaining custom error states:
- `ManageCoachConversations.jsx`
- `CoachCreator.jsx`
- Other newer components

---

## Design Patterns

### ✅ DO:
```jsx
// Use standardized component
<CenteredErrorState
  title="Workout Not Found"
  message="The workout you're looking for doesn't exist."
  buttonText="Back to Workouts"
  onButtonClick={() => navigate('/workouts')}
/>
```

### ❌ DON'T:
```jsx
// Don't create custom error UI
<div className="text-center">
  <p className="text-red-400">Error!</p>
  <button onClick={goBack}>Go Back</button>
</div>
```

---

## Testing Checklist

When adding error handling:
- [ ] Import from `ErrorStates.jsx`
- [ ] Choose correct component type (Centered/Inline/Empty)
- [ ] Set appropriate `variant` (error/warning/info)
- [ ] Provide clear, actionable message
- [ ] Include navigation button if needed
- [ ] Test both error and success paths

---

## Related Files
- `src/components/shared/ErrorStates.jsx` - Component definitions
- `src/utils/ui/uiPatterns.js` - Styling patterns
- `src/components/shared/AccessDenied.jsx` - Auth-specific errors

