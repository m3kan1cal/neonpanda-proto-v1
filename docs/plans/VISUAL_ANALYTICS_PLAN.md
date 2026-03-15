# Visual Analytics & Charting — Implementation Plan

> **Status:** Proposal
> **Author:** Claude
> **Date:** 2026-03-12

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

- [ ] Install `recharts` dependency
- [ ] Create `src/components/analytics/` directory
- [ ] Create `src/components/analytics/chartTheme.js` — shared colors, gradients, tooltip component, glow filters
- [ ] Create `src/components/analytics/ChartCard.jsx` — reusable wrapper (title, subtitle, time-range selector, loading skeleton, empty state) using `containerPatterns.cardMedium`
- [ ] Create `src/components/analytics/TimeRangeSelector.jsx` — pill toggle for 4W / 8W / 12W / 6M / 1Y
- [ ] Create `src/utils/agents/AnalyticsAgent.js` — data aggregation layer that fetches and transforms weekly/monthly reports into chart-ready arrays

#### 1b. Volume Trend Chart

- [ ] Create `src/components/analytics/VolumeTrendChart.jsx`
- [ ] Chart type: **Area chart** with gradient fill (neon pink → transparent)
- [ ] X-axis: Weeks (from weekly reports)
- [ ] Y-axis: Total tonnage (`volume_breakdown.working_sets.total_tonnage`)
- [ ] Data source: `ReportAgent.loadAllReports()` → extract tonnage per week
- [ ] Interactions: Hover tooltip showing week date range + exact tonnage + % change from prior week
- [ ] Annotation: Horizontal reference line for the period average

#### 1c. Training Frequency Chart

- [ ] Create `src/components/analytics/FrequencyChart.jsx`
- [ ] Chart type: **Bar chart** (cyan bars)
- [ ] X-axis: Weeks
- [ ] Y-axis: Sessions completed (`metadata.sessions_completed`)
- [ ] Data source: Same weekly reports
- [ ] Annotation: Dashed horizontal line for user's target frequency (default 5, from `WEEKLY_TARGET`)

#### 1d. Analytics Page Shell

- [ ] Create `src/components/analytics/TrainingPulse.jsx` — page layout with header, time-range selector, chart grid
- [ ] Add route `/training-grounds/analytics` to `App.jsx`
- [ ] Add navigation entry point from TrainingGroundsV2 (button in "Reports & Insights" section)
- [ ] Loading states: skeleton cards while reports load
- [ ] Empty state: friendly message if < 2 weeks of data ("Keep training! Analytics unlock after 2 weeks of data.")

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

- [ ] Create `src/components/analytics/ExerciseSelector.jsx`
- [ ] Searchable dropdown listing all exercises from `exerciseApi.getExerciseNames()`
- [ ] Shows count + last performed date per exercise
- [ ] Recently viewed exercises pinned at top

#### 2b. Strength Curve Chart

- [ ] Create `src/components/analytics/StrengthCurveChart.jsx`
- [ ] Chart type: **Line chart** with dot markers (neon pink line, glowing dots on PRs)
- [ ] X-axis: Dates
- [ ] Y-axis: Weight (or time for metcons, distance for running)
- [ ] Data source: `exerciseApi.getExercises(userId, exerciseName, { fromDate, toDate, sortOrder: 'asc' })`
- [ ] PR markers: Larger glowing dots with star icon on PR days
- [ ] Multiple series option: overlay reps as a secondary line (purple, right Y-axis)

#### 2c. Exercise Volume Chart

- [ ] Create `src/components/analytics/ExerciseVolumeChart.jsx`
- [ ] Chart type: **Bar chart** (cyan bars)
- [ ] X-axis: Dates
- [ ] Y-axis: Total tonnage per session (weight × reps × sets)
- [ ] Stacked option: by set type (working sets vs warm-up) if data available

#### 2d. PR Timeline

- [ ] Create `src/components/analytics/PRTimelineChart.jsx`
- [ ] Chart type: **Scatter plot** with milestone markers
- [ ] Shows all PRs for selected exercise on a timeline
- [ ] Color-coded by significance (major = pink, moderate = cyan, minor = purple)
- [ ] Tooltip: previous best → new best, improvement %, date

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

- [ ] Create `src/components/analytics/MovementBalanceChart.jsx`
- [ ] Chart type: **Radar chart** (hex-web style)
- [ ] 6 axes: Squat, Hinge, Push, Pull, Carry, Core
- [ ] Data source: `movement_analysis.pattern_balance` from latest weekly report
- [ ] Overlay: Current week (pink fill) vs 4-week average (cyan outline)
- [ ] Imbalance flags highlighted with pulsing glow on deficient axes

#### 3b. Body Part Frequency

- [ ] Create `src/components/analytics/BodyPartChart.jsx`
- [ ] Chart type: **Horizontal bar chart** or **Polar area chart**
- [ ] Categories: Legs, Chest, Back, Shoulders, Arms
- [ ] Data source: `movement_analysis.body_part_frequency` from weekly reports
- [ ] Multi-week overlay: Show trend as stacked or grouped bars

