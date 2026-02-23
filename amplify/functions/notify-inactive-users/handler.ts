import { UserProfile } from "../libs/user/types";
import {
  queryAllUsers,
  queryWorkoutsCount,
  queryPrograms,
  updateUserProfile,
} from "../../dynamodb/operations";
import { withHeartbeat } from "../libs/heartbeat";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { logger } from "../libs/logger";
import { sendInactivityReminderEmail } from "../libs/notifications/inactivity-email";
import {
  isProgramLagging,
  sendProgramAdherenceEmail,
} from "../libs/notifications/program-adherence-email";

const INACTIVITY_PERIOD_DAYS = 14;
const MIN_DAYS_BETWEEN_REMINDERS = 28;

const PROGRAM_INACTIVITY_DAYS = 5;
const MIN_DAYS_BETWEEN_PROGRAM_REMINDERS = 7;

interface NotificationStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  emailsSent: number;
  emailsSkipped: {
    optedOut: number;
    recentReminder: number;
    noEmail: number;
  };
  errors: number;
  programAdherenceEmailsSent: number;
  programAdherenceSkipped: {
    optedOut: number;
    recentReminder: number;
    noActivePrograms: number;
    allRecentlyActive: number;
  };
}

/**
 * EventBridge handler to run daily user notification checks:
 * 1. General inactivity reminder (no workouts in 14 days)
 * 2. Program adherence reminder (active program with no workouts logged in 5 days)
 */
