/**
 * Today's Prescribed Workout Status — server-side context block
 *
 * The conversation agent has historically had to call `get_todays_workout` to
 * know whether today's prescribed program template was already logged. The
 * model would sometimes skip the tool call and confabulate ("you just
 * completed today's power cleans") based on `query_exercise_history` rows
 * whose `completedAt` happened to be today.
 *
 * Pre-computing the status server-side and injecting it into the dynamic
 * prompt removes the model's reliance on a tool call for a fact we already
 * have. The model literally sees "Power Cleans — pending" in its system
 * context and cannot confuse a previously-logged exercise row for today's
 * prescription.
 *
 * The data is already in S3 (loaded for `get_todays_workout` on demand) so
 * the additional cost is one S3 GET per turn on program-scoped surfaces.
 */
import { getProgramDetailsFromS3 } from "./s3-utils";
import type { WorkoutTemplate } from "./types";
import { logger } from "../logger";

export interface TodayWorkoutStatusEntry {
  templateId: string;
  name: string;
  status: "pending" | "completed" | "skipped" | "regenerated";
  completedAt?: string;
}

export interface TodayWorkoutStatus {
  dayNumber: number;
  restDay: boolean;
  templates: TodayWorkoutStatusEntry[];
}

interface ActiveProgramLike {
  s3DetailKey?: string;
  currentDay?: number;
  totalDays?: number;
}

/**
 * Load the prescribed-workout status for a specific day in the user's program.
 *
 * Returns null on any failure or when there is no program / no S3 detail key —
 * callers should treat null as "no status block to render" rather than as an
 * error. Returning a successful object with `restDay: true` and an empty
 * `templates` array is the canonical "the prompt should show 'today is a rest
 * day'" signal.
 */
export async function loadTodayWorkoutStatus(
  activeProgram: ActiveProgramLike | null | undefined,
  requestedDayNumber: number | undefined,
): Promise<TodayWorkoutStatus | null> {
  if (!activeProgram?.s3DetailKey) return null;

  const dayNumber = requestedDayNumber ?? activeProgram.currentDay;
  if (typeof dayNumber !== "number" || dayNumber < 1) return null;

  if (
    typeof activeProgram.totalDays === "number" &&
    dayNumber > activeProgram.totalDays
  ) {
    return null;
  }

  try {
    const programDetails = await getProgramDetailsFromS3(
      activeProgram.s3DetailKey,
    );
    if (!programDetails || !programDetails.workoutTemplates) return null;

    const dayTemplates = programDetails.workoutTemplates.filter(
      (t: WorkoutTemplate) => t.dayNumber === dayNumber,
    );

    if (dayTemplates.length === 0) {
      return { dayNumber, restDay: true, templates: [] };
    }

    return {
      dayNumber,
      restDay: false,
      templates: dayTemplates.map((t) => ({
        templateId: t.templateId,
        name: t.name || "Workout",
        status: t.status || "pending",
        ...(t.completedAt && {
          completedAt:
            t.completedAt instanceof Date
              ? t.completedAt.toISOString()
              : String(t.completedAt),
        }),
      })),
    };
  } catch (error) {
    logger.warn("loadTodayWorkoutStatus failed:", {
      s3Key: activeProgram.s3DetailKey,
      dayNumber,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

/**
 * Format a TodayWorkoutStatus object as the prompt section the conversation
 * agent reads. The text is intentionally explicit about how to interpret each
 * status value so the model has no excuse to say "completed today" without
 * `status: "completed"` in this block.
 */
export function formatTodayWorkoutStatusForPrompt(
  status: TodayWorkoutStatus,
): string {
  const header = `## TODAY'S PRESCRIBED WORKOUT STATUS (Day ${status.dayNumber})`;

  if (status.restDay || status.templates.length === 0) {
    return `${header}

(rest day — no prescribed workout templates for this day)

Treat this as authoritative. Today is a rest day in the program; do not narrate
any prescribed work as completed today unless the user explicitly logged an
ad-hoc session.`;
  }

  const lines = status.templates.map((t) => {
    const statusLabel =
      t.status === "completed"
        ? `completed${t.completedAt ? ` (logged at ${t.completedAt})` : ""}`
        : t.status === "skipped"
          ? "skipped"
          : t.status === "regenerated"
            ? "regenerated (replaced — treat as pending)"
            : "pending (not yet logged)";
    return `- "${t.name}" — ${statusLabel}`;
  });

  return `${header}

${lines.join("\n")}

Treat these statuses as authoritative. Do not narrate any prescribed template as
completed/done/finished unless its status here is "completed". If a
\`query_exercise_history\` result returns a row whose date is today, that row
reflects work the user logged at some point today — but it does NOT necessarily
correspond to today's prescribed template unless that template's status above is
"completed".`;
}
