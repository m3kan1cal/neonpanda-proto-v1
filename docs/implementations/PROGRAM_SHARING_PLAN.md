# NeonPanda Program Sharing: Link-Based Viral Growth Plan

**Status:** ⏸️ PAUSED - Core Flow Complete, Stabilizing Before Phase 2

**Progress:** `████████████░░░░░░░░` 60% Complete

**Last Updated:** January 19, 2026

**Current State:** Core sharing flow is functional end-to-end. Backend complete and deployed. Frontend preview page, share modal, coach selection modal, and copy flow all working. Pausing to stabilize before building remaining features (MySharedPrograms management, ProgramAdaptationChat slide-out).

---

## Strategic Vision

**Core Principle:** Enable authentic sharing of successful programs to drive viral growth while keeping AI coaching central to every program copy.

**What This Is:** A sharing feature that lets users spread their success stories
**What This Is NOT:** A marketplace or template library

## Why This Approach

### The Pivot from Marketplace to Link Sharing

**Original Concern:** "It could accidentally turn NeonPanda into a template marketplace rather than a coaching platform."

**Solution:** Focus exclusively on personal sharing via links. No browsing, no discovery, no marketplace UI. Just: user shares success → friend previews → friend signs up → coach adapts program → friend gets personalized version.

### Strategic Benefits

✅ **Maintains Coaching Centrality** - Coach proactively analyzes every copied program
✅ **Authentic Social Proof** - Personal recommendations beat anonymous browsing
✅ **Viral Growth Mechanic** - Each share is an endorsement with social context
✅ **Instant Gratification** - Program copies immediately (no conversation required upfront)
✅ **Low Friction** - User can skip coaching if they want, or engage deeply
✅ **Reusable Pattern** - Same slide-out chat works for customizing ANY program
✅ **Simpler to Build** - No complex session management, leverages existing ProgramDesigner
✅ **No Creator Economy** - Sharing is a user feature, not a business model
✅ **Lower Maintenance** - No moderation, curation, or quality control systems

### Growth Loops

**Loop 1: Workout Partner (Active Program)**

```
User starts program →
Wants accountability/workout partner →
Shares active program: "Join me!" →
Friend copies and starts same program →
Both train together, mutual accountability →
Both complete and share success... [loop continues]
```

**Loop 2: Proven Results (Completed Program)**

```
User completes program with great results →
Shares link on social media with personal story →
Friend clicks link, sees compelling preview →
Friend signs up and instantly copies program →
Coach opens slide-out chat with proactive adaptation suggestions →
Friend can customize or skip and start training immediately →
Friend completes program →
Friend shares their success... [loop continues]
```

### Key Architecture Decision: Instant Copy + Coach Chat

**Pattern:** Similar to `CoachTemplate → Coach` (instant copy with optional customization)

**Why This Works:**

- Program exists immediately (instant gratification)
- Coach chat opens automatically (proactive coaching)
- User choice preserved (customize or skip)
- Same UI reusable for existing program customization
- Reduces complexity vs. conversation-first approach

---

## User Flows

### Flow 1: Sharing a Program

**Trigger Points:**

- During an active program (user wants workout partner to join them)
- After completing a program (coach celebrates + offers share)
- From ManagePrograms page (share button on active/completed program cards)
- After hitting a major PR (achievement notification includes share option)

**User Journey:**

```
1. User clicks "Share This Program"
2. Modal appears: "Generate shareable link"
3. Link generated instantly
4. User can:
   - Copy link to clipboard (with confirmation animation)
   - Share directly to social (Twitter, Facebook, etc.)
   - Add personal note/context
5. Link is active and can be managed from "My Shared Programs"
```

**UI Copy (Brand Voice):**

- Button: "Share This Program"
- Modal title: "Share Your Success"
- Success message: "Link copied! Time to inspire some athletes. 💪"
- Social share pre-fill: "Just crushed this program on @NeonPanda - [result]. Check it out: [link]"

### Flow 2: Non-Member Discovers Program

**User Journey:**

```
1. Clicks shared link (from social media, message, etc.)
2. Lands on public preview page at neonpanda.com/shared/programs/{id}
3. Sees:
   - Program name and description
   - Attribution: "Program by @username"
   - High-level structure (phases, duration, frequency)
   - Training goals and equipment needs
   - Sample week layout (day structure, not detailed exercises)
4. Cannot see:
   - Specific exercise prescriptions
   - Sets/reps/weight schemes
   - Detailed workout templates
5. Prominent CTA: "Sign Up to Adapt This Program"
6. Clicks CTA → Registration flow
7. After signup → Redirected to coach selection + adaptation flow
```

**Why This Works:**

- Creates curiosity (can see structure but not details)
- Shows enough to assess fit (goals, duration, commitment)
- Clear value proposition (get personalized version through coaching)
- Drives signups naturally

### Flow 3: Member Discovers Program (Instant Copy + Coach Chat)

**User Journey:**

```
1. Clicks shared link (already logged in)
2. Lands on preview page - sees all public info
3. CTA: "Get This Program"
4. Clicks CTA → Coach selection modal (if multiple coaches)
5. Selects coach (or single coach auto-selected)
6. Loading state: "Copying program to your account..."
7. Program INSTANTLY copied to user's account (active, day 1)
8. Redirects to ProgramDashboard for the new program
9. Slide-out chat auto-opens with coach's proactive analysis:

   Coach: "Hey! I just set you up with @marcus_fitness's Olympic
   lifting program. Nice choice!

   Looking at your profile, here are a few things I'd suggest
   adjusting:

   • Your equipment: You mentioned limited barbell time - I could
     swap some accessory work to dumbbells
   • Your schedule: This assumes 5 days/week, but you prefer 4 -
     I can condense the volume without losing effectiveness
   • Your goals: You're training for competition - I'd add more
     positional work in the snatch/C&J

   Want me to make these changes? Or we can chat through any
   other adjustments you'd like. You can also close this and
   start the program as-is - it's already saved!"

10. User has three options:
    a) Engage in conversation to customize further
    b) Quick accept: "Make those changes" (coach regenerates)
    c) Close slide-out and use program as-is

11. If customizing: Coach modifies program through conversation
12. Success message: "Perfect! Your program is ready. Week 1 starts [date]."
```

**Why This Flow Works:**

- **Instant gratification:** Program exists immediately, user sees ProgramDashboard
- **Proactive coaching:** Chat opens automatically, coach speaks first
- **User choice:** Can skip entirely by closing slide-out
- **Lower friction:** No mandatory conversation before getting program
- **Higher conversion:** Program is "theirs" immediately, reducing abandonment

**Technical Implementation:**

- `copy-shared-program` Lambda (pattern: `create-coach-config-from-template`)
- Program saved with `metadata.copiedFromSharedProgram = true`
- ProgramDashboard detects flag and auto-opens `ProgramAdaptationChat` slide-out
- Slide-out uses new `stream-program-conversation` Lambda (dedicated program modification handler)
- Same slide-out can be triggered later via "Customize with Coach" button

### Flow 4: Managing Shared Programs

**User Journey:**

```
1. Navigate to "My Shared Programs" (from account menu)
2. See list of programs they've shared
3. Each card shows:
   - Program name
   - Share link (click to copy)
   - Created date
   - Simple stats: "X people have adapted this"
4. Actions per program:
   - Copy link again
   - Unshare (deactivates link)
   - View preview (see what others see)
```

**Note:** Deliberately minimal stats. No gamification, no leaderboards, no pressure.

---

## TrainingGrounds: Multiple Active Programs Design

### Current Behavior (Single Program Focus)

The `TrainingGrounds.jsx` component currently assumes a **single active program** per coach:

```javascript
// Current logic in TrainingGrounds.jsx
if (activeProgram) {
  // Show TodaysWorkoutCard + ActiveProgramSummary
} else if (programs && programs.length > 0) {
  // Show first program from list (already filtered to active/paused)
} else {
  // Show empty state
}
```

### Future Design: Multiple Active Programs

When users can have **multiple active training programs** (e.g., copying a shared program while already running one), the TrainingGrounds page needs to handle this gracefully.

#### Scenario 1: User Has Multiple Active Programs

**Display Strategy:**

```
Training Programs Section:
┌─────────────────────────────────────────────────────────┐
│ 🏋️ YOUR ACTIVE PROGRAMS (2)                             │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────────────┐│
│ │ Olympic Lifting     │  │ 5x5 Strength Builder       ││
│ │ Day 12 of 56       │  │ Day 3 of 30                ││
│ │ ━━━━━━━░░░░ 21%    │  │ ━░░░░░░░░░ 10%             ││
│ │ Today: Back Squats │  │ Today: Rest Day            ││
│ │ [View Program]     │  │ [View Program]             ││
│ └─────────────────────┘  └─────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Implementation Approach:**

1. **Primary Program Selection** - User designates one program as "primary" (shown prominently with Today's Workout)
2. **Secondary Programs** - Other active programs shown as compact cards
3. **Quick Switching** - Tap to switch primary program focus
4. **Warning on Copy** - Alert user when copying a shared program while already running one

#### Scenario 2: Today's Workout from Multiple Programs

**Display Strategy Options:**

**Option A: Primary Program Only** (Recommended for V1)

- Only show today's workout from the primary/selected program
- Other programs accessible via "View Program" links

**Option B: Combined View** (Future Enhancement)

- Show all today's workouts across programs
- Risk: Information overload, confusion about which program to follow

**Option C: Intelligent Merge** (Complex - Future)

- AI suggests how to combine workouts when both have training days
- "You have workouts in both programs today. Want me to combine them?"

#### Scenario 3: Rest Day Handling with Multiple Programs

If Program A has rest day but Program B has workout:

- Show Program B's workout prominently
- Note: "Program A: Rest Day"

If both programs have rest days:

- Show rest day celebration
- Allow completing rest for either/both programs

#### Implementation Plan

**Phase 1 (Current):** Single program focus

- `activeProgram` is the first active program found
- Works well for most users

**Phase 2 (After Sharing Stabilizes):** Multiple program awareness

- Add "primary program" concept to user preferences or coach config
- Update `TrainingGrounds` to show secondary programs in compact view
- Add warning when copying shared program while program is active

**Phase 3 (Future):** Smart program management

- AI-assisted workout scheduling across programs
- Conflict detection and resolution
- Combined progress tracking

#### API Changes Needed

**New endpoint or parameter:**

```
GET /users/{userId}/coaches/{coachId}/programs?status=active&includeToday=true
```

Returns:

```json
{
  "programs": [...],
  "todaysWorkouts": [
    { "programId": "...", "workout": {...} },
    { "programId": "...", "isRestDay": true }
  ]
}
```

**ProgramAgent Changes:**

- `loadPrograms()` already supports `includeStatus: ["active", "paused"]`
- Need to extend to load today's workout for each active program
- Consider batch API call for efficiency

#### UI Copy for Multiple Programs

**When copying shared program while program is active:**

```
"You already have an active program running. Copying this program will give
you two active programs to manage. You can switch between them anytime.

