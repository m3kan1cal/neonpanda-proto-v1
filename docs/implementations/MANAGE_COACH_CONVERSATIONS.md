# Manage Coach Conversations Implementation Guide

This document outlines the complete implementation pattern for creating a "Manage Coach Conversations" feature based on the existing "Manage Workouts" feature structure.

## Implementation Status Summary

### ✅ **COMPLETED** - Backend Implementation
- **Lambda Functions**: `delete-coach-conversation` handler and resource ✅
- **Database Operations**: `deleteCoachConversation` function in DynamoDB operations ✅
- **Pinecone Operations**: `deleteConversationSummaryFromPinecone` function ✅
- **API Routes**: DELETE route added to existing coach conversation routes ✅
- **Backend Configuration**: Function registration, environment variables, IAM permissions ✅

### ✅ **COMPLETED** - Frontend Implementation
- **API Module**: `deleteCoachConversation` function added to `coachConversationApi.js` ✅
- **Agent Module**: `deleteCoachConversation` method added to `CoachConversationAgent.js` ✅
- **React Component**: `ManageCoachConversations.jsx` component created ✅
- **Navigation Integration**: Menu item added to Navigation.jsx ✅
- **Breadcrumb Integration**: Breadcrumb paths configured ✅
- **Floating Menu Integration**: FloatingMenuManager updated ✅
- **App Route Integration**: Route added to App.jsx ✅

### ✅ **COMPLETED** - Supporting Infrastructure
- **Data Types**: All necessary types already exist in coach-conversation types ✅
- **Existing Functions**: All required CRUD operations already exist and functional ✅

## Overview

The Manage Coach Conversations feature will mirror the Manage Workouts implementation with appropriate naming and functionality adaptations. The feature provides CRUD operations for coach conversations with filtering, sorting, and detailed management capabilities.

## Backend Implementation

### Lambda Functions Required

#### Core CRUD Operations

1. **delete-coach-conversation** ✅ **COMPLETED**
   - **File**: `amplify/functions/delete-coach-conversation/handler.ts` ✅
   - **Resource**: `amplify/functions/delete-coach-conversation/resource.ts` ✅
   - **Purpose**: Delete a conversation and cleanup (similar to delete-workout) ✅
   - **Route**: `DELETE /users/{userId}/coaches/{coachId}/conversations/{conversationId}` ✅
   - **Parameters**: userId, coachId, conversationId ✅
   - **Response**: Uses `createSuccessResponse` and `createErrorResponse` helpers like other handlers ✅
   - **Error Handling**: 400 for missing parameters, 404 for conversation not found, 500 for server errors ✅
   - **Cleanup**: Removes conversation from DynamoDB and any associated conversation summaries from Pinecone ✅

### Existing Functions to Leverage

The following functions already exist and can be used:
- `get-coach-conversations` - Gets conversations for specific user+coach (can be adapted for cross-coach queries)
- `get-coach-conversations-count` - Gets count for specific user+coach (can be adapted for cross-coach counting)
- `get-coach-conversation` - Gets specific conversation details (already works for any conversation)
- `update-coach-conversation` - Updates conversation metadata (already works for any conversation)

### Database Operations Required

#### New DynamoDB Operations

1. **deleteCoachConversation** ✅ **COMPLETED**
   ```typescript
   export async function deleteCoachConversation(
     userId: string,
     conversationId: string
   ): Promise<void>
   ```
   - **Purpose**: Delete conversation from DynamoDB ✅
   - **Implementation**: Similar to `deleteWorkout` function pattern ✅
   - **Location**: `amplify/dynamodb/operations.ts` ✅

#### New Pinecone Operations

2. **deleteConversationSummaryFromPinecone** ✅ **COMPLETED**
   ```typescript
   export async function deleteConversationSummaryFromPinecone(
     userId: string,
     conversationId: string
   ): Promise<{ success: boolean; error?: string }>
   ```
   - **Purpose**: Clean up conversation summary embeddings from Pinecone ✅
   - **Implementation**: Calls `deletePineconeContext` from `api-helpers.ts` ✅
   - **Location**: `amplify/functions/libs/coach-conversation/pinecone.ts` ✅

**Note**: No additional DynamoDB operations needed for counting since `get-coach-conversations-count` already exists.

### API Routes Updates ✅ **COMPLETED**

Add to `amplify/api/routes.ts`: ✅

```typescript
// In RouteIntegrations interface: ✅
deleteCoachConversation: apigatewayv2_integrations.HttpLambdaIntegration;

// Route added to existing addCoachConversationRoutes function: ✅
// Delete conversation
httpApi.addRoutes({
  path: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}',
  methods: [apigatewayv2.HttpMethod.DELETE],
  integration: integrations.deleteCoachConversation
});
```

**Note**: No additional count route needed since `get-coach-conversations-count` already exists. ✅

### Backend Configuration

#### Lambda Function Registration ✅ **COMPLETED**

Add to `amplify/backend.ts`: ✅

```typescript
// Import the new function ✅
import { deleteCoachConversation } from './functions/delete-coach-conversation/resource';

// Add to the backend definition ✅
const backend = defineBackend({
  // ... existing functions
  deleteCoachConversation, ✅
  // ... other functions
});
```

