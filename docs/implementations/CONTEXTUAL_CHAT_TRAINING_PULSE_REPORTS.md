## Contextual Chat Drawer — Training Pulse & Reports Pages

Implementation plan for extending the existing contextual chat drawer (already
shipped on Program Dashboard, Training Grounds, View Workouts, and the single
Workout Details page) to three more analytics surfaces:

- **Training Pulse** (`/training-grounds/training-pulse`)
- **Reports list** (`/training-grounds/reports`) — weekly + monthly tabs
- **Weekly Report viewer** (`/training-grounds/reports/weekly?weekId=…`)

A future-proofed slot is also reserved for a Monthly Report viewer page that
does not yet exist in the router.

> Status: **Plan only.** No application code is changed in this PR. The
> document is intended for review before any implementation work begins.

---

### 1. Goal

Mirror the inline coach-chat affordance that lives on Program Dashboard / View
Workouts onto the analytics pages so a user can ask their coach questions
about what they're looking at without leaving the page. Each page gets:

- A floating panda-head FAB (`EntityChatFAB`) anchored bottom-right.
- A right-side slide-over drawer (`ContextualChatDrawer`,
  `variant="trainingGroundsInlineChat"`) that opens with a "home" thread
  scoped to the page's primary entity (time range, weekId, etc).
- Page-aware priming on the backend so the agent knows the user is asking
  about, e.g., week `w-2026-04-20` or the last 8 weeks of training data.

No new UI components are introduced — every drawer-side primitive already
exists. Work is concentrated in (a) per-page wiring, (b) one new constants
group, and (c) extending the streaming validator + handler with three new
`clientContext.surface` values.

---

### 2. Reference Architecture (recap)

Canonical spec: `docs/implementations/CONTEXTUAL_CHAT_IMPLEMENTATION.md`.
Concrete reference implementations to mirror:

| Surface             | Page component                                    | Tag prefix                       | Session key prefix          | streamClientContext shape                                                              |
| ------------------- | ------------------------------------------------- | -------------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `program_dashboard` | `src/components/programs/ProgramDashboard.jsx`    | `program_dashboard_inline:{pid}` | `neonpanda-pd-inline-chat`  | `{ surface, programId }`                                                               |
| `view_workouts`    | `src/components/programs/ViewWorkouts.jsx`        | `view_workouts_inline:{pid}`     | `neonpanda-vw-inline-chat`  | `{ surface, programId, dayNumber?, isViewingToday? }`                                  |
| `training_grounds`  | (existing full-page chat — telemetry-only surface)| `training_grounds_inline`        | `neonpanda-tg-inline-chat`  | `{ surface }`                                                                          |
| `workoutEdit`       | `src/components/WorkoutDetails.jsx`               | n/a (uses `editContext`)         | n/a                         | n/a — uses `{ entityType: "workout", entityId }`                                       |

What every host page does:

1. `useState` for drawer open/close.
2. Mirror that to `setIsInlineCoachDrawerOpen` on `NavigationContext` so
   `App.jsx` hides mobile chrome.
3. `useMemo` four values: `inlineConversationTag`, `inlineSessionKey`,
   `newConversationTitle`, `streamClientContext`.
4. Render `<EntityChatFAB />` and `<ContextualChatDrawer variant="trainingGroundsInlineChat" />`
   conditional on `coachData` being loaded, just before `</div>` of the page
   container (above tooltips). See `ProgramDashboard.jsx:608-628` for the
   canonical block.

The drawer itself, the `CoachConversationAgent`, the SSE streaming pipeline,
and the empty-state tips already work for any new surface — we only need to
extend three things on the backend and add four memos per page.

---

### 3. Target Pages — Detail

#### 3.1 Training Pulse — `src/components/analytics/TrainingPulse.jsx`

Page state we need to forward:

