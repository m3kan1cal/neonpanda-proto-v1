# Phase 1 Testing Guide

## ✅ Phase 1 Complete!

All foundation files have been created:
- ✅ `navigationConfig.js` - Route and nav item definitions
- ✅ `navigationUtils.js` - Helper functions
- ✅ `NavigationContext.jsx` - State management
- ✅ `index.js` - Barrel exports
- ✅ `NavigationTest.jsx` - Test component

## How to Test Phase 1

### Step 1: Wrap App with NavigationProvider

Open `src/App.jsx` and wrap `AppContent` with `NavigationProvider`:

```jsx
import { NavigationProvider } from "./components/navigation";

function AppContent() {
  // ... existing code ...

  return (
    <NavigationProvider>  {/* ADD THIS */}
      <div className="min-h-screen">
        {/* existing Navigation component */}
        <Navigation user={user} signOut={signOut} />
        <Breadcrumbs />

        {/* ... rest of your app ... */}
      </div>
    </NavigationProvider>  {/* ADD THIS */}
  );
}
```

### Step 2: Add Test Component to Any Page

Temporarily add the test component to a page (e.g., `TrainingGrounds.jsx`):

```jsx
import NavigationTest from './navigation/NavigationTest';

function TrainingGrounds() {
  // ... existing code ...

  return (
    <div>
      {/* Your existing content */}

      {/* ADD THIS - Test Panel */}
      <NavigationTest />
    </div>
  );
}
```

### Step 3: View Test Panel

1. Run your dev server: `npm run dev`
2. Navigate to Training Grounds (or wherever you added the test component)
3. Look for the **🧪 Navigation Test Panel** in the bottom-right corner

### What to Verify

The test panel should show:

✅ **Context State:**
- userId (should match URL param)
- coachId (should match URL param)
- isAuthenticated (true/false)
- hasCoachContext (true if both userId and coachId present)
- currentCoachName (should say "Your Coach" as placeholder)

✅ **Badge Counts:**
- All should be 0 (mock data for now)
- Will be replaced with real Agent calls in later phases

✅ **Primary Nav:**
- Should show 3 items: Home, Training, Progress
- Training and Progress should only show if authenticated + coach context

✅ **Contextual Nav:**
- Only appears if hasCoachContext is true
- Shows: Workouts, Conversations, Memories

✅ **Helper Functions:**
- getHomeRoute() - should return appropriate route based on auth state
- getTrainingRoute() - should include userId and coachId
- getProgressRoute() - should include userId and coachId

✅ **Status:**
- Should show green "✅ Phase 1 Foundation Working!"

## Expected Behavior

### When NOT authenticated:
- isAuthenticated: false
- hasCoachContext: false
- Only shows Home in Primary Nav
- Contextual Nav hidden
- getHomeRoute() returns "/"

### When authenticated but NO coach selected:
- isAuthenticated: true
- hasCoachContext: false
- Shows Home in Primary Nav
- Training and Progress hidden
- Contextual Nav hidden
- getHomeRoute() returns "/coaches?userId=..."

### When authenticated WITH coach selected:
- isAuthenticated: true
- hasCoachContext: true
- Shows all 3 Primary Nav items
- Shows all Contextual Nav items
- getHomeRoute() returns "/training-grounds?userId=...&coachId=..."

## Troubleshooting

### "useNavigationContext must be used within NavigationProvider"
- Make sure you wrapped AppContent with NavigationProvider
- Check that import is correct: `import { NavigationProvider } from "./components/navigation"`

### Test panel not showing
- Make sure you imported NavigationTest in the page component
- Check console for errors
- Verify the component is rendering (check React DevTools)

### Context values are undefined
- Check that URL has userId and/or coachId params
- Verify auth state in browser (logged in?)
- Check console for errors

## Next Steps

Once Phase 1 is verified:

1. ✅ Remove the test component from your page
2. ✅ Keep NavigationProvider wrapped around AppContent
3. ✅ Move to Phase 2: Mobile Bottom Navigation

The NavigationProvider will stay in place for all future phases!

