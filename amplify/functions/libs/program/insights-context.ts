/**
 * Program Insights — Context Gathering
 *
 * Parallel-fetches and formats the structured signals that feed
 * build-program-insights. Deliberately reuses pre-digested AI output
 * (per-workout `insights.*`, weekly `actionable_insights`) rather than
 * re-deriving observations from raw data.
 */

import {
  getProgram,
  queryWorkouts,
  queryWeeklyAnalyticsPaginated,
  queryMemories,
  getUserProfile,
} from "../../../dynamodb/operations";
import type { Program } from "./types";
import type { Workout } from "../workout/types";
import { logger } from "../logger";

const WORKOUT_FETCH_LIMIT = 50; // Pull recent then filter in memory
const WORKOUT_FORMAT_CAP = 15; // Total formatted workouts (program-linked + ad-hoc combined cap)
const WEEKLY_ANALYTICS_LIMIT = 4;
const MEMORY_LIMIT = 20;

export interface GatheredProgramInsightsContext {
  program: Program;
  programSnapshot: string;
  programLinkedWorkouts: string;
  adHocWorkouts: string;
  weeklyAnalytics: string;
  memories: string;
  livingProfile: string;
  userTimezone?: string;
  counts: {
    programLinkedWorkoutCount: number;
    adHocWorkoutCount: number;
    weeklyAnalyticsCount: number;
    memoryCount: number;
    hasLivingProfile: boolean;
  };
}

/**
 * Determine whether a workout belongs to a given program.
 *
 * Order of precedence:
 *  1. `programContext.programId === programId` (explicit linkage)
 *  2. workout's `templateId` is owned by the program (program has it as a
 *     workout template — looked up via the in-memory templateId set passed in)
 *  3. otherwise: not linked
 */
const isProgramLinked = (
  workout: Workout,
  programId: string,
  programTemplateIds: Set<string>,
): boolean => {
  if (workout.programContext?.programId === programId) {
    return true;
  }
  if (workout.templateId && programTemplateIds.has(workout.templateId)) {
    return true;
  }
  return false;
};

const formatWorkoutLine = (
  workout: Workout,
  source: "program" | "ad-hoc",
): string => {
  const date = new Date(workout.completedAt).toISOString().split("T")[0];
  const name = workout.workoutName || workout.workoutData?.workout_name || "Workout";
  const discipline = workout.workoutData?.discipline || "general";
  const summary = workout.summary?.trim() || "(no summary)";
  const insights = workout.insights;
  const adherence = workout.extractionMetadata?.templateComparison?.adherenceScore;

  const insightParts: string[] = [];
  if (insights?.performanceComparison) {
    insightParts.push(`perf=${insights.performanceComparison}`);
  }
  if (insights?.achievements) {
    insightParts.push(`achv=${insights.achievements}`);
  }
  if (insights?.scalingAnalysis) {
    insightParts.push(`scaling=${insights.scalingAnalysis}`);
  }
  if (insights?.coachNote) {
    insightParts.push(`note=${insights.coachNote}`);
  }
  const insightsBlob =
    insightParts.length > 0 ? ` | ${insightParts.join(" | ")}` : "";

  const adherenceBlob =
    typeof adherence === "number"
      ? ` | adherence=${(adherence * 100).toFixed(0)}%`
      : "";

  return `[${source}] ${date} — ${name} (${discipline}): ${summary}${adherenceBlob}${insightsBlob}`;
};

const formatProgramSnapshot = (program: Program): string => {
  const adaptationLog = (program.adaptationLog || []).slice(-10).map(
    (a) =>
      `  - ${a.trigger}: ${a.description} → ${a.action}`,
  );
  const adaptationBlock =
    adaptationLog.length > 0
      ? `\nRecent adaptations:\n${adaptationLog.join("\n")}`
      : "";

  const phases = (program.phases || [])
    .map(
      (p) =>
        `  - ${p.name} (day ${p.startDay}-${p.endDay}): ${p.focusAreas?.join(", ") || "n/a"}`,
    )
    .join("\n");

  return `${program.name} — ${program.description}
Status: ${program.status}
Day ${program.currentDay} of ${program.totalDays} (${program.adherenceRate?.toFixed(0) ?? 0}% adherence, ${program.completedWorkouts} completed / ${program.skippedWorkouts} skipped / ${program.totalWorkouts} scheduled)
Goals: ${(program.trainingGoals || []).join("; ") || "n/a"}
Training frequency: ${program.trainingFrequency}/week
Phases:
${phases || "  (no phases defined)"}${adaptationBlock}`;
};