#### 3c. Recovery & Load Management

- [ ] Create `src/components/analytics/RecoveryLoadChart.jsx`
- [ ] Chart type: **Dual-axis line chart**
- [ ] Left Y-axis: Recovery score (1-10, green zones)
- [ ] Right Y-axis: Acute:Chronic workload ratio (0.5-2.0, with danger zone shading)
- [ ] X-axis: Weeks
- [ ] Data source: `fatigue_management` from weekly reports
- [ ] Zone shading: Green (0.8-1.3 ratio), Yellow (1.3-1.5), Red (>1.5)
- [ ] Deload indicator markers when `deload_indicators` flags fire

---

### Phase 4 — Dashboard Integration & Sparklines

**Goal:** Bring chart previews back into TrainingGroundsV2 and report pages so analytics feel integrated, not siloed.

#### 4a. Sparkline Components

- [ ] Create `src/components/analytics/Sparkline.jsx` — tiny inline chart (no axes, no labels, just the line)
- [ ] 60px × 24px, single-color stroke, optional fill
- [ ] Used inside highlight cards and report headers

#### 4b. Enhanced Highlight Cards

- [ ] Add volume sparkline to **StreakCard** (last 8 weeks volume trend)
- [ ] Add weight sparkline to **RecentPRsCard** (trend for top exercise)
- [ ] Add frequency sparkline to a new **WeeklyTrendCard** replacing or augmenting existing cards

#### 4c. Report Page Charts

- [ ] Add inline VolumeTrendChart to `WeeklyReportViewer.jsx` (showing this week in context of last 8)
- [ ] Add MovementBalanceChart to weekly report's movement analysis section
- [ ] Add body part frequency chart to monthly report

#### 4d. Weekly Comparison Widget

- [ ] Create `src/components/analytics/WeeklyComparisonChart.jsx`
- [ ] Chart type: **Grouped bar chart**
- [ ] Compare: This week vs Last week vs 4-week average
- [ ] Metrics: Tonnage, Sessions, Avg RPE, Duration
- [ ] Placed prominently in the analytics page header area

---

## File Structure (Final State)

```
src/components/analytics/
├── TrainingPulse.jsx              # Main page shell + routing
├── chartTheme.js                  # Colors, gradients, glows, shared config
├── ChartCard.jsx                  # Reusable chart container
├── TimeRangeSelector.jsx          # 4W/8W/12W/6M/1Y pill toggle
├── ExerciseSelector.jsx           # Searchable exercise picker
├── VolumeTrendChart.jsx           # Area chart — tonnage over time
├── FrequencyChart.jsx             # Bar chart — sessions per week
├── StrengthCurveChart.jsx         # Line chart — exercise weight over time
├── ExerciseVolumeChart.jsx        # Bar chart — exercise tonnage per session
├── PRTimelineChart.jsx            # Scatter — PR milestones
├── MovementBalanceChart.jsx       # Radar — push/pull/squat/hinge/carry/core
├── BodyPartChart.jsx              # Horizontal bar — body part frequency
├── RecoveryLoadChart.jsx          # Dual-axis — recovery vs load ratio
├── WeeklyComparisonChart.jsx      # Grouped bar — week vs week vs avg
└── Sparkline.jsx                  # Tiny inline trend line

src/utils/agents/
└── AnalyticsAgent.js              # Data transformation layer for charts
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

| Phase       | Components      | Complexity | Notes                                                                                               |
| ----------- | --------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| **Phase 1** | 6 files         | Medium     | Foundation + 2 charts + page shell. Biggest lift is the AnalyticsAgent data transformation.         |
| **Phase 2** | 4 files         | Medium     | Exercise API already exists and returns exactly what we need. Main work is the ExerciseSelector UX. |
| **Phase 3** | 3 files         | Medium     | Radar chart is the trickiest — Recharts `<Radar>` handles it but needs careful styling.             |
| **Phase 4** | 4 files + edits | Low-Medium | Sparklines are simple. Main work is integrating into existing components without disrupting them.   |

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

1. **Time range default:** Should the default view be 8 weeks or 12 weeks? (Recommendation: 8 weeks — enough to see trends, recent enough to feel relevant)
2. **Navigation placement:** Should "Analytics" get its own icon in the main nav, or live under Reports? (Recommendation: Promote to top-level nav item alongside Training Grounds — it's a core feature)
3. **Printing/export:** Should users be able to export charts as images or PDFs? (Recommendation: Not in v1, but design chart containers to support it later)
4. **Coach integration:** Should coaches see athlete analytics? (Already supported — coaches can view athlete data through existing permissions)

---

## Recommended Starting Point

**Start with Phase 1** — it delivers the most universally valuable charts (volume + frequency trends), establishes the full infrastructure (theme, chart cards, analytics page, data agent), and creates the foundation every subsequent phase builds on. Phase 2 (Exercise Deep Dive) should follow immediately as it's the highest-engagement feature.
