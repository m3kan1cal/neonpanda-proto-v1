# Shared Program Feature: Postman Integration Testing Guide

**Purpose:** End-to-end integration testing of the program sharing feature using real user data in Postman.

**Prerequisites:**

- Backend deployed to AWS (see `backend-deploy` TODO)
- Two real test users with active programs and coaches
- Postman installed with authentication configured (see `postman-auth-setup.md`)

---

## Test Scenario Overview

This integration test walks through the complete sharing flow:

```
Step 1: Get User 1's completed program  (GET /programs)
Step 2: Create shared program           (POST /share)
Step 3: Preview shared program          (GET /shared-programs/{id})  [PUBLIC]
Step 4: Copy to User 2's account        (POST /copy)
Step 5: Verify copied program           (GET /programs/{id})
Step 6: List User 1's shared programs   (GET /shared-programs)
Step 7: Deactivate share (cleanup)      (DELETE /shared-programs/{id})
```

---

## Required Test Data

Before starting, gather the following information:

### User 1 (Creator)

- **User ID**: `user_abc123_1234567890_x7k2m` (example)
- **Coach ID**: `user_abc123_coach_1704067200000` (example)
- **Completed Program ID**: `program_abc123_1705312200000_x7k2m`
- **Auth Token**: Get via Postman authentication

### User 2 (Recipient)

- **User ID**: `user_def456_1234567890_y8n3p` (example)
- **Coach ID**: `user_def456_coach_1704067200000_z9o4q`
- **Auth Token**: Get via Postman authentication (different user)

### API Base URL

```
https://api.neonpanda.com
OR
https://<sandbox-id>.execute-api.<region>.amazonaws.com
```

**Get from:** `amplify_outputs.json` → `custom.api.<apiId>.endpoint`

---

## Postman Collection Setup

### Environment Variables

Create a new Postman environment named `NeonPanda - Shared Program Test` with these variables:

```
API_BASE_URL          = <from amplify_outputs.json>
USER1_ID              = <creator user ID>
USER1_COACH_ID        = <creator's coach ID>
USER1_TOKEN           = <will be set by auth request>
USER1_PROGRAM_ID      = <completed program ID>

USER2_ID              = <recipient user ID>
USER2_COACH_ID        = <recipient's coach ID>
USER2_TOKEN           = <will be set by auth request>

SHARED_PROGRAM_ID     = <will be set by Step 2>
COPIED_PROGRAM_ID     = <will be set by Step 4>
```

---

## Test Steps

### STEP 0: Authenticate Both Users

**Request 0a: Authenticate User 1 (Creator)**

```http
POST https://cognito-idp.<region>.amazonaws.com/
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth

{
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "<USER_POOL_CLIENT_ID>",
  "AuthParameters": {
    "USERNAME": "<user1_email>",
    "PASSWORD": "<user1_password>"
  }
}
```

**Tests (JavaScript):**

```javascript
// Save token to environment
const responseJson = pm.response.json();
if (responseJson.AuthenticationResult) {
  pm.environment.set("USER1_TOKEN", responseJson.AuthenticationResult.IdToken);
  console.log("✅ User 1 authenticated");
}
```

**Request 0b: Authenticate User 2 (Recipient)**

Same as 0a, but save to `USER2_TOKEN`.

---

### STEP 1: Get User 1's Completed Program

**Purpose:** Verify User 1 has a completed program that can be shared.

**Request:**

```http
GET {{API_BASE_URL}}/users/{{USER1_ID}}/coaches/<coachId>/programs/{{USER1_PROGRAM_ID}}
Authorization: Bearer {{USER1_TOKEN}}
```

**Expected Response (200 OK):**

```json
{
  "program": {
    "programId": "program_abc123_1705312200000_x7k2m",
    "userId": "user_abc123_1234567890_x7k2m",
    "coachIds": ["user_abc123_coach_1704067200000"],
    "coachNames": ["Coach Marcus"],
    "name": "Olympic Lift Strength Builder",
    "description": "8-week program focusing on snatch and clean & jerk",
    "status": "completed",  // CRITICAL: Must be completed to share
    "totalDays": 56,
    "trainingFrequency": 5,
    "phases": [...],
    "trainingGoals": ["Increase snatch 1RM", "Improve technique"],
    "equipmentConstraints": ["barbell", "squat_rack", "bumper_plates"],
    "totalWorkouts": 40,
    "completedWorkouts": 40,
    "s3DetailKey": "programs/user_abc123.../program_abc123.../details.json",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Tests (JavaScript):**

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Program is completed", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.status).to.eql("completed");
});

pm.test("Program has workouts", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.totalWorkouts).to.be.above(0);
});
```

