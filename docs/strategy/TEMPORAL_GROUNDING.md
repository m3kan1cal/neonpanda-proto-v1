# Temporal Grounding Strategy

AI coaches on NeonPanda historically hallucinated or drifted on the current date — treating return-after-a-gap messages as "the next day," miscounting days-until future events, assigning logged workouts to the wrong calendar day, etc. This document describes the single, uniform approach this codebase now uses to keep every AI prompt surface grounded in real-world time.

## Principles

1. **One source of truth for "now".** Every AI prompt surface that reasons about time embeds the output of `buildTemporalContext()` from `amplify/functions/libs/analytics/temporal-context.ts`. No other file formats "today is ..." inline.
2. **Explicit, redundant representations.** The temporal block expresses now as ISO date, weekday, time, timezone, and full ISO timestamp — all at once. LLMs anchor better when the same fact is present in multiple formats.
3. **Ground recency.** When a `lastInteractionAt` is available, the block includes "It has been N days since the user's last message." This is the specific fix for the LLM assuming continuity of day when the user returns after a gap.
4. **Delegate arithmetic.** The `compute_date` agent tool (shared factory in `amplify/functions/libs/agents/shared/tools.ts`) resolves ISO / relative / month-day phrases to a concrete `YYYY-MM-DD`, day-of-week, and `daysFromToday`. Prompts instruct agents: _never estimate, always call the tool_.
5. **One canonical reader for user timezone.** `getUserTimezone(userProfile)` from `amplify/functions/libs/user/timezone.ts`. Reads `preferences.timezone`, validates it, falls back to `America/Los_Angeles`.

## Required invariants

- Every new or existing prompt surface that reasons about `today`, `yesterday`, `tomorrow`, `this week`, `recently`, `last X`, or any future date **MUST** embed `buildTemporalContext({ userTimezone, lastInteractionAt? }).promptBlock`.
- Every Lambda that needs a user's timezone **MUST** call `getUserTimezone(userProfile)`. Do not read `userProfile.timezone` (no such field) or `(userProfile as any)?.timezone`.
- Agents that may see user-provided date phrases (`"tomorrow"`, `"next saturday"`, `"may 3"`, `"in 2 weeks"`) **MUST** include the `compute_date` tool and a prompt directive telling the model to call it rather than guess.
- The program-designer builder **MUST** use `convertUtcToUserDate` (never UTC) when defaulting `startDate`.

## Surfaces covered

| Surface                        | File                                              | Status                                                                              |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Coach conversation (main chat) | `libs/agents/conversation/prompts.ts`             | Uses `buildTemporalContext` + `lastInteractionAt` + `compute_date` tool + directive |
| Coach creator session (Vesper) | `libs/agents/coach-creator-session/prompts.ts`    | Uses `buildTemporalContext` + `lastInteractionAt` + `compute_date` tool + directive |
| Program designer session       | `libs/agents/program-designer-session/prompts.ts` | Uses `buildTemporalContext` + `lastInteractionAt` + `compute_date` tool + directive |
| Workout logger                 | `libs/agents/workout-logger/prompts.ts`           | Uses `buildTemporalContext` + `compute_date` tool + directive                       |
| Async program builder          | `libs/agents/program-designer/prompts.ts`         | Uses `buildTemporalContext`; `startDate` default is user-local                      |
| Async coach builder            | `libs/agents/coach-creator/prompts.ts`            | Uses `buildTemporalContext`                                                         |
| Conversation summary           | `libs/coach-conversation/summary.ts`              | Uses `buildTemporalContext`                                                         |
| Living profile                 | `libs/user/living-profile.ts`                     | Uses `buildTemporalContext`                                                         |
| Workout insights               | `libs/schemas/workout-insights-schema.ts`         | Uses `buildTemporalContext`                                                         |

## `compute_date` tool

Exposed in conversation, coach-creator-session, program-designer-session, and workout-logger. Input:

```json
{ "references": ["tomorrow", "2026-05-03", "this saturday"] }
```

Response:

```json
{
  "now": { "isoDate": "2026-04-20", "timezone": "America/Los_Angeles" },
  "results": [
    {
      "input": "tomorrow",
      "isoDate": "2026-04-21",
      "dayOfWeek": "Tuesday",
      "daysFromToday": 1,
      "resolved": true
    },
    {
      "input": "2026-05-03",
      "isoDate": "2026-05-03",
      "dayOfWeek": "Sunday",
      "daysFromToday": 13,
      "resolved": true
    },
    {
      "input": "this saturday",
      "isoDate": "2026-04-25",
      "dayOfWeek": "Saturday",
      "daysFromToday": 5,
      "resolved": true
    }
  ]
}
```

When a reference cannot be parsed, `resolved: false` is returned and the agent is instructed to ask the user for clarification rather than guess.

Accepted reference shapes:

- ISO `YYYY-MM-DD`
- `today`, `tonight`, `this morning/afternoon/evening`
- `tomorrow`, `yesterday`
- `this <weekday>`, `next <weekday>`, `last <weekday>` (full names or common short forms)
- `in N days|weeks|months`, `N days|weeks|months ago`
- Month-day phrases: `may 3`, `may 3rd`, `3 may`, `may 3 2026`

## Key utilities

- `buildTemporalContext(input)` — `libs/analytics/temporal-context.ts`
- `daysUntil`, `resolveRelativeDate`, `resolveDateReferences`, `weekdayLabelForIsoDate`, `diffInCalendarDays` — `libs/analytics/date-math.ts`
- `getUserTimezone(userProfile)` — `libs/user/timezone.ts`
- `convertUtcToUserDate`, `getUserTimezoneOrDefault`, `parseCompletedAt` — `libs/analytics/date-utils.ts` (unchanged; the new utilities build on top of these)

## When adding a new AI prompt surface

1. Decide whether the surface reasons about time. If it uses words like `today`, `recently`, `this week`, `upcoming`, or handles any date field → yes.
2. Import `buildTemporalContext` and embed `promptBlock` in the dynamic section of the prompt.
3. If the surface is an agent that takes live user turns, thread `lastInteractionAt` in from the handler (ISO timestamp of the most recent prior user message).
4. If the agent may see user-provided date phrases, include `createComputeDateTool<TContext>()` in its tool set and add a one-paragraph directive to the prompt telling the model to call it.
5. If the caller is a Lambda that loads a user profile, read timezone via `getUserTimezone(userProfile)` — never via a direct field read.

## Rollback / feature flagging

The unified block is a drop-in upgrade of existing per-file date sections. No flags are wired because every surface either already had a simpler date block (streaming agents) or had none at all (async builders, summaries, profile, insights). If a regression surfaces, `buildTemporalContext` can be replaced with a shorter format by editing a single function.
