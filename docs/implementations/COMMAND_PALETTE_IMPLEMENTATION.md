# Command Palette Implementation Plan

## Overview
Implement a GitHub-style command palette as a unified quick actions interface for the entire application. This will provide a consistent, modern way to execute commands across all pages without navigation disruption.

## Phase 1: Core Infrastructure & Log Workout Command

### 1. Core Command Palette Component

#### Files to Create:
- `src/components/shared/CommandPalette.jsx` - Main command palette component
- `src/hooks/useCommandPalette.js` - Custom hook for command palette state
- `src/utils/commands/index.js` - Command registry and execution logic
- `src/utils/commands/workoutCommands.js` - Workout-specific commands

#### Component Structure:
```jsx
// CommandPalette.jsx
- Slide-down overlay from top of viewport
- Auto-focus input field
- Command parsing and suggestion display
- Keyboard navigation (arrow keys, enter, escape)
- Loading states and success/error feedback
- Mobile-responsive design
```

### 2. Command System Architecture

#### Command Registry Pattern:
```javascript
// Each command has:
{
  id: 'log-workout',
  trigger: '/log-workout',
  description: 'Log a completed workout',
  example: '/log-workout I did Fran in 8:57',
  category: 'workout',
  execute: async (args, context) => { /* implementation */ }
}
```

#### Command Context:
- `userId` - Current user ID
- `coachId` - Current coach ID (if applicable)
- `navigate` - React Router navigation function
- `showToast` - Toast notification function

### 3. UI/UX Implementation

#### Visual Design:
- **Backdrop**: Semi-transparent overlay (similar to modal)
- **Container**: Slide down from top, centered horizontally
- **Input**: Large, prominent text field with placeholder
- **Suggestions**: List of matching commands below input
- **Feedback**: Success/error states with appropriate styling
- **Animation**: Smooth slide-down/up transitions

#### Keyboard Interactions:
- `Cmd/Ctrl + K` - Open command palette (global shortcut)
- `Escape` - Close command palette
- `Arrow Up/Down` - Navigate command suggestions
- `Enter` - Execute selected command
- `Tab` - Auto-complete command

#### Styling Approach:
- Use existing synthwave theme classes
- Consistent with current design system
- High z-index to appear above all content
- Responsive breakpoints for mobile

### 4. Log Workout Command Implementation

#### Command Definition:
```javascript
{
  id: 'log-workout',
  trigger: '/log-workout',
  description: 'Log a completed workout',
  example: '/log-workout I did Fran in 8:57',
  category: 'workout',
  requiresAuth: true,
  execute: async (workoutDescription, context) => {
    // Call build-workout Lambda with workout description
    // Show loading state in command palette
    // Display success/error feedback
    // Auto-dismiss after success
  }
}
```

#### Integration Points:
- **API Integration**: Use new `create-workout` Lambda that wraps `build-workout`
- **Error Handling**: Display errors within command palette
- **Success Feedback**: Toast notification + auto-dismiss
- **Loading States**: Show spinner while processing

### 5. Integration with Existing UI

#### Replace Existing "Log Workout" Buttons:
- **FloatingMenuManager.jsx** - Line 459-469
- **Training Grounds** - Quick actions section
- **Manage Workouts** - Page-level action button

#### Updated Button Behavior:
```javascript
// Instead of individual implementations
onClick={() => {
  console.info('Log Workout clicked - functionality to be implemented');
}}

// New unified approach
onClick={() => {
  openCommandPalette('/log-workout ');
}}
```

### 6. Global State Management

#### Command Palette Context:
```javascript
// CommandPaletteContext.jsx
const CommandPaletteContext = createContext({
  isOpen: false,
  command: '',
  openPalette: (prefilledCommand) => {},
  closePalette: () => {},
  executeCommand: (commandString) => {}
});
```

#### App-Level Integration:
- Wrap app in CommandPaletteProvider
- Add global keyboard listener for Cmd/Ctrl + K
- Ensure command palette renders above all other content

## Implementation Steps