**Manual Verification:**

- [ ] Program status is `"completed"`
- [ ] Program has phases, goals, equipment constraints
- [ ] `s3DetailKey` is present

---

### STEP 2: Create Shared Program

**Purpose:** Generate a shareable link for the completed program.

**Request:**

```http
POST {{API_BASE_URL}}/users/{{USER1_ID}}/programs/{{USER1_PROGRAM_ID}}/share
Authorization: Bearer {{USER1_TOKEN}}
Content-Type: application/json

{
  "coachId": "<user1_coach_id>"
}
```

**Note:** `programId` comes from the URL path parameter, `coachId` is required in the body.

**Expected Response (201 Created):**

```json
{
  "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m",
  "shareUrl": "https://neonpanda.com/shared/programs/sharedProgram_abc123_1705312200000_x7k2m",
  "createdAt": "2025-01-17T10:30:00Z",
  "message": "Program shared successfully"
}
```

**Tests (JavaScript):**

```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Response has sharedProgramId", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.sharedProgramId).to.be.a("string");

  // Save for next requests
  pm.environment.set("SHARED_PROGRAM_ID", jsonData.sharedProgramId);
  console.log("✅ Shared Program ID:", jsonData.sharedProgramId);
});

pm.test("Share URL is valid", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.shareUrl).to.include(jsonData.sharedProgramId);
});
```

**Manual Verification:**

- [ ] `sharedProgramId` is saved to environment
- [ ] `shareUrl` contains the full public URL
- [ ] Response includes `createdAt` timestamp

**What Happened Backend:**

1. DynamoDB: `SharedProgram` entity created with `pk: sharedProgram#{id}`, `gsi1pk: user#{userId}`
2. S3: Full program details stored at `sharedPrograms/{userId}/{sharedProgramId}_{timestamp}.json`

---

### STEP 3: Preview Shared Program (Public Access)

**Purpose:** Verify the shared program is publicly accessible (no auth required).

**Request:**

```http
GET {{API_BASE_URL}}/shared-programs/{{SHARED_PROGRAM_ID}}
# NO AUTHORIZATION HEADER - Public endpoint
```

**Expected Response (200 OK):**

```json
{
  "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m",
  "creatorUsername": "marcus_fitness",
  "programSnapshot": {
    "name": "Olympic Lift Strength Builder",
    "description": "8-week program focusing on snatch and clean & jerk",
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
      },
      {
        "phaseId": "phase_2",
        "name": "Strength Peak",
        "startDay": 29,
        "endDay": 56,
        "durationDays": 28,
        "focusAreas": ["Max strength", "Competition prep"]
      }
    ],
    "trainingGoals": ["Increase snatch 1RM", "Improve technique"],
    "equipmentConstraints": ["barbell", "squat_rack", "bumper_plates"],
    "coachNames": ["Coach Marcus"]
  },
  "createdAt": "2025-01-17T10:30:00Z"
}
```

**Tests (JavaScript):**

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response includes program snapshot", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.programSnapshot).to.be.an("object");
  pm.expect(jsonData.programSnapshot.name).to.be.a("string");
});

pm.test("Response includes creator attribution", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.creatorUsername).to.be.a("string");
});

pm.test("Response includes phase breakdown", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.programSnapshot.phases).to.be.an("array");
  pm.expect(jsonData.programSnapshot.phases.length).to.be.above(0);
});

pm.test("Workout templates NOT exposed", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.workoutTemplates).to.be.undefined;
});
```

**Manual Verification:**

- [ ] Request succeeded WITHOUT authentication
- [ ] Response shows program structure (phases, goals, equipment)
- [ ] Response does NOT include workout templates (privacy preserved)
- [ ] Creator username is displayed for attribution
- [ ] Phase details include `name`, `startDay`, `endDay`, `focusAreas`

---

### STEP 4: Copy Shared Program to User 2's Account (Instant Copy)

**Purpose:** Test the instant copy flow - program should be created immediately in User 2's account.

**Request:**

```http
POST {{API_BASE_URL}}/users/{{USER2_ID}}/shared-programs/{{SHARED_PROGRAM_ID}}/copy
Authorization: Bearer {{USER2_TOKEN}}
Content-Type: application/json

