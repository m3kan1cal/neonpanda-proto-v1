# Training Programs - Phase 1 Complete ✅

**Date Completed:** October 20, 2025
**Status:** Backend infrastructure fully functional and ready for Phase 2

---

## Overview

Phase 1 successfully established the complete backend infrastructure for the Training Programs feature. All core CRUD operations, calendar logic, and S3 storage are operational and ready for integration with AI program generation (Phase 2) and frontend components (Phase 4).

---

## ✅ Completed Components

### 1. Data Model & Types (`amplify/functions/libs/training-program/`)

**Files Created:**
- `types.ts` - Complete TypeScript type definitions
- `calendar-utils.ts` - Date calculations and calendar logic (timezone-aware)
- `s3-utils.ts` - S3 storage for program details
- `workout-utils.ts` - Template to Universal Schema conversion
- `index.ts` - Module exports

**Key Types Defined:**
- `TrainingProgram` - Main program entity with phases, status, analytics
- `WorkoutTemplate` - Individual workout template structure (prescribed workouts)
- `TrainingProgramPhase` - Phase definitions with focus areas
- `TrainingProgramDetails` - S3-stored detailed program data
- `Exercise` - Movement definitions compatible with Universal Workout Schema
- Event types for all API operations
- UI helper types (TodaysWorkoutTemplates, TrainingProgramSummary)

### 2. Database Operations (`amplify/dynamodb/operations.ts`)

**Functions Added:**
```typescript
// Core CRUD
saveTrainingProgram(program: TrainingProgram): Promise<void>
getTrainingProgram(userId, coachId, programId): Promise<DynamoDBItem<TrainingProgram> | null>
updateTrainingProgram(userId, coachId, programId, updates): Promise<TrainingProgram>
deleteTrainingProgram(userId, coachId, programId): Promise<void>

// Query operations
queryTrainingProgramsByCoach(userId, coachId, options?): Promise<DynamoDBItem<TrainingProgram>[]>
queryTrainingPrograms(userId, options?): Promise<DynamoDBItem<TrainingProgram>[]>
queryTrainingProgramSummaries(userId, coachId?): Promise<TrainingProgramSummary[]>
queryTrainingProgramsCount(userId, options?): Promise<{ totalCount: number }>
```

**DynamoDB Schema:**
```
PK: user#{userId}#coach#{coachId}
SK: program#{programId}

GSI-1 (for cross-coach queries):
gsi1pk: user#{userId}
gsi1sk: program#{programId}
```

### 3. Calendar Utilities

**Key Functions:**
- `calculateEndDate()` - Calculate program end date from start + duration
- `calculateCurrentDay()` - Determine today's day number accounting for pauses
- `calculateScheduledDate()` - Calculate scheduled date for any workout day
- `calculatePauseDuration()` - Duration between pause and resume
- `recalculateWorkoutDates()` - Update all dates after pause/resume
- `getPhaseForDay()` - Get phase info for specific day
- `generateProgramCalendar()` - Full calendar view for UI
- `getProgressPercentage()` - Progress tracking

### 4. S3 Storage Utilities

**Key Functions:**
- `storeProgramDetailsInS3()` - Store daily workout templates and metadata
- `getProgramDetailsFromS3()` - Retrieve complete program details
- `saveProgramDetailsToS3()` - Update program details (replaces updateWorkoutInS3)
- `getWorkoutTemplateFromS3()` - Get single workout template
- `getMultipleWorkoutTemplatesFromS3()` - Batch template retrieval
- `getWorkoutTemplatesForPhase()` - Get all templates in a phase

**S3 Structure:**
```
training-programs/{userId}/{programId}_{timestamp}.json
```

**Note:** S3 key structure was simplified (removed branch prefix) for main apps bucket.

### 5. Lambda Functions (6 endpoints)

#### CREATE Training Program
- **Path:** `POST /users/{userId}/coaches/{coachId}/programs`
- **Handler:** `amplify/functions/create-training-program/handler.ts`
- **Function:** Create program structure (workout templates generated in Phase 2)
- **Permissions:** DynamoDB Read/Write, S3 Apps

#### GET Training Program
- **Path:** `GET /users/{userId}/coaches/{coachId}/programs/{programId}`
- **Handler:** `amplify/functions/get-training-program/handler.ts`
- **Function:** Retrieve single program with details
- **Permissions:** DynamoDB Read, S3 Apps

#### GET Training Programs (List)
- **Path:** `GET /users/{userId}/coaches/{coachId}/programs`
- **Handler:** `amplify/functions/get-training-programs/handler.ts`
- **Function:** List programs with filters (status, limit)
- **Query Params:** `?status=active&limit=10`
- **Permissions:** DynamoDB Read

#### UPDATE Training Program
- **Path:** `PUT /users/{userId}/coaches/{coachId}/programs/{programId}`
- **Handler:** `amplify/functions/update-training-program/handler.ts`
- **Function:** Update status (pause, resume, complete, archive) or modify program fields
- **Body Actions:** `{ action: 'pause' | 'resume' | 'complete' | 'archive' }` or direct field updates
- **Permissions:** DynamoDB Read/Write

