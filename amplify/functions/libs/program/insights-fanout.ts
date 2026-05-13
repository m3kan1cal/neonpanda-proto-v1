/**
 * Program Insights — Shared Fan-Out Helper
 *
 * Single source of truth for invoking build-program-insights across the
 * user's active programs. Used by:
 *   - build-workout-analysis (tail fan-out after each workout's per-workout
 *     analysis completes)
 *   - build-weekly-analytics / build-monthly-analytics (post-cron refresh)
 *
 * Always fire-and-forget via invokeAsyncLambda. Errors are swallowed so a
 * fan-out failure can never break the caller. Programs with no coachId are
 * filtered out — the build-program-insights handler rejects events missing
 * coachId, and getProgram(userId, coachId, programId) returns null when the
 * coach doesn't match, so silently passing undefined would drop insights for
 * that program.
 */

import { queryPrograms } from "../../../dynamodb/operations";
import { invokeAsyncLambda } from "../api-helpers";
import type { BuildProgramInsightsEvent } from "./types";
import { logger } from "../logger";

export interface FanOutProgramInsightsOptions {
  userId: string;
  source: BuildProgramInsightsEvent["source"];
  /** When true, set force=true on each invoke so the throttle in build-program-insights is bypassed. */
  force?: boolean;
  /** Workout id that triggered this fan-out, surfaced in CloudWatch for debugging. */
  triggerWorkoutId?: string;
  /** Short label used in invokeAsyncLambda's context arg for log clarity. */
  contextLabel?: string;
}

export const fanOutProgramInsights = async (
  options: FanOutProgramInsightsOptions,
): Promise<void> => {
  const functionName = process.env.BUILD_PROGRAM_INSIGHTS_FUNCTION_NAME;
  if (!functionName) {
    return;
  }

  try {
    const activePrograms = (await queryPrograms(options.userId)).filter(
      (p) => p.status === "active",
    );
    if (activePrograms.length === 0) {
      return;
    }

    const programsToFanOut = activePrograms.filter((p) => {
      if (!p.coachIds?.[0]) {
        logger.warn(
          `⚠️ Skipping program insights fan-out for ${p.programId}: program has no coachId`,
        );
        return false;
      }
      return true;
    });
    if (programsToFanOut.length === 0) {
      return;
    }

    logger.info(
      `🧠 Fanning out program insights for user ${options.userId} (${options.source}):`,
      {
        activeProgramCount: programsToFanOut.length,
      },
    );

    const label =
      options.contextLabel ?? `program insights fan-out (${options.source})`;

    await Promise.allSettled(
      programsToFanOut.map((p) => {
        const payload: BuildProgramInsightsEvent = {
          userId: options.userId,
          coachId: p.coachIds[0],
          programId: p.programId,
          source: options.source,
          ...(options.force ? { force: true } : {}),
          ...(options.triggerWorkoutId
            ? { triggerWorkoutId: options.triggerWorkoutId }
            : {}),
        };
        return invokeAsyncLambda(functionName, payload, label);
      }),
    );
  } catch (error) {
    logger.warn(
      `⚠️ Failed to fan out program insights for user ${options.userId} (non-fatal):`,
      error,
    );
  }
};
