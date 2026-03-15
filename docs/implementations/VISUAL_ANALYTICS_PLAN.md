# Visual Analytics & Charting — Implementation Plan

> **Status:** In Progress — Phases 1–3 complete, Phase 4 partially complete
> **Author:** Claude
> **Date:** 2026-03-12
> **Last Updated:** 2026-03-14

---

## Executive Summary

NeonPanda has rich structured analytics data (weekly reports, monthly reports, per-exercise history with full time-series) but surfaces it almost entirely as **text, badges, and heat-map grids**. There are no line charts, bar charts, area charts, or any trend visualizations anywhere in the app. This plan introduces a phased charting system that turns existing data into engaging, interactive visual stories — without requiring any new backend endpoints.

---

## Design Philosophy

### Guiding Principles

1. **Data-first, not chart-first.** Every chart must answer a question the athlete actually asks: _"Am I getting stronger?" "Am I training balanced?" "Should I deload?"_ If we can't name the question, we don't build the chart.

2. **Progressive disclosure.** Show the headline number big. Show the trend line underneath. Let the user drill into details on tap. Don't overwhelm the dashboard with 12 charts at once.

3. **Synthwave-native.** Charts must feel like they belong in this app. Neon glows on data points, dark backgrounds, gradient fills that fade to transparent, pink/cyan/purple as the primary palette. No generic Chart.js grey.

4. **Mobile-first, responsive.** Most athletes log workouts on their phones. Charts must be touch-friendly, readable at 375px, and not require horizontal scrolling.

5. **Incremental adoption.** Each phase ships standalone value. Phase 1 can ship without Phase 2.

---

## Library Choice: Recharts

### Why Recharts

| Criteria                         | Recharts                     | Chart.js (react-chartjs-2) | Visx                           | Nivo               |
| -------------------------------- | ---------------------------- | -------------------------- | ------------------------------ | ------------------ |
| React-native composability       | ✅ Built on React components | ❌ Canvas wrapper          | ✅ Low-level primitives        | ✅ Component-based |
| SVG (themeable via CSS/Tailwind) | ✅ SVG                       | ❌ Canvas                  | ✅ SVG                         | ✅ SVG             |
| Bundle size                      | ~45KB gzip                   | ~60KB gzip                 | ~25KB (but need many packages) | ~80KB gzip         |
| Learning curve                   | Low                          | Low                        | High                           | Medium             |
| Responsive containers built-in   | ✅ `<ResponsiveContainer>`   | ❌ Manual                  | ❌ Manual                      | ✅ Built-in        |
| Tooltip/legend customization     | ✅ Full JSX custom           | Limited                    | Build-your-own                 | Limited            |
| Animation support                | ✅ Built-in                  | ✅ Built-in                | ❌ Manual                      | ✅ Built-in        |
| Active maintenance (2025+)       | ✅ Active                    | ✅ Active                  | ⚠️ Slower                      | ✅ Active          |

**Verdict:** Recharts gives us SVG-based charts (essential for synthwave styling with gradients and glows), full React component composition, built-in responsive containers, and low learning curve. Visx is too low-level for the ROI. Chart.js canvas is hard to theme to our synthwave aesthetic.

### Synthwave Theming Strategy

Create a shared `chartTheme.js` that exports:

- **Color palette:** neon pink `#FF006E`, cyan `#00D9FF`, purple `#9D4EDD`, muted text colors
- **Gradient definitions:** SVG `<defs>` with linear gradients for area fills (pink-to-transparent, cyan-to-transparent)
- **Glow effects:** SVG filters for neon glow on data points and active elements
- **Axis styling:** Muted grid lines, synthwave font, no harsh borders
- **Tooltip component:** Custom JSX tooltip matching the app's card style
- **Animation config:** Consistent easing and duration across all charts

---

## Information Architecture: Where Charts Live

### Option A: Dedicated "Analytics" Tab (Recommended)