const formatWeeklyAnalytics = (analytics: any[]): string => {
  if (analytics.length === 0) {
    return "  (no weekly analytics available yet)";
  }
  return analytics
    .map((a) => {
      const data = a.analyticsData || {};
      const humanSummary = data.human_summary?.trim() || "(no summary)";
      const actionable = data.structured_analytics?.actionable_insights;
      const actionableBlob =
        actionable && Array.isArray(actionable) && actionable.length > 0
          ? `\n    actionable: ${actionable
              .slice(0, 3)
              .map((i: any) => (typeof i === "string" ? i : JSON.stringify(i)))
              .join("; ")}`
          : actionable && typeof actionable === "object"
            ? `\n    actionable: ${JSON.stringify(actionable).slice(0, 400)}`
            : "";
      return `  ${a.weekId} (${a.weekStart} → ${a.weekEnd}, ${a.metadata?.workoutCount ?? 0} workouts): ${humanSummary}${actionableBlob}`;
    })
    .join("\n");
};

const formatMemories = (memories: any[]): string => {
  if (memories.length === 0) {
    return "  (no recent memories)";
  }
  return memories
    .map(
      (m) =>
        `  - [${m.memoryType}/${m.metadata?.importance ?? "?"}] ${m.content?.slice(0, 200) ?? ""}`,
    )
    .join("\n");
};

const formatLivingProfile = (profile: any): string => {
  if (!profile) {
    return "  (no living profile yet)";
  }
  const trainingSummary = profile.trainingIdentity?.summary;
  const trajectory = profile.goalsAndProgress?.progressTrajectory;
  const currentPhase = profile.goalsAndProgress?.currentPhase;
  const goals = profile.goalsAndProgress?.activeGoals?.slice(0, 5)?.join("; ");
  const patterns =
    profile.observedPatterns?.patterns?.slice(0, 3)?.map(
      (p: any) =>
        `${p.pattern} (${p.category}, confidence=${(p.confidence ?? 0).toFixed(2)})`,
    ) || [];
  const milestones = profile.goalsAndProgress?.recentMilestones?.slice(0, 3);

  const parts: string[] = [];
  if (trainingSummary) parts.push(`  Identity: ${trainingSummary}`);
  if (trajectory) parts.push(`  Trajectory: ${trajectory}`);
  if (currentPhase) parts.push(`  Phase: ${currentPhase}`);
  if (goals) parts.push(`  Active goals: ${goals}`);
  if (patterns.length > 0) parts.push(`  Patterns: ${patterns.join("; ")}`);
  if (milestones && milestones.length > 0)
    parts.push(`  Recent milestones: ${milestones.join("; ")}`);

  return parts.length > 0 ? parts.join("\n") : "  (living profile present but sparse)";
};

/**
 * Parallel-fetch all context for the program-insights synthesis. Returns
 * formatted prompt blocks ready to embed into the system prompt.
 *
 * Throws if the program record cannot be loaded — callers should treat that
 * as a hard error.
 */
