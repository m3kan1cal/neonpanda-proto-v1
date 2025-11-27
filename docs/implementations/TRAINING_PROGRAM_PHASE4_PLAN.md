# Training Programs - Phase 4 Implementation Plan
## Adaptation Intelligence & User Engagement

**Created:** January 2025
**Status:** Planning - Ready for Implementation After Phase 3b Launch
**Dependencies:** Phase 3b (Program Dashboard & Workout Logging) Complete

---

## Executive Summary

Phase 4 transforms training programs from **static plans** into **intelligent, adaptive coaching systems** that learn from user behavior, provide contextual feedback, and automatically adjust to user performance patterns.

### Key Features
1. **Dashboard Quick Wins** (2%) - Complete deferred items from Phase 3b
2. **Adaptation Intelligence** (40%) - Auto-adjust programs based on user patterns
3. **Check-in System** (30%) - Regular feedback loops and coach responses
4. **Metrics & Analytics** (20%) - Comprehensive tracking and insights
5. **Polish & Testing** (8%) - Edge cases, performance, user testing

### Success Criteria
- **Adaptation Trigger Rate**: 15-25% of programs trigger at least one adaptation
- **Check-in Response Rate**: >60% of users complete weekly check-ins
- **User Satisfaction**: >85% positive feedback on adapted programs
- **Retention Impact**: Users with adapted programs have 1.5x retention vs. non-adapted

### Timeline
**Estimated: 4-5 weeks** (can be broken into sprints)

---

## Feature 1: Dashboard Quick Wins (2%)

### Priority: High (Ship with Phase 4 Week 1)
### Estimated Time: 1-2 days

These are deferred items from `TRAINING_PROGRAM_DASHBOARD_IMPLEMENTATION.md` that complete the dashboard experience.

---

### 1A. View Creation Conversation Link

**User Story:**
> "As a user, I want to view the Build mode conversation where my program was created, so I can remember what I told my coach and understand the program's origins."

**UI Location:**
- Program Dashboard → Actions Menu (⋮) → "View Creation Conversation"
- Or: Program Overview section → "View how this was created" link

**Implementation:**

```jsx
// src/components/programs/ProgramDashboard.jsx
const handleViewConversation = () => {
  if (!program.creationConversationId) {
    toast.error('Creation conversation not found');
    return;
  }

  // Navigate to conversation with Build mode context
  navigate(`/coach-conversations?userId=${userId}&coachId=${coachId}&conversationId=${program.creationConversationId}&mode=build`);
};

// In Actions Menu
<MenuItem onClick={handleViewConversation}>
  <ChatIcon />
  <span>View Creation Conversation</span>
</MenuItem>
```

**Backend:**
- ✅ No new endpoint needed - `creationConversationId` already stored in program entity

**Acceptance Criteria:**
- [ ] Link appears in program actions menu
- [ ] Clicking link navigates to Build mode conversation
- [ ] Conversation history shows program creation dialogue
- [ ] Works for both new and legacy programs

---

### 1B. Regenerate Workout Feature

**User Story:**
> "As a user, I want to request modifications to upcoming workouts through conversation with my coach, so I can adapt the program to equipment changes, time constraints, or preference changes."

**UI Location:**
- ViewWorkouts page → Workout card → "Request Changes" button (for scheduled/pending workouts)
- Or: "⋮" menu → "Modify This Workout"

**User Flow:**
1. User clicks "Request Changes" on Day 12 workout
2. Opens Build mode conversation with coach
3. Pre-populated context: "User wants to modify Day 12 workout of [Program Name]"
4. User: "I don't have a rower today, can you swap that part?"
5. Coach regenerates workout, updates S3 template
6. User sees updated workout immediately

**Implementation:**

```jsx
// src/components/programs/ViewWorkouts.jsx
const handleRequestChanges = async (template) => {
  // Build context message for coach
  const contextMessage = `I'd like to modify Day ${template.dayNumber} of my "${program.name}" program. Here's the current workout:\n\n${template.description}`;

  // Open conversation in Build mode with pre-filled message
  navigate(`/coach-conversations?userId=${userId}&coachId=${coachId}&mode=build&prefillMessage=${encodeURIComponent(contextMessage)}&programId=${programId}&templateId=${template.templateId}`);
};

// Add button to workout card (only for scheduled/pending workouts)
{template.status === 'scheduled' && (
  <button
    onClick={() => handleRequestChanges(template)}
    className={buttonPatterns.secondarySmall}
  >
    <EditIcon />
    <span>Request Changes</span>
  </button>
)}
```

**Backend:**

New Lambda endpoint to handle workout regeneration from conversation:

```typescript
// amplify/functions/regenerate-workout-template/handler.ts
export const handler = withAuth(async (event) => {
  const userId = event.user.userId;
  const { coachId, programId, templateId } = event.pathParameters;
  const { newWorkoutDescription, regenerationReason } = JSON.parse(event.body);

  // 1. Get current template
  const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);
  const template = programDetails.workoutTemplates.find(t => t.templateId === templateId);

  // 2. Store old version in adaptation history
  const adaptationEvent = {
    timestamp: new Date().toISOString(),
    trigger: 'user_requested_modification',
    dayNumber: template.dayNumber,
    reason: regenerationReason,
    originalWorkout: template.description,
    newWorkout: newWorkoutDescription
  };

  // 3. Update template in S3
  template.description = newWorkoutDescription;
  template.adaptationHistory = template.adaptationHistory || [];
  template.adaptationHistory.push(adaptationEvent);

  await saveProgramDetailsToS3(program.s3DetailKey, programDetails);

  // 4. Update program entity with adaptation log
  await updateProgram(userId, coachId, programId, {
    adaptationLog: [...(program.adaptationLog || []), adaptationEvent]
  });

  return createOkResponse({
    success: true,
    updatedTemplate: template,
    adaptationEvent
  });
});
```

**API Endpoint:**
```
PUT /users/{userId}/coaches/{coachId}/programs/{programId}/templates/{templateId}/regenerate
Body: {
  newWorkoutDescription: string,
  regenerationReason: string
}
```

**Coach Prompt Enhancement:**

When user is in Build mode with `programId` and `templateId` context:

```typescript
const systemPrompt = `
WORKOUT REGENERATION MODE