{
  "coachId": "{{USER2_COACH_ID}}"
}
```

**Expected Response (201 Created):**

```json
{
  "programId": "program_def456_1705312500000_y8n3p",
  "programName": "Olympic Lift Strength Builder",
  "coachId": "user_def456_coach_1704067200000_z9o4q",
  "coachName": "Coach Sarah",
  "message": "Program copied successfully. Ready to start!"
}
```

**Tests (JavaScript):**

```javascript
pm.test("Status code is 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Response includes new programId", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.programId).to.be.a("string");
  pm.expect(jsonData.programId).to.include(pm.environment.get("USER2_ID"));

  // Save for verification
  pm.environment.set("COPIED_PROGRAM_ID", jsonData.programId);
  console.log("✅ Copied Program ID:", jsonData.programId);
});

pm.test("Program name matches original", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.programName).to.eql("Olympic Lift Strength Builder");
});

pm.test("Coach info included", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.coachId).to.eql(pm.environment.get("USER2_COACH_ID"));
  pm.expect(jsonData.coachName).to.be.a("string");
});
```

**Manual Verification:**

- [ ] New `programId` is generated for User 2
- [ ] `programName` matches the original program
- [ ] `coachId` and `coachName` are User 2's coach
- [ ] Response message indicates program is ready to start

**What Happened Backend:**

1. Loaded shared program metadata from DynamoDB
2. Retrieved full program details (including workout templates) from S3
3. Created new `Program` entity for User 2 with:
   - Fresh `programId`
   - `status: "active"`, `currentDay: 1`
   - Start date = today
   - `metadata.copiedFromSharedProgram: true`
   - `metadata.adaptationReviewed: false` (triggers slide-out chat on first view)
4. Copied workout templates to User 2's S3 location
5. Saved new program to DynamoDB

---

### STEP 5: Verify Copied Program in User 2's Account

**Purpose:** Confirm the program was correctly copied with all details and metadata.

**Request:**

```http
GET {{API_BASE_URL}}/users/{{USER2_ID}}/coaches/{{USER2_COACH_ID}}/programs/{{COPIED_PROGRAM_ID}}
Authorization: Bearer {{USER2_TOKEN}}
```

**Expected Response (200 OK):**

```json
{
  "program": {
    "programId": "program_def456_1705312500000_y8n3p",
    "userId": "user_def456_1234567890_y8n3p",
    "coachIds": ["user_def456_coach_1704067200000_z9o4q"],
    "coachNames": ["Coach Sarah"],
    "name": "Olympic Lift Strength Builder",
    "description": "8-week program focusing on snatch and clean & jerk",
    "status": "active",
    "startDate": "2026-01-17",
    "endDate": "2026-03-13",
    "totalDays": 56,
    "currentDay": 1,
    "trainingFrequency": 5,
    "phases": [...],  // Same as original
    "trainingGoals": ["Increase snatch 1RM", "Improve technique"],
    "equipmentConstraints": ["barbell", "squat_rack", "bumper_plates"],
    "totalWorkouts": 40,
    "completedWorkouts": 0,  // Fresh start
    "skippedWorkouts": 0,
    "adherenceRate": 0,
    "s3DetailKey": "programs/user_def456.../program_def456.../details.json",
    "metadata": {
      "copiedFromSharedProgram": true,
      "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m",
      "sourceCreator": "marcus_fitness",
      "sourceCoachNames": ["Coach Marcus"],
      "adaptationReviewed": false,
      "copiedAt": "2026-01-17T10:35:00Z"
    },
    "createdAt": "2026-01-17T10:35:00Z"
  }
}
```

**Tests (JavaScript):**

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Program belongs to User 2", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.userId).to.eql(pm.environment.get("USER2_ID"));
});

pm.test("Program is active at day 1", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.status).to.eql("active");
  pm.expect(jsonData.program.currentDay).to.eql(1);
});

pm.test("Program has fresh analytics", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.completedWorkouts).to.eql(0);
  pm.expect(jsonData.program.skippedWorkouts).to.eql(0);
  pm.expect(jsonData.program.adherenceRate).to.eql(0);
});

pm.test("Copy metadata is present", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.metadata.copiedFromSharedProgram).to.be.true;
  pm.expect(jsonData.program.metadata.sharedProgramId).to.eql(
    pm.environment.get("SHARED_PROGRAM_ID"),
  );
  pm.expect(jsonData.program.metadata.adaptationReviewed).to.be.false;
});

pm.test("Source attribution preserved", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.metadata.sourceCreator).to.be.a("string");
  pm.expect(jsonData.program.metadata.sourceCoachNames).to.be.an("array");
});

pm.test("Program structure copied", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.program.phases).to.be.an("array");
  pm.expect(jsonData.program.trainingGoals).to.be.an("array");
  pm.expect(jsonData.program.equipmentConstraints).to.be.an("array");
});
```

