# Discipline Detection Evals

Labeled prompts that exercise the `detect_discipline` LLM tool across the 14
supported `ExerciseDiscipline` values, with an emphasis on **boundary cases**
that historically drift (road running vs trail running, rucking vs backpacking,
ruck vs trail run, road ultra vs mountain ultra, fast-pack).

## Files

- `fixtures.json` — labeled prompts (`prompt`, `expected`, optional `notes`).
  One per line, grouped by discipline with dedicated boundary buckets.
- `baseline.json` — committed non-regression baseline. Structure:
  ```json
  {
    "version": 1,
    "generatedAt": "...",
    "results": { "<fixture id>": { "predicted": "...", "pass": true } }
  }
  ```
- `runner.ts` — minimal runner that invokes the `detect_discipline` tool
  against `amplify/functions/libs/workout/discipline-detector.ts` in-process.
  Call it from `npm run eval:discipline-detection`. The runner compares the
  current run against `baseline.json` and fails if the pass-rate for any
  `expected` discipline regresses.

## Workflow

1. Add / edit fixtures in `fixtures.json`.
2. Run `tsx test/evals/discipline-detection/runner.ts --update-baseline`
   once on a known-good prompt to regenerate `baseline.json`.
3. After any change to `discipline-detector.ts`, the guidance modules, or any
   prompt that influences detection, run
   `tsx test/evals/discipline-detection/runner.ts`. CI expects exit code 0.

## Why commit the baseline?

Tightening prompt language to fix one boundary (e.g., "road ultra") often
regresses another (e.g., "fast-pack"). The committed baseline turns a silent
behavioral shift into a PR-visible diff so we can debate it explicitly.

## Boundary cases worth guarding (informational)

- Road 5k vs trail 10k with vert.
- Road ultra (stays `running`) vs mountain ultra (becomes `trail_running`).
- Flat 5mi ruck vs loaded hike up a 4,500ft peak.
- Fast-pack 8mi light pack: dominant-story tiebreaker.
- Day-2-of-a-loop workouts (multi-day cadence tells you it is `backpacking`).
- Treadmill rucks with a vest (still `rucking`).