The user wants to modify Day ${template.dayNumber} of their "${program.name}" program.

Current workout:
${template.description}

Current phase: ${currentPhase.name}
Phase goals: ${currentPhase.goals}

Listen to their modification request and regenerate the workout to:
1. Meet their new constraints (equipment, duration, etc.)
2. Maintain phase goals and progression intent
3. Preserve program coherence

After regeneration, output the new workout as natural language and confirm the changes.
`;
```

**Acceptance Criteria:**
- [ ] "Request Changes" button appears on scheduled workouts
- [ ] Clicking opens Build mode with workout context
- [ ] Coach understands regeneration request
- [ ] New workout replaces old in S3
- [ ] Adaptation history tracks change
- [ ] User sees updated workout immediately
- [ ] Works for any upcoming workout (not past/completed)

---

## Feature 2: Adaptation Intelligence System (40%)

### Priority: High
### Estimated Time: 2 weeks

Transform programs from static to dynamic by automatically detecting patterns and adjusting future workouts.

---

### 2A. Scaling Pattern Detection

**Problem:** User consistently scales prescribed weights/movements, indicating baseline was set too high.

**User Story:**
> "As a user, when I consistently scale workouts, I want my coach to automatically adjust future prescriptions so the program matches my actual capacity."

**Detection Logic:**

```typescript
// amplify/functions/detect-scaling-patterns/handler.ts

interface ScalingPattern {
  movement: string;
  prescribedValue: number | string;
  actualValue: number | string;
  frequency: number; // how many times in a row
  workoutIds: string[];
  confidenceScore: number; // 0-100
}

async function detectScalingPatterns(userId: string, programId: string): Promise<ScalingPattern[]> {
  // 1. Get recent workout logs from this program
  const recentWorkouts = await getRecentProgramWorkouts(userId, programId, { limit: 10 });

  // 2. Extract prescribed vs actual from workout logs
  const scalingEvents = [];
  for (const workout of recentWorkouts) {
    if (!workout.linkedTemplateId) continue;

    const template = await getTemplate(programId, workout.linkedTemplateId);
    const scalingAnalysis = workout.scalingAnalysis; // From log-workout-template

    if (scalingAnalysis?.wasScaled) {
      scalingEvents.push({
        dayNumber: template.dayNumber,
        modifications: scalingAnalysis.modifications,
        adherenceScore: scalingAnalysis.adherenceScore
      });
    }
  }

  // 3. Find patterns (same movement scaled 3+ times in a row)
  const patterns = findConsecutivePatterns(scalingEvents, { minOccurrences: 3 });

  // 4. Calculate confidence score
  patterns.forEach(pattern => {
    pattern.confidenceScore = calculateConfidence(pattern);
  });

  return patterns.filter(p => p.confidenceScore > 70);
}
```

**Adaptation Application:**

```typescript
// amplify/functions/apply-scaling-adaptation/handler.ts

export const handler = async (event) => {
  const { userId, programId, patterns } = JSON.parse(event.body);

  // 1. Get program details
  const program = await getProgram(userId, coachId, programId);
  const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);

  // 2. Find future workouts that contain the scaled movement
  const futureWorkouts = programDetails.workoutTemplates.filter(t =>
    t.dayNumber > program.currentDay &&
    t.status === 'scheduled'
  );

  // 3. For each pattern, adjust future workouts
  for (const pattern of patterns) {
    const affectedWorkouts = futureWorkouts.filter(w =>
      w.prescribedExercises.some(e => e.name.toLowerCase().includes(pattern.movement.toLowerCase()))
    );

    for (const workout of affectedWorkouts) {
      // Build AI prompt to adjust workout
      const adjustedWorkout = await adjustWorkoutForScaling(
        workout,
        pattern,
        program.coachConfig
      );

      // Update template
      const templateIndex = programDetails.workoutTemplates.findIndex(t => t.templateId === workout.templateId);
      programDetails.workoutTemplates[templateIndex] = adjustedWorkout;
    }

    // 4. Store adaptation event
    const adaptationEvent = {
      timestamp: new Date().toISOString(),
      trigger: 'consistent_scaling',
      pattern: {
        movement: pattern.movement,
        prescribedValue: pattern.prescribedValue,
        actualValue: pattern.actualValue,
        frequency: pattern.frequency
      },
      action: `Adjusted ${affectedWorkouts.length} future workouts for ${pattern.movement}`,
      affectedDays: affectedWorkouts.map(w => w.dayNumber),
      reasoning: `User consistently scaled ${pattern.movement} from ${pattern.prescribedValue} to ${pattern.actualValue} over ${pattern.frequency} workouts. Adjusting future prescriptions to match user's capacity.`
    };

    program.adaptationLog = program.adaptationLog || [];
    program.adaptationLog.push(adaptationEvent);
  }

  // 5. Save updates
  await saveProgramDetailsToS3(program.s3DetailKey, programDetails);
  await updateProgram(userId, coachId, programId, {
    adaptationLog: program.adaptationLog
  });

  return createOkResponse({
    success: true,
    patternsDetected: patterns.length,
    workoutsAdjusted: patterns.reduce((sum, p) => sum + p.affectedDays.length, 0)
  });
};
```

**AI Adjustment Prompt:**

```typescript
async function adjustWorkoutForScaling(
  workout: WorkoutTemplate,
  pattern: ScalingPattern,
  coachConfig: CoachConfig
): Promise<WorkoutTemplate> {
  const prompt = `
You are ${coachConfig.coach_name}, adjusting a workout based on user performance data.

CURRENT WORKOUT (Day ${workout.dayNumber}):
${workout.description}

SCALING PATTERN DETECTED:
- Movement: ${pattern.movement}
- Prescribed: ${pattern.prescribedValue}
- User consistently performs: ${pattern.actualValue}
- Frequency: ${pattern.frequency} workouts in a row

TASK: Rewrite the workout with adjusted prescriptions for ${pattern.movement}.
- Maintain the workout structure and intent
- Adjust ${pattern.movement} to reflect user's actual capacity (${pattern.actualValue})
- Keep other exercises unchanged
- Maintain phase goals

Output the adjusted workout as natural language.
`;

  const adjustedDescription = await callBedrockApi(
    prompt,
    `Adjust Day ${workout.dayNumber} workout for scaling pattern.`,
    MODEL_IDS.CLAUDE_SONNET_4FULL
  );

  return {
    ...workout,
    description: adjustedDescription,
    adaptationHistory: [
      ...(workout.adaptationHistory || []),
      {
        timestamp: new Date().toISOString(),
        trigger: 'consistent_scaling',
        pattern: pattern,
        originalDescription: workout.description
      }
    ]
  };
}
```

**Scheduled Detection Job:**

Run daily to check for patterns:

```typescript
// amplify/functions/scheduled-adaptation-detector/handler.ts

