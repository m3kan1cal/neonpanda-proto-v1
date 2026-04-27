/**
 * Formatters that turn a stored weekly/monthly analytics row into a compact
 * coaching-oriented bullet block for the conversation agent's system prompt.
 *
 * Used by the streaming coach handler when the user opens the inline coach
 * chat from a weekly or monthly report viewer (clientContext.surface ===
 * "weekly_report" | "monthly_report"). Highlights only — capped to keep the
 * extra tokens around ~600.
 */

import type { WeeklyAnalytics, MonthlyAnalytics } from "./types";

const HUMAN_SUMMARY_MAX_CHARS = 1500; // ~375 tokens
const TOP_MOVEMENT_LIMIT = 5;
const RECORDS_LIMIT = 5;

/**
 * Pull the structured_analytics block from a stored analytics row, tolerating
 * both the wrapped (`analyticsData.structured_analytics`) and legacy flat
 * (`structured_analytics`) shapes the frontend already accommodates.
 */
function getStructured(report: WeeklyAnalytics | MonthlyAnalytics): any {
  const analyticsData: any = (report as any).analyticsData ?? {};
  return (
    analyticsData.structured_analytics ??
    (report as any).structured_analytics ??
    {}
  );
}

function getHumanSummary(report: WeeklyAnalytics | MonthlyAnalytics): string {
  const summary =
    (report as any).analyticsData?.human_summary ??
    (report as any).human_summary;
  if (typeof summary !== "string" || !summary.trim()) return "";
  const trimmed = summary.trim();
  return trimmed.length > HUMAN_SUMMARY_MAX_CHARS
    ? `${trimmed.slice(0, HUMAN_SUMMARY_MAX_CHARS)}…`
    : trimmed;
}

function avgRpe(structured: any): number | null {
  const daily = structured?.raw_aggregations?.daily_volume;
  if (!Array.isArray(daily) || daily.length === 0) return null;
  const values = daily
    .map((d: any) => d?.avg_rpe)
    .filter((v: unknown): v is number => typeof v === "number" && v > 0);
  if (values.length === 0) return null;
  const sum = values.reduce((acc: number, v: number) => acc + v, 0);
  return Number((sum / values.length).toFixed(1));
}

function totalDurationMinutes(structured: any): number {
  const daily = structured?.raw_aggregations?.daily_volume;
  if (!Array.isArray(daily)) return 0;
  return daily.reduce(
    (acc: number, d: any) =>
      acc + (typeof d?.duration === "number" ? d.duration : 0),
    0,
  );
}

function topMovements(structured: any): string[] {
  const movements = structured?.volume_breakdown?.movements;
  if (!Array.isArray(movements)) return [];
  return movements
    .filter((m: any) => m && typeof m.name === "string")
    .slice(0, TOP_MOVEMENT_LIMIT)
    .map((m: any) => {
      const tonnage =
        typeof m.tonnage === "number" ? ` (${m.tonnage.toLocaleString()} lbs)` : "";
      return `${m.name}${tonnage}`;
    });
}

function records(structured: any): string[] {
  const recs = structured?.performance_markers?.records_set;
  if (!Array.isArray(recs)) return [];
  return recs
    .slice(0, RECORDS_LIMIT)
    .map((r: any) => {
      if (!r) return "";
      if (typeof r === "string") return r;
      const exercise = r.exercise || r.movement || r.name;
      const detail = r.detail || r.description || r.value;
      if (exercise && detail) return `${exercise}: ${detail}`;
      return exercise || detail || "";
    })
    .filter((s: string) => !!s);
}