### Step 1: Core Component (Est: 4-6 hours)
1. Create `CommandPalette.jsx` with basic slide-down UI
2. Implement keyboard interactions (escape, enter)
3. Add basic styling with synthwave theme
4. Test opening/closing behavior

### Step 2: Command System (Est: 3-4 hours)
1. Create command registry structure
2. Implement command parsing logic
3. Add command suggestion/filtering
4. Create base command execution framework

### Step 3: Log Workout Command (Est: 3-4 hours)
1. Create new `create-workout` Lambda wrapper
2. Add HTTP API route for workout creation
3. Implement workout command definition
4. Add loading states and error handling
5. Test end-to-end workflow

### Step 4: UI Integration (Est: 2-3 hours)
1. Replace existing "Log Workout" buttons
2. Add global keyboard shortcut
3. Create context provider and wrap app
4. Test across all existing log workout locations

### Step 5: Polish & Testing (Est: 2-3 hours)
1. Mobile responsiveness testing
2. Accessibility improvements (ARIA labels, focus management)
3. Error edge case handling
4. Performance optimization

## Future Commands (Phase 2+)

### Planned Commands:
- `/save-memory [content]` - Quick memory saving
- `/new-conversation [topic]` - Start new conversation
- `/search-workouts [query]` - Search workout history
- `/search-memories [query]` - Search memory history
- `/goto [page]` - Navigation shortcuts

### Extensibility:
- Plugin-style command registration
- Command categories and grouping
- User-customizable shortcuts
- Command history and favorites

## Technical Considerations

### Performance:
- Lazy load command palette component
- Debounce command search/filtering
- Efficient command matching algorithms
- Minimal bundle size impact

### Accessibility:
- Proper focus management
- Screen reader compatibility
- Keyboard-only navigation
- High contrast mode support

### Mobile Experience:
- Touch-friendly command selection
- Virtual keyboard considerations
- Responsive command suggestion layout
- Alternative trigger methods for mobile

## Success Metrics

### User Experience:
- Reduced clicks to log workouts
- Consistent behavior across all pages
- Fast command execution (< 2 seconds)
- High user adoption of keyboard shortcuts

### Technical:
- No performance regression
- Cross-browser compatibility
- Mobile functionality parity
- Maintainable command system architecture

## Risks & Mitigations

### Potential Issues:
1. **Keyboard Conflicts**: Cmd/Ctrl + K might conflict with browser shortcuts
   - *Mitigation*: Test across browsers, provide alternative triggers

2. **Mobile UX**: Command palette might feel awkward on mobile
   - *Mitigation*: Design mobile-first, provide touch-friendly alternatives

3. **Command Discoverability**: Users might not know about available commands
   - *Mitigation*: Help text, command suggestions, onboarding hints

4. **Performance Impact**: Global keyboard listeners and overlay rendering
   - *Mitigation*: Efficient event handling, component lazy loading

## Future Enhancements

### Advanced Features:
- Command aliases and shortcuts
- Command history and recent commands
- Custom user-defined commands
- Command palette themes
- Integration with browser history
- Command palette analytics

This implementation will establish a powerful, extensible foundation for quick actions while immediately solving the workout logging UX challenge.

---

## Backend Architecture Update

### New Lambda Function Required: `create-workout`

**Problem**: The existing `build-workout` Lambda is designed for asynchronous execution (fire-and-forget) within conversation workflows. For command palette integration, we need synchronous user feedback.

**Solution**: Create a wrapper Lambda that provides immediate HTTP responses while triggering async processing.

#### `create-workout` Lambda Specifications

**Purpose**:
- Accept HTTP requests for workout creation
- Validate input and provide immediate user feedback
- Trigger `build-workout` Lambda asynchronously
- Return success response quickly for UI feedback

**Files to Create**:
```
amplify/functions/create-workout/
├── handler.ts
└── resource.ts
```

