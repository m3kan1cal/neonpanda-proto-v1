# Mountain Disciplines One-Pager

> Status: shipped (April 2026). This document captures the product thinking
> behind the rollout of `trail_running`, `backpacking`, and `rucking` as
> first-class disciplines, and frames the next wave of mountain-native
> capabilities (peak-bagging, alpine, ski mountaineering).

## Problem

NeonPanda's fitness DNA started in gym-centric disciplines (CrossFit,
powerlifting, bodybuilding). Over time we grew into endurance (`running`,
`cycling`) and hybrid disciplines (`hyrox`, `circuit_training`, `hybrid`).
What we didn't have was a credible home for athletes whose training revolves
around:

- **Vert** — climbing and descending thousands of feet per session
- **Load** — carrying significant weight across distance (pack, ruck)
- **Route** — multi-day efforts that unfold across terrain, not laps

These athletes were jamming trail days and loaded hikes into `running` or
`hybrid`, and the extraction logic, program design, and share cards all had
to guess at what mattered. Coaches couldn't ask clean questions like "how
much vert did you do this week?" or "what's your average pack weight on
Zone-2 days?" because the data model couldn't answer.

## What we shipped

Three new first-class disciplines, wired end-to-end:

1. **`trail_running`** — trail surface, technicality, elevation gain/loss,
   segment pacing, ultra/race context. Road marathons still live in
   `running`; any workout with trail surface, vert, or ultra-on-trail
   language now routes here.
2. **`backpacking`** — trip name, trip day, total days, pack weight,
   terrain notes, and per-segment distance/duration/elevation. Built for
   multi-day efforts (JMT, Wonderland, Sierra High Route) and mountaineering
   prep days.
3. **`rucking`** — structured loaded-march training. Ruck type (training,
   event, tactical), event name, pack weight, cadence, and surface. Built
   for GoRuck, tactical prep, and athletes using rucking as a primary
   aerobic base.

Each discipline got:

- Detection rules in `detect_discipline` with explicit boundary cases
- Extraction schemas and segment-level data
- Program designer guidance (vert blocks, loaded carries, multi-day
  planning)
- Pinecone metadata mirrors so semantic recall can filter by ultra flag,
  pack weight, trip day, event name, cadence
- Workout viewer sections, share-card metrics, heatmap abbreviations, and
  badge colors
- Marketing coverage (Landing, About, FAQ, Technology, blog posts,
  changelog, platform update)

## Why now

Three signals converged:

1. **Athlete pull** — a growing share of early users were loading trail days
   and ruck sessions into coach conversations and asking for vert-aware
   programming
2. **Data quality** — the `running` discipline was getting diluted by trail
   and ultra data, making road-specific insights noisier
3. **Strategic headroom** — mountain sports (trail running, rucking, alpine,
   ski mountaineering) are one of the fastest-growing segments in both
   participation and spend, and the AI-coach gap there is wide open

## Boundary rules

The most important design decision was where to draw the lines between
overlapping disciplines. The rules:

- **`running` vs `trail_running`** — surface (road/track vs trail/singletrack)
  and vert (flat-ish vs meaningful climb). A road ultra is still `running`.
  A vert-heavy trail half is `trail_running`.
- **`rucking` vs `backpacking`** — single-session loaded march with a
  structured pace target is `rucking`. Multi-day trip with route and pack
  context is `backpacking`. A loaded day-hike with no pace target and no
  trip context lands in `backpacking` by default.
- **`trail_running` vs `backpacking`** — if a pack is the defining feature
  and the day is part of a multi-day trip, it's `backpacking`. A fast-pack
  day that's part of a multi-day effort with a small pack is still
  `backpacking` — the trip context wins.

Labeled fixtures for each of these boundary cases live in
`test/evals/discipline-detection/fixtures.json` with a committed
non-regression baseline.

## What's next

- **Peak-bagging** — named-peak lists (14ers, 100 highest, classic alpine
  routes), ticking off summits, route beta, approach/climb/descent splits
- **Ski mountaineering** — skinning vs ski descending, route lines, snow
  quality, avalanche conditions
- **Alpine climbing** — rope team size, grade, pitch count, approach load,
  bivy context
- **Mountaineering-specific programming** — expedition taper, altitude
  acclimatization blocks, pack-weight progression tied to trip dates

These all share the `vert + load + route` DNA of the three disciplines we
just shipped, and should plug into the same metadata model rather than
becoming their own one-off systems.

## Success signals to watch

- Share of new workouts logged as `trail_running`, `backpacking`, or
  `rucking` per week
- Dilution rate of `running` (ultra/vert language showing up in the road
  discipline after detection should trend toward zero)
- `detect_discipline` boundary-case accuracy vs the committed baseline
- Pinecone recall precision on queries like "show me my heaviest pack
  days" and "how much vert did I do in March"
- Coach conversations mentioning the new disciplines without prompting