#### Environment Variables ✅ **COMPLETED**

The `delete-coach-conversation` Lambda function will automatically receive all necessary environment variables from the centralized configuration in `amplify/backend.ts`. No additional environment variable configuration is needed in the resource definition. ✅

#### IAM Permissions ✅ **COMPLETED**

IAM permissions are handled through the centralized DynamoDB table permissions in `amplify/backend.ts`: ✅

```typescript
// DynamoDB permissions granted automatically ✅
coreTable.table.grantReadWriteData(backend.deleteCoachConversation.resources.lambda);
```

**Note**: Pinecone permissions are handled through the centralized `deletePineconeContext` function in `api-helpers.ts`. ✅
**Note**: No custom IAM policies needed - using centralized table permissions pattern. ✅

## Frontend Implementation

### API Module Updates ✅ **COMPLETED**

**File**: `src/utils/apis/coachConversationApi.js` ✅

**Requirements for `deleteCoachConversation` function:** ✅ **IMPLEMENTED**

- **Function signature**: `deleteCoachConversation(userId, coachId, conversationId)` ✅
- **HTTP method**: DELETE request to `/users/{userId}/coaches/{coachId}/conversations/{conversationId}` ✅
- **Error handling**: Handle 400 (bad request), 404 (not found), and general API errors ✅
- **Response parsing**: Parse error messages from response body for 400 errors ✅
- **Logging**: Log successful deletion with conversation details ✅
- **Return value**: Return the API response object ✅

**Note**: All other required API functions (`getCoachConversations`, `getCoachConversation`, `updateCoachConversation`, `getCoachConversationsCount`) already exist in this file. ✅

### Agent Module Updates ✅ **COMPLETED**

**File**: `src/utils/agents/CoachConversationAgent.js` ✅

**Requirements for `deleteCoachConversation` method:** ✅ **IMPLEMENTED**

- **Import**: Add `deleteCoachConversation` to existing imports from `coachConversationApi.js` ✅
- **Method signature**: `async deleteCoachConversation(userId, coachId, conversationId)` ✅
- **Parameter validation**: Verify all three parameters are provided, throw error if missing ✅
- **Loading state**: Set `isLoadingItem: true` at start, `false` on completion ✅
- **Error state**: Clear error at start, set error message on failure ✅
- **API call**: Call the imported `deleteCoachConversation` function ✅
- **List refresh**: Call `loadRecentConversations()` after successful deletion ✅
- **Error handling**: Log errors, update error state, trigger `onError` callback, re-throw error ✅
- **Return value**: Return `true` on success ✅

### React Component ✅ **COMPLETED**

**File**: `src/components/ManageCoachConversations.jsx` ✅ **CREATED**

**Requirements for ManageCoachConversations component:** ✅ **IMPLEMENTED**

- **Base pattern**: Follow `ManageMemories.jsx` layout pattern with vertical stacking, NOT the grid layout from `ManageWorkouts.jsx` ✅
- **Agent import**: Use `CoachConversationAgent` instead of `WorkoutAgent` or `MemoryAgent` ✅
- **State structure**: Match `ManageMemories` state with conversation-specific naming ✅
- **Delete modal**: Implement same delete confirmation modal pattern as memories/workouts ✅
- **Agent integration**: Initialize and manage `CoachConversationAgent` with same lifecycle patterns as MemoryAgent ✅
- **Delete handling**: Call `agent.deleteCoachConversation(userId, coachId, conversationId)` ✅
- **Layout**: Vertical list layout like `ManageMemories` - conversations stacked vertically ✅
- **Sorting**: Most recently updated conversations at the top (like memories sorted by most recent) ✅
- **UI components**: Reuse same styling, loading states, empty states, error states as `ManageMemories` ✅
- **Header text**: "Manage Coach Conversations" with appropriate description ✅
- **Button text**: "Start New Conversation" instead of "Log Workout" ✅
- **List items**: Each conversation as a vertically stacked item (not grid cards) ✅
- **Preview functionality**: Implement conversation preview (view details) similar to workout preview ✅
- **Navigation from list**: Click to navigate to individual conversation view ✅
- **Tooltip system**: Implement same tooltip system for action buttons as ManageWorkouts ✅
- **Toast notifications**: Use toast system for success/error messages (delete confirmations, etc.) ✅
- **Parameter validation**: Redirect to training-grounds if missing userId parameter ✅
- **Agent lifecycle**: Proper agent initialization, cleanup, and error handling ✅

### Navigation Integration ✅ **COMPLETED**

**Requirements for Navigation integration:** ✅ **IMPLEMENTED**

- **File**: `src/components/Navigation.jsx` ✅
- **Menu item**: Add new navigation item to existing menu structure ✅
- **Title**: "Manage Conversations" ✅
- **Path**: `/training-grounds/manage-conversations?userId=${userId}` ✅
- **Icon**: Use existing navigation styling (no custom icon needed) ✅
- **Description**: "Review and organize your coaching conversations" ✅
- **Placement**: Follow existing navigation menu patterns for item ordering ✅