- `timeRange` — already a piece of local state (`"4w" | "8w" | "12w" | "24w" | "1y"`).
- `selectedExercise` — optional exercise deep-dive selection. Useful for
  context but **not** for thread scoping (the user can swap exercises within
  one conversation).

**Scoping decision** (recommended):

- One **single home thread per (user, coach)** — not per `timeRange`. Time
  range is a transient lens, not a separate "place", and per-range threads
  would fragment conversation history every time the selector changes.
- `timeRange` (and `selectedExercise` when present) is forwarded each turn
  via `streamClientContext` so the agent always sees the current view.

Constants:

```js
// src/constants/contextualChat.js
export const INLINE_TRAINING_PULSE_TAG = "training_pulse_inline";
export function getTrainingPulseInlineSessionKey(userId, coachId) {
  return `neonpanda-tp-inline-chat:${userId}:${coachId}`;
}
```

Per-page memos:

```js
const inlineConversationTag = INLINE_TRAINING_PULSE_TAG;
const inlineSessionKey = useMemo(
  () =>
    userId && coachId
      ? getTrainingPulseInlineSessionKey(userId, coachId)
      : null,
  [userId, coachId],
);
const newChatThreadTitle = "Training Pulse";
const streamClientContext = useMemo(
  () => ({
    surface: "training_pulse",
    timeRange,
    ...(selectedExercise ? { exerciseName: selectedExercise } : {}),
  }),
  [timeRange, selectedExercise],
);
```

Mount point: just before the closing `</div>` of `layoutPatterns.pageContainer`,
above the existing `<Tooltip />` block.

#### 3.2 Reports list — `src/components/ViewReports.jsx`

Page state we need to forward:

- `activeTab` — already a piece of local state (`"weekly" | "monthly"`).

**Scoping decision** (recommended):

- One single home thread per (user, coach). The list is a single browse
  surface; switching tabs is a filter, not a different page.
- `activeTab` is forwarded as `reportType` via `streamClientContext`.

Constants:

```js
export const INLINE_VIEW_REPORTS_TAG = "view_reports_inline";
export function getViewReportsInlineSessionKey(userId, coachId) {
  return `neonpanda-vr-inline-chat:${userId}:${coachId}`;
}
```

Memos:

```js
const inlineConversationTag = INLINE_VIEW_REPORTS_TAG;
const inlineSessionKey = useMemo(
  () =>
    userId && coachId
      ? getViewReportsInlineSessionKey(userId, coachId)
      : null,
  [userId, coachId],
);
const newChatThreadTitle = "Reports";
const streamClientContext = useMemo(
  () => ({ surface: "reports_list", reportType: activeTab }),
  [activeTab],
);
```

#### 3.3 Weekly Report viewer — `src/components/WeeklyReports.jsx`

Page state we need to forward:

- `weekId` — URL param, the primary entity.

**Scoping decision** (recommended):

- One home thread **per `weekId`**, mirroring the per-program scoping on
  Program Dashboard. Each report week is a distinct entity worth a dedicated
  conversation.
- The drawer is hidden until the report finishes loading
  (`!reportAgentState.isLoadingItem && report`), matching how View Workouts
  waits for its program.

Constants:

```js
export const INLINE_WEEKLY_REPORT_TAG_PREFIX = "weekly_report_inline";
export function getWeeklyReportInlineTag(weekId) {
  return `${INLINE_WEEKLY_REPORT_TAG_PREFIX}:${weekId}`;
}
export function getWeeklyReportInlineSessionKey(userId, coachId, weekId) {
  return `neonpanda-wr-inline-chat:${userId}:${coachId}:${weekId}`;
}
```

Memos:

```js
const inlineConversationTag = useMemo(
  () => (weekId ? getWeeklyReportInlineTag(weekId) : null),
  [weekId],
);
const inlineSessionKey = useMemo(
  () =>
    userId && coachId && weekId
      ? getWeeklyReportInlineSessionKey(userId, coachId, weekId)
      : null,
  [userId, coachId, weekId],
);
const newChatThreadTitle = useMemo(() => {
  if (!report) return "Weekly Report";
  const start = report?.weekStartDate || report?.startDate;
  return start ? `Weekly Report — ${start}` : "Weekly Report";
}, [report]);
const streamClientContext = useMemo(
  () => (weekId ? { surface: "weekly_report", weekId } : null),
  [weekId],
);
```

Mount point: inside the existing `return (...)` block, just before the
closing `</div>` of `layoutPatterns.pageContainer`, above `<Tooltip />`s.

#### 3.4 Monthly Report viewer (future-proofed)

There is currently **no** standalone monthly viewer page wired in
`App.jsx` — monthly data is rendered as a tab inside `ViewReports`. The plan
reserves the surface name and constants so when that page does exist, the
drawer can be added with one PR rather than a coordinated frontend+backend
change.

Constants (added now, unused until the page exists):

```js
export const INLINE_MONTHLY_REPORT_TAG_PREFIX = "monthly_report_inline";
export function getMonthlyReportInlineTag(monthId) {
  return `${INLINE_MONTHLY_REPORT_TAG_PREFIX}:${monthId}`;
}
export function getMonthlyReportInlineSessionKey(userId, coachId, monthId) {
  return `neonpanda-mr-inline-chat:${userId}:${coachId}:${monthId}`;
}
```

The backend validator (§4.1) will accept `surface: "monthly_report"` from
day one so a future page launch needs no Lambda redeploy.

---

### 4. Backend Changes

#### 4.1 Extend the streaming-request validator

`amplify/functions/libs/streaming/request-validation.ts`

Extend the discriminated union:

```ts
export type ConversationClientContext =
  | { surface: "program_dashboard"; programId: string }
  | { surface: "training_grounds" }
  | {
      surface: "view_workouts";
      programId: string;
      dayNumber?: number;
      isViewingToday?: boolean;
    }
  // NEW —
  | {
      surface: "training_pulse";
      timeRange: "4w" | "8w" | "12w" | "24w" | "1y";
      exerciseName?: string;
    }
  | { surface: "reports_list"; reportType: "weekly" | "monthly" }
  | { surface: "weekly_report"; weekId: string }
  | { surface: "monthly_report"; monthId: string };
```

`ALLOWED_CLIENT_CONTEXT_SURFACES` grows to include the four new strings.
`validateConversationClientContext` adds branches that:

- For `training_pulse`: require `timeRange` to be one of the five enum values;
  optionally accept a non-empty string `exerciseName`. Reject `programId`.
- For `reports_list`: require `reportType` to be `"weekly"` or `"monthly"`.
  Reject `programId`.
- For `weekly_report`: require non-empty `weekId` string. Reject `programId`.
- For `monthly_report`: require non-empty `monthId` string. Reject `programId`.

Tests in `request-validation.test.ts` get matching cases, modeled on the
existing `view_workouts` blocks (~10 new `it` blocks total).

#### 4.2 Surface handling in `stream-coach-conversation`

`amplify/functions/stream-coach-conversation/handler.ts`

Two pieces of work:

1. **Logging block** (`handler.ts:200-209`) — extend with new surface fields
   so CloudWatch search by surface keeps working:

   ```ts
   clientContextTimeRange:
     clientContext?.surface === "training_pulse"
       ? clientContext.timeRange
       : undefined,
   clientContextWeekId:
     clientContext?.surface === "weekly_report"
       ? clientContext.weekId
       : undefined,
   clientContextMonthId:
     clientContext?.surface === "monthly_report"
       ? clientContext.monthId
       : undefined,
   clientContextReportType:
     clientContext?.surface === "reports_list"
       ? clientContext.reportType
       : undefined,
   ```

