# Dashboard Features Roadmap

**Status:** Active

**Last Updated:** February 11, 2026

**Context:** Feature ideas for improving the Training Grounds dashboard (`TrainingGroundsV2.jsx`) and broader platform capabilities. Prioritized by ROI relative to effort.

---

## Feature 1: PR Highlights in "Your Highlights"

**Priority:** High -- Best ROI
**Effort:** Low-Medium
**Status:** Complete

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

**Priority:** High -- Data integrity issue
**Effort:** Medium
**Status:** Complete (Phases 1-3)

### Overview

Refactor the workout logger agent's storage layer to natively support multiple workout extractions in a single agent invocation, allowing Claude to process workouts in parallel rather than being forced into sequential processing.

### Implementation (2026-02-09)

Phases 1-3 implemented:

1. **Array-based storage**: `Map<string, any[]>` with push-based storage, index-aware `getToolResult(key, index?)`, and `getAllToolResults(key)`.
2. **Index-aware tools**: `workoutIndex` parameter added to validate, normalize, summary, and save tools. Each tool retrieves the correct workout's data via index.
3. **Multi-result aggregation**: `buildResultFromToolData` aggregates all saved workouts into `allWorkouts` array. Handler passes `allWorkouts` in response.
4. **Removed workarounds**: `executedToolIds` guard and overwrite warnings removed. Prompt rule 8 updated to explain parallel processing.

### Remaining

- **Phase 4**: UI support for multiple workout confirmations (not yet needed -- backend handles it transparently).

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

## Feature 6: Workout Streak + Weekly Progress

**Priority:** High -- Best retention ROI
**Effort:** Low
**Status:** Complete

### Overview

Replace the misleading "Days" QuickStat (showed unique training days but tooltip said "training streak") with a real consecutive-day streak, plus a dedicated StreakCard in Your Highlights showing the streak prominently with a weekly progress bar.

### Implementation (2026-02-10)

- Added `_calculateWorkoutStreak(workouts)` to `WorkoutAgent.js` -- computes consecutive calendar days with at least one workout, with grace period (if no workout today, starts from yesterday).
- Added `currentStreak` to `WorkoutAgent` state, computed alongside existing stats in `loadWorkoutStats()`.
- Replaced "Days" QuickStat with "Streak" using a pixel-art `FireIcon`.
- Created `StreakCard.jsx` in `src/components/highlights/` -- hero streak number, pink-to-purple weekly progress bar (X/5), and context-aware motivational nudge.
- Updated "This Week" QuickStat tooltip to show "X of 5 workouts completed (Mon-Sun)".

### Key Files

| File                                            | Change                                             |
| ----------------------------------------------- | -------------------------------------------------- |
| `src/utils/agents/WorkoutAgent.js`              | `_calculateWorkoutStreak()`, `currentStreak` state |
| `src/components/highlights/StreakCard.jsx`      | New streak highlight card                          |
| `src/components/themes/SynthwaveComponents.jsx` | `FireIcon`, `FireIconSmall`                        |
| `src/components/TrainingGroundsV2.jsx`          | QuickStat replacement, StreakCard integration      |

---

## Feature 7: PR Unit of Measure

**Priority:** High -- Data quality
**Effort:** Low
**Status:** Complete

### Overview

Add `unit` field to PR achievements end-to-end so PR values display with their correct unit of measure (lbs, kg, mi, etc.) instead of inferring from PR type and user preference.

### Implementation (2026-02-10)

- Added `unit?: string` to `PRAchievement` interface in types.
- Added `unit` to the base workout extraction schema sent to Claude.
- Added PR unit tracking guidance to `base-guidance.ts` and aligned legacy `extraction.ts` field names with the actual schema.
- Updated `getPrUnit()` to accept optional `storedUnit` as first-priority override, falling back to `PR_TYPE_UNITS` inference for backward compatibility.
- Updated `WorkoutAgent._extractPrAchievements()` to pass `unit` through.
- Updated `RecentPRsCard` and `WorkoutViewer` to display units on PR values.

### Key Files

