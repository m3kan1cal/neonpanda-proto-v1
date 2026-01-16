# NeonPanda Program Sharing: Link-Based Viral Growth Plan

## Strategic Vision

**Core Principle:** Enable authentic sharing of successful programs to drive viral growth while keeping AI coaching central to every program copy.

**What This Is:** A sharing feature that lets users spread their success stories
**What This Is NOT:** A marketplace or template library

## Why This Approach

### The Pivot from Marketplace to Link Sharing

**Original Concern:** "It could accidentally turn NeonPanda into a template marketplace rather than a coaching platform."

**Solution:** Focus exclusively on personal sharing via links. No browsing, no discovery, no marketplace UI. Just: user shares success → friend previews → friend signs up → coach adapts program → friend gets personalized version.

### Strategic Benefits

✅ **Maintains Coaching Centrality** - Every program copy requires coach conversation
✅ **Authentic Social Proof** - Personal recommendations beat anonymous browsing
✅ **Viral Growth Mechanic** - Each share is an endorsement with social context
✅ **Simpler to Build** - 40% less complexity than marketplace approach
✅ **No Creator Economy** - Sharing is a user feature, not a business model
✅ **Lower Maintenance** - No moderation, curation, or quality control systems

### Growth Loop

```
User completes program with great results →
Shares link on social media with personal story →
Friend clicks link, sees compelling preview →
Friend signs up to adapt program with AI coach →
Friend experiences coaching value firsthand →
Friend completes adapted program →
Friend shares their success... [loop continues]
```

---

## User Flows

### Flow 1: Sharing a Program

**Trigger Points:**

- After completing a program (coach celebrates + offers share)
- From ManagePrograms page (share button on program card)
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

### Flow 3: Member Discovers Program

**User Journey:**

```
1. Clicks shared link (already logged in)
2. Lands on preview page - sees all public info
3. CTA changes to: "Adapt with My Coach"
4. Clicks CTA → Coach selection screen (if multiple coaches)
5. Coach conversation begins with program context:

Coach: "Hey! I see you're interested in @marcus_fitness's Olympic
lifting program. Let me take a look at this...

[Coach analyzes program snapshot internally]

This looks like a solid strength-focused program. I can see why
@marcus had success with it. Based on your profile, here's what
I'm thinking:

1. Your equipment: You mentioned limited barbell time - I'd adjust
   the accessory work to use dumbbells
2. Your schedule: This assumes 5 days/week, you prefer 4 - I can
   condense the volume
3. Your goals: You're training for competition - I'd add more
   positional work in the snatch/C&J

Want to see my adapted version, or should we discuss these
modifications first?"

6. User engages in conversation
7. Coach generates adapted program
8. User approves → Adapted program saved to their account
9. Success message: "Nice! This program is now yours to crush.
   Week 1 starts [date]."
```

**Technical Note:** This adaptation conversation uses existing `stream-program-designer-session` infrastructure with the shared program snapshot as additional context.

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
POST /users/{userId}/shared-programs/{sharedProgramId}/adapt
```

- Initiates adaptation conversation with selected coach
- Returns `conversationId` for streaming session
- Passes program snapshot as context to coach

**Request Body:**

```json
{
  "coachId": "user_abc123_coach_1704067200000"
}
```

**Response:**

```json
{
  "conversationId": "conv_adapt_1705312200000_k8j2x",
  "coachName": "Coach Marcus",
  "message": "Adaptation session started. Proceed to conversation."
}
```

---

## Backend Implementation

### New Lambda Functions

**Reference Pattern:** Follow existing program and coach template patterns

| Function                   | Reference                         | Purpose                 |
| -------------------------- | --------------------------------- | ----------------------- |
| `create-shared-program`    | `create-coach-creator-session`    | Generate shareable link |
| `get-shared-program`       | `get-coach-template`              | Public preview data     |
| `get-shared-programs`      | `get-coach-configs`               | User's share management |
| `delete-shared-program`    | `delete-coach-config`             | Unshare/deactivate      |
| `start-program-adaptation` | `stream-program-designer-session` | Coach adaptation flow   |

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

### Key Implementation: Copy with Adaptation

**Core Function:** `startProgramAdaptation()`

```typescript
// Reference: amplify/functions/stream-program-designer-session/handler.ts