**Handler Implementation**:
```typescript
// amplify/functions/create-workout/handler.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  createSuccessResponse,
  createErrorResponse,
  invokeAsyncLambda,
} from '../libs/api-helpers';
import { getCoachConfig } from '../../dynamodb/operations';

interface CreateWorkoutRequest {
  workoutDescription: string;
  coachId?: string;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return createErrorResponse(400, 'User ID is required');
    }

    const body = JSON.parse(event.body || '{}') as CreateWorkoutRequest;
    const { workoutDescription, coachId } = body;

    // Input validation
    if (!workoutDescription?.trim()) {
      return createErrorResponse(400, 'Workout description is required');
    }
    if (workoutDescription.length > 2000) {
      return createErrorResponse(400, 'Workout description too long (max 2000 characters)');
    }

    // Get coach config or use default
    let coachConfig;
    if (coachId) {
      const coach = await getCoachConfig(userId, coachId);
      if (!coach) {
        return createErrorResponse(404, 'Coach not found');
      }
      coachConfig = coach.attributes;
    } else {
      coachConfig = {
        coach_name: 'Workout Logger',
        coaching_style: 'supportive',
      };
    }

    // Trigger async workout processing
    const buildFunction = process.env.BUILD_WORKOUT_FUNCTION_NAME;
    if (!buildFunction) {
      return createErrorResponse(500, 'Workout processing not configured');
    }

    await invokeAsyncLambda(
      buildFunction,
      {
        userId,
        coachId: coachId || 'default',
        conversationId: 'command-palette',
        userMessage: workoutDescription.trim(),
        coachConfig,
        isSlashCommand: true,
        slashCommand: '/log-workout',
      },
      'command palette workout creation'
    );

    return createSuccessResponse({
      message: 'Workout logged successfully',
      status: 'processing',
      workoutDescription: workoutDescription.trim(),
      estimatedProcessingTime: '5-10 seconds',
    });

  } catch (error) {
    console.error('Create workout error:', error);
    return createErrorResponse(500, 'Failed to log workout');
  }
};
```

**API Routes to Add**:
```typescript
// amplify/api/routes.ts additions
createWorkout: apigatewayv2_integrations.HttpLambdaIntegration;

// New route:
httpApi.addRoutes({
  path: '/users/{userId}/workouts/create',
  methods: [apigatewayv2.HttpMethod.POST],
  integration: integrations.createWorkout
});
```

**Frontend API Helper**:
```javascript
// src/utils/apis/workoutCreateApi.js
import { getApiUrl } from './apiConfig';

export const createWorkout = async (userId, workoutDescription, coachId = null) => {
  const url = `${getApiUrl('')}/users/${userId}/workouts/create`;

  const payload = {
    workoutDescription,
    ...(coachId && { coachId })
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create workout');
  }

  return response.json();
};
```

#### User Experience Flow

1. **User Input**: `/log-workout I did Fran in 8:57`
2. **Command Palette**: Shows loading state
3. **`create-workout` Lambda**: Validates input, triggers `build-workout` async
4. **Immediate Response**: "Workout logged successfully - Processing in background..."
5. **Command Palette**: Closes with success toast
6. **Background Processing**: `build-workout` Lambda processes workout data
7. **Final Result**: Workout appears in history within 5-10 seconds

#### Architecture Benefits

✅ **Fast User Feedback** - Immediate response (< 1 second)
✅ **Async Processing** - Heavy Claude API calls happen in background
✅ **Input Validation** - Errors caught before expensive processing
✅ **Scalable** - Separates UI concerns from data processing
✅ **Consistent** - Follows existing async pattern used by coach creator

#### Files to Create/Modify

**New Files**:
- `amplify/functions/create-workout/handler.ts`
- `amplify/functions/create-workout/resource.ts`
- `src/utils/apis/workoutCreateApi.js`

**Modified Files**:
- `amplify/backend.ts` - Add create-workout integration
- `amplify/api/routes.ts` - Add workout creation route
- `src/utils/commands/workoutCommands.js` - Use new API endpoint

**Updated Implementation Timeline**: 12-17 hours total (was 10-15 hours)