```
Training Grounds V2 (Dashboard)
├── Today's Lineup
├── Your Highlights (existing cards — enhanced with sparklines)
├── Programs Overview
├── Reports & Insights
│   └── [View Full Analytics →]  ← NEW entry point
└── ...

/training-grounds/analytics  ← NEW PAGE
├── Performance Overview (time-range selector: 4W / 8W / 12W / 6M / 1Y)
│   ├── Volume Trend (area chart — total tonnage over time)
│   ├── Frequency Chart (bar chart — sessions per week)
│   └── Intensity Trend (line chart — avg RPE or intensity over time)
├── Exercise Deep Dive (searchable exercise selector)
│   ├── Strength Curve (line chart — weight over time for selected exercise)
│   ├── Volume per Session (bar chart — tonnage per session)
│   └── PR Timeline (scatter/milestone chart — PR achievements over time)
├── Body Balance (radar/polar chart — push/pull/squat/hinge/carry/core)
├── Recovery & Load (dual-axis — recovery score vs. acute:chronic ratio)
└── Weekly Comparison (grouped bar — this week vs last week vs 4-week avg)
```

### Option B: Embed Charts into Existing Report Pages

Enhance `WeeklyReportViewer` and `ViewReports` (monthly) with inline charts. This distributes charts but makes it harder to see cross-report trends.

### Recommendation: **Option A as the primary experience, with Phase 3 adding sparklines into existing cards and report pages for continuity.**

The dedicated page gives athletes a reason to come back ("let me check my analytics"), creates a clear mental model, and avoids cluttering the already-dense dashboard. The route `/training-grounds/analytics` follows the existing pattern.

---

## Phased Implementation

### Phase 1 — Foundation + Volume & Frequency Charts

**Goal:** Ship the analytics page with the two most universally valuable charts: "How much am I training?" and "How often?"

#### 1a. Setup & Infrastructure

- [x] Install `recharts` dependency
- [x] Create `src/components/analytics/` directory
- [x] Create `src/components/analytics/chartTheme.jsx` — shared colors, gradients, tooltip component, glow filters _(built as `.jsx` not `.js`)_
- [x] Create `src/components/analytics/ChartCard.jsx` — reusable wrapper (title, subtitle, time-range selector, loading skeleton, empty state) using `containerPatterns.cardMedium`
- [x] Create `src/components/analytics/TimeRangeSelector.jsx` — pill toggle for 4W / 8W / 12W / 6M / 1Y
- [x] Create `src/utils/agents/AnalyticsAgent.js` — data aggregation layer that fetches and transforms weekly/monthly reports into chart-ready arrays

#### 1b. Volume Trend Chart

- [x] Create `src/components/analytics/VolumeTrendChart.jsx`
- [x] Chart type: **Area chart** with gradient fill (neon pink → transparent)
- [x] X-axis: Weeks (from weekly reports)
- [x] Y-axis: Total tonnage (`volume_breakdown.working_sets.total_tonnage`)
- [x] Data source: `AnalyticsAgent.loadWeeklyChartData()` → extract tonnage per week
- [x] Interactions: Hover tooltip showing week date range + exact tonnage + % change from prior week
- [x] Annotation: Horizontal reference line for the period average

#### 1c. Training Frequency Chart

- [x] Create `src/components/analytics/FrequencyChart.jsx`
- [x] Chart type: **Bar chart** (cyan bars, dimmed when below target)
- [x] X-axis: Weeks
- [x] Y-axis: Sessions completed (`metadata.sessions_completed`)
- [x] Data source: Same weekly reports
- [x] Annotation: Dashed horizontal line for user's target frequency (default 5, from `WEEKLY_TARGET`)

#### 1d. Analytics Page Shell

- [x] Create `src/components/analytics/TrainingPulse.jsx` — page layout with header, time-range selector, chart grid
- [x] Add route `/training-grounds/analytics` to `App.jsx`
- [x] Add navigation entry point from TrainingGroundsV2 (button in "Reports & Insights" section)
- [x] Loading states: skeleton cards while reports load
- [x] Empty state: friendly message if < 2 weeks of data ("Keep training! Analytics unlock after 2 weeks of data.")

#### Data Flow (Phase 1)

```
TrainingPulse mounts
  → AnalyticsAgent.loadWeeklyReportsForRange(timeRange)
    → ReportAgent.loadAllReports({ fromDate, toDate })
      → reportApi.getWeeklyReports(userId, { fromDate, toDate, sortOrder: 'asc' })
  → Transform reports into chart-ready arrays:
      volumeData = reports.map(r => ({
        week: r.weekId,
        label: formatWeekLabel(r.weekStart, r.weekEnd),
        tonnage: r.structured_analytics.volume_breakdown.working_sets.total_tonnage,
        sessions: r.structured_analytics.metadata.sessions_completed,
      }))
  → Pass to VolumeTrendChart, FrequencyChart
```