**Manual Verification:**

- [ ] `userId` matches User 2
- [ ] `coachIds` and `coachNames` are User 2's coach
- [ ] `status` is `"active"` and `currentDay` is `1`
- [ ] `startDate` is today's date
- [ ] `totalWorkouts` matches original program
- [ ] `completedWorkouts`, `skippedWorkouts`, `adherenceRate` are all `0`
- [ ] `metadata.copiedFromSharedProgram` is `true`
- [ ] `metadata.sharedProgramId` references the original shared program
- [ ] `metadata.adaptationReviewed` is `false` (will trigger slide-out on first view)
- [ ] `metadata.sourceCreator` and `metadata.sourceCoachNames` preserve attribution
- [ ] `phases`, `trainingGoals`, `equipmentConstraints` match original program

**CRITICAL VERIFICATION:**
To fully verify workout templates were copied, you would need to:

1. Fetch the S3 object at `s3DetailKey` (requires AWS CLI or SDK)
2. Confirm `workoutTemplates` array is present and matches original count

---

### STEP 6: List User 1's Shared Programs

**Purpose:** Verify User 1 can see their shared programs in management view.

**Request:**

```http
GET {{API_BASE_URL}}/users/{{USER1_ID}}/shared-programs
Authorization: Bearer {{USER1_TOKEN}}
```

**Expected Response (200 OK):**

```json
{
  "sharedPrograms": [
    {
      "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m",
      "originalProgramId": "program_abc123_1705312200000_x7k2m",
      "creatorUserId": "user_abc123_1234567890_x7k2m",
      "creatorUsername": "marcus_fitness",
      "programSnapshot": {
        "name": "Olympic Lift Strength Builder",
        "description": "8-week program focusing on snatch and clean & jerk",
        "totalDays": 56,
        "trainingFrequency": 5,
        "phases": [...],
        "trainingGoals": [...],
        "equipmentConstraints": [...],
        "coachNames": ["Coach Marcus"]
      },
      "s3DetailKey": "sharedPrograms/user_abc123.../sharedProgram_abc123.../details.json",
      "isActive": true,
      "createdAt": "2025-01-17T10:30:00Z"
    }
  ]
}
```

**Tests (JavaScript):**

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response includes shared programs array", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.sharedPrograms).to.be.an("array");
});

pm.test("Newly created share is listed", function () {
  const jsonData = pm.response.json();
  const sharedProgramId = pm.environment.get("SHARED_PROGRAM_ID");
  const found = jsonData.sharedPrograms.find(
    (sp) => sp.sharedProgramId === sharedProgramId,
  );
  pm.expect(found).to.not.be.undefined;
});

pm.test("Share is active", function () {
  const jsonData = pm.response.json();
  const sharedProgramId = pm.environment.get("SHARED_PROGRAM_ID");
  const found = jsonData.sharedPrograms.find(
    (sp) => sp.sharedProgramId === sharedProgramId,
  );
  pm.expect(found.isActive).to.be.true;
});
```

**Manual Verification:**

- [ ] Array contains the shared program created in Step 2
- [ ] Each program shows `programSnapshot` with name, description, phases
- [ ] `isActive` is `true`
- [ ] `createdAt` timestamp is present

---

### STEP 7: Deactivate Shared Program (Cleanup)

**Purpose:** Clean up by deactivating the shared program. Link becomes inactive.

**Request:**

```http
DELETE {{API_BASE_URL}}/users/{{USER1_ID}}/shared-programs/{{SHARED_PROGRAM_ID}}
Authorization: Bearer {{USER1_TOKEN}}
```

**Expected Response (200 OK):**

```json
{
  "message": "Shared program deactivated successfully",
  "sharedProgramId": "sharedProgram_abc123_1705312200000_x7k2m"
}
```

**Tests (JavaScript):**

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Success message returned", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.message).to.include("deactivated");
});
```

**Manual Verification:**

- [ ] Response confirms deactivation
- [ ] Re-run Step 3 (Preview) - should return 404 or inactive status

**What Happened Backend:**

1. Loaded shared program from DynamoDB
2. Verified ownership (User 1 is creator)
3. Updated `isActive: false` in DynamoDB
4. Link no longer accessible via public preview

---

## Error Cases to Test

### Test E1: Share Non-Completed Program

**Request:**

