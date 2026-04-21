# AI Date Grounding Plan

**Status:** Draft — awaiting user review before implementation
**Owner:** TBD
**Related Files:** See "Files Touched" section
**Problem Date:** 2026-04-20

---

## 1. Problem Statement

AI coaches frequently hallucinate or drift on the current date. Common symptoms:

1. When a user returns after several days away, the coach treats the new message as if it is "the next day" relative to the previous turn (LLM anchors on conversation recency rather than real-world time).
2. When users reference absolute dates ("my meet on May 3"), the coach miscalculates how far away those dates are (frequently stating "in 2 weeks" when it is actually 6 weeks, or vice versa).
3. When users say "yesterday's workout" or "this Saturday", the coach sometimes resolves those against the wrong reference date, producing workouts on the wrong day, wrong programming anchors, or wrong "days until" counts.
4. Async downstream pipelines (program designer builder, coach creator builder, conversation summaries, living profile, workout insights) often run with **no current date** in the prompt at all, so any reasoning they do about "recent" or "this week" is ungrounded.
5. User timezone is read inconsistently across Lambdas — several handlers read a non-existent top-level `timezone` field and silently fall back to `America/Los_Angeles`, so many users are effectively on Pacific time regardless of their preferences.

The goal of this plan is to produce **a single, consistent, authoritative temporal context block** that is injected into every AI prompt surface that reasons about time, built from a **reliable user-timezone lookup**, and expressed in a format that LLMs are demonstrably better at reasoning with (explicit ISO dates + explicit day-of-week + explicit "days since last message" + explicit "days until" counters for any user-mentioned future dates the agent can see).

---

## 2. Current State (Audit Summary)

The codebase already has **partial** date grounding in live streaming agents, but it is inconsistent and leaky. The audit produced the following picture.

### 2.1 Where date IS currently in the prompt

| Surface                               | File                                                                                                                          | Format                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Coach conversation (main chat)        | `amplify/functions/libs/agents/conversation/prompts.ts` (~L261–287)                                                           | `Today is {weekday, long date} at {time} ({tz})` + a CRITICAL directive line |
| Coach creator session (Vesper intake) | `amplify/functions/libs/agents/coach-creator-session/prompts.ts` (~L206–237)                                                  | Same format                                                                  |
| Program designer session              | `amplify/functions/libs/agents/program-designer-session/prompts.ts` (~L342–373)                                               | Same format                                                                  |
| Workout logger agent                  | `amplify/functions/libs/agents/workout-logger/prompts.ts` (~L255–293)                                                         | `User Timezone / Current Date / Current Time` + `TEMPORAL AWARENESS` bullets |
| Workout extraction (non-agent flows)  | `amplify/functions/libs/workout/extraction.ts`, `base-guidance.ts`, `coach-conversation/prompt-generation.ts`, `detection.ts` | Dedicated `TEMPORAL CONTEXT` sections (parallel stack to agents)             |

### 2.2 Where date IS NOT in the prompt (but should be)

| Surface                        | File                                                                                             | Risk                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coach personality layer        | `amplify/functions/libs/coach-config/personality-utils.ts` — `buildCoachPersonalityPrompt()`     | No date. Not critical on its own, but the personality prompt is concatenated into many downstream flows.                                                                                                            |
| Program designer async builder | `amplify/functions/libs/agents/program-designer/prompts.ts`                                      | No "today" block. Builder also defaults `startDate` to **UTC calendar day** (`new Date().toISOString().split("T")[0]`) in `program-designer/tools.ts` — disagrees with session prompt's local time for US evenings. |
| Coach creator async builder    | `amplify/functions/libs/agents/coach-creator/prompts.ts`                                         | No current-date section. Coach-config generation (timeline, "start next week") is ungrounded.                                                                                                                       |
| Conversation summary generator | `amplify/functions/libs/coach-conversation/summary.ts` — `buildCoachConversationSummaryPrompt()` | No "today". Summaries that say "recently" / "this week" are ungrounded.                                                                                                                                             |
| Living profile generator       | `amplify/functions/libs/user/living-profile.ts` — `generateLivingProfile()`                      | No "today". Any "recent X" references in the profile drift.                                                                                                                                                         |
| Workout insights               | `amplify/functions/libs/schemas/workout-insights-schema.ts` — `getWorkoutInsightsPrompt()`       | No "today". "Last N days" framing has no anchor.                                                                                                                                                                    |