export const gatherProgramInsightsContext = async (params: {
  userId: string;
  coachId: string;
  programId: string;
}): Promise<GatheredProgramInsightsContext> => {
  const { userId, coachId, programId } = params;

  // Load program first so we know whether to bother gathering the rest of
  // the context (and so we can compute the program window for filtering).
  const program = await getProgram(userId, coachId, programId);
  if (!program) {
    throw new Error(
      `Program not found for user ${userId}, coach ${coachId}, program ${programId}`,
    );
  }

  // Program start date — use program.startDate (YYYY-MM-DD) interpreted as
  // start-of-day UTC. Workouts logged before this point are not relevant.
  const programStart = program.startDate
    ? new Date(`${program.startDate}T00:00:00.000Z`)
    : program.createdAt
      ? new Date(program.createdAt)
      : new Date(0);

  // Parallel-fetch everything else.
  const [workouts, weeklyAnalyticsResult, memories, userProfile] =
    await Promise.all([
      queryWorkouts(userId, {
        limit: WORKOUT_FETCH_LIMIT,
        sortBy: "completedAt",
        sortOrder: "desc",
      }).catch((err) => {
        logger.warn("gatherProgramInsightsContext: queryWorkouts failed", err);
        return [] as Workout[];
      }),
      queryWeeklyAnalyticsPaginated(userId, {
        limit: WEEKLY_ANALYTICS_LIMIT,
      }).catch((err) => {
        logger.warn(
          "gatherProgramInsightsContext: queryWeeklyAnalyticsPaginated failed",
          err,
        );
        return { items: [], totalCount: 0 } as { items: any[]; totalCount: number };
      }),
      queryMemories(userId, coachId, { limit: MEMORY_LIMIT }).catch((err) => {
        logger.warn(
          "gatherProgramInsightsContext: queryMemories failed",
          err,
        );
        return [] as any[];
      }),
      getUserProfile(userId).catch((err) => {
        logger.warn(
          "gatherProgramInsightsContext: getUserProfile failed",
          err,
        );
        return null as any;
      }),
    ]);

  // Build the in-memory template-id set so we can classify workouts.
  // Program record stores phases (high-level) but the full per-day template
  // list lives in S3 (s3DetailKey). To keep this Lambda fast we only check
  // programContext.programId for explicit linkage; for templateId-based
  // linkage we rely on the templateId set we can collect from completed
  // workouts whose programContext already references this program. This is
  // an intentional trade-off: false negatives (ad-hoc misclassified) are
  // acceptable in v1 since the prompt explicitly tolerates both buckets.
  const programTemplateIds = new Set<string>();
  for (const w of workouts) {
    if (w.programContext?.programId === programId && w.templateId) {
      programTemplateIds.add(w.templateId);
    }
  }

  // Filter to workouts logged on/after program start.
  const inWindow = workouts.filter((w) => {
    const completedAt = new Date(w.completedAt);
    return completedAt >= programStart;
  });

  const programLinked: Workout[] = [];
  const adHoc: Workout[] = [];
  for (const w of inWindow) {
    if (isProgramLinked(w, programId, programTemplateIds)) {
      programLinked.push(w);
    } else {
      adHoc.push(w);
    }
  }

  // Cap formatted workouts. Prioritize program-linked (these speak to plan
  // adherence) but reserve up to AD_HOC_FLOOR slots for ad-hoc so a heavy
  // program-linked week doesn't fully crowd them out. Never reserve more
  // slots than ad-hoc actually has.
  const AD_HOC_FLOOR = Math.floor(WORKOUT_FORMAT_CAP / 3);
  const adHocBudget = Math.min(
    adHoc.length,
    Math.max(AD_HOC_FLOOR, WORKOUT_FORMAT_CAP - programLinked.length),
  );
  const programBudget = Math.max(0, WORKOUT_FORMAT_CAP - adHocBudget);

  const formattedProgramLinked =
    programLinked.slice(0, programBudget).map((w) => formatWorkoutLine(w, "program")).join("\n") ||
    "  (no program-linked workouts in this program window yet)";

  const formattedAdHoc =
    adHoc.slice(0, adHocBudget).map((w) => formatWorkoutLine(w, "ad-hoc")).join("\n") ||
    "  (no ad-hoc workouts logged in this program window)";

  const userTimezone = (userProfile as any)?.preferences?.timezone || undefined;
  const livingProfile = (userProfile as any)?.livingProfile;

  return {
    program,
    programSnapshot: formatProgramSnapshot(program),
    programLinkedWorkouts: formattedProgramLinked,
    adHocWorkouts: formattedAdHoc,
    weeklyAnalytics: formatWeeklyAnalytics(weeklyAnalyticsResult.items),
    memories: formatMemories(memories),
    livingProfile: formatLivingProfile(livingProfile),
    userTimezone,
    counts: {
      programLinkedWorkoutCount: programLinked.length,
      adHocWorkoutCount: adHoc.length,
      weeklyAnalyticsCount: weeklyAnalyticsResult.items.length,
      memoryCount: memories.length,
      hasLivingProfile: !!livingProfile,
    },
  };
};