---

### Phase 2 — Exercise Deep Dive

**Goal:** Let athletes pick any exercise and see their strength progression over time. This is the "killer feature" — the chart athletes actually open the app to see.

#### 2a. Exercise Selector

- [x] Create `src/components/analytics/ExerciseSelector.jsx`
- [x] Searchable dropdown listing all exercises from `exerciseApi.getExerciseNames()`
- [x] Shows count per exercise
- [ ] Recently viewed exercises pinned at top _(not implemented; exercise names load via ExerciseAgent)_

#### 2b. Strength Curve Chart

- [x] Create `src/components/analytics/StrengthCurveChart.jsx`
- [x] Chart type: **Line chart** with dot markers (neon pink line, glowing dots on PRs)
- [x] X-axis: Dates
- [x] Y-axis: Weight (or time for metcons, distance for running)
- [x] Data source: `exerciseApi.getExercises(userId, exerciseName, { sortOrder: 'asc' })`
- [x] PR markers: Larger glowing green dots on PR sessions (running-max detection)
- [x] Multiple series option: overlay reps as a secondary dashed line (purple)

#### 2c. Exercise Volume Chart

- [x] Create `src/components/analytics/ExerciseVolumeChart.jsx`
- [x] Chart type: **Bar chart** (cyan bars)
- [x] X-axis: Dates
- [x] Y-axis: Total tonnage per session (weight × reps × sets, with per-set detail when available)
- [ ] Stacked option: by set type (working sets vs warm-up) if data available _(not implemented)_

#### 2d. PR Timeline

- [x] Create `src/components/analytics/PRTimelineChart.jsx`
- [x] Chart type: **Scatter plot** with milestone markers
- [x] Shows all PRs for selected exercise on a timeline
- [x] Color-coded by significance (major = pink, moderate = cyan, minor = purple)
- [x] Tooltip: previous best → new best, improvement %, date

#### Data Flow (Phase 2)

```
User selects "Back Squat" from ExerciseSelector
  → exerciseApi.getExercises(userId, "back_squat", { fromDate, toDate, sortOrder: 'asc' })
  → Returns array of { date, weight, reps, sets, rpe, ... }
  → Transform into chart data:
      strengthData = exercises.map(e => ({
        date: e.date,
        weight: e.weight,
        reps: e.reps,
        tonnage: e.weight * e.reps * (e.sets || 1),
        isPR: checkIfPR(e, exercises),
      }))
  → Pass to StrengthCurveChart, ExerciseVolumeChart, PRTimelineChart
```

---

### Phase 3 — Body Balance & Recovery

**Goal:** Help athletes identify imbalances and manage fatigue — the "smart coaching" layer.

#### 3a. Movement Pattern Balance

- [x] Create `src/components/analytics/MovementBalanceChart.jsx`
- [x] Chart type: **Radar chart**
- [x] 6 axes: Squat, Hinge, Push, Pull, Carry, Core
- [x] Data source: `movement_analysis.pattern_balance` from weekly reports via `weeklyChartData`
- [x] Overlay: Current week (pink fill) vs prior-week average (cyan dashed outline)
- [x] Imbalance flags rendered as pink warning badges below chart _(pulsing glow not implemented)_

#### 3b. Body Part Frequency

- [x] Create `src/components/analytics/BodyPartChart.jsx`
- [x] Chart type: **Horizontal bar chart** (color-coded per body part)
- [x] Categories: Legs, Back, Chest, Shoulders, Arms
- [x] Data source: `movement_analysis.body_part_frequency` aggregated across selected period
- [ ] Multi-week overlay / stacked bars _(not implemented; shows aggregated totals)_

#### 3c. Recovery & Load Management