| File                                                         | Change                                        |
| ------------------------------------------------------------ | --------------------------------------------- |
| `amplify/functions/libs/workout/types.ts`                    | `unit?: string` on `PRAchievement`            |
| `amplify/functions/libs/schemas/base-schema.ts`              | `unit` in `pr_achievements` schema            |
| `amplify/functions/libs/workout/extraction/base-guidance.ts` | PR unit tracking guidance                     |
| `amplify/functions/libs/workout/extraction.ts`               | Aligned legacy PR guidance field names        |
| `src/utils/workout/constants.js`                             | `getPrUnit()` accepts `storedUnit` override   |
| `src/utils/agents/WorkoutAgent.js`                           | `unit` in PR enrichment                       |
| `src/components/highlights/RecentPRsCard.jsx`                | Passes stored unit to `getPrUnit`             |
| `src/components/WorkoutViewer.jsx`                           | Displays units on PR previous/new/improvement |

---

## Feature 8: Top Exercises Card

**Priority:** Medium -- Low effort, celebrates consistency
**Effort:** Trivial
**Status:** Complete

### Overview

New `TopExercisesCard` in Your Highlights showing the user's most-performed exercises sorted by frequency, celebrating consistency alongside PRs that celebrate peaks.

### Implementation (2026-02-10)

- Created `TopExercisesCard.jsx` following `RecentPRsCard` pattern -- `containerPatterns.cardMedium`, `listItemPatterns.rowCyan`, count badges, discipline tags, relative timestamps.
- Integrated `ExerciseAgent` into `TrainingGroundsV2` (initialization, state management, data loading with `limit: 5`).
- Placed card in desktop right column (after Recent PRs, before Workout History) and mobile layout.

### Key Files

| File                                             | Change                                    |
| ------------------------------------------------ | ----------------------------------------- |
| `src/components/highlights/TopExercisesCard.jsx` | New component                             |
| `src/components/TrainingGroundsV2.jsx`           | ExerciseAgent integration, card placement |

---

## Feature 9: Best Streak Backend Optimization

**Priority:** Medium -- Accuracy issue for power users
**Effort:** Medium
**Status:** Planned

### Overview

Currently, best streak is computed from the most recent 100 workouts fetched by `WorkoutAgent.loadWorkoutStats()`. Active users with 100+ workouts will see an underreported "Best" streak since older workout data is never considered. The solution is to store `bestStreak` as a pre-computed field that updates when workouts are created.

### Problem

- `_calculateBestStreak()` operates on `workouts` array limited to 100 items
- Original 100-item limit was designed for "recent items and this week" calculations
- Best streak computation requires analyzing the user's complete workout history
- Power users with >100 workouts will never see their true best streak

### Proposed Solution (Backend Computed Field)

**Backend Changes:**

1. Add `bestStreak` field to user stats in DynamoDB (stored alongside other workout metrics)
2. Update `build-workout` Lambda to recalculate and store best streak after each workout creation
3. Modify `WorkoutAgent` to read pre-computed `bestStreak` from user stats instead of calculating client-side

**Migration:**

- One-time backfill script to calculate and store `bestStreak` for all existing users
- Query all workouts per user, compute best streak, update user stats record

**Benefits:**

- Accurate for all users regardless of workout count
- Improves dashboard performance (no client-side calculation needed)
- Best streak updates automatically when workouts are logged
- Scales efficiently as users log 1000+ workouts

### Alternative Approaches (Not Recommended)

**Option A: Increase Limit**

- Raise workout query limit from 100 to 500-1000
- Still has ceiling problem, loads unnecessary data, slows dashboard for power users

**Option C: Lightweight Query**

- Fetch only `completedAt` dates for streak calculation (not full workout objects)
- Still requires client-side calculation on every dashboard load
- Better than current, but not as efficient as backend computed field

### Key Files

| File                                         | Change                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| `amplify/functions/build-workout/handler.ts` | Compute and store `bestStreak` after workout creation       |
| `amplify/dynamodb/operations.ts`             | Add `bestStreak` to user stats schema and update operations |
| `src/utils/agents/WorkoutAgent.js`           | Read `bestStreak` from user stats instead of computing      |
| Migration script (new)                       | Backfill `bestStreak` for existing users                    |

---

## Feature 10: Configurable Weekly Target for Streak Card