### 2.3 Timezone plumbing inconsistency

**Canonical storage** (correct): `userProfile.preferences.timezone` (IANA string), defaulted to `"America/Los_Angeles"` in `post-confirmation`. Written/read by `Settings.jsx` under `profile.preferences?.timezone`.

**Incorrect reads** (silently fall back to Pacific):

- `stream-coach-conversation/handler.ts` — `getUserTimezoneOrDefault((userProfile as any)?.timezone || null)`
- `stream-coach-creator-session/handler.ts` — same shape
- `stream-program-designer-session/handler.ts` — same shape
- `workout-creator/handler-helpers.ts` — `conversationData.userProfile?.timezone`
- `build-conversation-summary` — `(userProfile as any)?.timezone`

**Correct reads** (for reference): `response-orchestrator.ts`, `log-workout-template/handler.ts`, `get-workout-template/handler.ts`, `coach-conversation/workout-detection.ts` — all use `userProfile?.preferences?.timezone`.

This is the root cause of a meaningful fraction of the date drift: even when a user configured Eastern time, the agent prompt was probably built in Pacific.

### 2.4 Existing utilities we'll reuse

In `amplify/functions/libs/analytics/date-utils.ts`:

- `getUserTimezoneOrDefault(userTimezone?)` — IANA fallback to `America/Los_Angeles`.
- `convertUtcToUserDate(utc, tz)` — `YYYY-MM-DD` in user TZ.
- `parseCompletedAt(value)` — robust timestamp parsing.
- Week/month range helpers — UTC-anchored; **not** what we want for coach reasoning (analytics-only).

There is **no** helper today that produces the "full temporal context block" for prompts. Each prompt file rolls its own `Intl.DateTimeFormat`. This is what we unify.

---

## 3. Design Principles

1. **Single source of truth.** One function produces the entire temporal context block. Every AI prompt surface that needs "today" calls that function and embeds the returned string. Drift becomes impossible.
2. **Explicit over implicit.** Give the model multiple redundant expressions of "now": ISO date, weekday, time, timezone, and a literal sentence. LLMs anchor better on explicit formats.
3. **Ground "last interaction" recency.** If we know `lastUserMessageAt`, include "It has been N days since your last message" so the model cannot assume "tomorrow from last turn." This is the direct fix for the reported complaint.
4. **Ground user-mentioned future dates at the tool layer.** When the user references an absolute date (e.g. "my meet on 2026-05-03"), the agent gains far more accuracy from a tool/helper that computes `days_until` for it than from asking the LLM to count. Provide it.
5. **Fix TZ plumbing first.** No amount of prompt engineering fixes a user who is silently defaulted to Pacific. Unify on `preferences.timezone` everywhere.
6. **Apply to every surface, not just live chat.** Async builders and summaries are where a lot of the long-tail "how far away" hallucinations come from.
7. **Don't break prompt caching.** The new block goes in the **dynamic** (non-cached) prompt section where it already lives. No changes to the static/cached prefixes.

---

## 4. Proposed Solution

### 4.1 New utility: `buildTemporalContext()`

Add `amplify/functions/libs/analytics/temporal-context.ts`:

```ts
export interface TemporalContextInput {
  userTimezone?: string | null;
  now?: Date;
  lastInteractionAt?: string | number | Date | null;
  upcomingAnchors?: Array<{ label: string; date: string }>;
}

export interface TemporalContext {
  isoDate: string;
  isoDateTime: string;
  weekday: string;
  weekdayShort: string;
  localDate: string;
  localTime: string;
  timezone: string;
  daysSinceLastInteraction: number | null;
  upcomingAnchors: Array<{ label: string; date: string; daysUntil: number }>;
  promptBlock: string;
}

export function buildTemporalContext(
  input: TemporalContextInput,
): TemporalContext;
```

`promptBlock` is the canonical string every prompt embeds. Shape:

```
## CURRENT DATE & TIME (AUTHORITATIVE)

- Today's ISO date: 2026-04-20
- Day of week: Monday
- Local time: 4:32 PM
- Timezone: America/Los_Angeles
- Current ISO timestamp: 2026-04-20T23:32:14Z

It has been 6 days since the user's last message.

Upcoming dates the user has referenced:
- Meet day (2026-05-03): 13 days from today
- Deload week start (2026-04-27): 7 days from today

CRITICAL TEMPORAL RULES:
1. The current date is 2026-04-20 (Monday). Never infer it from the conversation history.
2. "Today", "this morning", "tonight" all refer to 2026-04-20.
3. "Yesterday" is 2026-04-19 (Sunday). "Tomorrow" is 2026-04-21 (Tuesday).
4. Do not assume the user is messaging you the day after their previous message. It has been 6 days since their last message. Ask the user to clarify before assigning dates if ambiguous.
5. When calculating days-until a future date, subtract 2026-04-20 from the target ISO date. Do not estimate.
6. Always state future dates with both the ISO date and the day-count (e.g. "your meet on 2026-05-03 (13 days from today)").
```

Implementation notes:

- Uses `Intl.DateTimeFormat` with `timeZone: effectiveTimezone` (as current code does).
- `daysSinceLastInteraction` is computed from `convertUtcToUserDate(now, tz)` minus `convertUtcToUserDate(lastInteractionAt, tz)` so the count is **calendar-days in user TZ**, not milliseconds / 86400. This matches user intuition (a message at 11pm last night is "1 day ago" once it's past midnight).
- `upcomingAnchors` is optional; callers who detect user-mentioned future dates can pass them in (§4.5). When omitted, the "Upcoming dates" section is suppressed.
- Zero LLM calls; pure date math.

### 4.2 Unify user-timezone reads (prerequisite)

Create a single helper `getUserTimezone(userProfile)` in `amplify/functions/libs/user/timezone.ts` that reads `userProfile?.preferences?.timezone` and wraps `getUserTimezoneOrDefault`. Update these Lambdas/handlers to use it:

- `amplify/functions/stream-coach-conversation/handler.ts`
- `amplify/functions/stream-coach-creator-session/handler.ts`
- `amplify/functions/stream-program-designer-session/handler.ts`
- `amplify/functions/workout-creator/handler-helpers.ts`
- `amplify/functions/build-conversation-summary/*` (emotional snapshot extractor)
- Any other caller found via grep for `(userProfile as any)?.timezone` or `userProfile?.timezone` that is NOT `.preferences.timezone`.

Remove the `(as any)` casts; `UserProfile` already types `preferences.timezone?: string`.

### 4.3 Wire `buildTemporalContext()` into every AI prompt surface

Replace the ad-hoc `now.toLocaleDateString(...)` blocks in the files below with `buildTemporalContext({ userTimezone, lastInteractionAt }).promptBlock`:

**Streaming agents (already have partial blocks — upgrade and unify):**

| File                                                                | Change                                                                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amplify/functions/libs/agents/conversation/prompts.ts`             | Replace `## CURRENT DATE & TIME` section with `promptBlock`. Accept `lastInteractionAt` via options.                                                  |
| `amplify/functions/libs/agents/coach-creator-session/prompts.ts`    | Same treatment.                                                                                                                                       |
| `amplify/functions/libs/agents/program-designer-session/prompts.ts` | Same treatment.                                                                                                                                       |
| `amplify/functions/libs/agents/workout-logger/prompts.ts`           | Replace the `## CONTEXT` / `TEMPORAL AWARENESS` block with the unified one. Keep the workout-logger-specific "prefer extracted time over now()" rule. |

**Async agents (no current block today — add one):**

| File                                                        | Change                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amplify/functions/libs/agents/program-designer/prompts.ts` | Inject `promptBlock` at the top of dynamic content. Pass `upcomingAnchors` including any explicit `startDate` / competition / test dates detected from the session. |
| `amplify/functions/libs/agents/coach-creator/prompts.ts`    | Inject `promptBlock`.                                                                                                                                               |

**Non-agent prompt surfaces (no "today" today — add one):**

| File                                                                                             | Change                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `amplify/functions/libs/coach-conversation/summary.ts` — `buildCoachConversationSummaryPrompt()` | Inject `promptBlock` so the summary can correctly say "this week / this morning / two days ago."                                           |
| `amplify/functions/libs/user/living-profile.ts` — `generateLivingProfile()`                      | Inject `promptBlock`.                                                                                                                      |
| `amplify/functions/libs/schemas/workout-insights-schema.ts` — `getWorkoutInsightsPrompt()`       | Inject `promptBlock` so "last N days" framing has an anchor.                                                                               |
| `amplify/functions/libs/coach-config/personality-utils.ts` — `buildCoachPersonalityPrompt()`     | **No change.** Personality should be timeless; date lives in the dynamic block above. (Keeping it out here also preserves prompt caching.) |

### 4.4 Pass `lastInteractionAt` through to prompts

The "days since last message" directive is the direct fix for the reported issue. It requires knowing when the user last interacted.

1. Streaming handlers already load the conversation. Extract the timestamp of the most-recent prior user message (before the one being processed now) and pass it into `buildConversationAgentPrompt({ ..., lastInteractionAt })`.
2. For coach-creator-session and program-designer-session: same pattern, using the session's stored message timestamps.
3. For summary / living-profile / workout-insights builders: pass the most-recent interaction timestamp already available in their input payload.
4. If unavailable (first-ever turn), omit gracefully — `buildTemporalContext` suppresses the line when null.

### 4.5 Future-date anchoring via a new tool + helpers

Goal: when the user says "my meet is May 3" or "I want to hit a 500 deadlift by mid-June", the agent should not guess "how far away." Two-part fix:

**Part A — Deterministic helper:**

Add `amplify/functions/libs/analytics/date-math.ts` with:

```ts
export function daysUntil(targetIsoDate: string, now: Date, tz: string): number;
export function resolveRelativeDate(
  phrase: string,
  now: Date,
  tz: string,
): string | null;
// phrase examples: "tomorrow", "this saturday", "next monday", "in 3 weeks", "may 3"
```

`resolveRelativeDate` is a small parser (no LLM) for the common cases and returns a `YYYY-MM-DD` string. It is the authoritative resolver for tools that need to commit a date (workout `completedAt`, program `startDate`, scheduled deload dates).

**Part B — New agent tool: `compute_date`:**

Expose a tool in conversation, program-designer-session, coach-creator-session, and workout-logger:

```
compute_date({
  references: Array<"tomorrow" | "this saturday" | "2026-05-03" | ...>
}) -> Array<{ input, isoDate, dayOfWeek, daysFromToday }>
```

Behavior: runs `resolveRelativeDate` + `daysUntil` for each and returns a tight JSON payload. Forces the LLM to delegate all date math instead of guessing.

Agent prompts in §4.3 gain a short directive: _"Whenever the user mentions an absolute date, a relative date phrase, or asks how many days until something, call `compute_date` before answering."_

**Part C — Fix the UTC `startDate` default in program builder:**

In `amplify/functions/libs/agents/program-designer/tools.ts` around L86–89, replace:

```ts
const today = new Date().toISOString().split("T")[0];
```

with `convertUtcToUserDate(new Date(), userTimezone)` using the timezone passed into the builder context. Ensures a program "starting today" starts on the user's local Monday, not UTC Monday.

### 4.6 Optional: detect and surface user-referenced future dates

Stretch enhancement (defer unless we see the plain tool isn't enough):

- After each user turn, run a lightweight Haiku classifier to extract any date references from the user message and pass them to `buildTemporalContext({ upcomingAnchors })` for the _next_ turn.
- This makes the agent proactively see the full set of pinned future events in its temporal block, so multi-turn planning ("so I have 6 weeks left to peak") stays accurate even when the user doesn't reask.

Can be added later — not in scope for v1.

---

## 5. Prompt Wording Choices (evidence-based)

Tested patterns from the LLM-grounding literature (and Anthropic/OpenAI guidance) that this plan adopts:

1. **Redundant formats.** ISO date + weekday name + full-month date + ISO timestamp. Models anchor best when the same fact is repeated in multiple representations.
2. **"AUTHORITATIVE" label + numbered rules.** Models are measurably less likely to override a source when it's labeled authoritative and rules are enumerated.
3. **Negation of common failure modes.** Explicitly forbid the two observed failure modes:
   - "Never infer today's date from conversation history."
   - "Do not assume the user is messaging you the day after their previous message."
4. **Require delegation for math.** "Do not estimate" + provide the `compute_date` tool. This is the single most reliable lever against date arithmetic hallucination.
5. **Force output format.** "Always state future dates with both the ISO date and the day-count." Makes hallucinations visible (mismatched count vs ISO) and user-correctable.

---

## 6. Files Touched

**New files:**

- `amplify/functions/libs/analytics/temporal-context.ts` — `buildTemporalContext()` + unit tests.
- `amplify/functions/libs/analytics/date-math.ts` — `daysUntil`, `resolveRelativeDate` + unit tests.
- `amplify/functions/libs/user/timezone.ts` — `getUserTimezone(userProfile)`.

**Modified — timezone read unification:**

- `amplify/functions/stream-coach-conversation/handler.ts`
- `amplify/functions/stream-coach-creator-session/handler.ts`
- `amplify/functions/stream-program-designer-session/handler.ts`
- `amplify/functions/workout-creator/handler-helpers.ts`
- `amplify/functions/build-conversation-summary/` (emotional snapshot call site)

**Modified — prompt injection:**

- `amplify/functions/libs/agents/conversation/prompts.ts`
- `amplify/functions/libs/agents/coach-creator-session/prompts.ts`
- `amplify/functions/libs/agents/program-designer-session/prompts.ts`
- `amplify/functions/libs/agents/workout-logger/prompts.ts`
- `amplify/functions/libs/agents/program-designer/prompts.ts`
- `amplify/functions/libs/agents/coach-creator/prompts.ts`
- `amplify/functions/libs/coach-conversation/summary.ts`
- `amplify/functions/libs/user/living-profile.ts`
- `amplify/functions/libs/schemas/workout-insights-schema.ts`

**Modified — last-interaction plumbing:**

- Streaming handlers listed above, plus `libs/agents/conversation/agent.ts`, `coach-creator-session/agent.ts`, `program-designer-session/agent.ts` (to thread the timestamp into prompts).

**Modified — tool layer:**

- `amplify/functions/libs/agents/conversation/tools.ts` — add `compute_date` tool.
- `amplify/functions/libs/agents/coach-creator-session/tools.ts` — same.
- `amplify/functions/libs/agents/program-designer-session/tools.ts` — same.
- `amplify/functions/libs/agents/workout-logger/tools.ts` — same.
- `amplify/functions/libs/agents/program-designer/tools.ts` — fix UTC `startDate` default.

**Documentation:**

- Note in `docs/strategy/STRUCTURED_OUTPUTS_STRATEGY.md` (or a new `docs/strategy/TEMPORAL_GROUNDING.md`) describing the convention: every AI prompt that reasons about time uses `buildTemporalContext()`.

---

## 7. Testing Plan

### 7.1 Unit tests

- `buildTemporalContext` — frozen `now`, verify ISO/weekday/localDate/localTime across a half-dozen IANA zones (`America/Los_Angeles`, `America/New_York`, `Europe/London`, `Asia/Tokyo`, `Australia/Sydney`, `Pacific/Auckland`). Include DST boundary cases (spring-forward Sunday at 2:30am local).
- `daysSinceLastInteraction` — cross-midnight in user TZ (last msg at 11:55pm, now at 12:05am → 1 day, not 0).
- `daysUntil` — positive, zero (same day), negative (past) cases.
- `resolveRelativeDate` — "tomorrow", "this saturday" (today is saturday vs monday), "next monday" (today is sunday), "in 3 weeks", ISO passthrough.
- `compute_date` tool handler — returns expected structure for mixed inputs.

### 7.2 Integration tests

- `test/integration/` scenario: inject a conversation where the last user message is 6 days old, send a new user message containing "how's my form for Saturday," assert the system prompt visible to Bedrock contains `"It has been 6 days"` and `"Saturday"` resolves via tool not model.
- Scenario: user in `America/New_York` at 11:30pm ET sends a message; assert prompt shows `Today is {ET date}`, not UTC date.
- Scenario: program designer session finishes; assert the builder's system prompt contains the unified temporal block.

### 7.3 Manual/eval

- Run a scripted conversation against a deployed dev env simulating the reported failure (return after 3 days, reference "tomorrow's workout"). Confirm the coach no longer treats it as day-after-last-message.
- Log sampling: over ~50 recent conversations, count instances of date-mismatch language ("in X days" disagreeing with the ISO date in the same message) before vs after rollout.

---

## 8. Rollout

1. **Phase 1** — Ship `buildTemporalContext`, `date-math`, `getUserTimezone` utilities with unit tests. No behavior change.
2. **Phase 2** — Unify timezone reads across streaming handlers (behavior change: users with non-Pacific timezones suddenly see correct local dates). Monitor via logs for anomalous timezone values.
3. **Phase 3** — Swap streaming agent prompts to use `promptBlock` + `lastInteractionAt`. Ship behind no flag — it's a pure quality improvement and the format is a superset of what's there today.
4. **Phase 4** — Add `compute_date` tool to all four live agents, add the "delegate date math" directive to prompts.
5. **Phase 5** — Add temporal block to async builders (program-designer, coach-creator) and summarization/profile/insights prompts. Fix UTC `startDate` default.
6. **Phase 6** — (Optional) future-date anchor extraction (§4.6).

Each phase is an independent PR and shippable on its own.

---

## 9. Risks & Mitigations

| Risk                                                                                                             | Mitigation                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt length grows, pushes Haiku near limits for long threads                                                   | The unified block is ~20 lines — comparable to what conversation prompt already has. Net increase on other surfaces is acceptable. Measure token counts pre/post.                     |
| `resolveRelativeDate` is a mini-parser; easy to get wrong on edge cases ("this saturday" when today IS saturday) | Keep the set small and well-tested. When the parser can't confidently resolve, return null and let the LLM ask for clarification.                                                     |
| Timezone unification surfaces bad timezone strings stored historically                                           | Validate against `Intl.supportedValuesOf("timeZone")` in `getUserTimezone`; fall back to Pacific on invalid. Log (once per request) when fallback triggers.                           |
| `lastInteractionAt` not always available on first turn of a brand-new conversation                               | Suppress the "days since last message" line when null.                                                                                                                                |
| Prompt caching invalidation                                                                                      | The temporal block already lives in the dynamic section of conversation prompts. New insertions for other surfaces go into their dynamic portions too. No changes to cached prefixes. |
| Over-directive prompts reducing coach warmth                                                                     | The temporal block is structural; personality prompts (tone, encouragement style) are untouched.                                                                                      |

---

## 10. Open Questions for Review

1. Should `compute_date` be auto-called when the user message contains a detected date phrase, or left to the model's discretion under a prompt directive? (Recommendation: directive-only in v1; add automatic pre-call in a later iteration if needed.)
2. For users without a stored timezone, should we attempt to infer from browser on next session and persist? (Out of scope; recommend a separate task.)
3. Should the temporal block include the current week number / phase week for users on an active program (e.g. "Program week: 4 of 8, phase: hypertrophy")? Would significantly improve program-aware responses but expands scope. (Recommendation: defer to a v2.)
4. Do we want a server-side "stale conversation" banner in the UI when >N days have passed, or is the prompt change sufficient? (Recommendation: prompt change only for now.)

---

## 11. Acceptance Criteria

1. Every AI prompt surface listed in §2.1 and §2.2 embeds the output of `buildTemporalContext()` — verified by a codebase grep test.
2. No Lambda reads `(userProfile as any).timezone` or `userProfile.timezone` at top level — only `userProfile.preferences.timezone` via `getUserTimezone()`.
3. `compute_date` tool exists in all four live agents and is described in each agent's prompt.
4. `program-designer/tools.ts` default `startDate` uses user-local date, not UTC.
5. Unit tests cover TZ/DST edge cases and `daysSinceLastInteraction` cross-midnight.
6. Manual eval (§7.3) shows the "assumed-tomorrow" failure mode is no longer reproducible after a simulated 3-day gap.