export const handler = async (event) => {
  // 1. Get all active programs
  const activePrograms = await queryProgramsByStatus('active');

  // 2. For each program, detect patterns
  const detectionResults = [];
  for (const program of activePrograms) {
    const patterns = await detectScalingPatterns(program.userId, program.programId);

    if (patterns.length > 0) {
      // Apply adaptations
      await applyScalingAdaptation(program.userId, program.programId, patterns);

      // Notify user via coach message
      await sendAdaptationNotification(program.userId, program.coachId, patterns);

      detectionResults.push({
        programId: program.programId,
        patternsDetected: patterns.length
      });
    }
  }

  console.log(`✅ Adaptation detection complete: ${detectionResults.length} programs adapted`);
  return { statusCode: 200, body: JSON.stringify(detectionResults) };
};
```

**Coach Notification:**

```typescript
async function sendAdaptationNotification(
  userId: string,
  coachId: string,
  patterns: ScalingPattern[]
) {
  const conversationId = await getOrCreateConversation(userId, coachId);

  const message = `
I noticed you've been consistently scaling some movements, so I've adjusted your upcoming workouts to better match your current capacity:

${patterns.map(p => `• ${p.movement}: Adjusted from ${p.prescribedValue} to ${p.actualValue}`).join('\n')}

This should help you stay in the optimal training zone. Keep crushing it! 💪
`;

  await sendCoachMessage(conversationId, message);
}
```

**Frontend - Adaptation History Display:**

```jsx
// src/components/programs/AdaptationHistory.jsx