2. **Priming** (`handler.ts:262-303`):

   - `training_pulse` and `reports_list` are **telemetry-only** in v1 — same
     branch shape as `training_grounds`. Logging is enough; the agent already
     pulls living profile + emotional context, which is where weekly trend
     answers come from today. No extra DDB reads.
   - `weekly_report`: add a parallel fetch of the report row alongside the
     existing `Promise.all`. Use the existing `ReportAgent`-equivalent
     server-side helper (or whatever `getCoachConversationSummary` is paired
     with — confirm during implementation) to load the structured weekly
     report JSON, then format it via a new
     `formatWeeklyReportForPrompt(report)` helper in
     `libs/coach-conversation/` that emits a compact bullet summary
     (sessions, total volume, PRs, top movements, recovery score). Inject
     into agent context the same way `livingProfileContext` is.
   - `monthly_report`: identical pattern, separate formatter. Wired up now
     so the future viewer page works without a Lambda redeploy. Until the
     viewer ships, no client will send this surface.

   Cache identity (`{ weekId, weekStartDate }` / `{ monthId, monthStartDate }`)
   in `existingConversation.metadata.sessionReportContext` once per
   conversation, mirroring `sessionProgramContextToStore`. Stats are NOT
   cached — they're re-read per turn so the agent sees fresh data if the
   report is regenerated mid-conversation.

   Open question (see §7): do we want the formatter to include the full
   report or just the highlights? Recommendation: **highlights only** in v1
   (≤ ~600 tokens) to keep latency down; the agent can ask the user to dig
   deeper into a specific area if needed.

#### 4.3 New formatters

Two small utilities, co-located with existing context formatters
(`libs/coach-conversation/` or the same dir as
`formatLivingProfileForPrompt`):

- `formatWeeklyReportForPrompt(report)` — pulls
  `structured.training_metrics`, `structured.fatigue_management`,
  `structured.performance_markers`, returns a markdown bullet block.
- `formatMonthlyReportForPrompt(report)` — same idea, monthly aggregates.

Each ships with a unit test on a fixture (sample report JSON from
`amplify/functions/libs/analytics/` test fixtures).

---

### 5. Constants File — Final Shape

`src/constants/contextualChat.js` after this work:

- `INLINE_TRAINING_GROUNDS_TAG` *(unchanged)*
- `INLINE_PROGRAM_DASHBOARD_TAG_PREFIX` + `getProgramDashboardInlineTag` *(unchanged)*
- `INLINE_VIEW_WORKOUTS_TAG_PREFIX` + `getViewWorkoutsInlineTag` *(unchanged)*
- **NEW** `INLINE_TRAINING_PULSE_TAG` + `getTrainingPulseInlineSessionKey`
- **NEW** `INLINE_VIEW_REPORTS_TAG` + `getViewReportsInlineSessionKey`
- **NEW** `INLINE_WEEKLY_REPORT_TAG_PREFIX` + `getWeeklyReportInlineTag` + `getWeeklyReportInlineSessionKey`
- **NEW** `INLINE_MONTHLY_REPORT_TAG_PREFIX` + `getMonthlyReportInlineTag` + `getMonthlyReportInlineSessionKey`
- `getTrainingGroundsInlineSessionKey`, `getProgramDashboardInlineSessionKey`, `getViewWorkoutsInlineSessionKey` *(unchanged)*
- `TRAINING_GROUNDS_INLINE_PICKER_LIMIT` *(unchanged)*

---

### 6. Phased Rollout

Three small, independently shippable PRs (recommended over one mega-PR):

**PR 1 — Backend surface contract.**

- `request-validation.ts` + tests for the four new surfaces.
- Logging block changes in `stream-coach-conversation/handler.ts`.
- Lands without any frontend changes; backwards compatible (no client sends
  the new surfaces yet, so no behavior change).

**PR 2 — Frontend wiring (Training Pulse + ViewReports + WeeklyReports).**