Continue? [Copy Program] [Cancel]"
```

**On TrainingGrounds with multiple programs:**

```
"You have 2 active programs. Tap a program to focus on it."
```

**When both programs have workouts today:**

```
"You have workouts scheduled in both programs today. Which would you like to
focus on? (You can complete both if you're feeling ambitious!)"
```

---

## Technical Architecture

### Data Model

**Reference:** Follows existing patterns from `amplify/functions/libs/program/types.ts`

```typescript
/**
 * SharedProgram entity - represents a program shared for public viewing
 * Pattern: Similar to CoachTemplate but user-owned
 */
export interface SharedProgram {
  sharedProgramId: string; // "sharedProgram_{creatorUserId}_{timestamp}_{shortId}"
  originalProgramId: string; // Reference to source program
  creatorUserId: string; // User who shared
  creatorUsername: string; // Display name for attribution on preview page

  // Frozen snapshot of program at share time (similar to CoachTemplate.base_config pattern)
  programSnapshot: {
    name: string;
    description: string;
    totalDays: number;
    trainingFrequency: number; // Days per week
    phases: ProgramPhase[];
    trainingGoals: string[];
    equipmentConstraints: string[];
    coachNames: string[]; // ["Coach Marcus"] - for "Created with Coach Marcus"
  };

  // S3 reference for full workout templates
  s3DetailKey: string; // "sharedPrograms/{creatorUserId}/{sharedProgramId}_{timestamp}.json"

  // Metadata
  isActive: boolean; // False = unshared/deactivated

  // DynamoDB timestamps (populated from database metadata, like other entities)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ProgramPhase - reuse existing type from program/types.ts
 * Included here for reference
 */
interface ProgramPhase {
  phaseId: string;
  name: string;
  description: string;
  startDay: number;
  endDay: number;
  durationDays: number;
  focusAreas: string[];
}
```

### DynamoDB Schema

**Reference:** Follows patterns from `amplify/dynamodb/operations.ts`

```
SharedProgram Entity:
  pk: sharedProgram#{sharedProgramId}
  sk: metadata
  entityType: sharedProgram         // Required for GSI-3 entity type queries
  createdAt: ISO timestamp          // Auto-populated by createDynamoDBItem
  updatedAt: ISO timestamp          // Auto-populated by saveToDynamoDB

  attributes: {
    sharedProgramId,
    originalProgramId,
    creatorUserId,
    creatorUsername,
    programSnapshot: {...},
    s3DetailKey,
    isActive
  }

gsi1 (Creator's Shared Programs):
  gsi1pk: user#{creatorUserId}
  gsi1sk: sharedProgram#{sharedProgramId}

  Use Case: List all programs a user has shared
  Query: gsi1pk = "user#abc123" AND begins_with(gsi1sk, "sharedProgram#")

// That's it - no other GSIs needed
```

**Why This Pattern:**

- Uses `sharedProgram#{id}` as pk for **direct public lookups** (no userId needed) - same pattern as CoachTemplate for publicly-accessible entities
- Uses gsi1 with `user#{userId}` prefix to query user's shared programs (matches existing patterns)
- Entity type `sharedProgram` follows camelCase convention (required for GSI-3 queries)
- Public lookup is the PRIMARY use case (every shared link click), so pk should enable direct access
- No marketplace GSIs (no discovery features)
- No stats tracking (views, copies, etc.)
- Just enough to support link sharing and user management

**Alternative Considered:** Using `pk: user#{userId}` pattern like other user-owned entities, but rejected because:

1. Public lookups would require parsing userId from sharedProgramId (fragile)
2. Public access is the primary use case (viral sharing)
3. CoachTemplate establishes precedent for public-access entities using non-user pk

### S3 Structure

**Reference:** Follows pattern from `amplify/functions/libs/program/s3-utils.ts`

```
sharedPrograms/
  {creatorUserId}/
    {sharedProgramId}_{timestamp}.json    # Full program snapshot with workout templates
```

**Example key:** `sharedPrograms/abc123/sharedProgram_abc123_1705312200000_x7k2m_2025-01-15T10-30-00-000Z.json`

**details.json Contents:**

```json
{
  "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m",
  "programSnapshot": {
    "name": "Olympic Lift Strength Builder",
    "description": "8-week program focusing on snatch and clean & jerk",
    "totalDays": 56,
    "trainingFrequency": 5,
    "phases": [],
    "trainingGoals": ["Increase snatch 1RM", "Improve technique"],
    "equipmentConstraints": ["barbell", "squat_rack", "bumper_plates"],
    "coachNames": ["Coach Marcus"]
  },
  "workoutTemplates": [
    {
      "templateId": "template_abc123_1705312200000_day1",
      "dayNumber": 1,
      "groupId": "group_abc123_1705312200000_wk1d1",
      "name": "Lower Body Strength",
      "description": "..."
    }
  ],
  "generationMetadata": {
    "sharedAt": "2025-01-15T10:30:00.000Z",
    "originalProgramId": "program_abc123_1704067200000_m3n8p"
  }
}
```

---

## API Endpoints

### Public Endpoints (No Auth Required)

```
GET /shared-programs/{sharedProgramId}
```

- Returns program snapshot for preview page
- Only returns safe, public-facing data
- Validates `isActive: true` before returning

**Response:**

```json
{
  "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m",
  "creatorUsername": "marcus_fitness",
  "programSnapshot": {
    "name": "Olympic Lift Strength Builder",
    "description": "8-week program...",
    "totalDays": 56,
    "trainingFrequency": 5,
    "phases": [
      {
        "phaseId": "phase_1",
        "name": "Base Building",
        "startDay": 1,
        "endDay": 28,
        "durationDays": 28,
        "focusAreas": ["Technique", "Volume building"]
      }
    ],
    "trainingGoals": ["Increase snatch 1RM"],
    "equipmentConstraints": ["barbell", "squat_rack"],
    "coachNames": ["Coach Marcus"]
  },
  "createdAt": "2025-01-15T10:30:00Z"
}
```

### Protected Endpoints (Auth Required)

```
POST /users/{userId}/programs/{programId}/share
```

- Creates SharedProgram from existing user program
- Copies program data to S3
- Returns shareable link

**Request Body:**

```json
{
  "includePersonalNotes": false
}
```

**Response:**

```json
{
  "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m",
  "shareUrl": "https://neonpanda.com/shared/programs/sharedProgram_abc123_1705312200000_x7k2m",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

```
GET /users/{userId}/shared-programs
```

- Lists all programs this user has shared
- Includes minimal stats (adaptation count)

```
DELETE /users/{userId}/shared-programs/{sharedProgramId}
```

- Soft delete (sets `isActive: false`)
- Link becomes inactive but data preserved
- Can be reactivated if needed

```
POST /users/{userId}/shared-programs/{sharedProgramId}/copy
```

- **Instantly copies** shared program to user's account
- Creates new Program with active status, day 1
- Returns new programId for immediate redirect to ProgramDashboard
- Program includes metadata for slide-out chat trigger

**Request Body:**

```json
{
  "coachId": "user_abc123_coach_1704067200000"
}
```

**Response:**

```json
{
  "programId": "program_abc123_1705312200000_x7k2m",
  "programName": "Olympic Lift Strength Builder",
  "coachId": "user_abc123_coach_1704067200000",
  "coachName": "Coach Marcus",
  "message": "Program copied successfully. Ready to start!"
}
```

**Note:** No separate adaptation endpoint needed. Adaptation happens via ProgramDashboard's slide-out chat component, which uses the new `stream-program-conversation` Lambda designed specifically for program modification conversations.

---

## Backend Implementation

### New Lambda Functions

**Reference Pattern:** Follow existing program and coach template patterns

| Function                      | Reference                           | Purpose                                      |
| ----------------------------- | ----------------------------------- | -------------------------------------------- |
| `create-shared-program`       | `create-coach-creator-session`      | Generate shareable link                      |
| `get-shared-program`          | `get-coach-template`                | Public preview data (no auth)                |
| `get-shared-programs`         | `get-coach-configs`                 | User's share management                      |
| `delete-shared-program`       | `delete-coach-config`               | Unshare/deactivate                           |
| `copy-shared-program`         | `create-coach-config-from-template` | **Instant copy to user account**             |
| `stream-program-conversation` | `stream-coach-conversation`         | **Stream coach chat for program adaptation** |

**Note on Architecture:**

- `stream-program-conversation` is a **NEW** Lambda handler dedicated to program modification conversations
- Unlike `stream-program-designer-session` (multi-phase program creation wizard), this handler is simpler:
  - Works with existing programs only
  - No wizard state management
  - Supports both "adaptation" (coach speaks first) and "customization" (user speaks first) modes
  - Can modify programs through conversational interface
- This separation keeps ProgramDesigner focused on creation, and program conversations focused on modification

### Lambda Permissions

**Reference:** `amplify/shared-policies.ts` and `amplify/backend.ts`

Each Lambda needs appropriate shared policies attached in `backend.ts`:

```typescript
// In amplify/backend.ts - add to appropriate policy groups:

// Functions needing DynamoDB READ/WRITE
[
  // ... existing functions ...
  backend.createSharedProgram,
  backend.deleteSharedProgram,
].forEach((func) => {
  sharedPolicies.attachDynamoDbReadWrite(func.resources.lambda);
});

// Functions needing DynamoDB READ-ONLY
[
  // ... existing functions ...
  backend.getSharedProgram, // Public endpoint - read only
  backend.getSharedPrograms, // List user's shares - read only
].forEach((func) => {
  sharedPolicies.attachDynamoDbReadOnly(func.resources.lambda);
});

// Functions needing S3 Apps bucket access (for shared program details)
[
  // ... existing functions ...
  backend.createSharedProgram, // Write shared program details to S3
  backend.getSharedProgram, // Read shared program details from S3
].forEach((func) => {
  sharedPolicies.attachS3AppsAccess(func.resources.lambda);
});
```

### Lambda Handler Patterns

**Protected Endpoint Pattern (with auth):**

```typescript
// Reference: amplify/functions/get-program/handler.ts
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";

const baseHandler: AuthenticatedHandler = async (event) => {
  try {
    const userId = event.user.userId; // Auth validated by middleware
    // ... handler logic ...
    return createOkResponse({ data });
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse(500, "Internal server error", error);
  }
};

export const handler = withAuth(baseHandler);
```

**Public Endpoint Pattern (no auth):**

```typescript
// Reference: amplify/functions/get-coach-template/handler.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const sharedProgramId = event.pathParameters?.sharedProgramId;
    if (!sharedProgramId) {
      return createErrorResponse(400, "sharedProgramId is required");
    }

    // No auth check - public access
    const sharedProgram = await getSharedProgram(sharedProgramId);

    if (!sharedProgram || !sharedProgram.isActive) {
      return createErrorResponse(404, "Shared program not found");
    }

    return createOkResponse({ sharedProgram });
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse(500, "Internal server error");
  }
};
```

### Lambda Resource Definition

**Reference:** `amplify/functions/get-coach-template/resource.ts`

```typescript
// amplify/functions/get-shared-program/resource.ts
import { defineFunction } from "@aws-amplify/backend";

export const getSharedProgram = defineFunction({
  name: "get-shared-program",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 256,
});
```

### Key Implementation: Instant Copy + Coach Chat

**Architecture Decision:** Program copies immediately (like `CoachTemplate → Coach`), then ProgramDashboard triggers slide-out chat for optional adaptation.

**Core Function:** `copySharedProgram()` in `copy-shared-program/handler.ts`

```typescript
// Reference: amplify/functions/create-coach-config-from-template/handler.ts

import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import {
  getSharedProgram,
  getCoachConfig,
  saveProgram,
} from "../../dynamodb/operations";
import { getSharedProgramDetailsFromS3 } from "../libs/shared-program/s3-utils";
import { storeProgramDetailsInS3 } from "../libs/program/s3-utils";
import { Program, ProgramPhase } from "../libs/program/types";

const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;
  const sharedProgramId = event.pathParameters?.sharedProgramId;
  const { coachId } = JSON.parse(event.body || "{}");

  if (!sharedProgramId || !coachId) {
    return createErrorResponse(400, "sharedProgramId and coachId are required");
  }

  try {
    // 1. Get shared program metadata
    const sharedProgram = await getSharedProgram(sharedProgramId);
    if (!sharedProgram || !sharedProgram.isActive) {
      return createErrorResponse(404, "Shared program not found or inactive");
    }

    // 2. Get shared program details from S3 (includes workout templates)
    const sharedDetails = await getSharedProgramDetailsFromS3(
      sharedProgram.s3DetailKey,
    );
    if (!sharedDetails) {
      return createErrorResponse(404, "Shared program details not found");
    }

    // 3. Get coach for attribution
    const coachConfig = await getCoachConfig(userId, coachId);
    if (!coachConfig) {
      return createErrorResponse(404, "Coach not found");
    }

    // 4. Generate new program ID
    const timestamp = Date.now();
    const shortId = Math.random().toString(36).substring(2, 11);
    const newProgramId = `program_${userId}_${timestamp}_${shortId}`;

    // 5. Calculate start/end dates
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(
      today.getTime() +
        sharedProgram.programSnapshot.totalDays * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];

    // 6. Create new program with copy metadata
    const newProgram: Program = {
      programId: newProgramId,
      userId,
      coachIds: [coachId],
      coachNames: [coachConfig.coach_name],

      // Copy program definition from snapshot
      name: sharedProgram.programSnapshot.name,
      description: sharedProgram.programSnapshot.description,
      status: "active",

      // Timeline - starts today at day 1
      startDate,
      endDate,
      totalDays: sharedProgram.programSnapshot.totalDays,
      currentDay: 1,

      // Pause tracking - fresh start
      pausedAt: null,
      pausedDuration: 0,

      // Copy program structure
      phases: sharedProgram.programSnapshot.phases,
      equipmentConstraints: sharedProgram.programSnapshot.equipmentConstraints,
      trainingGoals: sharedProgram.programSnapshot.trainingGoals,
      trainingFrequency: sharedProgram.programSnapshot.trainingFrequency,

      // Analytics - fresh start
      totalWorkouts: sharedDetails.workoutTemplates.length,
      completedWorkouts: 0,
      skippedWorkouts: 0,
      completedRestDays: 0,
      adherenceRate: 0,
      lastActivityAt: null,

      // S3 reference (will be set after storing)
      s3DetailKey: "",

      // Empty adaptation log (fresh program)
      adaptationLog: [],
      dayCompletionStatus: {},

      // CRITICAL: Copy metadata for slide-out chat trigger
      metadata: {
        copiedFromSharedProgram: true,
        sharedProgramId: sharedProgram.sharedProgramId,
        sourceCreator: sharedProgram.creatorUsername,
        sourceCoachNames: sharedProgram.programSnapshot.coachNames,
        adaptationReviewed: false, // Triggers slide-out on first ProgramDashboard view
        copiedAt: new Date().toISOString(),
      },
    };

    // 7. Copy workout templates to user's S3 location
    const s3DetailKey = await storeProgramDetailsInS3(newProgramId, userId, {
      programId: newProgramId,
      workoutTemplates: sharedDetails.workoutTemplates,
    });
    newProgram.s3DetailKey = s3DetailKey;

    // 8. Save program to DynamoDB
    await saveProgram(newProgram);

    console.info("Shared program copied successfully:", {
      sharedProgramId,
      newProgramId,
      userId,
      coachId,
      sourceCreator: sharedProgram.creatorUsername,
    });

    return createOkResponse({
      programId: newProgramId,
      programName: newProgram.name,
      coachId,
      coachName: coachConfig.coach_name,
      message: "Program copied successfully. Ready to start!",
    });
  } catch (error) {
    console.error("Error copying shared program:", error);
    return createErrorResponse(500, "Failed to copy program", error);
  }
};

export const handler = withAuth(baseHandler);
```

**Program Metadata Fields for Copy Tracking:**

```typescript
// Add to Program interface in libs/program/types.ts
interface Program {
  // ... existing fields ...

  // Optional metadata for copied programs
  metadata?: {
    // Shared program copy tracking
    copiedFromSharedProgram?: boolean; // True if this was copied from a shared program
    sharedProgramId?: string; // Source shared program ID
    sourceCreator?: string; // Username of original creator
    sourceCoachNames?: string[]; // Original coach names for attribution
    adaptationReviewed?: boolean; // False = trigger slide-out on first view
    copiedAt?: string; // ISO timestamp of copy

    // Future: Could track customization history
    adaptationHistory?: Array<{
      timestamp: string;
      changeType: string;
      description: string;
    }>;
  };
}
```

**Why This Pattern:**

- Mirrors `createCoachConfigFromTemplate` - instant copy, user owns immediately
- No complex session management
- Program exists in user's account with all workout templates
- `adaptationReviewed: false` flag triggers slide-out chat on first view
- Same metadata pattern extensible for existing program customization

### S3 Operations

**Reference:** `amplify/functions/libs/program/s3-utils.ts`

```typescript
import { getObjectAsJson, putObjectAsJson } from "../s3-utils";
import { SharedProgram } from "./types";
import { ProgramDetails } from "../program/types";

/**
 * Store shared program details in S3
 * Pattern: Follows storeProgramDetailsInS3 from libs/program/s3-utils.ts
 */
