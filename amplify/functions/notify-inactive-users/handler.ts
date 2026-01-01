import { UserProfile } from "../libs/user/types";
import {
  queryAllUsers,
  queryWorkoutsCount,
  updateUserProfile,
} from "../../dynamodb/operations";
import { withHeartbeat } from "../libs/heartbeat";
import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import {
  sendEmail,
  buildEmailFooterHtml,
  buildEmailFooterText,
  getAppUrl,
} from "../libs/email-utils";

const INACTIVITY_PERIOD_DAYS = 14; // 2 weeks
const MIN_DAYS_BETWEEN_REMINDERS = 28; // Don't send more than once per month

interface InactivityStats {
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
}

/**
 * EventBridge handler to notify inactive users via email
 * Triggered every 2 weeks
 */
export const handler = async () => {
  return withHeartbeat("Inactive User Notification Check", async () => {
    console.info("📧 Starting inactive user notification check", {
      timestamp: new Date().toISOString(),
      inactivityPeriodDays: INACTIVITY_PERIOD_DAYS,
      minDaysBetweenReminders: MIN_DAYS_BETWEEN_REMINDERS,
    });

    const stats: InactivityStats = {
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
    };

    try {
      // Process all users in batches using pagination
      let lastEvaluatedKey: any = undefined;
      let batchNumber = 0;

      do {
        batchNumber++;
        const result = await queryAllUsers(50, lastEvaluatedKey); // Process 50 users at a time
        const users = result.users;

        console.info(
          `📦 Processing batch ${batchNumber} with ${users.length} users`,
        );
        stats.totalUsers += users.length;

        // Process each user in the batch
        for (const user of users) {
          try {
            await processUser(user, stats);
          } catch (error) {
            console.error(`❌ Error processing user ${user.userId}:`, error);
            stats.errors++;
          }
        }

        lastEvaluatedKey = result.lastEvaluatedKey;
      } while (lastEvaluatedKey);

      console.info(
        "✅ Inactive user notification check completed successfully",
        {
          ...stats,
          completedAt: new Date().toISOString(),
        },
      );

      return createOkResponse({
        message: "Inactive user notification check completed successfully",
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Fatal error in inactive user notification:", error);

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
  }); // 10 second default heartbeat interval
};

/**
 * Process a single user: check activity and send email if needed
 */
async function processUser(
  user: UserProfile,
  stats: InactivityStats,
): Promise<void> {
  // Skip if user has opted out of coach check-ins
  const emailNotificationsEnabled =
    user.preferences?.emailNotifications?.coachCheckIns ?? true;
  if (!emailNotificationsEnabled) {
    console.info(`⏭️  User ${user.userId} has opted out of coach check-ins`);
    stats.emailsSkipped.optedOut++;
    return;
  }

  // Skip if no email address
  if (!user.email) {
    console.warn(`⚠️  User ${user.userId} has no email address`);
    stats.emailsSkipped.noEmail++;
    return;
  }

  // Skip if we sent a reminder recently
  const lastReminderSent = user.preferences?.lastSent?.coachCheckIns;
  if (lastReminderSent) {
    const daysSinceLastReminder = Math.floor(
      (Date.now() - new Date(lastReminderSent).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceLastReminder < MIN_DAYS_BETWEEN_REMINDERS) {
      console.info(
        `⏭️ User ${user.userId} received reminder ${daysSinceLastReminder} days ago, skipping`,
      );
      stats.emailsSkipped.recentReminder++;
      return;
    }
  }

  // Check workout activity
  const workoutCount = await queryWorkoutsCount(user.userId, {
    fromDate: new Date(
      Date.now() - INACTIVITY_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    ),
  });

  if (workoutCount > 0) {
    console.info(
      `✅ User ${user.userId} has logged ${workoutCount} workouts, active`,
    );
    stats.activeUsers++;
    return;
  }

  // User is inactive, send reminder email
  console.info(
    `📧 User ${user.userId} is inactive, sending reminder email to ${user.email}`,
  );
  stats.inactiveUsers++;

  await sendInactivityReminderEmail(user);
  await updateLastReminderSent(user.userId);

  stats.emailsSent++;
  console.info(`✅ Successfully sent reminder to ${user.email}`);
}

/**
 * Send inactivity reminder email via SES
 */
async function sendInactivityReminderEmail(user: UserProfile): Promise<void> {
  const firstName = user.firstName || user.username;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Miss You at NeonPanda!</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
      font-size: 16px;
    }
    p {
      font-size: 16px;
      margin: 15px 0;
      color: #333;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f9f9f9;
      padding: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .logo-header {
      background-color: #0a0a0a;
      padding: 10px;
      margin: -30px -30px 30px -30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .logo-header img {
      max-width: 400px;
      height: auto;
    }
    h1 {
      color: #ff6ec7;
      font-size: 28px;
      margin-bottom: 20px;
      margin-top: 0;
    }
    .feature-box {
      background-color: #fff5f8;
      border-left: 4px solid #FF10F0;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .feature-box h2 {
      color: #FF10F0;
      margin-top: 0;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .feature-box p {
      color: #333;
      margin: 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
    }
    .footer p {
      margin: 10px 0;
    }
    .footer a {
      color: #00ffff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="logo-header">
        <img src="https://neonpanda.ai/images/logo-dark-sm.webp" alt="NeonPanda Logo">
      </div>

      <h1>Hey ${firstName}! 👋</h1>

      <p>It's been a few weeks since your last workout, and we wanted to check in – not to pile on pressure, but to let you know we're still in your corner.</p>

      <p>Maybe life got hectic. Maybe motivation dipped. Maybe the app didn't click. Whatever the reason, no judgment. We get it. Training is hard, staying consistent is harder.</p>

      <div class="feature-box">
        <h2>💪 Here's the Thing:</h2>
        <p><strong>You don't need to be perfect to come back.</strong> You don't need a grand plan or a fresh start on Monday. Just one workout. That's all it takes. Your coach is still here, and we'd love to see you again.</p>
      </div>

      <p>If now's not the time, that's okay too. But whenever you're ready – your NeonPanda coaches will be here. Keep training hard, and remember – we're still in your corner, even if we're a little quieter now. 💪</p>

      <p style="margin-top: 30px; font-style: italic; color: #333;">– The NeonPanda Team</p>

${buildEmailFooterHtml(user.email, "coach-checkins", user.userId)}
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
Hey ${firstName}! 👋

It's been a few weeks since your last workout, and we wanted to check in – not to pile on pressure, but to let you know we're still in your corner.

Maybe life got hectic. Maybe motivation dipped. Maybe the app didn't click. Whatever the reason, no judgment. We get it. Training is hard, staying consistent is harder.

💪 Here's the Thing:

You don't need to be perfect to come back. You don't need a grand plan or a fresh start on Monday. Just one workout. That's all it takes. Your coach is still here, and we'd love to see you again.

If now's not the time, that's okay too. But whenever you're ready – your NeonPanda coaches will be here. Keep training hard, and remember – we're still in your corner, even if we're a little quieter now. 💪

– The NeonPanda Team

Visit NeonPanda: ${getAppUrl()}
${buildEmailFooterText(user.email, "coach-checkins", user.userId)}
  `.trim();

  const result = await sendEmail({
    to: user.email,
    subject: `NeonPanda - ${firstName}, we miss you!`,
    htmlBody,
    textBody,
  });

  if (!result.success) {
    throw new Error(`Failed to send email: ${result.error?.message}`);
  }

  console.info(`✅ Successfully sent inactivity reminder to ${user.email}`, {
    messageId: result.messageId,
    requestId: result.requestId,
  });
}

/**
 * Update the lastSent.coachCheckIns timestamp for the user
 */
async function updateLastReminderSent(userId: string): Promise<void> {
  await updateUserProfile(userId, {
    preferences: {
      lastSent: {
        coachCheckIns: new Date(),
      },
    },
  });

  console.info(`Updated preferences.lastSent.coachCheckIns for user ${userId}`);
}
