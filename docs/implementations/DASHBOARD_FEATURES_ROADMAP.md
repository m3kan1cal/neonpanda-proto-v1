# Dashboard Features Roadmap

**Status:** Planning

**Last Updated:** February 8, 2026

**Context:** Feature ideas for improving the Training Grounds dashboard (`TrainingGroundsV2.jsx`) and broader platform capabilities. Prioritized by ROI relative to effort.

---

## Feature 1: PR Highlights in "Your Highlights"

**Priority:** High -- Best ROI
**Effort:** Low-Medium
**Status:** Not Started

### Overview

Surface recent personal records (PRs) prominently on the Training Grounds dashboard in the "Your Highlights" section. PRs are the most motivating data point for fitness users, and the data is already being captured but not showcased outside of individual workout views.

### Current State

- Workout-level PR achievements (`pr_achievements`) are already extracted by the workout logger agent during workout logging and stored in DynamoDB workout records.
- `PRAchievement` type includes: exercise, discipline, pr_type (1rm, volume_pr, distance_pr, pace_pr), previous_best, new_best, improvement, improvement_percentage, significance (minor/moderate/major), context, date_previous.
- Exercise-level aggregated PRs (`prWeight`, `prReps`, `prVolume`) are computed on-the-fly in `calculateExerciseAggregations()` in `amplify/dynamodb/exercise.ts`.
- PRs are displayed in the `WorkoutViewer.jsx` component (lines 2474-2614) but only when viewing an individual workout.
- No dashboard-level PR display exists.

### What Needs to Be Built

**Backend:**

- Query recent workouts (past 2 weeks) and filter for those with non-empty `pr_achievements`.
- Could leverage existing `queryRecentWorkouts()` from `amplify/dynamodb/workout.ts` or add a lightweight endpoint.
- Option A (v1): Filter recent workouts client-side from the workouts already loaded by `WorkoutAgent`.
- Option B (v2): Dedicated backend endpoint for recent PRs across all exercises if performance becomes an issue.

**Frontend:**

- New `RecentPRsCard` component for the "Your Highlights" section grid.
- Display PR cards showing: exercise name, PR type, new value, improvement amount/percentage, date achieved.
- Match existing "Neon Glass" card styling from `containerPatterns.cardMedium`.
- Link each PR row to the corresponding workout detail view.
- Handle empty state (no recent PRs).

**Data Flow:**

1. `WorkoutAgent` loads recent workouts (already happens on dashboard load).
2. Filter workouts where `pr_achievements` array is non-empty and `completedAt` is within the last 2 weeks.
3. Flatten and sort PRs by date (most recent first).
4. Display in the "Your Highlights" section alongside existing cards (Conversations, Workout History, Reports, Programs).

### Key Files

| File                                          | Change                                                        |
| --------------------------------------------- | ------------------------------------------------------------- |
| `src/components/TrainingGroundsV2.jsx`        | Add PR Highlights card to the "Your Highlights" grid          |
| `src/components/highlights/RecentPRsCard.jsx` | New component for PR display                                  |
| `src/utils/agents/WorkoutAgent.js`            | Possibly expose PR filtering utility (or filter in component) |
| `amplify/functions/libs/workout/types.ts`     | Reference: `PRAchievement` interface                          |
| `amplify/functions/libs/exercise/types.ts`    | Reference: Exercise metrics types                             |

### Design Notes

- PRs with significance "major" should be visually distinguished (different accent color or icon).
- Consider a trophy/star icon for the section header to differentiate from other cards.
- Time window (2 weeks) should be configurable or could expand if no recent PRs found.
- Could later add "all-time PRs" view or link to a dedicated PR history page.

---

## Feature 2: Report Action Card in Today's Lineup

**Priority:** Medium -- Good ROI, reusable infrastructure
**Effort:** Medium
**Status:** Not Started

### Overview

Show a one-time action card in the "Today's Lineup" section when a new weekly or monthly report has been generated. The card prompts the user to view the report, and once viewed (or dismissed), it does not appear again. This creates a reusable "action card" pattern in Today's Lineup that can be extended to other notification types in the future.

### Current State

- Weekly reports are generated automatically every Sunday at 9:00 AM UTC via `build-weekly-analytics` Lambda.
- Monthly reports are generated on the 1st of each month at 9:00 AM UTC via `build-monthly-analytics` Lambda.
- Reports are surfaced in the "Reports & Insights" section (Tier 2) with a `NewBadge` based on `isCurrentWeekReport()` -- purely time-based, not user-action-based.
- No viewed/dismissed tracking exists in the data model.
- `TodaysWorkoutRow` only displays workout cards for active programs. No action card pattern exists.

### What Needs to Be Built

**Backend:**