export async function storeSharedProgramDetailsInS3(
  sharedProgramId: string,
  creatorUserId: string,
  originalProgramDetails: ProgramDetails,
  programSnapshot: SharedProgram["programSnapshot"],
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  // S3 key structure: sharedPrograms/{creatorUserId}/{sharedProgramId}_{timestamp}.json
  const key = `sharedPrograms/${creatorUserId}/${sharedProgramId}_${timestamp}.json`;

  const sharedProgramDetails = {
    sharedProgramId,
    programSnapshot,
    workoutTemplates: originalProgramDetails.workoutTemplates,
    generationMetadata: {
      sharedAt: new Date().toISOString(),
      originalProgramId: originalProgramDetails.programId,
    },
  };

  await putObjectAsJson(key, sharedProgramDetails, {
    pretty: true,
    metadata: {
      sharedProgramId,
      creatorUserId,
      sharedAt: new Date().toISOString(),
    },
  });

  console.info("Successfully stored shared program details in S3:", {
    key,
    sharedProgramId,
    creatorUserId,
    templateCount: originalProgramDetails.workoutTemplates.length,
  });

  return key;
}

/**
 * Retrieve shared program details from S3
 */
export async function getSharedProgramDetailsFromS3(
  s3Key: string,
): Promise<any | null> {
  try {
    const details = await getObjectAsJson(s3Key);
    console.info("Successfully retrieved shared program details from S3:", {
      key: s3Key,
      sharedProgramId: details.sharedProgramId,
    });
    return details;
  } catch (error) {
    console.error("Failed to retrieve shared program details from S3:", {
      error,
      key: s3Key,
    });
    return null;
  }
}
```

### DynamoDB Operations

**Reference:** `amplify/dynamodb/operations.ts` - follows CoachTemplate and Program patterns

```typescript
import {
  createDynamoDBItem,
  saveToDynamoDB,
  loadFromDynamoDB,
  queryFromDynamoDB,
} from "../../dynamodb/operations";
import { SharedProgram } from "./types";
import { Program } from "../program/types";
import { getUserProfile } from "../../dynamodb/operations";
import { getProgramDetailsFromS3 } from "../program/s3-utils";
import { storeSharedProgramDetailsInS3 } from "./s3-utils";

/**
 * Save a shared program to DynamoDB
 * Pattern: Follows saveProgram from operations.ts
 */
export async function saveSharedProgram(
  sharedProgram: SharedProgram,
): Promise<void> {
  const item = createDynamoDBItem<SharedProgram>(
    "sharedProgram",
    `sharedProgram#${sharedProgram.sharedProgramId}`,
    "metadata",
    sharedProgram,
    new Date().toISOString(),
  );

  // Add gsi1 keys for querying by creator
  const itemWithGsi = {
    ...item,
    gsi1pk: `user#${sharedProgram.creatorUserId}`,
    gsi1sk: `sharedProgram#${sharedProgram.sharedProgramId}`,
  };

  await saveToDynamoDB(itemWithGsi);

  console.info("Shared program saved successfully:", {
    sharedProgramId: sharedProgram.sharedProgramId,
    creatorUserId: sharedProgram.creatorUserId,
    originalProgramId: sharedProgram.originalProgramId,
    programName: sharedProgram.programSnapshot.name,
  });
}

/**
 * Get a shared program by ID (public access - no userId required)
 * Pattern: Follows getCoachTemplate from operations.ts
 */
export async function getSharedProgram(
  sharedProgramId: string,
): Promise<SharedProgram | null> {
  const item = await loadFromDynamoDB<SharedProgram>(
    `sharedProgram#${sharedProgramId}`,
    "metadata",
    "sharedProgram",
  );

  if (!item) {
    return null;
  }

  // Check if active before returning
  if (!item.attributes.isActive) {
    console.info("Shared program found but inactive:", { sharedProgramId });
    return null;
  }

  return {
    ...item.attributes,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Query all shared programs for a user
 * Pattern: Follows queryPrograms using gsi1 from operations.ts
 */
export async function querySharedPrograms(
  userId: string,
): Promise<SharedProgram[]> {
  const tableName = getTableName();

  const result = await withThroughputScaling(async () => {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi1",
      KeyConditionExpression:
        "gsi1pk = :gsi1pk AND begins_with(gsi1sk, :gsi1sk_prefix)",
      FilterExpression: "#entityType = :entityType",
      ExpressionAttributeNames: {
        "#entityType": "entityType",
      },
      ExpressionAttributeValues: {
        ":gsi1pk": `user#${userId}`,
        ":gsi1sk_prefix": "sharedProgram#",
        ":entityType": "sharedProgram",
      },
    });

    return docClient.send(command);
  }, `Query shared programs for user ${userId}`);

  const items = (result.Items || []) as DynamoDBItem<SharedProgram>[];

  // Filter to only active shared programs and deserialize
  const activePrograms = items
    .filter((item) => item.attributes.isActive)
    .map((item) => ({
      ...item.attributes,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));

  console.info("User shared programs queried successfully:", {
    userId,
    totalFound: items.length,
    activeCount: activePrograms.length,
  });

  return activePrograms;
}

/**
 * Create a shared program from an existing program
 * Pattern: Follows createCoachConfigFromTemplate from operations.ts
 */
export async function createSharedProgram(
  userId: string,
  programId: string,
  coachId: string,
): Promise<SharedProgram> {
  // 1. Get user profile for username
  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    throw new Error(`User profile not found: ${userId}`);
  }

  // 2. Get the original program
  const program = await getProgram(userId, coachId, programId);
  if (!program) {
    throw new Error(`Program not found: ${programId}`);
  }

  // 3. Verify program can be shared (active or completed only)
  if (program.status === "archived") {
    throw new Error(
      `Cannot share an archived program. Only active or completed programs can be shared. Current status: ${program.status}`,
    );
  }

  // 4. Get program details from S3
  const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);
  if (!programDetails) {
    throw new Error(`Program details not found in S3: ${program.s3DetailKey}`);
  }

  // 5. Generate shared program ID
  const timestamp = Date.now();
  const shortId = Math.random().toString(36).substring(2, 11);
  const sharedProgramId = `sharedProgram_${userId}_${timestamp}_${shortId}`;

  // 6. Create program snapshot
  const programSnapshot: SharedProgram["programSnapshot"] = {
    name: program.name,
    description: program.description,
    totalDays: program.totalDays,
    trainingFrequency: program.trainingFrequency,
    phases: program.phases,
    trainingGoals: program.trainingGoals,
    equipmentConstraints: program.equipmentConstraints,
    coachNames: program.coachNames,
  };

  // 7. Copy program details to shared S3 location
  const s3DetailKey = await storeSharedProgramDetailsInS3(
    sharedProgramId,
    userId,
    programDetails,
    programSnapshot,
  );

  // 8. Create SharedProgram entity
  const sharedProgram: SharedProgram = {
    sharedProgramId,
    originalProgramId: programId,
    creatorUserId: userId,
    creatorUsername: userProfile.username,
    programSnapshot,
    s3DetailKey,
    isActive: true,
  };

  // 9. Save to DynamoDB
  await saveSharedProgram(sharedProgram);

  console.info("Shared program created successfully:", {
    sharedProgramId,
    originalProgramId: programId,
    creatorUserId: userId,
    creatorUsername: userProfile.username,
    programName: programSnapshot.name,
  });

  return sharedProgram;
}

/**
 * Deactivate a shared program (soft delete)
 * Pattern: Follows updateCoachConfig pattern from operations.ts
 */
export async function deactivateSharedProgram(
  userId: string,
  sharedProgramId: string,
): Promise<void> {
  // 1. Get the shared program
  const sharedProgram = await getSharedProgram(sharedProgramId);
  if (!sharedProgram) {
    throw new Error(`Shared program not found: ${sharedProgramId}`);
  }

  // 2. Verify ownership
  if (sharedProgram.creatorUserId !== userId) {
    throw new Error("Unauthorized: You can only unshare your own programs");
  }

  // 3. Load the full DynamoDB item for update
  const existingItem = await loadFromDynamoDB<SharedProgram>(
    `sharedProgram#${sharedProgramId}`,
    "metadata",
    "sharedProgram",
  );

  if (!existingItem) {
    throw new Error(`Shared program not found: ${sharedProgramId}`);
  }

  // 4. Update isActive to false
  const updatedItem = {
    ...existingItem,
    attributes: {
      ...existingItem.attributes,
      isActive: false,
    },
    updatedAt: new Date().toISOString(),
    // Preserve gsi keys
    gsi1pk: `user#${userId}`,
    gsi1sk: `sharedProgram#${sharedProgramId}`,
  };

  await saveToDynamoDB(updatedItem, true /* requireExists */);

  console.info("Shared program deactivated successfully:", {
    sharedProgramId,
    userId,
  });
}
```

---

## Frontend Implementation

### New Components

**File Structure:**

```
src/
  components/
    shared-programs/
      ShareProgramModal.jsx          # Share button → link generation
      SharedProgramPreview.jsx       # Public preview page
      MySharedPrograms.jsx           # User's share management
      ProgramAttribution.jsx         # "Based on program by @user"
  utils/
    apis/
      sharedProgramApi.js            # API wrapper functions
```

### Frontend Patterns Reference

**Loading/Error State Pattern:**

```jsx
// Reference: src/components/programs/ManagePrograms.jsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// Loading state
if (loading) {
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    </div>
  );
}

// Error state
if (error) {
  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={containerPatterns.cardMedium}>
        <p className="text-red-400">{error}</p>
        <button onClick={retry} className={buttonPatterns.secondary}>
          Try Again
        </button>
      </div>
    </div>
  );
}
```

**API Config Pattern:**

```javascript
// Reference: src/utils/apis/apiConfig.js
import { getApiUrl, authenticatedFetch } from "./apiConfig.js";

// Public endpoint (no auth required)
const response = await fetch(`${getApiUrl("")}/shared-programs/${id}`, {
  method: "GET",
  headers: { "Content-Type": "application/json" },
});

// Protected endpoint (with auth)
const response = await authenticatedFetch(
  `${getApiUrl("")}/users/${userId}/shared-programs`,
  { method: "GET" },
);
```

**Toast/Notification Pattern:**

```jsx
// For "Link copied!" feedback - use existing notification system
// Reference: Check if useToast hook exists, otherwise use simple state
const [copied, setCopied] = useState(false);