function buildHighlightsBullets(
  structured: any,
): string[] {
  const meta = structured?.metadata ?? {};
  const sessions = meta.sessions_completed;
  const tonnage = structured?.volume_breakdown?.working_sets?.total_tonnage;
  const overload = structured?.weekly_progression?.progressive_overload_score;
  const recovery = structured?.fatigue_management?.recovery_score;
  const rpe = avgRpe(structured);
  const minutes = totalDurationMinutes(structured);
  const recCount = Array.isArray(structured?.performance_markers?.records_set)
    ? structured.performance_markers.records_set.length
    : 0;

  const bullets: string[] = [];
  if (typeof sessions === "number") {
    bullets.push(`Sessions completed: ${sessions}`);
  }
  if (typeof tonnage === "number" && tonnage > 0) {
    bullets.push(`Total working-set tonnage: ${tonnage.toLocaleString()} lbs`);
  }
  if (minutes > 0) {
    bullets.push(`Total training time: ${minutes} min`);
  }
  if (typeof overload === "number" && overload > 0) {
    bullets.push(`Progressive overload score: ${overload}/10`);
  }
  if (typeof recovery === "number" && recovery > 0) {
    bullets.push(`Recovery score: ${recovery}/10`);
  }
  if (rpe !== null) {
    bullets.push(`Average RPE: ${rpe}`);
  }
  if (recCount > 0) {
    bullets.push(`Records set: ${recCount}`);
  }
  return bullets;
}

/**
 * Shared body-section assembler used by both the weekly and monthly formatters.
 * Takes a pre-built header section and appends the highlights / top movements
 * / records / coach's-eye summary, each conditional on having data to show.
 *
 * Kept private — the public entry points are `formatWeeklyReportForPrompt`
 * and `formatMonthlyReportForPrompt`, which differ only in their header.
 */
function assembleReportPrompt(
  report: WeeklyAnalytics | MonthlyAnalytics,
  header: string,
): string {
  const structured = getStructured(report);
  const sections: string[] = [header];

  const bullets = buildHighlightsBullets(structured);
  if (bullets.length > 0) {
    sections.push(`## Highlights\n${bullets.map((b) => `- ${b}`).join("\n")}`);
  }

  const movements = topMovements(structured);
  if (movements.length > 0) {
    sections.push(
      `## Top Movements (by volume)\n${movements.map((m) => `- ${m}`).join("\n")}`,
    );
  }

  const recs = records(structured);
  if (recs.length > 0) {
    sections.push(`## Records Set\n${recs.map((r) => `- ${r}`).join("\n")}`);
  }

  const human = getHumanSummary(report);
  if (human) {
    sections.push(`## Coach's-Eye Summary\n${human}`);
  }

  return sections.join("\n\n");
}

/**
 * Format a weekly analytics row for injection into the coach's system prompt.
 * Highlights only — capped at roughly 600 tokens including the optional
 * human summary.
 */
export function formatWeeklyReportForPrompt(report: WeeklyAnalytics): string {
  const header = `# WEEKLY REPORT IN FOCUS
The user opened this chat from the **Weekly Report viewer**. Frame coaching answers around this week's data; if you need anything that isn't in the highlights below, use your tools to look up the underlying workouts.

- Week ID: ${report.weekId}${report.weekStart ? `\n- Week of: ${report.weekStart}${report.weekEnd ? ` → ${report.weekEnd}` : ""}` : ""}`;
  return assembleReportPrompt(report, header);
}

/**
 * Format a monthly analytics row for injection into the coach's system prompt.
 * Same shape as the weekly formatter — used when (a future) monthly viewer
 * page opens the inline coach chat with surface === "monthly_report".
 */
export function formatMonthlyReportForPrompt(
  report: MonthlyAnalytics,
): string {
  const header = `# MONTHLY REPORT IN FOCUS
The user opened this chat from the **Monthly Report viewer**. Frame coaching answers around this month's aggregated data; if you need anything that isn't in the highlights below, use your tools to look up the underlying workouts or weekly reports.

- Month ID: ${report.monthId}${report.monthStart ? `\n- Month of: ${report.monthStart}${report.monthEnd ? ` → ${report.monthEnd}` : ""}` : ""}`;
  return assembleReportPrompt(report, header);
}