- `src/constants/contextualChat.js` additions.
- Drawer/FAB wired into the three pages.
- Manual smoke test each page in dev browser; verify mobile back button
  closes drawer first.

**PR 3 — Backend priming for `weekly_report` (and `monthly_report` skeleton).**

- New formatters + unit tests.
- Conditional fetch in `handler.ts` for the report-scoped surfaces.
- `sessionReportContext` cache in conversation metadata.

`training_pulse` / `reports_list` ship telemetry-only and never need a PR 3.

---

### 7. Open Questions for Review

1. **Drawer per-tab on ViewReports?** Plan says single thread + `reportType`
   forwarded. Alternative: two threads (`view_reports_inline:weekly`,
   `view_reports_inline:monthly`) for clean conversational separation. Lean
   toward single, but easy to flip.
2. **Time range scoping on Training Pulse?** Single thread vs per-range
   (5 threads). Lean single — strong recommendation.
3. **`exerciseName` on Training Pulse `streamClientContext`?** Useful but
   adds a dependency to the context memo (re-streams on every selector
   change). Alternative: omit it and let the agent ask. Lean **include** —
   it's the most contextually rich signal on that page.
4. **Weekly report priming depth.** Highlights (~600 tokens) vs full
   structured JSON (~3-5k). Lean highlights for v1.
5. **Monthly viewer page — build now or later?** Plan reserves the surface
   but does not add the page. Confirm we're OK deferring. If we want to
   build it in parallel, that's a separate plan.
6. **Drawer label / title.** Weekly Report drawer title proposed as
   `Weekly Report — {weekStartDate}`. ViewReports title proposed as plain
   `Reports`. Training Pulse as `Training Pulse`. OK to tweak.
7. **Mobile FAB collision.** Training Pulse and the report pages already
   render `CommandPaletteButton` in the header. The FAB is bottom-right and
   `EntityChatFAB` already coexists with command palette on Program
   Dashboard, so no expected collision — flag if QA finds one.

---

### 8. Testing & Verification

- **Unit:** new validator test cases (4 surfaces × valid/invalid). New
  formatter tests on fixture reports.
- **Manual:** open each page in `npm run dev`, confirm:
  - FAB renders only after `coachData` loads
  - Drawer opens, posts a message, gets a stream back, closes cleanly
  - Switching `timeRange` / `activeTab` / `weekId` produces the right
    `streamClientContext` (verify in CloudWatch logs once deployed)
  - Mobile: back-button closes drawer first; bottom nav hides while open
  - sessionStorage key matches the constant; resuming the page reopens the
    same conversation
- **Type-check:** `npm test` (Vitest also runs the validator tests).
- **Lint:** `npm run lint`.
- **Swagger:** unaffected — no new HTTP endpoints.

---

### 9. Non-Goals

- No new agent tools. The agent's tool surface stays as-is; we're only
  changing the *prompt context* it receives.
- No changes to the drawer component, `CoachConversationAgent`, or SSE
  pipeline. If we hit a limitation there, it's out of scope and goes into
  a follow-up.
- No new HTTP endpoints, no Swagger/OpenAPI changes.
- No URL-state for drawer (open/close stays local React state, matching the
  reference pages).
- No monthly-report deep-view page in this work.

---

### 10. Risks

- **Token bloat.** Adding weekly-report priming on every turn increases the
  prompt size for that surface. Mitigation: highlights-only formatter,
  capped at ~600 tokens.
- **Stale report stats.** Report rows are written by the
  `build-weekly-analytics` scheduler; if a user opens the drawer mid-rebuild
  they could see "old" stats in the response. Acceptable — same risk
  exists today on the report viewer itself.
- **Validator drift.** Adding a fifth+ surface schema to the union has
  historically been a hot spot for typos. Mitigation: keep the new test
  cases tight on per-surface required/forbidden fields.
- **sessionStorage key sprawl.** Each new surface adds a key prefix. Low
  risk — keys are short-lived and per-tab.