export const handler = async () => {
  return withHeartbeat("Daily User Notification Check", async () => {
    logger.info("📧 Starting daily user notification check", {
      timestamp: new Date().toISOString(),
      inactivityPeriodDays: INACTIVITY_PERIOD_DAYS,
      minDaysBetweenReminders: MIN_DAYS_BETWEEN_REMINDERS,
      programInactivityDays: PROGRAM_INACTIVITY_DAYS,
      minDaysBetweenProgramReminders: MIN_DAYS_BETWEEN_PROGRAM_REMINDERS,
    });

    const stats: NotificationStats = {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      emailsSent: 0,
      emailsSkipped: {
        optedOut: 0,
        recentReminder: 0,
        noEmail: 0,
      },
      errors: 0,
      programAdherenceEmailsSent: 0,
      programAdherenceSkipped: {
        optedOut: 0,
        recentReminder: 0,
        noActivePrograms: 0,
        allRecentlyActive: 0,
      },
    };

    try {
      let lastEvaluatedKey: any = undefined;
      let batchNumber = 0;

      do {
        batchNumber++;
        const result = await queryAllUsers(50, lastEvaluatedKey);
        const users = result.users;

        logger.info(
          `📦 Processing batch ${batchNumber} with ${users.length} users`,
        );
        stats.totalUsers += users.length;

        for (const user of users) {
          try {
            await processUser(user, stats);
          } catch (error) {
            logger.error(`❌ Error processing user ${user.userId}:`, error);
            stats.errors++;
          }
        }

        lastEvaluatedKey = result.lastEvaluatedKey;
      } while (lastEvaluatedKey);

      logger.info("✅ Daily user notification check completed successfully", {
        ...stats,
        completedAt: new Date().toISOString(),
      });

      return createOkResponse({
        message: "Daily user notification check completed successfully",
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("❌ Fatal error in daily user notification check:", error);

      return createErrorResponse(
        500,
        error instanceof Error ? error.message : "Unknown error occurred",
        {
          error: error instanceof Error ? error.stack : String(error),
          stats,
          timestamp: new Date().toISOString(),
        },
      );
    }
  });
};

/**
 * Process a single user: run both inactivity and program adherence checks.
 * Both checks require an email address; each has its own opt-out preference.
 */
async function processUser(
  user: UserProfile,
  stats: NotificationStats,
): Promise<void> {
  if (!user.email) {
    logger.warn(`⚠️  User ${user.userId} has no email address`);
    stats.emailsSkipped.noEmail++;
    return;
  }

  await checkGeneralInactivity(user, stats);
  await checkProgramAdherence(user, stats);
}

// ─── General Inactivity Check ─────────────────────────────────────────────────

async function checkGeneralInactivity(
  user: UserProfile,
  stats: NotificationStats,
): Promise<void> {
  const coachCheckInsEnabled =
    user.preferences?.emailNotifications?.coachCheckIns ?? true;
  if (!coachCheckInsEnabled) {
    logger.info(`⏭️  User ${user.userId} has opted out of coach check-ins`);
    stats.emailsSkipped.optedOut++;
    return;
  }

  const lastReminderSent = user.preferences?.lastSent?.coachCheckIns;
  if (lastReminderSent) {
    const daysSince = daysSinceDate(lastReminderSent);
    if (daysSince < MIN_DAYS_BETWEEN_REMINDERS) {
      logger.info(
        `⏭️ User ${user.userId} received check-in ${daysSince} days ago, skipping`,
      );
      stats.emailsSkipped.recentReminder++;
      return;
    }
  }

  const workoutCount = await queryWorkoutsCount(user.userId, {
    fromDate: new Date(
      Date.now() - INACTIVITY_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    ),
  });

  if (workoutCount > 0) {
    logger.info(
      `✅ User ${user.userId} has logged ${workoutCount} workouts in last ${INACTIVITY_PERIOD_DAYS} days, active`,
    );
    stats.activeUsers++;
    return;
  }

  logger.info(
    `📧 User ${user.userId} is inactive, sending reminder to ${user.email}`,
  );
  stats.inactiveUsers++;

  await sendInactivityReminderEmail(user);
  await updateLastSentTimestamp(user.userId, "coachCheckIns");

  stats.emailsSent++;
  logger.info(`✅ Inactivity reminder sent to ${user.email}`);
}

// ─── Program Adherence Check ──────────────────────────────────────────────────

async function checkProgramAdherence(
  user: UserProfile,
  stats: NotificationStats,
): Promise<void> {
  const programAdherenceEnabled =
    user.preferences?.emailNotifications?.programAdherence ?? true;
  if (!programAdherenceEnabled) {
    logger.info(
      `⏭️  User ${user.userId} has opted out of program adherence reminders`,
    );
    stats.programAdherenceSkipped.optedOut++;
    return;
  }

  const lastProgramReminderSent = user.preferences?.lastSent?.programAdherence;
  if (lastProgramReminderSent) {
    const daysSince = daysSinceDate(lastProgramReminderSent);
    if (daysSince < MIN_DAYS_BETWEEN_PROGRAM_REMINDERS) {
      logger.info(
        `⏭️ User ${user.userId} received program adherence reminder ${daysSince} days ago, skipping`,
      );
      stats.programAdherenceSkipped.recentReminder++;
      return;
    }
  }

  const activePrograms = await queryPrograms(user.userId, { status: "active" });
  if (activePrograms.length === 0) {
    logger.info(`⏭️ User ${user.userId} has no active programs`);
    stats.programAdherenceSkipped.noActivePrograms++;
    return;
  }

  const laggingPrograms = activePrograms.filter(isProgramLagging);

  if (laggingPrograms.length === 0) {
    logger.info(
      `✅ User ${user.userId} is on track across all ${activePrograms.length} active program(s)`,
    );
    stats.programAdherenceSkipped.allRecentlyActive++;
    return;
  }

  logger.info(
    `📧 User ${user.userId} is behind on ${laggingPrograms.length} program(s), sending adherence reminder to ${user.email}`,
  );

  await sendProgramAdherenceEmail(user, laggingPrograms);
  await updateLastSentTimestamp(user.userId, "programAdherence");

  stats.programAdherenceEmailsSent++;
  logger.info(`✅ Program adherence reminder sent to ${user.email}`);
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

function daysSinceDate(date: Date | string): number {
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
}

async function updateLastSentTimestamp(
  userId: string,
  key: "coachCheckIns" | "programAdherence",
): Promise<void> {
  await updateUserProfile(userId, {
    preferences: {
      lastSent: {
        [key]: new Date(),
      },
    },
  });

  logger.info(`Updated preferences.lastSent.${key} for user ${userId}`);
}