### Breadcrumb Integration ✅ **COMPLETED**

**Requirements for Breadcrumb updates:** ✅ **IMPLEMENTED**

- **File**: `src/components/Breadcrumbs.jsx` ✅
- **New breadcrumb pattern**: `Training Grounds > Manage Coach Conversations > Coach Conversation` ✅
- **Path mapping**: Update breadcrumb logic to handle conversation management paths ✅
- **Route structure**: ✅
  - `/training-grounds/manage-conversations` → "Training Grounds > Manage Coach Conversations" ✅
  - `/training-grounds/coach-conversations?{querystringParams}` → "Training Grounds > Manage Coach Conversations > Coach Conversation" ✅
- **Link behavior**: Each breadcrumb level should be clickable and navigate to the appropriate page ✅
- **URL parameters**: Preserve `userId` and other relevant query parameters in breadcrumb links ✅
- **Consistency**: Follow existing breadcrumb patterns for styling and interaction ✅

### Floating Menu Integration ✅ **COMPLETED**

**Requirements for FloatingMenuManager updates:** ✅ **IMPLEMENTED**

- **File**: `src/components/shared/FloatingMenuManager.jsx` ✅
- **Button updates**: Add "Manage Conversations" button to navigate to manage conversations ✅
- **Menu context**: Add context awareness for manage conversations page ✅
- **Navigation logic**: Update navigation logic to account for new manage conversations route ✅
- **Consistency**: Maintain existing floating menu behavior, styling and state management ✅

## Data Types and Interfaces ✅ **COMPLETED**

### New Type Definitions ✅ **COMPLETED**

**File**: `amplify/functions/libs/coach-conversation/types.ts` ✅

**Requirements for type definitions:** ✅ **ALREADY EXIST**

- **CoachConversationSummary**: Interface for conversation list items with core fields ✅ **EXISTS**
- **CoachConversationListItem**: Simplified interface for conversation lists ✅ **EXISTS**
- **ManageConversationFilters**: Interface for filtering options ✅ **NOT NEEDED** (filtering handled in frontend)
- **Field types**: Use appropriate types matching existing conversation schemas ✅ **EXISTS**

**Note**: All necessary types already exist in the coach-conversation types file. ✅

## Key Implementation Notes

### Naming Patterns Applied

| Workout Feature | Coach Conversation Feature |
|----------------|---------------------------|
| `ManageWorkouts` | `ManageCoachConversations` |
| `WorkoutAgent` | `CoachConversationAgent` |
| `getWorkouts` | `getCoachConversations` |
| `getWorkout` | `getCoachConversation` |
| `updateWorkout` | `updateCoachConversation` |
| `deleteWorkout` | `deleteCoachConversation` |
| `getWorkoutsCount` | `getCoachConversationsCount` |
| `workoutId` | `conversationId` |
| `workoutData` | `conversationData` |
| `completedAt` | `lastActivity` |
| `discipline` | `coachId` |
| `confidence` | `messageCount` |

### Key Differences from Workouts

1. **Multi-Coach Context**: Conversations span multiple coaches, unlike workouts which are more standalone
2. **Real-time Nature**: Conversations are ongoing vs workouts which are completed events
3. **Message Threading**: Conversations have message history vs workout data snapshots
4. **Active/Inactive Status**: Conversations can be archived vs workouts which are historical
5. **Existing Infrastructure**: Most CRUD operations already exist, only need delete and cross-coach aggregation

### Integration Points

1. **Existing Conversation APIs**: Leverage existing `get-coach-conversations`, `get-coach-conversation`, etc.
2. **DynamoDB Schema**: Extend existing conversation storage patterns
3. **Route Structure**: Add new management routes alongside existing conversation routes
4. **Agent Patterns**: Follow established agent architecture from WorkoutAgent
5. **UI Components**: Reuse styling and interaction patterns from ManageWorkouts

### Development Phases

1. **Phase 1**: Backend delete function and Pinecone cleanup implementation
2. **Phase 2**: API routes integration and backend testing
3. **Phase 3**: Frontend API module updates (add delete function)
4. **Phase 4**: Agent module updates (add delete method)
5. **Phase 5**: React component implementation (ManageCoachConversations)
6. **Phase 6**: Navigation and breadcrumb integration
7. **Phase 7**: FloatingMenuManager updates and testing
8. **Phase 8**: End-to-end testing and refinement

### Simplified Implementation Notes

Since ALL CRUD operations already exist, this implementation is extremely simplified compared to the workout pattern. The main work involves:

1. **Adding delete functionality** for conversations (similar to delete-workout) - ONLY new backend function needed
2. **Adding Pinecone cleanup** for conversation summaries (similar to workout summary cleanup)
3. **Creating aggregation logic** in the frontend to query conversations across all coaches for a user
4. **Building the management UI** that leverages existing conversation APIs
5. **Implementing filtering and sorting** on the frontend using existing APIs

This implementation provides a streamlined blueprint for creating the Manage Coach Conversations feature while leveraging the existing conversation infrastructure and maintaining consistency with the codebase architecture.