#### LOG Workout Template
- **Path:** `POST /users/{userId}/coaches/{coachId}/programs/{programId}/templates/{templateId}/log`
- **Handler:** `amplify/functions/log-workout-template/handler.ts`
- **Function:** Convert template to logged workout (Universal Schema), mark complete, advance program
- **Body:** `{ workoutData?, feedback?, completedAt? }`
- **Returns:** Created workout + updated template + program state
- **Permissions:** DynamoDB Read/Write, S3 Apps

#### GET Workout Template
- **Path:** `GET /users/{userId}/coaches/{coachId}/programs/{programId}/templates`
- **Path:** `GET /users/{userId}/coaches/{coachId}/programs/{programId}/templates/{templateId}`
- **Handler:** `amplify/functions/get-workout-template/handler.ts`
- **Function:** Get workout templates by criteria (specific template, by day, today's templates, or all)
- **Query Params:** `?day=5&today=true`
- **Returns:** Template(s) + phase info + next template preview + progress
- **Permissions:** DynamoDB Read, S3 Apps

### 6. API Integration

**Routes Registered in `amplify/api/resource.ts`:**
- All 6 endpoints added to HTTP API Gateway V2
- All routes protected with Cognito User Pool authorizer
- CORS configured for all methods

**Backend Integration in `amplify/backend.ts`:**
- All Lambda functions imported and registered in `defineBackend()`
- Lambda resources passed to `createCoreApi()`
- Permissions granted via shared policies

### 7. IAM Permissions

**DynamoDB Read/Write:**
- `createTrainingProgram`
- `updateTrainingProgram`
- `logWorkoutTemplate`

**DynamoDB Read-Only:**
- `getTrainingProgram`
- `getTrainingPrograms`
- `getWorkoutTemplate`

**S3 Apps Bucket Access:**
- `createTrainingProgram` (store program details with empty templates)
- `getTrainingProgram` (read program details)
- `logWorkoutTemplate` (update template status, create workout log)
- `getWorkoutTemplate` (read workout templates)

---

## 🎯 Business Logic Implemented

### Status State Machine
```
States: "active" | "paused" | "completed" | "archived"

Transitions:
- Created → active
- active → paused (user pauses)
- paused → active (user resumes, dates recalculated)
- active → completed (all workouts finished)
- any → archived (user archives)
```

### Pause/Resume Logic
1. **Pause:** Records `pausedAt` timestamp, sets status to "paused"
2. **Resume:**
   - Calculates pause duration (days)
   - Adds to cumulative `pausedDuration`
   - Recalculates all future workout dates
   - Sets status back to "active"
3. **Effect:** Past workouts unchanged, future workouts shift forward

### Workout Template Logging & Advancement
- Logging a template converts it to a logged workout (Universal Schema)
- Template and logged workout are linked via `linkedWorkoutId`
- Only completing primary templates advances `currentDay` by 1
- Optional/accessory templates track separately via `dayCompletionStatus`
- Adherence rate automatically recalculated
- `lastActivityDate` updated on any interaction

### Calendar Calculations
- All dates stored as `YYYY-MM-DD` strings
- Day 1 = startDate
- Day N = startDate + (N-1) days + pausedDuration
- Timezone-aware (UTC storage, user timezone for display)

---

## 📊 Data Flow Architecture

### Program Creation Flow
```
1. User initiates program creation (frontend)
2. POST /programs with program structure
3. createTrainingProgram Lambda:
   - Validates input
   - Calculates dates and phases
   - Creates TrainingProgram entity
   - Saves to DynamoDB
4. Returns programId and structure
5. [Phase 2] AI generates daily workouts
6. [Phase 2] Workouts stored in S3, program updated
```

### Today's Workout Template Flow
```
1. User requests today's workout templates
2. GET /programs/{programId}/templates?today=true
3. getWorkoutTemplate Lambda:
   - Loads program from DynamoDB
   - Fetches user profile for timezone
   - Calculates current day in user's timezone (accounting for pauses)
   - Retrieves templates from S3 for current day
   - Gets phase context
   - Fetches next template preview
4. Returns enriched template data with progress and completion status
```

### Workout Template Logging Flow
```
1. User logs workout template completion
2. POST /programs/{programId}/templates/{templateId}/log { workoutData?, feedback?, completedAt? }
3. logWorkoutTemplate Lambda:
   - Converts template to Workout (Universal Schema) via convertTemplateToUniversalSchema()
   - Saves workout to DynamoDB as logged workout
   - Updates template in S3 (status: 'completed', linkedWorkoutId, feedback)
   - Updates program in DynamoDB:
     * completedWorkouts++
     * currentDay++ (only if primary template)
     * dayCompletionStatus updated
     * adherenceRate recalculated
     * lastActivityDate updated
4. Returns logged workout, updated template, and program state
```

---

## 🔧 Technical Decisions

### Why S3 for Workout Templates?
- **Size:** Programs can have 50+ detailed workout templates (100KB+)
- **DynamoDB Limit:** 400KB item size limit
- **Read Patterns:** Usually only need current day's templates
- **Cost:** S3 cheaper for large, infrequently accessed data
- **Flexibility:** Easy to regenerate/update individual templates in Phase 2

### Why GSI-1 for Cross-Coach Queries?
- Users can have programs from multiple coaches
- Need to query "all my programs" regardless of coach
- GSI-1 enables efficient cross-coach queries
- Maintains coach-specific primary key for access patterns

### Why Manual Advancement?
- Gives users control (won't accidentally skip if sick)
- Allows retroactive completion of missed workouts
- Prevents confusion with auto-skip behavior
- Maintains data integrity

---

## ✅ Phase 1 Success Criteria Met

- [x] Complete data model with all entity types
- [x] DynamoDB CRUD operations functional
- [x] Calendar logic handles dates, pauses, phases
- [x] S3 storage for program details operational
- [x] 6 Lambda endpoints created and tested
- [x] API routes registered with authorizer
- [x] IAM permissions granted correctly
- [x] No linting errors
- [x] Follows existing codebase patterns

---

## 🚀 Ready for Phase 2

Phase 1 provides the complete foundation for:
- ✅ Storing and retrieving programs
- ✅ Managing program lifecycle (pause/resume/complete)
- ✅ Tracking workout completion and progress
- ✅ Calendar-based scheduling with flexibility

**Next Steps (Phase 2 - AI Program Generation):**
- Add `mode` parameter to conversation system (Chat vs Build)
- Create Build mode system prompt for program creation conversations
- Integrate Claude for AI program generation from user conversations
- Generate daily workout templates based on user goals, equipment, and constraints
- Store AI-generated templates in S3 using Phase 1 infrastructure
- Link templates to program via existing `s3DetailKey`

**Note:** Phase 1 built the backend foundation (storage, CRUD, calendar logic). Phase 2 will add conversational AI generation on top of this infrastructure.

---

## 📝 API Examples

### Create Program Structure
```bash
POST /users/user123/coaches/coach456/programs
{
  "programName": "8-Week Competition Prep",
  "programDescription": "Prepare for Spartan Race with strength and endurance",
  "totalDays": 56,
  "trainingFrequency": 5,
  "startDate": "2025-10-27",
  "equipmentConstraints": ["barbell", "dumbbells to 50lbs", "pull-up bar"],
  "trainingGoals": ["improve running speed", "build upper body strength"],
  "phases": [
    {
      "phaseName": "Base Building",
      "phaseDescription": "Foundation strength and endurance",
      "durationDays": 14,
      "focusAreas": ["strength", "movement quality"]
    },
    {
      "phaseName": "Intensification",
      "phaseDescription": "Increase volume and intensity",
      "durationDays": 28,
      "focusAreas": ["power", "endurance"]
    },
    {
      "phaseName": "Peak",
      "phaseDescription": "Race-specific preparation",
      "durationDays": 14,
      "focusAreas": ["speed", "agility"]
    }
  ]
}
```

### Get Today's Workout Templates
```bash
GET /users/user123/coaches/coach456/programs/program789/templates?today=true

Response:
{
  "todaysWorkoutTemplates": {
    "programId": "program789",
    "programName": "8-Week Competition Prep",
    "dayNumber": 5,
    "totalDays": 56,
    "phaseName": "Base Building",
    "templates": [
      {
        "templateId": "template_day5_primary",
        "templateType": "primary",
        "dayNumber": 5,
        "scheduledDate": "2025-10-31",
        "name": "Heavy Back Squat + Short Metcon",
        "description": "...",
        "estimatedDuration": 60,
        "prescribedExercises": [...],
        "status": "pending"
      }
    ],
    "completionStatus": {
      "primaryComplete": false,
      "optionalCompleted": 0,
      "totalOptional": 1
    },
    "nextWorkout": {
      "dayNumber": 6,
      "name": "Active Recovery",
      "scheduledDate": "2025-11-01"
    }
  },
  "progressPercentage": 9,
  "daysRemaining": 52
}
```

### Log Workout Template
```bash
POST /users/user123/coaches/coach456/programs/program789/templates/template_day5_primary/log
{
  "feedback": {
    "rating": 5,
    "difficulty": "just_right",
    "comments": "Great workout, felt strong!"
  },
  "completedAt": "2025-10-31T14:30:00Z", // Optional, defaults to now
  "workoutData": { /* Optional: Override with actual performance data */ }
}

Response:
{
  "success": true,
  "workout": { /* Logged workout in Universal Schema */ },
  "template": { /* Updated template with status: 'completed' */ },
  "program": { /* Updated program state */ },
  "message": "Workout logged successfully"
}
```

### Pause Program
```bash
PUT /users/user123/coaches/coach456/programs/program789
{
  "action": "pause"
}
```

---

## 📈 Metrics Ready to Track

Phase 1 implementation supports tracking:
- Program creation rate
- Active vs paused vs completed programs
- Adherence rate (completedWorkouts / totalWorkouts)
- Daily engagement (lastActivityDate)
- Program completion rate
- Average program duration
- Phase progression rates
- Workout skip patterns

---

**Phase 1 Status: ✅ COMPLETE**
**Ready for Phase 2: ✅ YES**
**Technical Debt: None**
**Blockers: None**