```http
POST {{API_BASE_URL}}/users/{{USER1_ID}}/programs/<active_program_id>/share
Authorization: Bearer {{USER1_TOKEN}}
Content-Type: application/json

{
  "coachId": "{{USER1_COACH_ID}}"
}
```

**Expected Response (400 Bad Request):**

```json
{
  "error": "Only completed programs can be shared. Current status: active"
}
```

---

### Test E2: Copy with Invalid Coach ID

**Request:**

```http
POST {{API_BASE_URL}}/users/{{USER2_ID}}/shared-programs/{{SHARED_PROGRAM_ID}}/copy
Authorization: Bearer {{USER2_TOKEN}}
Content-Type: application/json

{
  "coachId": "invalid_coach_id"
}
```

**Expected Response (404 Not Found):**

```json
{
  "error": "Coach not found"
}
```

---

### Test E3: Copy Inactive Shared Program

**Request:**

```http
POST {{API_BASE_URL}}/users/{{USER2_ID}}/shared-programs/{{SHARED_PROGRAM_ID}}/copy
Authorization: Bearer {{USER2_TOKEN}}
Content-Type: application/json
# After running Step 7 (deactivate)

{
  "coachId": "{{USER2_COACH_ID}}"
}
```

**Expected Response (400 Bad Request):**

```json
{
  "error": "Shared program is inactive"
}
```

**Note:** Preview endpoint (GET) will also return 404 for inactive programs since `getSharedProgram()` returns null.

---

### Test E4: Delete Another User's Shared Program

**Request:**

```http
DELETE {{API_BASE_URL}}/users/{{USER2_ID}}/shared-programs/{{SHARED_PROGRAM_ID}}
Authorization: Bearer {{USER2_TOKEN}}
# User 2 trying to delete User 1's share
```

**Expected Response (403 Forbidden):**

```json
{
  "error": "Unauthorized: You can only unshare your own programs"
}
```

---

## Success Criteria

✅ **All 7 main steps complete successfully**
✅ **User 1 can create a shared program from a completed program**
✅ **Shared program is publicly accessible (no auth)**
✅ **User 2 can instantly copy the program to their account**
✅ **Copied program has correct metadata for slide-out chat trigger**
✅ **User 1 can list their shared programs**
✅ **User 1 can deactivate shared programs**
✅ **All error cases return appropriate status codes**

---

## Debugging Tips

### Check DynamoDB Items

```bash
# Get shared program
aws dynamodb get-item \
  --table-name <TABLE_NAME> \
  --key '{"pk": {"S": "sharedProgram#<SHARED_PROGRAM_ID>"}, "sk": {"S": "metadata"}}'

# Query user's shared programs
aws dynamodb query \
  --table-name <TABLE_NAME> \
  --index-name gsi1 \
  --key-condition-expression "gsi1pk = :pk AND begins_with(gsi1sk, :sk)" \
  --expression-attribute-values '{":pk": {"S": "user#<USER_ID>"}, ":sk": {"S": "sharedProgram#"}}'
```

### Check S3 Objects

```bash
# List shared program details
aws s3 ls s3://<BUCKET_NAME>/sharedPrograms/<USER_ID>/

# Download shared program details
aws s3 cp s3://<BUCKET_NAME>/<S3_DETAIL_KEY> ./shared-program-details.json

# View contents
cat shared-program-details.json | jq .
```

### Check CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/amplify-<appId>-copy-shared-program-<suffix> --follow

# Filter for errors
aws logs tail /aws/lambda/amplify-<appId>-copy-shared-program-<suffix> --filter-pattern "ERROR" --follow
```

---

## Next Steps After Testing

Once all tests pass:

1. **Update Progress:**
   - Mark `backend-test` TODO as complete
   - Update `PROGRAM_SHARING_PLAN.md` with test results

2. **Begin Frontend Development:**
   - Day 3: Share flow (`ShareProgramModal`, API wrappers)
   - Day 4: Preview & copy flow (`SharedProgramPreview`, `CoachSelectionModal`)
   - Day 5: Slide-out adaptation chat (`ProgramAdaptationChat`)

3. **Document Test Results:**
   - Save Postman collection and environment
   - Take screenshots of successful responses
   - Note any issues or edge cases discovered

---

## Postman Collection Export

After completing the test, export your Postman collection:

1. Click **Collections** → Right-click your collection → **Export**
2. Choose **Collection v2.1** format
3. Save as `shared-program-integration-tests.postman_collection.json`
4. Export environment: **Environments** → Click gear icon → Export
5. Save as `shared-program-test.postman_environment.json`

These can be shared with the team or used for automated testing in CI/CD.