**Priority:** Low -- Nice-to-have personalization
**Effort:** Low-Medium
**Status:** Not Started

### Overview

The StreakCard "This Week" progress bar currently uses a hardcoded weekly target of 5 workouts (`WEEKLY_TARGET = 5` in `StreakCard.jsx`). Make the target configurable so it reflects the user's preference or their current training program (e.g. program prescribes 4 days/week → show X/4).

### Current State

- `StreakCard.jsx` defines `const WEEKLY_TARGET = 5` and uses it for the "This Week" label (X/5) and progress bar percentage.
- No user setting or program-derived target exists; all users see 5 as the target.
- QuickStat tooltip and changelog copy reference "5 workouts" (see `src/utils/changelogData.js` and any "This Week" tooltip).

### What Needs to Be Built

**Option A: User setting**

- Add a user preference (e.g. in Settings or user profile) for "Weekly workout target" (default 5).
- Store in DynamoDB user record or a lightweight preferences entity.
- Pass `weeklyTarget` (or equivalent) from dashboard/agent into `StreakCard`; component uses prop with fallback to 5.

**Option B: Derive from active program(s)**

- From active program(s), infer "workouts per week" (e.g. program has 4 phases with 4 days/week → target 4).
- Requires a clear rule: single active program vs multiple (e.g. max, sum, or primary program only).
- Pass derived target into `StreakCard`; fallback to 5 when no program or ambiguous.

**Option C: Hybrid**

- Prefer program-derived target when available and unambiguous; otherwise use user setting; default 5.

**Frontend:**

- `StreakCard` accepts optional `weeklyTarget?: number` prop; use it when provided, else `WEEKLY_TARGET`.
- Update any tooltips or copy that say "5 workouts" to use the active target (or generic "weekly target" wording).
- If Option A or C: Settings UI for weekly target (number input or preset, e.g. 3, 4, 5, 6, 7).

**Backend (if Option A or C):**

- User preferences schema and read/update operations for weekly target.
- Optional: endpoint or inclusion in existing user/profile fetch.

### Key Files

| File                                               | Change                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/highlights/StreakCard.jsx`         | Accept `weeklyTarget` prop, use for label and progress bar       |
| `src/components/TrainingGroundsV2.jsx`             | Pass `weeklyTarget` to StreakCard (from settings or derived)     |
| `src/components/Settings.jsx`                      | (If Option A/C) Weekly target setting control                    |
| `src/utils/agents/WorkoutAgent.js` or ProgramAgent | (If Option B/C) Expose or derive workouts-per-week from programs |
| `amplify/dynamodb/operations.ts`                   | (If Option A/C) User preferences read/update for weekly target   |
| `src/utils/changelogData.js`                       | Update copy if it hardcodes "5"                                  |

### Design Notes

- Default 5 keeps current behavior and avoids breaking existing users.
- Program-derived target is more accurate for users on a structured plan but needs a simple, documented rule for multi-program or no-program cases.
- Consider capping displayed target (e.g. 3–7) to avoid odd values from bad data or edge cases.

---

## Priority Summary

| #   | Feature                             | Priority  | Effort     | Build When                            |
| --- | ----------------------------------- | --------- | ---------- | ------------------------------------- |
| 1   | PR Highlights                       | High      | Low-Medium | Complete                              |
| 2   | Report Action Card                  | Medium    | Medium     | Next                                  |
| 3   | Multi-Workout Architecture          | High      | Medium     | Complete (Phases 1-3)                 |
| 4   | Meal Planner Agent                  | Low (now) | Very High  | After core engagement is proven       |
| 5   | Exercise History & PR Timeline      | Low       | Medium     | After users request exercise tracking |
| 6   | Workout Streak + Weekly Progress    | High      | Low        | Complete                              |
| 7   | PR Unit of Measure                  | High      | Low        | Complete                              |
| 8   | Top Exercises Card                  | Medium    | Trivial    | Complete                              |
| 9   | Best Streak Backend Optimization    | Medium    | Medium     | When power users hit 100+ workouts    |
| 10  | Configurable Weekly Target (Streak) | Low       | Low-Medium | When personalization is prioritized   |