const handleCopyLink = () => {
  navigator.clipboard.writeText(shareUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

// In JSX:
<button onClick={handleCopyLink} className={buttonPatterns.secondary}>
  {copied ? "Copied! ✓" : "Copy Link"}
</button>;
```

### ShareProgramModal.jsx

**Reference Pattern:** Modal patterns from `src/components/CoachCreator.jsx`

```jsx
import React, { useState } from "react";
import { createSharedProgram } from "../../utils/apis/sharedProgramApi";
import {
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";

function ShareProgramModal({ program, userId, onClose }) {
  const [shareUrl, setShareUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const result = await createSharedProgram(userId, program.programId);
      setShareUrl(result.shareUrl);
    } catch (error) {
      console.error("Failed to create share link:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSocialShare = (platform) => {
    const text = `Just crushed this program on @NeonPanda! Check it out:`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    };
    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  return (
    <div className={containerPatterns.modal}>
      <div className={containerPatterns.cardMedium}>
        <h2 className={typographyPatterns.heading2}>Share Your Success</h2>
        <p className={typographyPatterns.body}>
          Generate a shareable link for "{program.name}". Anyone with the link
          can preview it and adapt it with their AI coach.
        </p>

        {!shareUrl ? (
          <button
            onClick={handleGenerateLink}
            className={buttonPatterns.primary}
            disabled={loading}
          >
            {loading ? "Generating..." : "Create Share Link"}
          </button>
        ) : (
          <div className="share-options">
            <div className="share-link-container">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="share-link-input"
              />
              <button
                onClick={handleCopyLink}
                className={buttonPatterns.secondary}
              >
                {copied ? "Copied! ✓" : "Copy Link"}
              </button>
            </div>

            <div className="social-share-buttons">
              <button
                onClick={() => handleSocialShare("twitter")}
                className={buttonPatterns.secondary}
              >
                Share on Twitter
              </button>
              <button
                onClick={() => handleSocialShare("facebook")}
                className={buttonPatterns.secondary}
              >
                Share on Facebook
              </button>
            </div>
          </div>
        )}

        <button onClick={onClose} className={buttonPatterns.ghost}>
          Close
        </button>
      </div>
    </div>
  );
}

export default ShareProgramModal;
```

**Styling Notes:**

- Use `containerPatterns.modal` for overlay
- Use `containerPatterns.cardMedium` for modal content
- Share link input: cyan border on focus, pink glow on copy success
- Copy button: Brief neon pulse animation on success

### SharedProgramPreview.jsx

**Reference Pattern:** `src/components/programs/ProgramDashboard.jsx` layout

**Key Change:** Uses instant copy flow, not separate adaptation route.

```jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSharedProgram,
  copySharedProgram,
} from "../../utils/apis/sharedProgramApi";
import { getCoachConfigs } from "../../utils/apis/coachApi";
import { useAuth } from "../../contexts/AuthContext";
import CoachSelectionModal from "./CoachSelectionModal";
import {
  layoutPatterns,
  containerPatterns,
  buttonPatterns,
  badgePatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";

function SharedProgramPreview() {
  const { sharedProgramId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [showCoachSelection, setShowCoachSelection] = useState(false);
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    loadSharedProgram();
  }, [sharedProgramId]);

  const loadSharedProgram = async () => {
    try {
      const data = await getSharedProgram(sharedProgramId);
      setProgram(data);
    } catch (error) {
      console.error("Failed to load shared program:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle "Get This Program" button click
  const handleGetProgram = async () => {
    if (!user) {
      // Redirect to signup with return URL (back to this preview)
      navigate(`/signup?redirect=/shared/programs/${sharedProgramId}`);
      return;
    }

    // Load user's coaches to determine flow
    try {
      const coachList = await getCoachConfigs(user.userId);
      setCoaches(coachList);

      if (coachList.length === 0) {
        // No coaches - redirect to coach creation with return context
        navigate(
          `/coach-creator?returnTo=/shared/programs/${sharedProgramId}&context=shared-program`,
        );
        return;
      }

      if (coachList.length === 1) {
        // Single coach - skip selection, copy directly
        await handleCopyWithCoach(coachList[0].coach_id);
      } else {
        // Multiple coaches - show selection modal
        setShowCoachSelection(true);
      }
    } catch (error) {
      console.error("Failed to load coaches:", error);
    }
  };

  // Perform the actual copy and redirect
  const handleCopyWithCoach = async (coachId) => {
    try {
      setCopying(true);
      setShowCoachSelection(false);

      // Call copy API - program is instantly created
      const result = await copySharedProgram(
        user.userId,
        sharedProgramId,
        coachId,
      );

      // Redirect to ProgramDashboard for the new program
      // ProgramDashboard will auto-open the adaptation slide-out
      navigate(
        `/training-grounds/programs/dashboard?userId=${user.userId}&coachId=${coachId}&programId=${result.programId}`,
      );
    } catch (error) {
      console.error("Failed to copy program:", error);
      setCopying(false);
      // TODO: Show error toast
    }
  };

  const handleCoachSelected = (coachId) => {
    handleCopyWithCoach(coachId);
  };

  const handleCreateNewCoach = () => {
    setShowCoachSelection(false);
    navigate(
      `/coach-creator?returnTo=/shared/programs/${sharedProgramId}&context=shared-program`,
    );
  };

  if (loading) return <div>Loading...</div>;
  if (!program) return <div>Program not found</div>;

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header */}
        <div className={`${containerPatterns.cardLarge} p-8 mb-6`}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-3 h-3 bg-synthwave-neon-pink rounded-full mt-2 animate-pulse" />
            <div>
              <h1 className="font-russo text-3xl md:text-4xl text-white uppercase tracking-wider">
                {program.programSnapshot.name}
              </h1>
              {/* Attribution */}
              <p className="text-synthwave-neon-cyan font-rajdhani text-lg mt-1">
                Program by @{program.creatorUsername}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-synthwave-text-secondary font-rajdhani text-lg leading-relaxed mb-6">
            {program.programSnapshot.description}
          </p>

          {/* Key Stats */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className={`${badgePatterns.cyan} px-3 py-1`}>
              {program.programSnapshot.totalDays} days
            </div>
            <div className={`${badgePatterns.cyan} px-3 py-1`}>
              {program.programSnapshot.trainingFrequency}x per week
            </div>
            {program.programSnapshot.equipmentConstraints?.length > 0 && (
              <div className={`${badgePatterns.purple} px-3 py-1`}>
                Equipment:{" "}
                {program.programSnapshot.equipmentConstraints
                  .slice(0, 3)
                  .join(", ")}
                {program.programSnapshot.equipmentConstraints.length > 3 &&
                  "..."}
              </div>
            )}
          </div>

          {/* Training Goals */}
          {program.programSnapshot.trainingGoals?.length > 0 && (
            <div className="mb-8">
              <h3 className="font-russo text-lg text-white uppercase tracking-wide mb-3">
                Training Goals
              </h3>
              <ul className="space-y-2">
                {program.programSnapshot.trainingGoals.map((goal, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-synthwave-text-secondary font-rajdhani"
                  >
                    <span className="text-synthwave-neon-cyan mt-1">•</span>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA - Primary action */}
          <button
            onClick={handleGetProgram}
            className={`${buttonPatterns.heroCTA} w-full sm:w-auto`}
            disabled={copying}
          >
            {copying ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Copying to your account...
              </span>
            ) : user ? (
              "Get This Program"
            ) : (
              "Sign Up to Get This Program"
            )}
          </button>
        </div>

        {/* Phase Breakdown */}
        <div className={`${containerPatterns.cardMedium} p-6 mb-6`}>
          <h2 className="font-russo text-xl text-white uppercase tracking-wide mb-4">
            Program Structure
          </h2>
          <div className="space-y-4">
            {program.programSnapshot.phases.map((phase, index) => (
              <div
                key={phase.phaseId || index}
                className="bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/10 rounded-lg p-4"
              >
                <h3 className="font-russo text-synthwave-neon-cyan uppercase tracking-wide text-sm mb-1">
                  Phase {index + 1}: {phase.name}
                </h3>
                <div className="text-synthwave-text-muted font-rajdhani text-sm mb-2">
                  Days {phase.startDay}-{phase.endDay} ({phase.durationDays}{" "}
                  days)
                </div>
                <div className="text-synthwave-text-secondary font-rajdhani">
                  Focus: {phase.focusAreas?.join(", ") || phase.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-center text-synthwave-text-muted font-rajdhani text-sm opacity-70">
          Full workout details available after getting this program
        </p>
      </div>

      {/* Coach Selection Modal */}
      {showCoachSelection && (
        <CoachSelectionModal
          userId={user.userId}
          sharedProgram={program}
          coaches={coaches}
          onSelect={handleCoachSelected}
          onCreateNew={handleCreateNewCoach}
          onClose={() => setShowCoachSelection(false)}
        />
      )}
    </div>
  );
}

export default SharedProgramPreview;
```

**Styling Notes:**

- Dark background with neon accents (works for non-logged-in users)
- `containerPatterns.cardLarge` for main section with padding
- Phase cards use subtle glassmorphism subcontainer pattern
- CTA uses `buttonPatterns.heroCTA` for maximum conversion
- Loading state on CTA button during copy operation
- Attribution prominently displayed in cyan

### MySharedPrograms.jsx

**Reference Pattern:** `src/components/programs/ManagePrograms.jsx` layout

```jsx
import React, { useEffect, useState } from "react";
import {
  querySharedPrograms,
  deactivateSharedProgram,
} from "../../utils/apis/sharedProgramApi";
import { useAuth } from "../../contexts/AuthContext";
import {
  layoutPatterns,
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";

function MySharedPrograms() {
  const { user } = useAuth();
  const [sharedPrograms, setSharedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedPrograms();
  }, []);

  const loadSharedPrograms = async () => {
    try {
      const programs = await querySharedPrograms(user.userId);
      setSharedPrograms(programs);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (sharedProgramId) => {
    const shareUrl = `${window.location.origin}/shared/programs/${sharedProgramId}`;
    navigator.clipboard.writeText(shareUrl);
    // Show brief success notification
  };

  const handleUnshare = async (sharedProgramId) => {
    if (!confirm("Are you sure? This will deactivate the share link.")) return;

    try {
      await deactivateSharedProgram(user.userId, sharedProgramId);
      loadSharedPrograms(); // Refresh list
    } catch (error) {
      console.error("Failed to unshare:", error);
    }
  };

  const handleViewPreview = (sharedProgramId) => {
    window.open(`/shared/programs/${sharedProgramId}`, "_blank");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={layoutPatterns.pageContainer}>
      <h1 className={typographyPatterns.heroTitle}>My Shared Programs</h1>

      {sharedPrograms.length === 0 ? (
        <div className={containerPatterns.cardMedium}>
          <p className={typographyPatterns.body}>
            You haven't shared any programs yet. Complete a program and share
            your success!
          </p>
        </div>
      ) : (
        <div className="programs-grid">
          {sharedPrograms.map((shared) => (
            <div
              key={shared.sharedProgramId}
              className={containerPatterns.cardMedium}
            >
              <h3 className={typographyPatterns.heading3}>
                {shared.programSnapshot.name}
              </h3>
              <div className={typographyPatterns.caption}>
                Shared on {new Date(shared.createdAt).toLocaleDateString()}
              </div>

              <div className="share-link-preview">
                <input
                  type="text"
                  value={`${window.location.origin}/shared/programs/${shared.sharedProgramId}`}
                  readOnly
                  className="share-link-input"
                />
                <button
                  onClick={() => handleCopyLink(shared.sharedProgramId)}
                  className={buttonPatterns.secondary}
                >
                  Copy Link
                </button>
              </div>

              <div className="action-buttons">
                <button
                  onClick={() => handleViewPreview(shared.sharedProgramId)}
                  className={buttonPatterns.secondary}
                >
                  View Preview
                </button>
                <button
                  onClick={() => handleUnshare(shared.sharedProgramId)}
                  className={buttonPatterns.ghost}
                >
                  Unshare
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MySharedPrograms;
```

### ProgramAdaptationChat.jsx (Slide-out Component)

**Architecture Decision:** Create a reusable slide-out chat component that:

1. Opens automatically when viewing a newly-copied shared program
2. Can be manually triggered via "Customize with Coach" button on ANY program
3. Reuses existing `ProgramDesigner` streaming infrastructure

**Why Slide-out Pattern:**

- Keeps user on ProgramDashboard (context preserved)
- Non-destructive: program exists regardless of chat engagement
- Same component works for shared program adaptation AND existing program customization
- Lower friction than navigating to separate page
- Uses dedicated `stream-program-conversation` Lambda (simpler than ProgramDesigner wizard)

**Key Implementation Details:**

| Aspect              | Shared Program Adaptation                     | Existing Program Customization            |
| ------------------- | --------------------------------------------- | ----------------------------------------- |
| Trigger             | Auto-opens on first ProgramDashboard view     | User clicks "Customize with Coach" button |
| Mode                | `adaptation-new-copy`                         | `program-customization`                   |
| Coach First Message | Proactive analysis + suggestions              | Asks what user wants to change            |
| Context             | Source program snapshot + creator attribution | Current program state                     |

**Reference Files:**

- `src/components/ProgramDesigner.jsx` - Streaming chat UI patterns (for reference)
- `src/components/CoachConversation.jsx` - Streaming conversation UI (closer pattern match)
- `src/utils/ui/uiPatterns.js` - Container patterns for slide-out
- `amplify/functions/stream-coach-conversation/handler.ts` - Reference for streaming pattern
- **NEW:** `amplify/functions/stream-program-conversation/handler.ts` - Dedicated program conversation handler

**Slide-out Container Pattern:**

```jsx
// src/components/shared/SlideOutPanel.jsx
// Reference: Add to uiPatterns.js

export const slideOutPatterns = {
  // Overlay backdrop
  overlay:
    "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",

  // Slide-out panel container (right side)
  panel:
    "fixed top-0 right-0 h-full w-full max-w-2xl bg-synthwave-bg-primary border-l border-synthwave-neon-cyan/20 shadow-2xl shadow-synthwave-neon-cyan/10 z-50 transform transition-transform duration-300 ease-out",

  // Panel header
  header:
    "flex items-center justify-between px-6 py-4 border-b border-synthwave-neon-cyan/20 bg-synthwave-bg-card/30",

  // Panel content area (scrollable)
  content: "flex flex-col h-[calc(100%-80px)] overflow-hidden",
};
```

**Implementation:**

```jsx
// src/components/shared-programs/ProgramAdaptationChat.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { createProgramConversation } from "../../utils/apis/programConversationApi";
import ChatInput from "../shared/ChatInput";
import {
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import { XIcon } from "../themes/SynthwaveComponents";
import { parseMarkdown } from "../../utils/markdownParser.jsx";

/**
 * ProgramAdaptationChat - Slide-out panel for program customization
 *
 * DUAL PURPOSE:
 * 1. Shared Program Adaptation: Auto-opens when user first views a copied shared program
 * 2. Program Customization: Opens when user clicks "Customize with Coach" on any program
 *
 * @param {Object} props
 * @param {Object} props.program - The program being adapted/customized
 * @param {string} props.userId - Current user ID
 * @param {string} props.coachId - Selected coach ID
 * @param {boolean} props.isOpen - Controls slide-out visibility
 * @param {Function} props.onClose - Called when user closes slide-out
 * @param {Function} props.onProgramUpdated - Called when program is modified
 * @param {'adaptation-new-copy' | 'program-customization'} props.mode - Determines behavior
 */
function ProgramAdaptationChat({
  program,
  userId,
  coachId,
  isOpen,
  onClose,
  onProgramUpdated,
  mode = "program-customization",
}) {
  // State - mirrors ProgramDesigner.jsx
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentState, setAgentState] = useState({
    messages: [],
    isTyping: false,
    isStreaming: false,
    coachName: null,
    coachAvatar: null,
  });

  const agentRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Create session on mount
  useEffect(() => {
    if (isOpen && program && coachId) {
      initializeSession();
    }

    return () => {
      // Cleanup agent on unmount
      if (agentRef.current) {
        agentRef.current.destroy?.();
      }
    };
  }, [isOpen, program?.programId, coachId]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build context based on mode
      const conversationContext = buildConversationContext();

      // Create program conversation session
      const conversation = await createProgramConversation(userId, coachId, {
        programId: program.programId,
        ...conversationContext,
      });

      setSessionId(conversation.conversationId);

      // Initialize streaming conversation (simpler than ProgramDesigner wizard)
      // Pattern follows CoachConversation rather than ProgramDesigner
      // TODO: Create ProgramConversationAgent or use simplified streaming pattern
    } catch (err) {
      console.error("Failed to initialize adaptation session:", err);
      setError("Failed to start conversation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const buildConversationContext = () => {
    if (mode === "adaptation-new-copy") {
      return {
        mode: "adaptation",
        sourceCreator: program.metadata?.sourceCreator,
        sourceCoachNames: program.metadata?.sourceCoachNames,
        sharedProgramId: program.metadata?.sharedProgramId,
        // Tell coach to speak first with proactive analysis
        coachSpeaksFirst: true,
      };
    } else {
      return {
        mode: "customization",
        // Coach waits for user to describe what they want
        coachSpeaksFirst: false,
      };
    }
  };

  const handleSendMessage = useCallback(async (message) => {
    if (!agentRef.current || !message.trim()) return;

    try {
      await agentRef.current.sendMessage(message);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, []);

  const handleClose = () => {
    // If this was a shared program adaptation, mark as reviewed
    if (
      mode === "adaptation-new-copy" &&
      program.metadata?.copiedFromSharedProgram
    ) {
      // This will be handled by ProgramDashboard calling API to update metadata
      onProgramUpdated?.({ adaptationReviewed: true });
    }
    onClose();
  };

  // Render header based on mode
  const renderHeader = () => (
    <div className="flex items-center justify-between px-6 py-4 border-b border-synthwave-neon-cyan/20 bg-synthwave-bg-card/30">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-pulse" />
        <div>
          <h2 className="font-russo text-lg text-white">
            {mode === "adaptation-new-copy"
              ? "Adapt This Program"
              : "Customize with Coach"}
          </h2>
          <p className="text-sm text-synthwave-text-secondary font-rajdhani">
            {program.name}
            {mode === "adaptation-new-copy" &&
              program.metadata?.sourceCreator && (
                <span className="ml-2 text-synthwave-neon-cyan">
                  from @{program.metadata.sourceCreator}
                </span>
              )}
          </p>
        </div>
      </div>

      <button
        onClick={handleClose}
        className="p-2 text-synthwave-text-muted hover:text-white hover:bg-synthwave-bg-card/50 rounded-lg transition-colors"
        aria-label="Close"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );

  // Render empty state based on mode
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 space-y-4">
      {mode === "adaptation-new-copy" ? (
        <>
          <div className="text-center space-y-2">
            <p className="text-synthwave-text-secondary font-rajdhani">
              Your coach is analyzing this program...
            </p>
          </div>
          {/* Program summary card */}
          <div
            className={`${containerPatterns.cardMedium} w-full max-w-md p-4`}
          >
            <div className="grid grid-cols-2 gap-3 text-sm font-rajdhani">
              <div>
                <span className="text-synthwave-text-muted">Duration:</span>
                <span className="ml-2 text-white">
                  {program.totalDays} days
                </span>
              </div>
              <div>
                <span className="text-synthwave-text-muted">Frequency:</span>
                <span className="ml-2 text-white">
                  {program.trainingFrequency}x/week
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-synthwave-text-muted">Goals:</span>
                <span className="ml-2 text-white">
                  {program.trainingGoals?.slice(0, 2).join(", ") ||
                    "Not specified"}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-synthwave-text-secondary font-rajdhani">
            Tell your coach what you'd like to change about this program.
          </p>
          <p className="text-synthwave-text-muted text-sm font-rajdhani">
            Examples: adjust schedule, modify equipment, change intensity, swap
            exercises
          </p>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-synthwave-bg-primary border-l border-synthwave-neon-cyan/20 shadow-2xl shadow-synthwave-neon-cyan/10 z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {renderHeader()}

        {/* Chat content area */}
        <div className="flex flex-col h-[calc(100%-80px)]">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-synthwave-neon-cyan"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center flex-1 px-6">
              <p className="text-red-400 font-rajdhani">{error}</p>
              <button
                onClick={initializeSession}
                className={buttonPatterns.secondary}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Messages area - same rendering as ProgramDesigner.jsx */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {agentState.messages.length === 0
                  ? renderEmptyState()
                  : agentState.messages.map((msg, index) => (
                      // Message rendering follows ProgramDesigner.jsx pattern
                      <div
                        key={msg.id || index}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] ${
                            msg.role === "user"
                              ? "bg-synthwave-neon-pink/20 border border-synthwave-neon-pink/30"
                              : "bg-synthwave-bg-card/50 border border-synthwave-neon-cyan/20"
                          } rounded-lg px-4 py-3`}
                        >
                          <div className="text-white font-rajdhani whitespace-pre-wrap">
                            {parseMarkdown(msg.content)}
                          </div>
                        </div>
                      </div>
                    ))}

                {/* Typing indicator */}
                {agentState.isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-synthwave-bg-card/50 border border-synthwave-neon-cyan/20 rounded-lg px-4 py-3">
                      <div className="flex space-x-1">
                        <div
                          className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-synthwave-neon-cyan rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat input */}
              <div className="border-t border-synthwave-neon-cyan/20 px-4 py-4">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={agentState.isTyping || agentState.isStreaming}
                  placeholder={
                    mode === "adaptation-new-copy"
                      ? "Ask about adaptations or say 'Make those changes'..."
                      : "Describe what you'd like to change..."
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ProgramAdaptationChat;
```

### Dual-Purpose Pattern: Why This Matters

The `ProgramAdaptationChat` slide-out is designed to serve **two use cases** with the same component:

| Trigger                             | Mode                    | Coach Behavior                           | User Experience                        |
| ----------------------------------- | ----------------------- | ---------------------------------------- | -------------------------------------- |
| First view of copied shared program | `adaptation-new-copy`   | Coach speaks first, proactively analyzes | "Your coach is ready with suggestions" |
| User clicks "Customize with Coach"  | `program-customization` | Coach waits for user input               | "Tell me what you'd like to change"    |

**Why This Is Powerful:**

1. **Shared Program Adaptation** - When a user copies a shared program, the slide-out opens automatically with the coach already analyzing and suggesting changes. This keeps coaching central without adding friction.

2. **Existing Program Customization** - Any user can customize ANY of their programs at any time. Same UI, same streaming chat, just different prompt mode. This is a NEW capability that comes "for free" with this architecture.

3. **Future Extensibility** - The same pattern could support:
   - Post-workout program adjustments ("That was too hard, adjust the rest of the week")
   - Phase transition reviews ("Phase 1 complete, let's talk about Phase 2")
   - Mid-program check-ins ("How's the program working for you?")

**Backend Implementation:**

A **NEW** Lambda handler `stream-program-conversation` is created specifically for program modification conversations:

```typescript
// amplify/functions/stream-program-conversation/handler.ts
// Pattern: Similar to stream-coach-conversation but program-specific

import { APIGatewayProxyEventV2 } from "aws-lambda";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import {
  getProgram,
  getCoachConfig,
  getUserProfile,
} from "../../dynamodb/operations";
import { getProgramDetailsFromS3 } from "../libs/program/s3-utils";
import { buildCoachPersonalityPrompt } from "../libs/coach-config/personality-utils";
import { callBedrockApi } from "../libs/api-helpers";

/**
 * Stream a conversation about modifying an existing program
 *
 * CONTEXT MODES:
 * - "adaptation": Coach speaks first, analyzes shared program for user
 * - "customization": User speaks first, asks for specific changes
 *
 * Unlike stream-program-designer-session (which creates programs),
 * this handler modifies existing programs through conversation.
 */
const baseHandler: AuthenticatedHandler = async (event) => {
  const userId = event.user.userId;
  const { programId, coachId, mode, message, conversationHistory } = JSON.parse(
    event.body || "{}",
  );

  try {
    // Load program, coach, and user data
    const program = await getProgram(userId, coachId, programId);
    const coachConfig = await getCoachConfig(userId, coachId);
    const userProfile = await getUserProfile(userId);
    const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);

    // Build system prompt based on mode
    const systemPrompt = buildProgramConversationPrompt(
      coachConfig,
      program,
      programDetails,
      userProfile,
      mode,
      JSON.parse(event.body || "{}"), // includes sourceCreator, etc for adaptation mode
    );

    // Stream response from Bedrock
    // TODO: Implement streaming response pattern
    // TODO: Support tool calls for program modification
  } catch (error) {
    console.error("Error in program conversation:", error);
    throw error;
  }
};

export const handler = withAuth(baseHandler);

/**
 * Build system prompt based on conversation mode
 */
function buildProgramConversationPrompt(
  coachConfig: any,
  program: any,
  programDetails: any,
  userProfile: any,
  mode: "adaptation" | "customization",
  context: any,
): string {
  const personalityPrompt = buildCoachPersonalityPrompt(coachConfig);

  if (mode === "adaptation") {
    return `${personalityPrompt}

CONTEXT: The user just copied a training program shared by @${context.sourceCreator}.
The program is now in their account and ready to use. Your job is to proactively
analyze it and suggest adaptations based on their profile.

PROGRAM DETAILS:
- Name: ${program.name}
- Duration: ${program.totalDays} days
- Frequency: ${program.trainingFrequency}x per week
- Goals: ${program.trainingGoals?.join(", ")}
- Equipment: ${program.equipmentConstraints?.join(", ")}
- Created by: @${context.sourceCreator} with ${context.sourceCoachNames?.join(", ")}

USER PROFILE:
- Equipment: ${userProfile.availableEquipment?.join(", ") || "not specified"}
- Training frequency: ${userProfile.trainingFrequency || "not specified"}
- Goals: ${userProfile.fitnessGoals?.join(", ") || "not specified"}

YOUR TASK:
1. Start by acknowledging the program and giving credit to @${context.sourceCreator}
2. Proactively analyze how well it fits this user's:
   - Available equipment
   - Schedule/time constraints
   - Training goals
   - Experience level
3. Suggest 2-3 SPECIFIC adaptations you'd recommend
4. Offer to make these changes, or let them use the program as-is

IMPORTANT:
- The program already exists in their account - they can start immediately
- If they say "make those changes" or similar, modify the program accordingly
- Keep suggestions actionable and specific
- Give credit to the original creator

Start by speaking first with your analysis.
`;
  } else {
    return `${personalityPrompt}

CONTEXT: The user wants to customize their existing training program.

PROGRAM DETAILS:
- Name: ${program.name}
- Current Day: ${program.currentDay} of ${program.totalDays}
- Status: ${program.status}
- Goals: ${program.trainingGoals?.join(", ")}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

YOUR TASK:
1. Wait for the user to describe what they want to change
2. Ask clarifying questions if needed
3. Propose specific modifications
4. Make changes when they confirm

IMPORTANT:
- Understand their constraints before suggesting changes
- Preserve what's working, only change what they ask for
- Confirm changes before implementing
`;
  }
}
```

**Why This Approach:**

1. **Separation of Concerns:** ProgramDesigner creates programs (wizard flow), this handler modifies them (conversation flow)
2. **Simpler:** No multi-phase state management, just load program → chat → modify
3. **Reusable:** Same handler for both shared program adaptation and existing program customization
4. **Extensible:** Can add tool calls for program modification (regenerate workouts, adjust schedule, etc)

### Coach Selection Flow

**Trigger:** User clicks "Adapt with My Coach" on SharedProgramPreview

**Implementation Location:** `src/components/shared-programs/CoachSelectionModal.jsx`

**Flow Logic:**

```jsx
// In SharedProgramPreview.jsx

const handleAdapt = async () => {
  if (!user) {
    // Redirect to signup with return URL
    navigate(`/signup?redirect=/shared/programs/${sharedProgramId}/adapt`);
    return;
  }

  // Load user's coaches
  const coaches = await getCoachConfigs(user.userId);

  if (coaches.length === 0) {
    // No coaches - redirect to coach creation with adaptation context
    navigate(
      `/coach-creator?returnTo=/shared/programs/${sharedProgramId}/adapt&context=adaptation`,
    );
    return;
  }

  if (coaches.length === 1) {
    // Single coach - skip selection, go directly to adaptation
    navigate(
      `/shared/programs/${sharedProgramId}/adapt?userId=${user.userId}&coachId=${coaches[0].coach_id}`,
    );
    return;
  }

  // Multiple coaches - show selection modal
  setShowCoachSelectionModal(true);
};
```

**Coach Selection Modal:**

```jsx
// src/components/shared-programs/CoachSelectionModal.jsx
import React, { useState, useEffect } from "react";
import { getCoachConfigs } from "../../utils/apis/coachApi";
import {
  containerPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";

function CoachSelectionModal({
  userId,
  sharedProgram,
  onSelect,
  onCreateNew,
  onClose,
}) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoachId, setSelectedCoachId] = useState(null);

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    const coachList = await getCoachConfigs(userId);
    setCoaches(coachList);
    setLoading(false);
  };

  // Determine best fit coach based on program discipline
  const getBestFitCoach = () => {
    // Extract discipline from shared program (if available)
    const programGoals = sharedProgram.programSnapshot.trainingGoals || [];
    const programName = sharedProgram.programSnapshot.name.toLowerCase();

    // Simple matching based on coach specialty/name
    // Could be enhanced with AI-based matching in future
    return coaches.find((coach) => {
      const coachSpec =
        coach.selected_personality?.coaching_specialty?.toLowerCase() || "";
      return programGoals.some(
        (goal) =>
          coachSpec.includes(goal.toLowerCase()) ||
          programName.includes(coachSpec),
      );
    });
  };

  const bestFitCoach = getBestFitCoach();

  return (
    <div className={containerPatterns.modal}>
      <div className={containerPatterns.cardLarge}>
        <h2 className={typographyPatterns.heading2}>
          Choose Your Coach for Adaptation
        </h2>
        <p className={typographyPatterns.body}>
          Select which coach should adapt "{sharedProgram.programSnapshot.name}"
          for you.
        </p>

        {loading ? (
          <div>Loading coaches...</div>
        ) : (
          <div className="space-y-4 mt-6">
            {coaches.map((coach) => (
              <div
                key={coach.coach_id}
                onClick={() => setSelectedCoachId(coach.coach_id)}
                className={`${containerPatterns.cardMedium} cursor-pointer transition-all ${
                  selectedCoachId === coach.coach_id
                    ? "border-synthwave-neon-cyan ring-2 ring-synthwave-neon-cyan/30"
                    : "border-synthwave-border hover:border-synthwave-neon-cyan/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Coach Avatar */}
                    <div className="w-12 h-12 rounded-full bg-synthwave-neon-cyan/10 border-2 border-synthwave-neon-cyan flex items-center justify-center">
                      <span className="text-lg font-bold text-synthwave-neon-cyan">
                        {coach.coach_name?.charAt(0) || "C"}
                      </span>
                    </div>

                    <div>
                      <h3 className={typographyPatterns.heading3}>
                        {coach.coach_name}
                      </h3>
                      <p className="text-sm text-synthwave-text-secondary">
                        {coach.selected_personality?.coaching_specialty ||
                          "General Coach"}
                      </p>
                    </div>
                  </div>

                  {/* Best Fit Badge */}
                  {bestFitCoach?.coach_id === coach.coach_id && (
                    <div className="px-2 py-1 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded text-synthwave-neon-purple text-xs font-bold uppercase">
                      Best Fit
                    </div>
                  )}
                </div>

                {/* Coach personality preview */}
                {coach.selected_personality?.primary_template && (
                  <p className="mt-2 text-sm text-synthwave-text-secondary">
                    Style: {coach.selected_personality.primary_template}
                  </p>
                )}
              </div>
            ))}

            {/* Create New Coach Option */}
            <div
              onClick={onCreateNew}
              className={`${containerPatterns.cardMedium} cursor-pointer border-dashed hover:border-synthwave-neon-pink/50 transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-synthwave-text-muted flex items-center justify-center">
                  <span className="text-2xl text-synthwave-text-muted">+</span>
                </div>
                <div>
                  <h3 className={typographyPatterns.heading3}>
                    Create New Coach
                  </h3>
                  <p className="text-sm text-synthwave-text-secondary">
                    Build a custom coach for this program
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button onClick={onClose} className={buttonPatterns.secondary}>
            Cancel
          </button>
          <button
            onClick={() => onSelect(selectedCoachId)}
            disabled={!selectedCoachId}
            className={buttonPatterns.primary}
          >
            Start Adaptation
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoachSelectionModal;
```

### Analytics Events

**Implementation Location:** Add to relevant API calls and UI interactions.

**Pattern:** Use existing analytics utility or create `src/utils/analytics/sharedProgramAnalytics.js`

```javascript
// src/utils/analytics/sharedProgramAnalytics.js

/**
 * Analytics events for program sharing feature
 * Track user journey through share → preview → adapt → complete flow
 */

// Event names (use consistent naming convention)
export const SHARED_PROGRAM_EVENTS = {
  // Sharing flow
  SHARE_INITIATED: "share_program_initiated",
  SHARE_LINK_GENERATED: "share_link_generated",
  SHARE_LINK_COPIED: "share_link_copied",

  // Discovery flow
  SHARE_LINK_VIEWED: "share_link_viewed",

  // Adaptation flow
  ADAPTATION_STARTED: "adaptation_started",
  ADAPTATION_COMPLETED: "adaptation_completed",

  // Management
  SHARE_DEACTIVATED: "share_deactivated",
};

/**
 * Track when user initiates sharing a program
 * Trigger: User clicks "Share This Program" button
 */
export function trackShareInitiated(userId, programId) {
  console.info("📊 Analytics: share_program_initiated", { userId, programId });
  // TODO: Send to analytics backend (Amplitude, Mixpanel, or custom)
  // analytics.track(SHARED_PROGRAM_EVENTS.SHARE_INITIATED, { userId, programId });
}

/**
 * Track when share link is successfully generated
 * Trigger: API returns sharedProgramId
 */
export function trackShareLinkGenerated(sharedProgramId, userId) {
  console.info("📊 Analytics: share_link_generated", {
    sharedProgramId,
    userId,
  });
  // analytics.track(SHARED_PROGRAM_EVENTS.SHARE_LINK_GENERATED, { sharedProgramId, userId });
}

/**
 * Track share link views (public preview page loads)
 * Trigger: SharedProgramPreview component mounts
 * Note: Track referrer to understand traffic sources
 */
export function trackShareLinkViewed(sharedProgramId, referrer, hasAuth) {
  console.info("📊 Analytics: share_link_viewed", {
    sharedProgramId,
    referrer: referrer || document.referrer || "direct",
    hasAuth,
  });
  // analytics.track(SHARED_PROGRAM_EVENTS.SHARE_LINK_VIEWED, {
  //   sharedProgramId,
  //   referrer: referrer || document.referrer || 'direct',
  //   hasAuth,
  //   timestamp: new Date().toISOString()
  // });
}

/**
 * Track when user starts adaptation conversation
 * Trigger: User selects coach and begins adaptation
 */
export function trackAdaptationStarted(sharedProgramId, userId, coachId) {
  console.info("📊 Analytics: adaptation_started", {
    sharedProgramId,
    userId,
    coachId,
  });
  // analytics.track(SHARED_PROGRAM_EVENTS.ADAPTATION_STARTED, {
  //   sharedProgramId,
  //   userId,
  //   coachId,
  //   timestamp: new Date().toISOString()
  // });
}

/**
 * Track when adaptation completes and new program is created
 * Trigger: Program designer session completes with adapted program
 */
export function trackAdaptationCompleted(
  sharedProgramId,
  userId,
  newProgramId,
) {
  console.info("📊 Analytics: adaptation_completed", {
    sharedProgramId,
    userId,
    newProgramId,
  });
  // analytics.track(SHARED_PROGRAM_EVENTS.ADAPTATION_COMPLETED, {
  //   sharedProgramId,
  //   userId,
  //   newProgramId,
  //   timestamp: new Date().toISOString()
  // });
}

/**
 * Track when user copies share link
 * Trigger: User clicks copy button or social share button
 * @param destination - 'clipboard' | 'twitter' | 'facebook'
 */
export function trackShareLinkCopied(sharedProgramId, destination) {
  console.info("📊 Analytics: share_link_copied", {
    sharedProgramId,
    destination,
  });
  // analytics.track(SHARED_PROGRAM_EVENTS.SHARE_LINK_COPIED, {
  //   sharedProgramId,
  //   destination,
  //   timestamp: new Date().toISOString()
  // });
}

/**
 * Track when user deactivates a share
 * Trigger: User clicks "Unshare" button
 */
export function trackShareDeactivated(sharedProgramId, userId) {
  console.info("📊 Analytics: share_deactivated", { sharedProgramId, userId });
  // analytics.track(SHARED_PROGRAM_EVENTS.SHARE_DEACTIVATED, {
  //   sharedProgramId,
  //   userId,
  //   timestamp: new Date().toISOString()
  // });
}
```

**Integration Points:**

```javascript
// In ShareProgramModal.jsx
import {
  trackShareInitiated,
  trackShareLinkGenerated,
  trackShareLinkCopied,
} from "../../utils/analytics/sharedProgramAnalytics";

const handleGenerateLink = async () => {
  trackShareInitiated(userId, program.programId); // Track initiation

  const result = await createSharedProgram(userId, program.programId);

  trackShareLinkGenerated(result.sharedProgramId, userId); // Track success
  setShareUrl(result.shareUrl);
};

const handleCopyLink = () => {
  navigator.clipboard.writeText(shareUrl);
  trackShareLinkCopied(sharedProgramId, "clipboard"); // Track copy
  setCopied(true);
};

const handleSocialShare = (platform) => {
  trackShareLinkCopied(sharedProgramId, platform); // Track social share
  // ... open social share URL
};

// In SharedProgramPreview.jsx
import { trackShareLinkViewed } from "../../utils/analytics/sharedProgramAnalytics";

useEffect(() => {
  if (program) {
    trackShareLinkViewed(sharedProgramId, document.referrer, !!user);
  }
}, [program, user]);

// In AdaptProgramChat.jsx
import {
  trackAdaptationStarted,
  trackAdaptationCompleted,
} from "../../utils/analytics/sharedProgramAnalytics";

// On session creation:
trackAdaptationStarted(sharedProgramId, userId, coachId);

// On program completion (in agent onNavigation callback):
if (type === "program-complete") {
  trackAdaptationCompleted(sharedProgramId, userId, data.programId);
}
```

### API Wrapper Functions

**File:** `src/utils/apis/sharedProgramApi.js`

**Reference:** `src/utils/apis/programApi.js`

```javascript
// Use existing API config pattern
import { getApiUrl, authenticatedFetch } from "./apiConfig.js";

/**
 * Create a shareable link for a completed program
 * @param {string} userId - The user ID
 * @param {string} programId - The program ID to share
 * @returns {Promise<Object>} - The share response with sharedProgramId and shareUrl
 */
export async function createSharedProgram(userId, programId) {
  const url = `${getApiUrl("")}/users/${userId}/programs/${programId}/share`;

  const response = await authenticatedFetch(url, {
    method: "POST",
    body: JSON.stringify({ includePersonalNotes: false }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("createSharedProgram: Error response:", errorText);
    throw new Error(`Failed to create share: ${response.status}`);
  }
  return response.json();
}

/**
 * Get a shared program by ID (PUBLIC - no auth required)
 * @param {string} sharedProgramId - The shared program ID
 * @returns {Promise<Object>} - The shared program data
 */
export async function getSharedProgram(sharedProgramId) {
  // Public endpoint - no auth required
  const url = `${getApiUrl("")}/shared-programs/${sharedProgramId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("getSharedProgram: Error response:", errorText);
    throw new Error(`Failed to get shared program: ${response.status}`);
  }
  return response.json();
}

/**
 * Query all shared programs for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of shared programs
 */
export async function querySharedPrograms(userId) {
  const url = `${getApiUrl("")}/users/${userId}/shared-programs`;

  const response = await authenticatedFetch(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("querySharedPrograms: Error response:", errorText);
    throw new Error(`Failed to list shared programs: ${response.status}`);
  }
  return response.json();
}

/**
 * Deactivate (unshare) a shared program
 * @param {string} userId - The user ID
 * @param {string} sharedProgramId - The shared program ID to deactivate
 */
export async function deactivateSharedProgram(userId, sharedProgramId) {
  const url = `${getApiUrl("")}/users/${userId}/shared-programs/${sharedProgramId}`;

  const response = await authenticatedFetch(url, { method: "DELETE" });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("deactivateSharedProgram: Error response:", errorText);
    throw new Error(`Failed to unshare program: ${response.status}`);
  }
}

/**
 * Copy a shared program to user's account (instant copy)
 * @param {string} userId - The user ID
 * @param {string} sharedProgramId - The shared program ID to copy
 * @param {string} coachId - The coach ID to associate with the copied program
 * @returns {Promise<Object>} - The new program info { programId, programName, coachId, coachName }
 */
export async function copySharedProgram(userId, sharedProgramId, coachId) {
  const url = `${getApiUrl("")}/users/${userId}/shared-programs/${sharedProgramId}/copy`;

  const response = await authenticatedFetch(url, {
    method: "POST",
    body: JSON.stringify({ coachId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("copySharedProgram: Error response:", errorText);
    throw new Error(`Failed to copy shared program: ${response.status}`);
  }
  return response.json();
}

/**
 * Update program metadata (used to mark adaptation as reviewed)
 * @param {string} userId - The user ID
 * @param {string} coachId - The coach ID
 * @param {string} programId - The program ID
 * @param {Object} updates - Metadata updates to apply
 */
export async function updateProgramMetadata(
  userId,
  coachId,
  programId,
  updates,
) {
  const url = `${getApiUrl("")}/users/${userId}/coaches/${coachId}/programs/${programId}/metadata`;

  const response = await authenticatedFetch(url, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("updateProgramMetadata: Error response:", errorText);
    throw new Error(`Failed to update program metadata: ${response.status}`);
  }
  return response.json();
}
```

### Routes Integration

**File:** `src/App.jsx`

**Note:** No separate `/adapt` route needed - adaptation happens via slide-out on ProgramDashboard.

```jsx
import SharedProgramPreview from "./components/shared-programs/SharedProgramPreview";
import MySharedPrograms from "./components/shared-programs/MySharedPrograms";

// Add to routes
<Routes>
  {/* Existing routes... */}

  {/* Public route - no auth required */}
  <Route
    path="/shared/programs/:sharedProgramId"
    element={<SharedProgramPreview />}
  />

  {/* Protected routes */}
  <Route
    path="/programs/shared"
    element={
      <ProtectedRoute>
        <MySharedPrograms />
      </ProtectedRoute>
    }
  />

  {/* NOTE: No /adapt route needed - adaptation flow:
      1. User copies program from SharedProgramPreview
      2. copySharedProgram API redirects to existing ProgramDashboard route
      3. ProgramDashboard detects metadata.copiedFromSharedProgram
      4. ProgramAdaptationChat slide-out opens automatically
  */}
</Routes>;
```

### ProgramDashboard Integration

**File:** `src/components/programs/ProgramDashboard.jsx`

Add slide-out chat support for both shared program adaptation and existing program customization:

```jsx
import React, { useState, useEffect, useRef } from "react";
import ProgramAdaptationChat from "../shared-programs/ProgramAdaptationChat";
import { updateProgramMetadata } from "../../utils/apis/programApi";
// ... other existing imports

export default function ProgramDashboard() {
  // ... existing state ...

  // NEW: Slide-out chat state
  const [adaptationChatOpen, setAdaptationChatOpen] = useState(false);
  const [adaptationMode, setAdaptationMode] = useState(null);

  // NEW: Auto-open slide-out for freshly copied shared programs
  useEffect(() => {
    if (
      program &&
      program.metadata?.copiedFromSharedProgram &&
      !program.metadata?.adaptationReviewed
    ) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => {
        setAdaptationMode("adaptation-new-copy");
        setAdaptationChatOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    program?.programId,
    program?.metadata?.copiedFromSharedProgram,
    program?.metadata?.adaptationReviewed,
  ]);

  // NEW: Handle manual customization request
  const handleCustomizeProgram = () => {
    setAdaptationMode("program-customization");
    setAdaptationChatOpen(true);
  };

  // NEW: Handle slide-out close and metadata update
  const handleAdaptationChatClose = () => {
    setAdaptationChatOpen(false);
  };

  const handleProgramUpdated = async (updates) => {
    if (updates.adaptationReviewed) {
      // Mark program as reviewed so slide-out doesn't reopen
      try {
        await updateProgramMetadata(userId, coachId, program.programId, {
          metadata: { ...program.metadata, adaptationReviewed: true },
        });
        // Update local state
        setProgram((prev) => ({
          ...prev,
          metadata: { ...prev.metadata, adaptationReviewed: true },
        }));
      } catch (error) {
        console.error("Failed to update program metadata:", error);
      }
    }
    // Reload program if other changes were made
    if (updates.programRegenerated) {
      await loadData();
    }
  };

  return (
    <div className={layoutPatterns.pageContainer}>
      {/* ... existing dashboard content ... */}

      {/* Add "Customize with Coach" button to ProgramOverview section */}
      <ProgramOverview
        program={program}
        programAgentRef={programAgentRef}
        onProgramUpdate={handleProgramUpdate}
        onCustomize={handleCustomizeProgram} // NEW: Pass handler
      />

      {/* ... rest of dashboard ... */}

      {/* NEW: Adaptation/Customization slide-out chat */}
      {program && (
        <ProgramAdaptationChat
          program={program}
          userId={userId}
          coachId={coachId}
          isOpen={adaptationChatOpen}
          onClose={handleAdaptationChatClose}
          onProgramUpdated={handleProgramUpdated}
          mode={adaptationMode}
        />
      )}
    </div>
  );
}
```

### ProgramOverview Integration

**File:** `src/components/programs/ProgramOverview.jsx`

Add "Customize with Coach" button:

```jsx
function ProgramOverview({
  program,
  programAgentRef,
  onProgramUpdate,
  onCustomize,
}) {
  // ... existing component code ...

  return (
    <div className={containerPatterns.cardMedium}>
      {/* ... existing overview content ... */}

      {/* Action buttons section */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-synthwave-neon-cyan/10">
        {/* Existing buttons: Pause/Resume, Mark Complete, etc. */}

        {/* NEW: Customize with Coach button - always available */}
        <button
          onClick={onCustomize}
          className={buttonPatterns.secondary}
          data-tooltip-id="customize-tooltip"
          data-tooltip-content="Chat with your coach to modify this program"
        >
          <span className="flex items-center gap-2">
            <ChatIcon className="w-4 h-4" />
            Customize with Coach
          </span>
        </button>

        {/* Attribution for copied programs */}
        {program.metadata?.copiedFromSharedProgram && (
          <div className="w-full mt-2 text-sm text-synthwave-text-muted font-rajdhani">
            Based on program by @{program.metadata.sourceCreator}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Integration with ManagePrograms

**File:** `src/components/programs/ManagePrograms.jsx`

Add share button to each active or completed program card:

```jsx
{
  (program.status === "active" || program.status === "completed") && (
    <button
      onClick={() => handleShareProgram(program)}
      className={buttonPatterns.secondary}
    >
      Share This Program
    </button>
  );
}
```

---

## Brand Voice Examples

### UI Copy Throughout Application

**Share Button States:**

- Default: "Share This Program"
- Generating: "Creating link..."
- Success: "Link copied! Time to inspire some athletes."

**Preview Page:**

- CTA for non-members: "Sign Up to Get This Program"
- CTA for members: "Get This Program"
- Attribution line: "Program by @username"
- Privacy note: "Full workout details available after getting this program"

**Copy Loading States:**

- Button click: "Copying to your account..."
- Redirect: "Setting up your program..."

**Slide-out Chat - Coach First Message (Shared Program):**

```
"Hey! I just set you up with @marcus_fitness's Olympic lifting program.
Nice choice!

Looking at your profile, here are a few things I'd suggest adjusting:

• Your equipment: You mentioned limited barbell time - I could swap
  some accessory work to dumbbells
• Your schedule: This assumes 5 days/week, but you prefer 4 - I can
  condense the volume without losing effectiveness
• Your goals: You're training for competition - I'd add more
  positional work in the snatch/C&J

Want me to make these changes? Or we can chat through any other
adjustments. You can also close this and start the program as-is -
it's already saved and ready to go!"
```

**Slide-out Chat - Customization Mode (Existing Program):**

```
"What would you like to change about your program? I can help with:

• Adjusting your training schedule
• Swapping exercises for equipment you have
• Modifying intensity or volume
• Adding or removing focus areas

Just tell me what's on your mind."
```

**After Quick Accept ("Make those changes"):**

```
"Done! I've updated your program with those adjustments. Here's what
changed:

• Replaced 3 barbell accessories with dumbbell alternatives
• Condensed to 4 days/week (combined some sessions)
• Added positional drills on snatch days

Your Week 1 starts [date]. Ready when you are!"
```

**Attribution on ProgramDashboard:**

- Subtle text: "Based on program by @username"
- Tooltip: "This program was adapted from a shared template"

**Empty State (No Shared Programs):**

```
"You haven't shared any programs yet. Complete a program and share your
success to inspire other athletes!"
```

---

## Implementation Timeline

### Week 1: Core Infrastructure (2 days)

**Day 1: Backend Foundation** ✅ COMPLETED

- [x] Define SharedProgram types in `amplify/functions/libs/shared-program/types.ts` ✅
- [x] Add DynamoDB operations in `amplify/dynamodb/operations.ts` ✅
  - `saveSharedProgram()` - Save shared program to DynamoDB
  - `getSharedProgram()` - Get by ID (public access, no auth)
  - `querySharedPrograms()` - Query user's shared programs via GSI1
  - `deactivateSharedProgram()` - Soft delete (set isActive=false)
- [x] Implement S3 utilities in `amplify/functions/libs/shared-program/s3-utils.ts` ✅
  - `storeSharedProgramDetailsInS3()` - Store program snapshot with workout templates
  - `getSharedProgramDetailsFromS3()` - Retrieve shared program details
- [x] Create Lambda handlers: `create-shared-program`, `get-shared-program`, `get-shared-programs`, `delete-shared-program` ✅
- [x] Add API routes to `amplify/api/resource.ts` ✅
- [x] Register Lambdas and attach policies in `amplify/backend.ts` ✅

**Day 2: Instant Copy Backend** ✅ COMPLETED

- [x] Add `metadata` field to Program interface in `amplify/functions/libs/program/types.ts` ✅
- [x] Create centralized ID generation utilities in `amplify/functions/libs/id-utils.ts` ✅
  - `generateProgramId()`, `generateSharedProgramId()`, `generateWorkoutId()`, etc.
  - Refactored existing handlers to use centralized utilities
- [x] Extend SharedProgram types to preserve AI generation provenance ✅
  - Added `originalGeneratedBy`, `originalAiModel`, `originalConfidence`, `originalGenerationPrompt` to SharedProgramDetails
- [x] Create `copy-shared-program` Lambda handler with thin handler pattern ✅
  - Handler in `amplify/functions/copy-shared-program/handler.ts`
  - Business logic in `amplify/functions/libs/shared-program/copy-utils.ts`
  - Resource definition in `amplify/functions/copy-shared-program/resource.ts`
- [x] Add API route for `POST /users/{userId}/shared-programs/{sharedProgramId}/copy` ✅
- [ ] Register `copy-shared-program` Lambda in `amplify/backend.ts`
- [ ] Test instant copy flow end-to-end (pending deployment)

### Week 2: Frontend Core (2-3 days)

**Day 3: Share Flow** ✅ COMPLETED

- [x] Build `ShareProgramModal.jsx` component ✅
- [x] Add share button to `ManagePrograms.jsx` and `ProgramOverview.jsx` ✅
- [x] Create API wrapper functions in `sharedProgramApi.js` ✅
- [x] Test share link generation flow ✅

**Day 4: Preview & Copy Flow** ✅ COMPLETED

- [x] Build `SharedProgramPreview.jsx` component (with instant copy CTA) ✅
- [x] Build `SelectCoachModal.jsx` component (renamed from CoachSelectionModal) ✅
- [x] Add `/shared/programs/:sharedProgramId` route to `App.jsx` ✅
- [x] Test public preview access (no auth) ✅
- [x] Test instant copy flow (single coach auto-select + multi-coach modal) ✅
- [x] Add skeleton loading to SharedProgramPreview ✅
- [x] Refactor shared program ID generation to use nanoid for privacy ✅

**Day 5: Slide-out Adaptation Chat** ⏸️ NOT STARTED (Future Work)

- [ ] Create `stream-program-conversation` Lambda handler (NEW dedicated handler)
- [ ] Build `ProgramAdaptationChat.jsx` slide-out component
- [ ] Add slide-out container patterns to `uiPatterns.js`
- [ ] Create `programConversationApi.js` API wrapper
- [ ] Integrate into `ProgramDashboard.jsx`:
  - Auto-open for freshly copied shared programs (`metadata.copiedFromSharedProgram`)
  - Manual trigger via "Customize with Coach" button
- [ ] Add `onCustomize` prop to `ProgramOverview.jsx`

### Week 3: Management & Polish (1 day) ⏸️ NOT STARTED (Future Work)

**Day 6: Share Management**

- [ ] Build `MySharedPrograms.jsx` component
- [ ] Add `/programs/shared` route
- [ ] Add unshare functionality
- [ ] Test share management flow

**Day 7: Testing & Launch Prep**

- [ ] End-to-end testing: share → preview → copy → dashboard → slide-out → customize
- [ ] Create `sharedProgramAnalytics.js` with all tracking events
- [ ] Integrate analytics calls into components
- [ ] Test analytics events fire correctly at each step
- [ ] Soft launch with beta users

**Total Estimated Time: 6-7 days** (4 days complete, ~3 days remaining)

### Implementation Order (Recommended)

```
1. Backend routes & Lambda registration
2. copy-shared-program Lambda (enables instant copy)
3. Frontend: SharedProgramPreview + CoachSelectionModal
4. Frontend: ShareProgramModal
5. Frontend: ProgramAdaptationChat slide-out
6. Frontend: ProgramDashboard integration (auto-open + customize button)
7. Frontend: MySharedPrograms management
8. Analytics integration
9. End-to-end testing
```

---

## Success Metrics

### Growth Metrics

- **Shares Created:** Number of programs shared per week
- **Share Click Rate:** Clicks on shared links / total shares
- **Preview to Signup:** Non-members who sign up after viewing preview
- **Copy Rate:** Members who copy shared programs / preview views
- **Completion Rate:** Users who complete copied programs

### Engagement Metrics (New: Instant Copy + Slide-out)

- **Social Shares:** Programs shared to social media vs. direct links
- **Time to Copy:** Time from preview view to program copy (should be seconds)
- **Slide-out Engagement:** % of users who engage with slide-out chat vs. close immediately
- **Conversation Depth:** Number of messages in slide-out conversations
- **Quick Accept Rate:** % who say "make those changes" vs. detailed customization
- **Customization Reuse:** % of users who later use "Customize with Coach" on their programs

### Quality Metrics

- **Copy Success:** Programs completed after copying (with and without customization)
- **User Satisfaction:** Feedback on copied programs
- **Coach Value Perception:** Do users find coach suggestions valuable?

### Target Goals (3 months post-launch)

- 20% of active/completed programs get shared
- 30% click-through rate on shared links
- 15% conversion rate from preview to signup (non-members)
- **80% of members who view preview copy the program** (higher than before due to instant copy)
- 40% of users engage with slide-out chat (beyond just viewing)
- 20% request customizations through slide-out
- 70% completion rate on copied programs
- 15% of existing program users try "Customize with Coach" feature

---

## Risk Mitigation

### Risk: Low-quality shared programs

**Impact:** Users copy bad programs, get injured or discouraged
**Mitigation:**

- Only allow sharing of completed programs (user finished it themselves)
- Coach validation required before user can start adapted program
- Clear disclaimer on preview page
- Option to report problematic shared programs

### Risk: Copyright/IP issues

**Impact:** User shares someone else's paid program
**Mitigation:**

- Clear TOS: Users certify they own/created the program
- DMCA takedown process for reported violations
- Cannot share programs that were copied from other shares
- Watermark attribution on all shared programs

### Risk: Spam/abuse of sharing

**Impact:** Users create junk programs just to share
**Mitigation:**

- Only active or completed programs can be shared (user is engaged with it)
- Archived programs cannot be shared (prevents sharing abandoned programs)
- Can deactivate/delete shares at any time
- Platform can flag/remove abusive shares

### Risk: Adoption failure

**Impact:** Users don't share or adapt programs
**Mitigation:**

- Clear prompts after program completion
- Coach celebrates completion and suggests sharing
- Show examples of successful shares in UI
- Start with beta users who are likely to share

---

## Future Enhancements (Post-V1)

These features are explicitly **out of scope** for initial launch but could be added later based on user feedback:

### Optional Phase 2 Features

- Simple view counter on preview page (non-gamified)
- "Programs by this creator" link on preview page
- Email notification when someone adapts your program
- Success story submission form for creators

### Optional Phase 3 Features

- Lightweight "Featured Programs" section on homepage (editorial)
- Creator verification badge (completed 3+ programs)
- Community challenges using shared programs
- Integration with fitness tracking APIs

**Key principle:** Only add if users explicitly request and if it enhances coaching, not if it turns platform into marketplace.

---

## Implementation Progress

### Recent Updates (January 19, 2026) - PAUSED FOR STABILIZATION

**Completed Days 3-4: Frontend Core Flow** 🎉

- ✅ Built `ShareProgramModal.jsx` - Share link generation with copy to clipboard and social sharing
- ✅ Built `SharedProgramPreview.jsx` - Public preview page with hero, program details, phases, and CTA
- ✅ Built `SelectCoachModal.jsx` - Coach selection modal for users with multiple coaches
- ✅ Created `sharedProgramApi.js` - API wrapper functions for all sharing endpoints
- ✅ Added `/shared/programs/:sharedProgramId` route to `App.jsx`
- ✅ Added share button to `ProgramOverview.jsx` (active/completed programs)
- ✅ Implemented skeleton loading for `SharedProgramPreview.jsx`
- ✅ Refactored `generateSharedProgramId()` to use `nanoid(21)` for privacy (removes userId from public URLs)
- ✅ Tested instant copy flow with single coach (auto-select) and multiple coaches (modal selection)
- ✅ Fixed coach ID field name mismatch (`coach_id` vs `coachId`)
- ✅ Fixed program status filtering for sidebar badge count (includeStatus API pattern)

**Current State:** Core sharing flow works end-to-end:

1. User can share active/completed programs from ProgramOverview
2. Share link is generated and can be copied or shared to social
3. Public preview page shows program details without revealing workout specifics
4. Logged-in users can copy program with coach selection (auto or modal)
5. Program copies to user's account and redirects to ProgramDashboard

**Pausing to stabilize before building:**

- `MySharedPrograms.jsx` - Share management page
- `ProgramAdaptationChat.jsx` - Slide-out chat for program customization
- Analytics tracking integration

---

### Previous Updates (January 17, 2026)

**Completed Day 2: Instant Copy Backend** 🎉

- ✅ Added `metadata` field to Program interface for tracking copied programs
- ✅ Created centralized ID generation utilities (`id-utils.ts`)
- ✅ Extended SharedProgram types to preserve AI generation provenance
- ✅ Implemented `copy-shared-program` Lambda with thin handler pattern
- ✅ Created `copy-utils.ts` for instant copy business logic
- ✅ Refactored multiple handlers to use centralized ID utilities
- ✅ Added API route for instant copy endpoint
- ✅ Registered `copy-shared-program` Lambda in `amplify/backend.ts`
- ✅ Deployed and tested end-to-end

---

### Completed ✅

**Phase 1 - Core Infrastructure:**

1. **Type Definitions** - `amplify/functions/libs/shared-program/types.ts`
   - SharedProgramSnapshot interface
   - SharedProgram entity interface
   - SharedProgramDetails interface (extended with provenance tracking)
   - API request/response types
   - Created: January 2026

2. **DynamoDB Operations** - `amplify/dynamodb/operations.ts`
   - saveSharedProgram() - Stores shared program with GSI for user queries
   - getSharedProgram() - Public access retrieval
   - querySharedPrograms() - Get all shared programs for a user (with pagination)
   - deactivateSharedProgram() - Soft delete with ownership verification (idempotent)
   - Created: January 2026

3. **S3 Utilities** - `amplify/functions/libs/shared-program/s3-utils.ts`
   - storeSharedProgramDetailsInS3() - Store full program details with provenance
   - getSharedProgramDetailsFromS3() - Retrieve shared program details
   - Created: January 2026

4. **Lambda Handlers** - Created: January 2026
   - `create-shared-program/` - Create shared program from existing program
   - `get-shared-program/` - Public preview endpoint (no auth required)
   - `get-shared-programs/` - Get user's shared programs (auth required)
   - `delete-shared-program/` - Deactivate shared program (auth required)
   - `copy-shared-program/` - **NEW** Instant copy with thin handler pattern

5. **API Routes Configuration** - `amplify/api/resource.ts`
   - POST `/users/{userId}/programs/{programId}/share` - Create shared program
   - GET `/shared-programs/{sharedProgramId}` - Public preview (no auth)
   - GET `/users/{userId}/shared-programs` - List user's shares
   - DELETE `/users/{userId}/shared-programs/{sharedProgramId}` - Unshare
   - POST `/users/{userId}/shared-programs/{sharedProgramId}/copy` - Instant copy
   - Created: January 2026

6. **Lambda Registration** - `amplify/backend.ts`
   - Registered all sharing Lambdas (create, get, list, delete)
   - Attached appropriate policies (DynamoDB, S3)
   - Created: January 2026

7. **ID Generation Utilities** - `amplify/functions/libs/id-utils.ts`
   - Centralized ID generation for all entities (programs, workouts, exercises, etc.)
   - Refactored existing handlers to use centralized utilities
   - Created: January 2026

8. **Program Metadata Extension** - `amplify/functions/libs/program/types.ts`
   - Added `metadata` field to Program interface
   - Tracks copied programs, source attribution, adaptation status
   - Created: January 2026

9. **Instant Copy Implementation** - `amplify/functions/libs/shared-program/copy-utils.ts`
   - `copySharedProgramToUser()` - Main orchestration function
   - Thin handler pattern (business logic separate from handler)
   - Preserves AI generation provenance
   - Created: January 2026

### Completed ✅ (Since Last Update)

**Phase 2 - Frontend Components (Core Flow):**

- [x] `ShareProgramModal.jsx` - Share link generation ✅
- [x] `SharedProgramPreview.jsx` - Public preview + copy flow ✅
- [x] `SelectCoachModal.jsx` - Coach selection for copy (modal with avatar styling) ✅
- [x] `sharedProgramApi.js` - API wrapper functions ✅
- [x] Share button on `ProgramOverview.jsx` ✅
- [x] Route `/shared/programs/:sharedProgramId` in `App.jsx` ✅
- [x] Privacy fix: `sharedProgramId` now uses `nanoid` (no userId exposure) ✅

### Paused ⏸️ (Future Work - Next Week)

**Phase 2 - Frontend Components (Remaining):**

- [ ] `ProgramAdaptationChat.jsx` - Slide-out chat component for program customization
- [ ] `MySharedPrograms.jsx` - User's share management page

**Phase 3 - Integration & Polish:**

- [ ] `stream-program-conversation` Lambda handler (backend for slide-out chat)
- [ ] ProgramDashboard integration (auto-open slide-out for copied programs)
- [ ] ProgramOverview "Customize with Coach" button
- [ ] Analytics tracking implementation (`sharedProgramAnalytics.js`)
- [ ] End-to-end testing with beta users

---

## Appendix: Key File References

### Backend Files

**New Files Created ✅:**

- `amplify/functions/libs/shared-program/types.ts` - SharedProgram interfaces ✅
- `amplify/functions/libs/shared-program/s3-utils.ts` - S3 operations ✅
- `amplify/functions/libs/shared-program/copy-utils.ts` - **Instant copy business logic** ✅
- `amplify/functions/libs/id-utils.ts` - **Centralized ID generation utilities** ✅
- `amplify/functions/create-shared-program/` - Share creation Lambda ✅
- `amplify/functions/get-shared-program/` - Public preview Lambda ✅
- `amplify/functions/get-shared-programs/` - User's shares Lambda ✅
- `amplify/functions/delete-shared-program/` - Unshare Lambda ✅
- `amplify/functions/copy-shared-program/resource.ts` - Lambda resource definition ✅
- `amplify/functions/copy-shared-program/handler.ts` - **Instant copy Lambda** (thin handler pattern) ✅

**New Files to Create:**

- `amplify/functions/stream-program-conversation/resource.ts` - **NEW streaming conversation handler**
- `amplify/functions/stream-program-conversation/handler.ts` - **NEW handler for program modification conversations**

**Existing Files Modified ✅:**

- `amplify/dynamodb/operations.ts` - ✅ SharedProgram CRUD operations added
- `amplify/api/resource.ts` - ✅ API routes added (public + protected)
- `amplify/backend.ts` - ✅ Registered sharing Lambdas (except `copy-shared-program` - pending)
- `amplify/functions/libs/program/types.ts` - ✅ Added `metadata` field to Program interface
- `amplify/functions/create-program/handler.ts` - ✅ Refactored to use `generateProgramId()`
- `amplify/functions/build-exercise/handler.ts` - ✅ Refactored to use `generateExerciseId()`
- `amplify/functions/libs/program-designer/handler-helpers.ts` - ✅ Refactored to use `generateProgramId()`
- `amplify/functions/libs/agents/workout-logger/tools.ts` - ✅ Refactored to use `generateWorkoutId()`

**Existing Files to Modify:**

- `amplify/backend.ts` - Register `copy-shared-program` Lambda + attach policies (final step)

### Frontend Files

**New Files Created ✅:**

- `src/components/shared-programs/ShareProgramModal.jsx` - Share link generation modal ✅
- `src/components/shared-programs/SharedProgramPreview.jsx` - Public preview + instant copy ✅
- `src/components/shared-programs/SelectCoachModal.jsx` - Coach selection modal (with avatar styling matching CoachHeader) ✅
- `src/utils/apis/sharedProgramApi.js` - API wrapper functions ✅

**New Files to Create (Future):**

- `src/components/shared-programs/MySharedPrograms.jsx` - User's share management
- `src/components/shared-programs/ProgramAdaptationChat.jsx` - **Slide-out chat** (dual-purpose: adaptation + customization)
- `src/utils/apis/programConversationApi.js` - **API wrapper for stream-program-conversation**
- `src/utils/analytics/sharedProgramAnalytics.js` - Analytics event tracking

**Existing Files Modified ✅:**

- `src/App.jsx` - Added route `/shared/programs/:sharedProgramId` ✅
- `src/components/programs/ProgramOverview.jsx` - Added "Share This Program" button ✅
- `amplify/functions/libs/id-utils.ts` - Refactored `generateSharedProgramId()` to use `nanoid` ✅

**Existing Files to Modify (Future):**

- `src/App.jsx` - Add route `/programs/shared` for MySharedPrograms
- `src/utils/ui/uiPatterns.js` - Add `slideOutPatterns` for slide-out panel
- `src/components/programs/ProgramDashboard.jsx` - Integrate slide-out chat:
  - Auto-open for copied shared programs (`metadata.copiedFromSharedProgram`)
  - State management for slide-out visibility
  - Handle metadata updates on close
- `src/components/programs/ProgramOverview.jsx` - Add "Customize with Coach" button
- `src/utils/apis/programApi.js` - Add `updateProgramMetadata()` function

### Reference Files

**Backend Patterns:**

- **Instant Copy Pattern:** `amplify/functions/create-coach-config-from-template/handler.ts` - Template to entity copy
- **DynamoDB Operations:** `amplify/dynamodb/operations.ts` - CRUD patterns
- **Streaming Conversation:** `amplify/functions/stream-coach-conversation/handler.ts` - General conversation streaming
- **NEW Streaming Handler:** `amplify/functions/stream-program-conversation/handler.ts` - Program-specific conversations
- **S3 Operations:** `amplify/functions/libs/program/s3-utils.ts`
- **Public Lambda Handler:** `amplify/functions/get-coach-template/handler.ts` - No-auth pattern
- **Protected Lambda Handler:** `amplify/functions/get-program/handler.ts` - Auth pattern
- **Shared Policies:** `amplify/shared-policies.ts` - Policy attachment
- **API Helpers:** `amplify/functions/libs/api-helpers.ts` - Response utilities
- **Auth Middleware:** `amplify/functions/libs/auth/middleware.ts` - withAuth

**Frontend Patterns:**

- **Modal UI:** `src/components/CoachCreator.jsx` - Modal patterns
- **Program Dashboard:** `src/components/programs/ProgramDashboard.jsx` - Layout, state management
- **Program Management:** `src/components/programs/ManagePrograms.jsx` - List view, actions
- **Streaming Chat UI:** `src/components/ProgramDesigner.jsx` - Reuse for slide-out
- **Chat Agent:** `src/utils/agents/ProgramDesignerAgent.js` - State management
- **UI Patterns:** `src/utils/ui/uiPatterns.js` - All styling patterns
- **API Config:** `src/utils/apis/apiConfig.js` - API utilities
- **Program API:** `src/utils/apis/programApi.js` - API wrapper patterns

---

## Next Steps

### Current Status: PAUSED FOR STABILIZATION ⏸️

Core sharing flow is complete and functional. Pausing development to:

1. Allow existing features to stabilize in production
2. Gather user feedback on the share → preview → copy flow
3. Plan remaining features with fresh perspective

---

### When Resuming (Estimated: Late January 2026)

**Phase 2 Completion: Share Management (~1 day)**

- Build `MySharedPrograms.jsx` component
- Add `/programs/shared` route to `App.jsx`
- Add unshare functionality
- Test share management flow

**Phase 3: Slide-out Adaptation Chat (~2 days)**

- Create `stream-program-conversation` Lambda handler (NEW dedicated handler)
- Build `ProgramAdaptationChat.jsx` slide-out component
- Add slide-out container patterns to `uiPatterns.js`
- Create `programConversationApi.js` API wrapper
- Integrate into `ProgramDashboard.jsx`:
  - Auto-open for freshly copied shared programs (`metadata.copiedFromSharedProgram`)
  - Manual trigger via "Customize with Coach" button
- Add `onCustomize` prop to `ProgramOverview.jsx`

**Phase 4: Polish & Launch (~1 day)**

- End-to-end testing: share → preview → copy → dashboard → slide-out → customize
- Create `sharedProgramAnalytics.js` with all tracking events
- Integrate analytics calls into components
- Test analytics events fire correctly at each step
- Soft launch with beta users

---

### Completed ✅

**Phase 1: Backend (Days 1-2)** - COMPLETE

- All Lambda handlers deployed and tested
- DynamoDB operations working
- S3 storage working
- API routes configured

**Phase 2 Core: Frontend Share & Copy Flow (Days 3-4)** - COMPLETE

- ShareProgramModal working
- SharedProgramPreview working with skeleton loading
- SelectCoachModal working (matches CoachHeader styling)
- Single coach auto-select working
- Multi-coach modal selection working
- Privacy: sharedProgramId uses nanoid (no userId exposure)

---

## Summary

This approach to program sharing delivers:

✅ **Viral growth** through authentic personal sharing
✅ **Instant gratification** - program copies immediately, no waiting
✅ **Coaching centrality** - coach proactively analyzes and suggests adaptations
✅ **User choice** - customize deeply OR skip and start training
✅ **Reusable pattern** - same slide-out works for customizing ANY program
✅ **Lower complexity** - no complex session management, leverages existing infrastructure
✅ **Better UX** - program exists immediately, chat is optional enhancement

**Core Philosophy:** Sharing is a user feature that amplifies success stories. Every copied program goes through an AI coach, but the user controls how deeply they engage.

**Key Architectural Decision:** Instant Copy + Slide-out Chat

```
SharedProgram → Copy to Program (instant, like CoachTemplate → Coach)
→ Redirect to ProgramDashboard (program exists!)
→ Slide-out auto-opens with coach's proactive analysis
→ User chooses: customize, quick accept, or close and start training
```

This pattern:

1. Reduces friction (no mandatory conversation)
2. Preserves coaching value (coach speaks proactively)
3. Enables future features (customize any program with coach)
4. Uses dedicated `stream-program-conversation` handler (simpler than ProgramDesigner wizard)
5. Reusable for any program modification conversation

---

## Current Status Summary (January 19, 2026)

### What's Working ✅

| Feature                                  | Status                             |
| ---------------------------------------- | ---------------------------------- |
| Share link generation                    | ✅ Working                         |
| Public preview page                      | ✅ Working (with skeleton loading) |
| Instant copy (single coach)              | ✅ Working                         |
| Coach selection modal (multiple coaches) | ✅ Working                         |
| Privacy (nanoid for shared IDs)          | ✅ Implemented                     |
| Backend (all Lambda handlers)            | ✅ Deployed                        |

### What's Not Built Yet ⏸️

| Feature                                     | Priority | Notes                    |
| ------------------------------------------- | -------- | ------------------------ |
| MySharedPrograms management                 | Medium   | Unshare functionality    |
| ProgramAdaptationChat slide-out             | Medium   | Proactive coach analysis |
| Analytics tracking                          | Low      | Track share/copy events  |
| Multiple active programs in TrainingGrounds | Low      | Design documented above  |

### Resume Plan

When resuming development (late January 2026):

1. **Day 1:** Build `MySharedPrograms.jsx` with unshare functionality
2. **Day 2-3:** Build `ProgramAdaptationChat.jsx` slide-out + backend
3. **Day 4:** Analytics integration and end-to-end testing
4. **Future:** Multiple active programs in TrainingGrounds (Phase 2/3)