async function startProgramAdaptation(
  userId: string,
  sharedProgramId: string,
  coachId: string,
): Promise<{ conversationId: string }> {
  // 1. Get shared program
  const sharedProgram = await getSharedProgram(sharedProgramId);
  if (!sharedProgram || !sharedProgram.isActive) {
    throw new Error("Shared program not found or inactive");
  }

  // 2. Get user profile and coach config
  const userProfile = await getUserProfile(userId);
  const coachConfig = await getCoachConfig(userId, coachId);

  // 3. Create adaptation conversation session
  const timestamp = Date.now();
  const shortId = Math.random().toString(36).substring(2, 11);
  const conversationId = `conv_adapt_${timestamp}_${shortId}`;

  // 4. Build conversation context with source program
  const conversationContext = {
    conversationId,
    userId,
    coachId,
    coachConfig,
    userProfile,

    // New: Source program for adaptation
    adaptationMode: true,
    sourceProgramTemplate: sharedProgram.programSnapshot,
    sourceCreator: sharedProgram.creatorUsername,

    systemPrompt: buildAdaptationPrompt(coachConfig, sharedProgram),
    messages: [],
  };

  // 5. Save initial conversation state
  await saveConversationSession(conversationContext);

  return { conversationId };
}

function buildAdaptationPrompt(
  coachConfig: CoachConfig,
  sharedProgram: SharedProgram,
): string {
  return `
You are ${coachConfig.coach_name}, a ${coachConfig.selected_personality?.primary_template} coach.

ADAPTATION CONTEXT:
The user is interested in adapting a program created by @${sharedProgram.creatorUsername}.

SOURCE PROGRAM DETAILS:
${JSON.stringify(sharedProgram.programSnapshot, null, 2)}

YOUR TASK:
1. Acknowledge the source program and its creator
2. Analyze how well it fits the user's goals, equipment, and schedule
3. Suggest specific adaptations based on user's profile
4. Generate a customized version that maintains the program's core structure
   but adapts it to the user's specific situation

Remember: Give credit to the original creator while making this program
truly personalized for this user. The goal is adaptation, not wholesale
replacement.

Start by introducing yourself and sharing your initial thoughts on how
this program could work for the user.
  `;
}
```

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

  // 3. Verify program is completed (only completed programs can be shared)
  if (program.status !== "completed") {
    throw new Error(
      `Only completed programs can be shared. Current status: ${program.status}`,
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

```jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSharedProgram } from "../../utils/apis/sharedProgramApi";
import { useAuth } from "../../contexts/AuthContext";
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

  const handleAdapt = () => {
    if (!user) {
      // Redirect to signup with return URL
      navigate(`/signup?redirect=/shared/programs/${sharedProgramId}/adapt`);
    } else {
      // Go to adaptation flow
      navigate(`/shared/programs/${sharedProgramId}/adapt`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!program) return <div>Program not found</div>;

  return (
    <div className={layoutPatterns.pageContainer}>
      {/* Header */}
      <div className={containerPatterns.cardLarge}>
        <div className="program-header">
          <div className={badgePatterns.pinkDot} />
          <h1 className={typographyPatterns.heroTitle}>
            {program.programSnapshot.name}
          </h1>
        </div>

        {/* Attribution */}
        <div
          className={typographyPatterns.caption}
          style={{ color: "var(--neon-cyan)" }}
        >
          Program by @{program.creatorUsername}
        </div>

        {/* Description */}
        <p className={typographyPatterns.body}>
          {program.programSnapshot.description}
        </p>

        {/* Key Stats */}
        <div className="program-stats">
          <div className={badgePatterns.cyan}>
            {program.programSnapshot.totalDays} days
          </div>
          <div className={badgePatterns.cyan}>
            {program.programSnapshot.trainingFrequency}x per week
          </div>
          {program.programSnapshot.equipmentConstraints?.length > 0 && (
            <div className={badgePatterns.cyan}>
              Equipment:{" "}
              {program.programSnapshot.equipmentConstraints.join(", ")}
            </div>
          )}
        </div>

        {/* Training Goals */}
        <div className="training-goals">
          <h3 className={typographyPatterns.heading3}>Training Goals</h3>
          <ul>
            {program.programSnapshot.trainingGoals.map((goal, i) => (
              <li key={i} className={typographyPatterns.body}>
                {goal}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button onClick={handleAdapt} className={buttonPatterns.heroCTA}>
          {user ? "Adapt with My Coach" : "Sign Up to Adapt This Program"}
        </button>
      </div>

      {/* Phase Breakdown */}
      <div className={containerPatterns.cardMedium}>
        <h2 className={typographyPatterns.heading2}>Program Structure</h2>
        {program.programSnapshot.phases.map((phase, index) => (
          <div key={phase.phaseId || index} className="phase-card">
            <h3 className={typographyPatterns.heading3}>
              Phase {index + 1}: {phase.name}
            </h3>
            <div className={typographyPatterns.body}>
              Days {phase.startDay}-{phase.endDay} ({phase.durationDays} days)
            </div>
            <div className={typographyPatterns.body}>
              Focus: {phase.focusAreas?.join(", ") || phase.description}
            </div>
          </div>
        ))}
      </div>

      {/* Privacy Note */}
      <div
        className={typographyPatterns.caption}
        style={{ textAlign: "center", opacity: 0.7 }}
      >
        Detailed workouts only visible after signing up and adapting with your
        AI coach
      </div>
    </div>
  );
}

export default SharedProgramPreview;
```

**Styling Notes:**

- Dark background with neon accents (works for non-logged-in users)
- `containerPatterns.cardLarge` for main section
- Phase cards use `containerPatterns.coachNotesSection` pattern
- CTA uses `buttonPatterns.heroCTA` for maximum conversion

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

### AdaptProgramChat.jsx

**Architecture Decision:** Reuse existing `ProgramDesigner.jsx` and `stream-program-designer-session` infrastructure with adaptation context.

**Why Reuse:**

- Same streaming UI patterns (SSE, typing indicators, message rendering)
- Same agent-based state management (`ProgramDesignerAgent`)
- Same coach conversation flow infrastructure
- Reduces code duplication and maintenance burden
- Leverages battle-tested streaming implementation

**Key Differences from ProgramDesigner:**

1. **Session Creation:** Creates session with `adaptationMode: true` and `sourceProgramTemplate`
2. **Empty State:** Shows source program summary instead of generic tips
3. **Header:** Shows "Adapting: [Program Name]" instead of "Program Designer"
4. **System Prompt:** Coach receives source program context for adaptation

**Reference Files:**

- `src/components/ProgramDesigner.jsx` - Base component to follow
- `amplify/functions/stream-program-designer-session/handler.ts` - Backend streaming
- `src/utils/agents/ProgramDesignerAgent.js` - State management agent

**Implementation Approach:**

```jsx
// src/components/shared-programs/AdaptProgramChat.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getSharedProgram } from "../../utils/apis/sharedProgramApi";
import ProgramDesignerAgent from "../../utils/agents/ProgramDesignerAgent";
import { createProgramDesignerSession } from "../../utils/apis/programDesignerApi";

// Import same UI components as ProgramDesigner.jsx
import {
  containerPatterns,
  layoutPatterns,
  buttonPatterns,
  typographyPatterns,
} from "../../utils/ui/uiPatterns";
import ChatInput from "../shared/ChatInput";
import MessageItem from "../shared/MessageItem"; // Extract from ProgramDesigner if needed

function AdaptProgramChat() {
  const { sharedProgramId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const userId = user?.userId;
  const coachId = searchParams.get("coachId");

  // State
  const [sharedProgram, setSharedProgram] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentState, setAgentState] = useState({
    messages: [],
    isTyping: false,
    isStreaming: false,
    // ... same as ProgramDesigner
  });

  const agentRef = useRef(null);

  // Load shared program on mount
  useEffect(() => {
    loadSharedProgramAndCreateSession();
  }, [sharedProgramId, coachId]);

  const loadSharedProgramAndCreateSession = async () => {
    try {
      // 1. Load the shared program
      const program = await getSharedProgram(sharedProgramId);
      setSharedProgram(program);

      // 2. Create adaptation session with source program context
      const session = await createProgramDesignerSession(userId, coachId, {
        adaptationMode: true,
        sourceProgramTemplate: program.programSnapshot,
        sourceCreator: program.creatorUsername,
        sharedProgramId: program.sharedProgramId,
      });

      setSessionId(session.sessionId);

      // 3. Initialize agent with session
      agentRef.current = new ProgramDesignerAgent({
        userId,
        coachId,
        sessionId: session.sessionId,
        onStateChange: setAgentState,
        // ... same config as ProgramDesigner
      });

      await agentRef.current.loadCoachDetails(userId, coachId);
      await agentRef.current.loadSession(userId, session.sessionId);
    } catch (error) {
      console.error("Failed to initialize adaptation:", error);
    } finally {
      setLoading(false);
    }
  };

  // Render adaptation-specific empty state
  const renderAdaptationEmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 px-4">
      <div className="text-center space-y-2">
        <h2 className={typographyPatterns.emptyStateHeader}>
          Adapting: {sharedProgram?.programSnapshot.name}
        </h2>
        <p className={typographyPatterns.emptyStateDescription}>
          Created by @{sharedProgram?.creatorUsername}
        </p>
      </div>

      {/* Source program summary */}
      <div className={containerPatterns.cardMedium}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-synthwave-text-secondary">Duration:</span>
            <span className="ml-2">
              {sharedProgram?.programSnapshot.totalDays} days
            </span>
          </div>
          <div>
            <span className="text-synthwave-text-secondary">Frequency:</span>
            <span className="ml-2">
              {sharedProgram?.programSnapshot.trainingFrequency}x/week
            </span>
          </div>
        </div>
      </div>

      <p className={typographyPatterns.emptyStateDescription}>
        Your coach will analyze this program and suggest adaptations based on
        your profile. Send a message to start the conversation.
      </p>
    </div>
  );

  // Rest follows ProgramDesigner.jsx pattern exactly:
  // - Message rendering with streaming support
  // - ChatInput with same configuration
  // - Typing indicators, scroll behavior, etc.

  return (
    <div className={layoutPatterns.pageContainer}>
      {/* Header with "Adapting: Program Name" */}
      {/* Messages area - same as ProgramDesigner */}
      {/* ChatInput - same as ProgramDesigner */}
    </div>
  );
}

export default AdaptProgramChat;
```

**Backend Modifications:**

The `stream-program-designer-session` handler needs to:

1. Check for `adaptationMode` in the session
2. Build adaptation-specific system prompt when in adaptation mode
3. Include source program context in AI conversation

```typescript
// In stream-program-designer-session/handler.ts or handler-helpers.ts

// Modify loadSessionData or handleProgramDesignerFlow to check:
if (programSession.adaptationMode && programSession.sourceProgramTemplate) {
  // Use buildAdaptationPrompt() instead of standard program design prompt
  systemPrompt = buildAdaptationPrompt(
    coachConfig,
    programSession.sourceProgramTemplate,
    programSession.sourceCreator,
  );
}
```

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
 * Start a program adaptation conversation with a coach
 * @param {string} userId - The user ID
 * @param {string} sharedProgramId - The shared program ID to adapt
 * @param {string} coachId - The coach ID to use for adaptation
 * @returns {Promise<Object>} - The conversation session info
 */
export async function startProgramAdaptation(userId, sharedProgramId, coachId) {
  const url = `${getApiUrl("")}/users/${userId}/shared-programs/${sharedProgramId}/adapt`;

  const response = await authenticatedFetch(url, {
    method: "POST",
    body: JSON.stringify({ coachId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("startProgramAdaptation: Error response:", errorText);
    throw new Error(`Failed to start adaptation: ${response.status}`);
  }
  return response.json();
}
```

### Routes Integration

**File:** `src/App.jsx`

```jsx
import SharedProgramPreview from "./components/shared-programs/SharedProgramPreview";
import MySharedPrograms from "./components/shared-programs/MySharedPrograms";
import AdaptProgramChat from "./components/shared-programs/AdaptProgramChat";

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
    path="/shared/programs/:sharedProgramId/adapt"
    element={
      <ProtectedRoute>
        <AdaptProgramChat />
      </ProtectedRoute>
    }
  />
  <Route
    path="/programs/shared"
    element={
      <ProtectedRoute>
        <MySharedPrograms />
      </ProtectedRoute>
    }
  />
</Routes>;
```

### Integration with ManagePrograms

**File:** `src/components/programs/ManagePrograms.jsx`

Add share button to each completed program card:

```jsx
{
  program.status === "completed" && (
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
- Success: "Link copied! Time to inspire some athletes. 💪"

**Preview Page:**

- CTA for non-members: "Sign Up to Adapt This Program"
- CTA for members: "Adapt with My Coach"
- Attribution line: "Program by @username"
- Privacy note: "Detailed workouts only visible after signing up"

**Coach Adaptation Intro:**

```
"Hey! I see you're interested in @creator's program. Let me take a look...

[analyzes program]

This looks like a solid approach. Based on your profile, here's what
I'm thinking we could adjust..."
```

**After Successful Adaptation:**

```
"Nice! This program is now yours to crush. Week 1 starts [date].

I've customized it for your equipment and schedule while keeping the
core strength-building approach that worked for @creator. Let's get it!"
```

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
- [ ] Create Lambda handlers: `create-shared-program`, `get-shared-program`
- [ ] Add API routes to `amplify/api/resource.ts`

**Day 2: Frontend Foundation**

- [ ] Build `ShareProgramModal.jsx`
- [ ] Add share button to `ManagePrograms.jsx`
- [ ] Create API wrapper functions in `sharedProgramApi.js`
- [ ] Test share link generation flow

### Week 2: Preview & Adaptation (2-3 days)

**Day 3: Public Preview**

- [ ] Build `SharedProgramPreview.jsx` component
- [ ] Add `/shared/programs/:sharedProgramId` route to `App.jsx`
- [ ] Test public access (no auth)
- [ ] Add social share buttons
- [ ] Build `CoachSelectionModal.jsx` component

**Day 4-5: Adaptation Flow**

- [ ] Modify `programDesignerApi.js` to support adaptationMode in createProgramDesignerSession
- [ ] Modify `create-program-designer-session` Lambda to accept adaptation context
- [ ] Modify `stream-program-designer-session` to build adaptation prompt when adaptationMode=true
- [ ] Build `AdaptProgramChat.jsx` (reuse ProgramDesigner.jsx patterns and streaming UI)
- [ ] Wire up coach selection flow (single coach → skip modal, multiple → show selection)
- [ ] Test full adaptation conversation flow end-to-end

### Week 3: Management & Polish (1 day)

**Day 6: Share Management**

- [ ] Build `MySharedPrograms.jsx` component
- [ ] Create `get-shared-programs` and `delete-shared-program` Lambdas
- [ ] Add unshare functionality
- [ ] Add `/programs/shared` route

**Day 7: Testing & Launch Prep**

- [ ] End-to-end testing (share → preview → adapt → complete)
- [ ] Create `sharedProgramAnalytics.js` with all tracking events
- [ ] Integrate analytics calls into ShareProgramModal, SharedProgramPreview, AdaptProgramChat
- [ ] Test analytics events fire correctly at each step
- [ ] Write help documentation
- [ ] Create sample shared programs for testing
- [ ] Soft launch with beta users

**Total Estimated Time: 6-7 days**

---

## Success Metrics

### Growth Metrics

- **Shares Created:** Number of programs shared per week
- **Share Click Rate:** Clicks on shared links / total shares
- **Preview to Signup:** Non-members who sign up after viewing preview
- **Adaptation Rate:** Members who adapt shared programs / preview views
- **Completion Rate:** Users who complete adapted programs

### Engagement Metrics

- **Social Shares:** Programs shared to social media vs. direct links
- **Time to Adaptation:** Time from preview to starting adaptation conversation
- **Conversation Depth:** Number of messages in adaptation conversations
- **Customization Level:** Percentage of programs significantly modified during adaptation

### Quality Metrics

- **Adaptation Success:** Programs completed after adaptation
- **User Satisfaction:** Feedback on adapted programs
- **Coach Quality:** Quality of adaptation conversations (user ratings)

### Target Goals (3 months post-launch)

- 20% of completed programs get shared
- 30% click-through rate on shared links
- 15% conversion rate from preview to signup (non-members)
- 60% of members who view preview start adaptation
- 70% completion rate on adapted programs

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

- Only completed programs can be shared (user finished it themselves)
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

### Completed ✅

**Phase 1 - Core Infrastructure:**

1. **Type Definitions** - `amplify/functions/libs/shared-program/types.ts`
   - SharedProgramSnapshot interface
   - SharedProgram entity interface
   - SharedProgramDetails interface
   - API request/response types
   - Created: January 2026

2. **DynamoDB Operations** - `amplify/dynamodb/operations.ts`
   - saveSharedProgram() - Stores shared program with GSI for user queries
   - getSharedProgram() - Public access retrieval
   - querySharedPrograms() - Get all shared programs for a user
   - deactivateSharedProgram() - Soft delete with ownership verification
   - Created: January 2026

3. **S3 Utilities** - `amplify/functions/libs/shared-program/s3-utils.ts`
   - storeSharedProgramDetailsInS3() - Store full program details
   - getSharedProgramDetailsFromS3() - Retrieve program details
   - Created: January 2026

4. **Lambda Handlers** - Created: January 2026
   - `create-shared-program/` - Create shared program from existing program
   - `get-shared-program/` - Public preview endpoint (no auth required)
   - `get-shared-programs/` - Get user's shared programs (auth required)
   - `delete-shared-program/` - Deactivate shared program (auth required)

### In Progress 🚧

**Phase 1 - API & Frontend:**

- API Routes configuration in `amplify/api/resource.ts`
- Lambda registration in `amplify/backend.ts`
- Frontend components (ShareProgramModal, SharedProgramPreview, etc.)
- Program adaptation flow

### Not Started ⏸️

**Phase 2 - Program Adaptation:**

- Adaptation-specific prompts and handler modifications
- Coach selection flow
- Analytics tracking implementation
- Social sharing integration

---

## Appendix: Key File References

### Backend Files

**New Files to Create:**

- `amplify/functions/libs/shared-program/types.ts` - SharedProgram interfaces
- `amplify/functions/libs/shared-program/s3-utils.ts` - S3 copy operations
- `amplify/functions/create-shared-program/resource.ts` - Lambda resource definition
- `amplify/functions/create-shared-program/handler.ts` - Share creation Lambda
- `amplify/functions/get-shared-program/resource.ts` - Lambda resource definition (PUBLIC)
- `amplify/functions/get-shared-program/handler.ts` - Public preview Lambda
- `amplify/functions/get-shared-programs/resource.ts` - Lambda resource definition
- `amplify/functions/get-shared-programs/handler.ts` - User management Lambda
- `amplify/functions/delete-shared-program/resource.ts` - Lambda resource definition
- `amplify/functions/delete-shared-program/handler.ts` - Unshare Lambda
- `amplify/functions/start-program-adaptation/resource.ts` - Lambda resource definition
- `amplify/functions/start-program-adaptation/handler.ts` - Adaptation Lambda

**Existing Files to Modify:**

- `amplify/dynamodb/operations.ts` - Add SharedProgram CRUD operations (saveSharedProgram, getSharedProgram, querySharedPrograms, deactivateSharedProgram)
- `amplify/api/resource.ts` - Add new API routes (public and protected)
- `amplify/backend.ts` - Register new Lambda functions AND attach shared policies:
  - Import new Lambda resources
  - Add to createCoreApi function parameters
  - Attach DynamoDB and S3 policies per "Lambda Permissions" section above
- `amplify/functions/create-program-designer-session/handler.ts` - Accept adaptationMode context in session creation
- `amplify/functions/stream-program-designer-session/handler.ts` - Check for adaptationMode and use adaptation prompt
- `amplify/functions/libs/program-designer/handler-helpers.ts` - Add buildAdaptationPrompt() function
- `amplify/functions/libs/program-designer/types.ts` - Add adaptation fields to ProgramDesignerSession interface

### Frontend Files

**New Files to Create:**

- `src/components/shared-programs/ShareProgramModal.jsx` - Share link generation modal
- `src/components/shared-programs/SharedProgramPreview.jsx` - Public preview page
- `src/components/shared-programs/MySharedPrograms.jsx` - User's share management
- `src/components/shared-programs/AdaptProgramChat.jsx` - Adaptation conversation (reuses ProgramDesigner patterns)
- `src/components/shared-programs/CoachSelectionModal.jsx` - Coach selection for adaptation
- `src/utils/apis/sharedProgramApi.js` - API wrapper functions
- `src/utils/analytics/sharedProgramAnalytics.js` - Analytics event tracking

**Existing Files to Modify:**

- `src/App.jsx` - Add routes
- `src/components/programs/ManagePrograms.jsx` - Add share button
- `src/utils/apis/programDesignerApi.js` - Add adaptationMode support to createProgramDesignerSession

### Reference Files

**Backend Patterns:**

- **DynamoDB Operations Pattern:** `amplify/dynamodb/operations.ts` lines 3070-3120 (saveProgram)
- **CoachTemplate Pattern:** `amplify/dynamodb/operations.ts` lines 2768-2846 (createCoachConfigFromTemplate)
- **Streaming Conversation:** `amplify/functions/stream-program-designer-session/handler.ts`
- **S3 Operations:** `amplify/functions/libs/program/s3-utils.ts`
- **Public Lambda Handler:** `amplify/functions/get-coach-template/handler.ts` - Pattern for no-auth endpoints
- **Protected Lambda Handler:** `amplify/functions/get-program/handler.ts` - Pattern for authenticated endpoints
- **Lambda Resource Definition:** `amplify/functions/get-program/resource.ts`
- **Shared Policies:** `amplify/shared-policies.ts` - Policy attachment patterns
- **API Response Helpers:** `amplify/functions/libs/api-helpers.ts` - createOkResponse, createErrorResponse
- **Auth Middleware:** `amplify/functions/libs/auth/middleware.ts` - withAuth pattern

**Frontend Patterns:**

- **Modal UI Pattern:** `src/components/CoachCreator.jsx`
- **Program Display:** `src/components/programs/ProgramDashboard.jsx`
- **Program Management:** `src/components/programs/ManagePrograms.jsx` - List view, action buttons
- **Program Designer Streaming UI:** `src/components/ProgramDesigner.jsx` - Reuse for AdaptProgramChat
- **Program Designer Agent:** `src/utils/agents/ProgramDesignerAgent.js` - State management for adaptation
- **UI Patterns:** `src/utils/ui/uiPatterns.js` - Button, container, typography patterns
- **API Config:** `src/utils/apis/apiConfig.js` - getApiUrl, authenticatedFetch
- **API Service Pattern:** `src/utils/apis/programApi.js` - Example API wrapper functions
- **Program Designer API:** `src/utils/apis/programDesignerApi.js` - Session creation pattern

---

## Summary

This simplified approach to program sharing:

✅ Enables viral growth through authentic personal sharing
✅ Maintains coaching as the central value proposition
✅ Requires 40% less development time than marketplace approach
✅ Avoids creator economy complexity
✅ Creates clear path from discovery to signup to engagement
✅ Focuses on user success stories rather than template browsing

**Core Philosophy:** Sharing is a user feature that amplifies success stories, not a marketplace that commoditizes coaching.

The key insight is that **personal recommendations beat anonymous browsing** for trust and conversion. By keeping sharing link-based and coach-mediated, we drive growth while deepening coaching relationships rather than replacing them.