export function AdaptationHistory({ program }) {
  const adaptations = program.adaptationLog || [];

  if (adaptations.length === 0) {
    return (
      <div className={containerPatterns.emptyState}>
        <p>No adaptations yet. Your program will adjust as we learn your patterns.</p>
      </div>
    );
  }

  return (
    <div className={containerPatterns.section}>
      <h3 className={typographyPatterns.sectionHeader}>Program Adaptations</h3>
      <div className="space-y-4">
        {adaptations.map((adaptation, index) => (
          <div key={index} className={containerPatterns.card}>
            <div className="flex items-start space-x-3">
              <div className={`${messagePatterns.statusDotCyan} mt-1`}></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-rajdhani font-semibold text-synthwave-neon-cyan">
                    {formatAdaptationTrigger(adaptation.trigger)}
                  </span>
                  <span className="text-xs text-synthwave-text-muted">
                    {formatDate(adaptation.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-synthwave-text-secondary mb-2">
                  {adaptation.reasoning}
                </p>
                {adaptation.affectedDays && (
                  <div className="flex items-center space-x-2 text-xs text-synthwave-text-muted">
                    <span>Affected workouts:</span>
                    {adaptation.affectedDays.map(day => (
                      <span key={day} className={buttonPatterns.badgeSmall}>
                        Day {day}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Detects consistent scaling patterns (3+ consecutive workouts)
- [ ] Adjusts future workouts automatically
- [ ] Stores adaptation reasoning in log
- [ ] Notifies user via coach message
- [ ] Shows adaptation history in dashboard
- [ ] Only adapts future workouts (not past)
- [ ] Respects phase goals and progression intent
- [ ] Runs daily via scheduled Lambda

---

### 2B. Missed Workout Handling

**Problem:** User skips multiple workouts, program should ease them back in.

**User Story:**
> "As a user, when I miss several workouts, I want my program to reduce volume/intensity so I can ease back in without injury or burnout."

**Detection Logic:**

```typescript
interface MissedWorkoutPattern {
  consecutiveSkips: number;
  skipsInLast7Days: number;
  lastCompletedDate: string;
  confidence: 'high' | 'medium' | 'low';
}

async function detectMissedWorkoutPattern(
  userId: string,
  programId: string
): Promise<MissedWorkoutPattern | null> {
  const program = await getProgram(userId, coachId, programId);
  const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);

  // Count recent skips
  const last7Workouts = programDetails.workoutTemplates
    .filter(t => t.dayNumber <= program.currentDay && t.dayNumber > program.currentDay - 7)
    .sort((a, b) => b.dayNumber - a.dayNumber);

  const consecutiveSkips = countConsecutiveSkips(last7Workouts);
  const skipsInLast7Days = last7Workouts.filter(w => w.status === 'skipped').length;

  // Determine if adaptation needed
  const needsAdaptation = consecutiveSkips >= 2 || skipsInLast7Days >= 3;

  if (!needsAdaptation) return null;

  return {
    consecutiveSkips,
    skipsInLast7Days,
    lastCompletedDate: findLastCompletedWorkout(last7Workouts)?.completedAt,
    confidence: consecutiveSkips >= 3 ? 'high' : 'medium'
  };
}
```

**Adaptation Application:**

```typescript
async function applyMissedWorkoutAdaptation(
  userId: string,
  programId: string,
  pattern: MissedWorkoutPattern
) {
  const program = await getProgram(userId, coachId, programId);
  const programDetails = await getProgramDetailsFromS3(program.s3DetailKey);

  // Get next 2-3 workouts
  const upcomingWorkouts = programDetails.workoutTemplates
    .filter(t => t.dayNumber > program.currentDay && t.dayNumber <= program.currentDay + 3)
    .filter(t => t.status === 'scheduled');

  // Reduce volume/intensity for each
  for (const workout of upcomingWorkouts) {
    const easedWorkout = await easeWorkoutVolume(workout, pattern, program.coachConfig);

    const templateIndex = programDetails.workoutTemplates.findIndex(t => t.templateId === workout.templateId);
    programDetails.workoutTemplates[templateIndex] = easedWorkout;
  }

  // Store adaptation
  const adaptationEvent = {
    timestamp: new Date().toISOString(),
    trigger: 'missed_workouts',
    pattern: {
      consecutiveSkips: pattern.consecutiveSkips,
      skipsInLast7Days: pattern.skipsInLast7Days
    },
    action: `Reduced volume/intensity for next ${upcomingWorkouts.length} workouts`,
    affectedDays: upcomingWorkouts.map(w => w.dayNumber),
    reasoning: `User skipped ${pattern.skipsInLast7Days} workouts in the last 7 days. Easing back in with reduced volume to prevent injury and rebuild momentum.`
  };

  program.adaptationLog = program.adaptationLog || [];
  program.adaptationLog.push(adaptationEvent);

  await saveProgramDetailsToS3(program.s3DetailKey, programDetails);
  await updateProgram(userId, coachId, programId, {
    adaptationLog: program.adaptationLog
  });

  // Notify user
  await sendMissedWorkoutNotification(userId, coachId, pattern, upcomingWorkouts.length);
}
```

**AI Volume Reduction Prompt:**

```typescript
async function easeWorkoutVolume(
  workout: WorkoutTemplate,
  pattern: MissedWorkoutPattern,
  coachConfig: CoachConfig
): Promise<WorkoutTemplate> {
  const reductionLevel = pattern.consecutiveSkips >= 3 ? 'significant' : 'moderate';

  const prompt = `
You are ${coachConfig.coach_name}, adjusting a workout for a user returning after missed sessions.

CURRENT WORKOUT (Day ${workout.dayNumber}):
${workout.description}

USER CONTEXT:
- Consecutive skips: ${pattern.consecutiveSkips}
- Total skips in last 7 days: ${pattern.skipsInLast7Days}
- Last completed: ${pattern.lastCompletedDate}

TASK: Reduce workout volume/intensity to help user ease back in.
- Reduction level: ${reductionLevel}
- Keep exercise selection similar
- Reduce sets/reps/rounds by 20-30%
- Lower intensity (weights, pace)
- Add extra warmup/mobility
- Maintain phase goals but prioritize momentum over volume

Be encouraging and explain the adjustment.

Output the adjusted workout as natural language.
`;

  const adjustedDescription = await callBedrockApi(
    prompt,
    `Ease Day ${workout.dayNumber} workout for user returning from missed sessions.`,
    MODEL_IDS.CLAUDE_SONNET_4FULL
  );

  return {
    ...workout,
    description: adjustedDescription,
    adaptationHistory: [
      ...(workout.adaptationHistory || []),
      {
        timestamp: new Date().toISOString(),
        trigger: 'missed_workouts',
        pattern: pattern,
        originalDescription: workout.description
      }
    ]
  };
}
```

**Acceptance Criteria:**
- [ ] Detects 2+ consecutive skips OR 3+ skips in 7 days
- [ ] Reduces volume for next 2-3 workouts
- [ ] Sends encouraging coach message
- [ ] Logs adaptation reasoning
- [ ] Only triggers once per pattern (doesn't keep reducing)
- [ ] Returns to normal volume after user completes adjusted workouts

---

### 2C. Feedback-Based Adaptation

**Problem:** User consistently rates workouts "too easy" or "too hard".

**User Story:**
> "As a user, when I provide feedback that workouts are too easy/hard, I want my program to adjust intensity for upcoming phases."

**Implementation:**

```typescript
// Triggered after workout completion with feedback
async function analyzeWorkoutFeedback(
  userId: string,
  programId: string,
  workoutId: string,
  feedback: WorkoutFeedback
) {
  const program = await getProgram(userId, coachId, programId);

  // Get recent feedback (last 5 workouts)
  const recentFeedback = await getRecentFeedback(programId, { limit: 5 });

  // Analyze sentiment
  const sentimentPattern = analyzeFeedbackPattern(recentFeedback);

  if (sentimentPattern.trend === 'consistently_too_easy' && sentimentPattern.confidence > 70) {
    await increaseIntensity(userId, programId, sentimentPattern);
  } else if (sentimentPattern.trend === 'consistently_too_hard' && sentimentPattern.confidence > 70) {
    await decreaseIntensity(userId, programId, sentimentPattern);
  }
}

interface FeedbackPattern {
  trend: 'consistently_too_easy' | 'consistently_too_hard' | 'appropriate' | 'mixed';
  confidence: number; // 0-100
  sampleSize: number;
  averageRating: number;
}

function analyzeFeedbackPattern(feedback: WorkoutFeedback[]): FeedbackPattern {
  // Count sentiment
  const tooEasy = feedback.filter(f => f.difficulty === 'too_easy' || f.rating <= 2).length;
  const tooHard = feedback.filter(f => f.difficulty === 'too_hard' || f.rating >= 9).length;
  const appropriate = feedback.filter(f => f.difficulty === 'appropriate' || (f.rating >= 3 && f.rating <= 8)).length;

  // Determine trend
  let trend: FeedbackPattern['trend'] = 'mixed';
  if (tooEasy >= 4) trend = 'consistently_too_easy';
  if (tooHard >= 4) trend = 'consistently_too_hard';
  if (appropriate >= 4) trend = 'appropriate';

  // Calculate confidence
  const confidence = Math.max(tooEasy, tooHard, appropriate) / feedback.length * 100;

  return {
    trend,
    confidence,
    sampleSize: feedback.length,
    averageRating: feedback.reduce((sum, f) => sum + (f.rating || 5), 0) / feedback.length
  };
}
```

**Acceptance Criteria:**
- [ ] Collects feedback after workout completion
- [ ] Analyzes last 5 workouts for patterns
- [ ] Adjusts next phase if 4/5 workouts show same sentiment
- [ ] Increases intensity for "too easy"
- [ ] Decreases intensity for "too hard"
- [ ] Logs reasoning and shows to user

---

## Feature 3: Check-in System (30%)

### Priority: Medium
### Estimated Time: 1.5 weeks

Regular feedback loops between user and coach to maintain engagement and gather qualitative data.

---

### 3A. Weekly Check-ins

**User Story:**
> "As a user, I want to provide weekly feedback to my coach about how the program is going, so they can make informed adjustments."

**Check-in Trigger:**
- Every 7 days from program start
- After completing Week 1, Week 2, etc.
- Optional: Mid-week pulse check

**Check-in Questions:**

```typescript
interface WeeklyCheckIn {
  checkInId: string;
  programId: string;
  weekNumber: number;
  submittedAt: Date;

  // Quantitative
  overallRating: number; // 1-5 stars
  energyLevels: 'low' | 'moderate' | 'high';
  recoveryQuality: 'poor' | 'fair' | 'good' | 'excellent';
  adherence: number; // % of planned workouts completed

  // Qualitative
  whatWentWell: string;
  challenges: string;
  adjustmentRequests: string;

  // Coach Response
  coachResponse?: {
    message: string;
    plannedAdaptations: string[];
    generatedAt: Date;
  };
}
```

**UI Component:**

```jsx
// src/components/programs/WeeklyCheckIn.jsx

export function WeeklyCheckIn({ program, onSubmit }) {
  const [checkIn, setCheckIn] = useState({
    overallRating: 0,
    energyLevels: 'moderate',
    recoveryQuality: 'good',
    whatWentWell: '',
    challenges: '',
    adjustmentRequests: ''
  });

  const handleSubmit = async () => {
    await onSubmit({
      ...checkIn,
      programId: program.programId,
      weekNumber: Math.ceil(program.currentDay / 7),
      submittedAt: new Date().toISOString()
    });
  };

  return (
    <div className={containerPatterns.modal}>
      <h2 className={typographyPatterns.modalHeader}>
        Week {Math.ceil(program.currentDay / 7)} Check-in
      </h2>

      <div className="space-y-6">
        {/* Overall Rating */}
        <div>
          <label className={typographyPatterns.label}>
            How was this week overall?
          </label>
          <StarRating
            value={checkIn.overallRating}
            onChange={(rating) => setCheckIn({ ...checkIn, overallRating: rating })}
          />
        </div>

        {/* Energy & Recovery */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={typographyPatterns.label}>Energy Levels</label>
            <SegmentedControl
              options={['low', 'moderate', 'high']}
              value={checkIn.energyLevels}
              onChange={(val) => setCheckIn({ ...checkIn, energyLevels: val })}
            />
          </div>
          <div>
            <label className={typographyPatterns.label}>Recovery Quality</label>
            <SegmentedControl
              options={['poor', 'fair', 'good', 'excellent']}
              value={checkIn.recoveryQuality}
              onChange={(val) => setCheckIn({ ...checkIn, recoveryQuality: val })}
            />
          </div>
        </div>

        {/* Qualitative Feedback */}
        <div>
          <label className={typographyPatterns.label}>
            What went well this week?
          </label>
          <textarea
            className={inputPatterns.textarea}
            value={checkIn.whatWentWell}
            onChange={(e) => setCheckIn({ ...checkIn, whatWentWell: e.target.value })}
            placeholder="E.g., Hit a new PR, felt strong on squats, good energy..."
          />
        </div>

        <div>
          <label className={typographyPatterns.label}>
            Any challenges or concerns?
          </label>
          <textarea
            className={inputPatterns.textarea}
            value={checkIn.challenges}
            onChange={(e) => setCheckIn({ ...checkIn, challenges: e.target.value })}
            placeholder="E.g., Knee felt tweaky, struggled with volume, time constraints..."
          />
        </div>

        <div>
          <label className={typographyPatterns.label}>
            Any adjustments you'd like for next week?
          </label>
          <textarea
            className={inputPatterns.textarea}
            value={checkIn.adjustmentRequests}
            onChange={(e) => setCheckIn({ ...checkIn, adjustmentRequests: e.target.value })}
            placeholder="E.g., More upper body, less running, lighter weights..."
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSubmit}
            className={buttonPatterns.primaryLarge}
          >
            Submit Check-in
          </button>
          <button
            onClick={onCancel}
            className={buttonPatterns.secondaryLarge}
          >
            Skip This Week
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Check-in Trigger Logic:**

```typescript
// Check when user opens dashboard or completes workout
async function shouldShowCheckInPrompt(program: Program): Promise<boolean> {
  const currentWeek = Math.ceil(program.currentDay / 7);
  const lastCheckIn = program.checkIns?.[program.checkIns.length - 1];

  // Show if no check-in for current week
  if (!lastCheckIn || lastCheckIn.weekNumber < currentWeek) {
    // Only show if at least 5 days into the week (to have meaningful data)
    const daysIntoWeek = program.currentDay % 7;
    return daysIntoWeek >= 5;
  }

  return false;
}
```

**Backend - Submit Check-in:**

```typescript
// amplify/functions/submit-program-checkin/handler.ts

export const handler = withAuth(async (event) => {
  const userId = event.user.userId;
  const { coachId, programId } = event.pathParameters;
  const checkInData = JSON.parse(event.body);

  // 1. Store check-in
  const checkIn: WeeklyCheckIn = {
    checkInId: generateId(),
    programId,
    ...checkInData
  };

  const program = await getProgram(userId, coachId, programId);
  program.checkIns = program.checkIns || [];
  program.checkIns.push(checkIn);

  // 2. Generate coach response via AI
  const coachResponse = await generateCheckInResponse(
    checkIn,
    program,
    coachConfig
  );

  checkIn.coachResponse = coachResponse;

  // 3. Update program
  await updateProgram(userId, coachId, programId, {
    checkIns: program.checkIns
  });

  // 4. Send coach response as conversation message
  await sendCoachMessage(
    program.conversationId || await getOrCreateConversation(userId, coachId),
    coachResponse.message
  );

  return createOkResponse({
    success: true,
    checkIn,
    coachResponse
  });
});
```

**AI Coach Response Generation:**

```typescript
async function generateCheckInResponse(
  checkIn: WeeklyCheckIn,
  program: Program,
  coachConfig: CoachConfig
): Promise<CoachResponse> {
  const prompt = `
You are ${coachConfig.coach_name}, responding to your client's Week ${checkIn.weekNumber} check-in for their "${program.name}" program.

CHECK-IN DATA:
- Overall rating: ${checkIn.overallRating}/5 stars
- Energy levels: ${checkIn.energyLevels}
- Recovery quality: ${checkIn.recoveryQuality}
- Adherence: ${checkIn.adherence}% of planned workouts

WHAT WENT WELL:
${checkIn.whatWentWell}

CHALLENGES:
${checkIn.challenges}

ADJUSTMENT REQUESTS:
${checkIn.adjustmentRequests}

PROGRAM CONTEXT:
- Current phase: ${getCurrentPhase(program).name}
- Current day: ${program.currentDay} of ${program.totalDays}
- Completed workouts: ${program.completedWorkouts}/${program.totalWorkouts}

TASK: Provide a thoughtful, personalized response.
1. Acknowledge what went well (celebrate wins!)
2. Address challenges with specific advice
3. Explain any planned adjustments for next week
4. Maintain your coaching personality
5. Keep it encouraging but realistic

Output as JSON:
{
  "message": "Your response to the user...",
  "plannedAdaptations": ["Adjustment 1", "Adjustment 2"]
}
`;

  const response = await callBedrockApi(
    prompt,
    `Generate check-in response for Week ${checkIn.weekNumber}.`,
    MODEL_IDS.CLAUDE_SONNET_4FULL,
    { prefillResponse: '{' }
  );

  return parseJsonWithFallbacks(response);
}
```

**API Endpoint:**
```
POST /users/{userId}/coaches/{coachId}/programs/{programId}/check-ins
Body: WeeklyCheckIn
Response: { checkIn, coachResponse }
```

**Acceptance Criteria:**
- [ ] Check-in prompt appears after completing 5 days of a week
- [ ] User can submit qualitative + quantitative feedback
- [ ] Coach generates personalized response via AI
- [ ] Response appears in conversation
- [ ] Check-in history stored with program
- [ ] Can view past check-ins in dashboard
- [ ] Reminder notification if not submitted after 7 days

---

## Feature 4: Metrics & Analytics (20%)

### Priority: Medium
### Estimated Time: 1 week

Track and visualize program performance for users and platform insights.

---

### 4A. User-Facing Metrics

**Enhanced Progress Overview:**

```jsx
// src/components/programs/EnhancedProgressOverview.jsx

export function EnhancedProgressOverview({ program, programDetails }) {
  const metrics = calculateProgramMetrics(program, programDetails);

  return (
    <div className={containerPatterns.sidebar}>
      <h3 className={typographyPatterns.sectionHeader}>Progress Metrics</h3>

      {/* Adherence Rate */}
      <MetricCard
        label="Adherence Rate"
        value={`${metrics.adherenceRate}%`}
        trend={metrics.adherenceTrend}
        color="cyan"
        tooltip="Percentage of scheduled workouts completed"
      />

      {/* Current Streak */}
      <MetricCard
        label="Current Streak"
        value={`${metrics.currentStreak} days`}
        color={metrics.currentStreak >= 7 ? 'green' : 'cyan'}
        badge={metrics.currentStreak >= 7 ? '🔥' : null}
      />

      {/* PRs This Program */}
      <MetricCard
        label="Personal Records"
        value={metrics.prsAchieved}
        color="pink"
        badge="🏆"
      />

      {/* Average Workout Rating */}
      <MetricCard
        label="Avg Workout Rating"
        value={`${metrics.avgRating.toFixed(1)}/5`}
        renderValue={() => <StarRating value={metrics.avgRating} readonly />}
      />

      {/* Volume Progression */}
      <div className="mt-6">
        <h4 className={typographyPatterns.subsectionHeader}>Volume Trend</h4>
        <MiniLineChart
          data={metrics.weeklyVolume}
          color="cyan"
          height={60}
        />
      </div>

      {/* Adaptations */}
      {metrics.adaptationCount > 0 && (
        <MetricCard
          label="Program Adaptations"
          value={metrics.adaptationCount}
          color="purple"
          onClick={() => navigate('/adaptations')}
          tooltip="Click to view adaptation history"
        />
      )}
    </div>
  );
}
```

**Metrics Calculation:**

```typescript
function calculateProgramMetrics(
  program: Program,
  programDetails: ProgramDetails
) {
  // Adherence
  const adherenceRate = Math.round(
    (program.completedWorkouts / program.currentDay) * 100
  );

  // Adherence trend (last 7 days vs previous 7 days)
  const last7Days = programDetails.workoutTemplates
    .filter(t => t.dayNumber > program.currentDay - 7 && t.dayNumber <= program.currentDay);
  const prev7Days = programDetails.workoutTemplates
    .filter(t => t.dayNumber > program.currentDay - 14 && t.dayNumber <= program.currentDay - 7);

  const last7Adherence = last7Days.filter(t => t.status === 'completed').length / last7Days.length;
  const prev7Adherence = prev7Days.filter(t => t.status === 'completed').length / prev7Days.length;
  const adherenceTrend = last7Adherence > prev7Adherence ? 'up' : 'down';

  // Current streak
  let currentStreak = 0;
  const recentWorkouts = programDetails.workoutTemplates
    .filter(t => t.dayNumber <= program.currentDay)
    .sort((a, b) => b.dayNumber - a.dayNumber);

  for (const workout of recentWorkouts) {
    if (workout.status === 'completed') {
      currentStreak++;
    } else {
      break;
    }
  }

  // PRs (extract from workout logs)
  const completedWorkouts = await getCompletedProgramWorkouts(program.programId);
  const prsAchieved = completedWorkouts.filter(w => w.hasPR).length;

  // Average rating
  const workoutsWithFeedback = programDetails.workoutTemplates.filter(t => t.userFeedback?.rating);
  const avgRating = workoutsWithFeedback.length > 0
    ? workoutsWithFeedback.reduce((sum, t) => sum + t.userFeedback.rating, 0) / workoutsWithFeedback.length
    : 0;

  // Volume trend (by week)
  const weeklyVolume = calculateWeeklyVolume(programDetails);

  return {
    adherenceRate,
    adherenceTrend,
    currentStreak,
    prsAchieved,
    avgRating,
    weeklyVolume,
    adaptationCount: program.adaptationLog?.length || 0
  };
}
```

---

### 4B. Platform-Level Analytics

**CloudWatch Metrics:**

```typescript
// amplify/functions/libs/analytics/program-metrics.ts

export async function trackProgramMetric(
  metricName: string,
  value: number,
  dimensions: Record<string, string>
) {
  await cloudwatch.putMetricData({
    Namespace: 'NeonPanda/Programs',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: 'Count',
      Dimensions: Object.entries(dimensions).map(([key, val]) => ({
        Name: key,
        Value: val
      }))
    }]
  });
}

// Usage examples:
await trackProgramMetric('ProgramCreated', 1, { coachId, programType: 'strength' });
await trackProgramMetric('WorkoutCompleted', 1, { programId, dayNumber: '5' });
await trackProgramMetric('AdaptationTriggered', 1, { trigger: 'scaling_pattern' });
await trackProgramMetric('CheckInSubmitted', 1, { weekNumber: '2' });
```

**Metrics Dashboard (Internal):**

Track these key metrics in CloudWatch:
- **Program Creation Rate**: Programs created per day/week
- **Active Programs**: Count of active programs
- **Adherence Rate Distribution**: Histogram of adherence rates
- **Completion Rate**: % of programs completed vs abandoned
- **Adaptation Trigger Rate**: % of programs with adaptations
- **Check-in Response Rate**: % of users submitting check-ins
- **Average Program Duration**: Actual vs planned duration
- **User Retention**: Retention rate for users with programs vs without

**Weekly Report Email:**

```typescript
// amplify/functions/generate-program-analytics-report/handler.ts

export const handler = async (event) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const metrics = await collectWeeklyMetrics(startDate, endDate);

  const report = `
# Training Programs - Weekly Report

**Week of ${formatDate(startDate)} - ${formatDate(endDate)}**

## Programs
- Active Programs: ${metrics.activePrograms} (↑ ${metrics.activeProgramsChange})
- New Programs Created: ${metrics.newPrograms}
- Programs Completed: ${metrics.completedPrograms}
- Programs Abandoned: ${metrics.abandonedPrograms}

## User Engagement
- Average Adherence Rate: ${metrics.avgAdherence}%
- Check-in Response Rate: ${metrics.checkInRate}%
- Workouts Completed: ${metrics.workoutsCompleted}

## Adaptations
- Programs with Adaptations: ${metrics.programsWithAdaptations} (${metrics.adaptationTriggerRate}%)
- Most Common Trigger: ${metrics.topAdaptationTrigger}

## Top Performing Programs
${metrics.topPrograms.map(p => `- ${p.name}: ${p.adherence}% adherence`).join('\n')}

## Issues & Opportunities
${metrics.issues.map(i => `- ${i}`).join('\n')}
`;

  await sendEmail({
    to: 'founder@neonpanda.ai',
    subject: 'Training Programs Weekly Report',
    body: report
  });
};
```

**Acceptance Criteria:**
- [ ] CloudWatch metrics tracking all key events
- [ ] Weekly report emailed to founder
- [ ] User-facing metrics dashboard
- [ ] Metrics visualizations (charts, graphs)
- [ ] Export metrics to CSV

---

## Feature 5: Polish & Testing (8%)

### Priority: High
### Estimated Time: 3-4 days

---

### 5A. Edge Cases

**Handle These Scenarios:**

1. **Program with no workouts left**
   - User completes all workouts early
   - Show completion celebration
   - Offer to create next program

2. **Long pause (30+ days)**
   - Confirm user wants to resume
   - Offer to regenerate next week (freshness)

3. **Multiple simultaneous adaptations**
   - Limit to 1 adaptation per week
   - Prioritize most important

4. **User deletes program mid-adaptation**
   - Cancel scheduled adaptation jobs
   - Clean up references

5. **Adaptation conflicts with user regeneration**
   - User's manual changes take precedence
   - Don't auto-adapt manually regenerated workouts

---

### 5B. Performance Optimization

**Caching Strategies:**

```typescript
// Cache program details in memory for 5 minutes
const programCache = new Map<string, { data: any, expiry: number }>();

async function getCachedProgramDetails(programId: string) {
  const cached = programCache.get(programId);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const data = await getProgramDetailsFromS3(programId);
  programCache.set(programId, {
    data,
    expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  return data;
}
```

**Batch Operations:**

```typescript
// Detect adaptations for multiple programs in one Lambda invocation
export const handler = async (event) => {
  const programIds = event.programIds; // Batch of 10-20 programs

  const results = await Promise.all(
    programIds.map(programId => detectAndApplyAdaptations(programId))
  );

  return { processed: results.length };
};
```

---

### 5C. Error Handling & Monitoring

**Comprehensive Error Tracking:**

```typescript
// Wrap all adaptation logic
try {
  await applyScalingAdaptation(userId, programId, patterns);
} catch (error) {
  console.error('❌ Adaptation failed:', error);

  // Log to CloudWatch with structured data
  await logError('adaptation_failed', {
    userId,
    programId,
    trigger: 'scaling_pattern',
    error: error.message,
    stack: error.stack
  });

  // Alert founder if critical
  if (isCriticalError(error)) {
    await sendAlert({
      title: 'Program Adaptation Failure',
      severity: 'high',
      details: error.message
    });
  }

  // Don't fail silently - notify user
  await sendCoachMessage(conversationId,
    "I ran into an issue adjusting your program. No worries - I'll take another look and follow up with you soon!"
  );
}
```

**Health Checks:**

```typescript
// Daily health check Lambda
export const handler = async () => {
  const checks = {
    adaptationDetector: await testAdaptationDetector(),
    checkInReminders: await testCheckInReminders(),
    metricsTracking: await testMetricsTracking(),
    s3Access: await testS3Access()
  };

  const failures = Object.entries(checks).filter(([_, passed]) => !passed);

  if (failures.length > 0) {
    await sendAlert({
      title: 'Phase 4 Health Check Failed',
      severity: 'medium',
      details: `Failed checks: ${failures.map(([name]) => name).join(', ')}`
    });
  }

  return { allPassed: failures.length === 0, checks };
};
```

---

## Implementation Schedule

### Week 1: Dashboard Quick Wins + Scaling Detection

**Days 1-2: Dashboard Quick Wins**
- [ ] View Creation Conversation link
- [ ] Regenerate Workout button & flow
- [ ] Coach conversation integration
- [ ] Testing

**Days 3-5: Scaling Pattern Detection**
- [ ] `detect-scaling-patterns` Lambda
- [ ] `apply-scaling-adaptation` Lambda
- [ ] AI adjustment prompts
- [ ] Scheduled job setup
- [ ] Coach notification system
- [ ] Frontend: Adaptation History component

---

### Week 2: Missed Workouts + Feedback Adaptation

**Days 1-2: Missed Workout Detection**
- [ ] Detection logic
- [ ] Volume reduction AI prompts
- [ ] Application Lambda
- [ ] Coach notification
- [ ] Testing edge cases

**Days 3-4: Feedback-Based Adaptation**
- [ ] Feedback pattern analysis
- [ ] Intensity adjustment logic
- [ ] Integration with workout logging
- [ ] Testing

**Day 5: Integration Testing**
- [ ] Test all adaptation triggers
- [ ] Verify no conflicts
- [ ] Performance testing

---

### Week 3: Check-in System

**Days 1-2: Check-in UI**
- [ ] `WeeklyCheckIn.jsx` component
- [ ] Check-in prompt logic
- [ ] Modal/page design
- [ ] Responsive layout

**Days 3-4: Check-in Backend**
- [ ] `submit-program-checkin` Lambda
- [ ] AI coach response generation
- [ ] Check-in storage
- [ ] Reminder notifications

**Day 5: Check-in History**
- [ ] View past check-ins
- [ ] Check-in timeline component
- [ ] Testing

---

### Week 4: Metrics & Polish

**Days 1-2: Metrics Dashboard**
- [ ] Enhanced progress overview
- [ ] Metrics calculation utilities
- [ ] CloudWatch integration
- [ ] Weekly report generation

**Days 3-4: Testing & Edge Cases**
- [ ] Edge case handling
- [ ] Error scenarios
- [ ] Performance optimization
- [ ] Load testing

**Day 5: Documentation & Launch Prep**
- [ ] Update API docs
- [ ] Component documentation
- [ ] User guides (internal)
- [ ] Founder demo prep

---

## Success Metrics

### Quantitative
- **Adaptation Trigger Rate**: 15-25% of programs (on track)
- **Check-in Response Rate**: >60% (good engagement)
- **User Satisfaction**: >85% positive feedback on adaptations
- **Retention Lift**: 1.5x for users with adapted programs vs. static

### Qualitative
- Users feel program "learns" from them
- Coaches (AI) feel more responsive and intelligent
- Feedback loops feel natural, not forced
- Adaptations are explained and transparent

---

## API Endpoints Summary

**New Endpoints:**

```
# Dashboard Quick Wins
PUT  /users/{userId}/coaches/{coachId}/programs/{programId}/templates/{templateId}/regenerate

# Adaptations
POST /users/{userId}/coaches/{coachId}/programs/{programId}/adaptations/detect
POST /users/{userId}/coaches/{coachId}/programs/{programId}/adaptations/apply

# Check-ins
POST /users/{userId}/coaches/{coachId}/programs/{programId}/check-ins
GET  /users/{userId}/coaches/{coachId}/programs/{programId}/check-ins

# Metrics
GET  /users/{userId}/coaches/{coachId}/programs/{programId}/metrics
GET  /users/{userId}/coaches/{coachId}/programs/{programId}/analytics
```

---

## Lambda Functions Summary

**New Functions:**

```
amplify/functions/
├── regenerate-workout-template/          # Dashboard quick win
├── detect-scaling-patterns/              # Adaptation
├── apply-scaling-adaptation/             # Adaptation
├── detect-missed-workout-pattern/        # Adaptation
├── apply-missed-workout-adaptation/      # Adaptation
├── scheduled-adaptation-detector/        # Scheduled job (daily)
├── submit-program-checkin/               # Check-in
├── generate-checkin-response/            # Check-in (or inline)
├── send-checkin-reminder/                # Check-in reminder job
└── generate-program-analytics-report/    # Weekly report job
```

---

## Dependencies & Prerequisites

### Backend
- ✅ Phase 3b complete (workout logging, program dashboard)
- ✅ Scaling analysis in `log-workout-template` (already implemented)
- ✅ S3 utilities for program details
- ✅ DynamoDB operations
- 🔲 CloudWatch metrics utilities
- 🔲 Email/notification system

### Frontend
- ✅ Program dashboard components
- ✅ ProgramAgent
- 🔲 Adaptation history component
- 🔲 Check-in modal/page
- 🔲 Enhanced metrics dashboard

---

## Risk Mitigation

### Technical Risks

**Risk 1: Adaptation Quality**
- **Mitigation**: Extensive testing of AI prompts with real workout data
- **Fallback**: Manual review flag for first 20 adaptations
- **Monitoring**: Track user feedback on adapted workouts

**Risk 2: Over-Adaptation**
- **Mitigation**: Limit to 1 adaptation per week per program
- **Fallback**: Allow users to revert adaptations
- **Monitoring**: Track adaptation frequency, alert if >30% of programs adapted

**Risk 3: Performance Impact**
- **Mitigation**: Scheduled jobs run during low-traffic hours
- **Fallback**: Batch processing, rate limiting
- **Monitoring**: CloudWatch alarms on Lambda duration/errors

---

## Post-Phase 4: Future Enhancements

**Phase 5 Ideas (3+ months out):**
1. **Biometric Integration**: HRV, sleep, recovery data → Auto-adjust intensity
2. **Social Features**: Share programs, leaderboards, accountability partners
3. **Advanced Analytics**: Predictive modeling for program success
4. **Multi-Coach Programs**: Strength coach + gymnastics coach collaborate
5. **Voice Check-ins**: Audio feedback via Alexa/Google Home
6. **Program Marketplace**: Top coaches publish program templates
7. **Competition Prep Mode**: Auto-taper for events, peak week optimization

---

## Conclusion

Phase 4 completes the training program vision by adding **intelligence and adaptability**. Programs stop being static PDFs and become **living, breathing coaching relationships** that learn, adapt, and respond to user needs in real-time.

### Phase 3b Achievement Unlocked: 98% Complete ✅
Ship it! Get real user data, learn from actual behavior, then return to build Phase 4 with confidence.

### Phase 4 Ready When You Are 🚀
This plan is comprehensive, actionable, and ready for implementation when you have production usage data to inform the adaptation logic.

---

**Next Steps:**
1. ✅ Ship Phase 3b to production
2. ✅ Monitor user behavior for 2-4 weeks
3. ✅ Gather feedback on program experience
4. ✅ Analyze workout logging patterns
5. ✅ Return to Phase 4 with real data to inform adaptation thresholds

**Let's ship Phase 3b and celebrate! 🎉**

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Status: Ready for Implementation (Post-Phase 3b Launch)*