- [x] Create `src/components/analytics/RecoveryLoadChart.jsx`
- [x] Chart type: **Dual-axis composed chart** (Area + Line)
- [x] Left Y-axis: Recovery score (1-10, green area)
- [x] Right Y-axis: Acute:Chronic workload ratio (0-2.2, warning-colored line)
- [x] X-axis: Weeks
- [x] Data source: `fatigue_management` from weekly reports
- [x] Zone shading: Green (0.8-1.3 ratio), Yellow (1.3-1.5), Red (>1.5)
- [ ] Deload indicator markers when `deload_indicators` flags fire _(not implemented)_

---

### Phase 4 — Dashboard Integration & Sparklines

**Goal:** Bring chart previews back into TrainingGroundsV2 and report pages so analytics feel integrated, not siloed.

#### 4a. Sparkline Components

- [x] Create `src/components/analytics/Sparkline.jsx` — tiny inline chart (no axes, no labels, just the line)
- [x] Configurable width/height (default 80×28), single-color stroke, optional area fill
- [x] `extractSparklineData()` helper to convert weekly reports → sparkline arrays
- [x] Used inside highlight cards

#### 4b. Enhanced Highlight Cards

- [x] Add volume sparkline to **StreakCard** (last N weeks volume trend)
- [x] Add frequency sparkline to **RecentPRsCard**
- [x] `extractSparklineData` called in `TrainingGroundsV2.jsx` and passed to both cards
- [ ] Add frequency sparkline to a new **WeeklyTrendCard** _(card not created)_

#### 4c. Report Page Charts

- [ ] Add inline VolumeTrendChart to `WeeklyReportViewer.jsx` (showing this week in context of last 8)
- [ ] Add MovementBalanceChart to weekly report's movement analysis section
- [ ] Add body part frequency chart to monthly report

#### 4d. Weekly Comparison Widget

- [x] Create `src/components/analytics/WeeklyComparisonChart.jsx`
- [x] Chart type: **Grouped bar chart**
- [x] Compare: This week vs Last week vs 4-week rolling average
- [x] Metrics: Tonnage, Sessions, Sets, Avg Duration
- [x] Placed in the analytics page Performance Overview section

---

## File Structure (Final State)

```
src/components/analytics/
├── TrainingPulse.jsx              # ✅ Main page shell + routing
├── chartTheme.jsx                 # ✅ Colors, gradients, glows, shared config (note: .jsx not .js)
├── ChartCard.jsx                  # ✅ Reusable chart container
├── TimeRangeSelector.jsx          # ✅ 4W/8W/12W/6M/1Y pill toggle
├── ExerciseSelector.jsx           # ✅ Searchable exercise picker
├── VolumeTrendChart.jsx           # ✅ Area chart — tonnage over time
├── FrequencyChart.jsx             # ✅ Bar chart — sessions per week
├── StrengthCurveChart.jsx         # ✅ Line chart — exercise weight over time
├── ExerciseVolumeChart.jsx        # ✅ Bar chart — exercise tonnage per session
├── PRTimelineChart.jsx            # ✅ Scatter — PR milestones
├── MovementBalanceChart.jsx       # ✅ Radar — push/pull/squat/hinge/carry/core
├── BodyPartChart.jsx              # ✅ Horizontal bar — body part frequency
├── RecoveryLoadChart.jsx          # ✅ Dual-axis — recovery vs load ratio
├── WeeklyComparisonChart.jsx      # ✅ Grouped bar — week vs week vs avg
└── Sparkline.jsx                  # ✅ Tiny inline trend line

src/utils/agents/
└── AnalyticsAgent.js              # ✅ Data transformation layer for charts
```

---

## Synthwave Chart Styling Spec

### Color Assignments

| Data Series                        | Color      | Hex                      | Usage                       |
| ---------------------------------- | ---------- | ------------------------ | --------------------------- |
| Primary metric (volume, weight)    | Neon Pink  | `#FF006E`                | Area fills, primary lines   |
| Secondary metric (frequency, reps) | Cyan       | `#00D9FF`                | Bars, secondary lines       |
| Tertiary / overlay                 | Purple     | `#9D4EDD`                | Radar overlays, comparisons |
| Positive delta                     | Green      | `#00FF88`                | Improvement indicators      |
| Warning / danger zone              | Red/Orange | `#FF3366`                | Deload zones, overtraining  |
| Grid lines                         | Muted      | `rgba(255,255,255,0.06)` | Background grid             |
| Axis labels                        | Muted text | `rgba(255,255,255,0.5)`  | Tick labels                 |