- Add `viewedAt` field to `WeeklyAnalytics` and `MonthlyAnalytics` data models (or use a lightweight user preferences entity for dismissed items).
- New API endpoint: `PUT /users/{userId}/reports/weekly/{weekId}/viewed` to mark a report as viewed.
- Update `ReportAgent` with `markReportAsViewed(weekId)` method.
- Query logic: "get unviewed reports for this user within the last 7 days."

**Frontend:**

- New `ActionCard` component (reusable pattern for Today's Lineup non-workout items).
- Specific `ReportActionCard` variant showing report summary/preview.
- "View Report" CTA button that navigates to the report and marks it as viewed.
- Dismiss button that marks it as viewed without navigating.
- Integrate into `TodaysWorkoutRow` -- prepend action cards before workout cards in the grid.
- Update `TrainingGroundsV2` to check for unviewed reports and pass them to `TodaysWorkoutRow`.

**Data Model Change:**

```typescript
// Addition to WeeklyAnalytics / MonthlyAnalytics
viewedAt?: string; // ISO timestamp, null = not viewed
```

### Key Files

| File                                              | Change                                              |
| ------------------------------------------------- | --------------------------------------------------- |
| `amplify/functions/libs/analytics/types.ts`       | Add `viewedAt` to analytics types                   |
| `amplify/dynamodb/operations.ts`                  | Add `markReportViewed()` operation                  |
| `amplify/functions/mark-report-viewed/handler.ts` | New Lambda handler                                  |
| `src/utils/agents/ReportAgent.js`                 | Add `markReportAsViewed()`, `loadUnviewedReports()` |
| `src/components/programs/TodaysWorkoutRow.jsx`    | Accept and render action cards                      |
| `src/components/programs/ReportActionCard.jsx`    | New action card component                           |
| `src/components/TrainingGroundsV2.jsx`            | Wire up unviewed report checking and passing        |

### Design Notes

- The "action card" pattern in Today's Lineup should be generic enough to reuse for other one-time notifications (e.g., "New program suggestion", "Milestone reached").
- Action cards should appear before workout cards in the grid.
- Match "Neon Glass" styling but with a distinct accent (e.g., purple for reports) to differentiate from workout cards.
- Consider a subtle animation or glow to draw attention.

---

## Feature 3: Multi-Workout Logger Architecture

**Priority:** Low -- Technical debt, not user-facing
**Effort:** High
**Status:** Documented (architecture spec complete)

### Overview

Refactor the workout logger agent's storage layer to natively support multiple workout extractions in a single agent invocation, allowing Claude to process workouts in parallel rather than being forced into sequential processing.

### Current State

The architecture and migration plan are fully documented in `docs/implementations/WORKOUT_LOGGER_AGENT_ARCHITECTURE.md`. A prompt + code enforcement workaround is already in place and working:

1. Prompt rule (prompts.ts, rule 8): Instructs Claude to process one workout at a time.
2. Code guard (agent.ts, `handleToolUse`): `executedToolIds` Set blocks duplicate tool types within a single turn.
3. Overwrite warning (agent.ts, `storeToolResult`): Logs a warning if extraction data is overwritten before being saved.

### When to Implement

- When multi-workout messages become more common (currently rare/edge case).
- When performance matters: sequential processing adds latency for multi-workout messages.
- When the agent framework is being refactored for other reasons (good time to bundle the storage change).

### Migration Phases

| Phase | Scope                                                     | Risk        | Files Affected                         |
| ----- | --------------------------------------------------------- | ----------- | -------------------------------------- |
| 1     | Array-based storage, backward-compatible retrieval        | Low         | `agent.ts`                             |
| 2     | Pipeline-aware tools (save, validate, normalize, summary) | Medium      | 4 tool files                           |
| 3     | Multi-result return from `logWorkout`, handler updates    | Medium-High | `types.ts`, `handler.ts`               |
| 4     | UI support for multiple workout confirmations             | Medium-High | `stream-coach-conversation/handler.ts` |

### Reference

Full architecture spec: `docs/implementations/WORKOUT_LOGGER_AGENT_ARCHITECTURE.md`

---

## Feature 4: Meal Planner AI Agent

**Priority:** Low (now) -- High long-term potential
**Effort:** Very High
**Status:** Concept Only

### Overview

Create a new AI agent that builds personalized meal plans aligned to users' fitness goals, similar to how training programs work. Users would pair nutritional plans with their training programs for a holistic fitness + health approach.

### Current State

- No nutrition-related infrastructure exists in the codebase.
- The concept is listed in `NOTES_MLF.md` under "Ideas to work on" and "FUTURE ROADMAP."
- The platform has proven patterns for AI agents (workout logger, program designer, coach conversation) that could inform the meal planner agent design.

### What Would Need to Be Built

**Backend (new domain):**

- New data model: `MealPlan`, `MealPlanDay`, `Meal`, `NutrientProfile` entities in DynamoDB.
- New AI agent: `MealPlannerAgent` with tools for generating meal plans, adapting to dietary restrictions, calculating macros.
- New Lambda functions: `build-meal-plan` (async), `get-meal-plans` (sync), CRUD operations.
- S3 storage for meal plan details (similar to program details pattern).
- Pinecone integration for meal plan summaries and semantic search.

**Frontend (new pages):**

- Meal plan designer (similar to program designer flow).
- Meal plan viewer/tracker.
- Daily meal tracking interface.
- Integration with Training Grounds dashboard.

**AI & Domain:**

- Nutrition domain prompts and validation.
- Macro calculation logic.
- Dietary restriction handling (allergies, preferences, goals).
- Integration with training program goals (bulk, cut, maintain, performance).

### Risks

- Nutrition advice carries real responsibility -- bad fitness advice is inconvenient, bad nutrition advice can be harmful.
- Extremely broad scope; could easily expand into grocery lists, recipe databases, supplement tracking.
- Spreads development across two domains before engagement is proven in the first.

### When to Implement

- After core fitness engagement metrics are strong and retention is proven.
- When beta users specifically request nutritional guidance (validate demand).
- When the platform has resources to properly research and validate nutritional AI guidance.
- Consider starting with a lightweight "nutrition chat" mode in coach conversations before building a full agent.

---

## Feature 5: Exercise History & PR Timeline

**Priority:** Low (future) -- Builds on Feature 1
**Effort:** Medium
**Status:** Concept Only

### Overview

A dedicated "Exercise History" or "PR Timeline" feature that leverages exercise-level aggregations to show progression over time for individual exercises. For example, "see your back squat max weight over time" as a chart, or a "Top Exercises" card on the dashboard showing the user's most frequently performed movements.

### Current State

- Individual exercise occurrences are already stored as separate DynamoDB records with full `ExerciseMetrics` (weight, reps, sets, maxWeight, totalVolume, estimated1RM, etc.).
- `calculateExerciseAggregations()` in `amplify/dynamodb/exercise.ts` computes `prWeight`, `prReps`, `prVolume`, `averageWeight`, `averageReps` across all occurrences of an exercise.
- `queryExerciseNames()` returns all unique exercise names sorted by frequency (count), with `lastPerformed` and `disciplines`. This is already a "most performed" leaderboard.
- The `get-exercises` API requires a specific `exerciseName` -- there is no "all exercises with recent PRs" query.
- Exercise-level PRs are objective (computed from metrics) but lack the rich context of workout-level `pr_achievements` (no improvement delta, significance, or previous best tracking).

### Potential Sub-Features

**A. "Top Exercises" Dashboard Card (low effort)**

- Uses the existing `get-exercise-names` endpoint which already returns exercises sorted by count.
- Shows "Back Squat (47x), Bench Press (38x), Deadlift (32x)" in a lightweight card.
- Complements the PR Highlights card: PRs celebrate peaks, frequency celebrates consistency.
- Near-zero backend effort -- the API and data already exist.

**B. PR Timeline / Progression Charts (medium effort)**

- Query exercise history for a specific exercise and plot `maxWeight`, `estimated1RM`, or `totalVolume` over time.
- Could use the existing `get-exercises` endpoint with date range filtering.
- Requires a charting library and a new dedicated page/view.
- High engagement value for serious lifters who want to see trends.

**C. Cross-Exercise PR Detection (higher effort)**

- Detect when a new exercise occurrence sets a PR by comparing against `calculateExerciseAggregations()`.
- Would require an N+1 query pattern (load all exercise names, then query each) or a new aggregation table.
- Produces objective PRs that supplement the AI-detected workout-level PRs.
- Better suited as a backend job (post-workout processing) than a real-time dashboard query.

### Why Not Now

- The exercises API requires a specific `exerciseName` upfront. Finding recent PRs across all exercises would require expensive N+1 queries.
- Exercise-level PRs lack the rich context (improvement deltas, significance) that workout-level `pr_achievements` provide.
- The PR Highlights card (Feature 1) already covers the dashboard PR use case effectively.
- These features are most valuable once users have enough exercise history to make trends and frequency data meaningful.

### When to Implement

- After Feature 1 (PR Highlights) is validated with users.
- When users request exercise-specific progression tracking.
- When the platform adds a dedicated "Exercise Library" or "Exercise History" page.
- The "Top Exercises" card (sub-feature A) could be added quickly as a low-effort dashboard enhancement at any time.

---

## Priority Summary

| #   | Feature                        | Priority  | Effort     | Build When                            |
| --- | ------------------------------ | --------- | ---------- | ------------------------------------- |
| 1   | PR Highlights                  | High      | Low-Medium | Now (implemented)                     |
| 2   | Report Action Card             | Medium    | Medium     | After Feature 1                       |
| 3   | Multi-Workout Architecture     | Low       | High       | When edge case becomes common         |
| 4   | Meal Planner Agent             | Low (now) | Very High  | After core engagement is proven       |
| 5   | Exercise History & PR Timeline | Low       | Medium     | After users request exercise tracking |