### Gradient Definitions (SVG `<defs>`)

```jsx
// Area chart fill — pink fade
<linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="#FF006E" stopOpacity={0.3} />
  <stop offset="100%" stopColor="#FF006E" stopOpacity={0.0} />
</linearGradient>

// Cyan area fill
<linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="#00D9FF" stopOpacity={0.25} />
  <stop offset="100%" stopColor="#00D9FF" stopOpacity={0.0} />
</linearGradient>
```

### Glow Effect

```jsx
<filter id="neonGlow">
  <feGaussianBlur stdDeviation="3" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

### Custom Tooltip

```jsx
// Matches containerPatterns.cardMedium styling
<div
  className="bg-synthwave-bg-secondary border border-synthwave-text-muted/20
                rounded-none px-3 py-2 shadow-lg backdrop-blur-sm"
>
  <p className="text-white font-header text-sm font-bold">{label}</p>
  <p className="text-synthwave-neon-pink text-xs">{value}</p>
</div>
```

---

## Sizing & Effort Estimates

| Phase       | Components      | Status            | Notes                                                                                                                   |
| ----------- | --------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Phase 1** | 6 files         | ✅ Complete       | Foundation + 2 charts + page shell + AnalyticsAgent shipped.                                                            |
| **Phase 2** | 4 files         | ✅ Complete       | ExerciseSelector, StrengthCurveChart, ExerciseVolumeChart, PRTimelineChart shipped.                                     |
| **Phase 3** | 3 files         | ✅ Complete       | MovementBalanceChart, BodyPartChart, RecoveryLoadChart shipped.                                                         |
| **Phase 4** | 4 files + edits | ⚠️ Partially done | Sparkline, WeeklyComparisonChart, StreakCard/RecentPRsCard integrations done. WeeklyTrendCard + report page charts TBD. |

---

## Dependencies on Existing Systems

| Dependency               | Status        | Notes                                                                      |
| ------------------------ | ------------- | -------------------------------------------------------------------------- |
| Weekly report data       | ✅ Available  | `reportApi.getWeeklyReports()` returns full `structured_analytics`         |
| Monthly report data      | ✅ Available  | `reportApi.getMonthlyReports()` returns full analytics                     |
| Exercise history         | ✅ Available  | `exerciseApi.getExercises()` returns date-sorted history with aggregations |
| Exercise names list      | ✅ Available  | `exerciseApi.getExerciseNames()` for the selector                          |
| PR achievements          | ✅ Available  | Embedded in workout data + weekly reports                                  |
| Movement pattern balance | ✅ Available  | In `structured_analytics.movement_analysis.pattern_balance`                |
| Recovery/fatigue data    | ✅ Available  | In `structured_analytics.fatigue_management`                               |
| New backend endpoints    | ❌ Not needed | All data is already exposed through existing APIs                          |

**Key insight: Zero backend work required.** Every chart can be powered by data that already exists in the API layer. The `AnalyticsAgent` transforms existing report data into chart-friendly arrays on the client side.

---

## Open Questions

1. **Time range default:** ~~Should the default view be 8 weeks or 12 weeks?~~ **Resolved:** Default is 8 weeks (`useState("8w")` in `TrainingPulse.jsx`).
2. **Navigation placement:** ~~Should "Analytics" get its own icon in the main nav, or live under Reports?~~ **Resolved:** Promoted to a top-level contextual nav item — `id: "progress"`, label "Reports & Analytics", routes to `/training-grounds/analytics`.
3. **Printing/export:** Should users be able to export charts as images or PDFs? _(Not in v1 — deferred. Chart containers are SVG-based and ready to support this.)_
4. **Coach integration:** Should coaches see athlete analytics? _(Already supported — coaches can view athlete data through existing permissions.)_

---

## Recommended Starting Point

**Start with Phase 1** — it delivers the most universally valuable charts (volume + frequency trends), establishes the full infrastructure (theme, chart cards, analytics page, data agent), and creates the foundation every subsequent phase builds on. Phase 2 (Exercise Deep Dive) should follow immediately as it's the highest-engagement feature.
