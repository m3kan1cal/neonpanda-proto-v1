import { UserProfile } from '../libs/user/types';
import { queryAllUsers, queryWorkoutsCount, updateUserProfile } from '../../dynamodb/operations';
import { withHeartbeat } from '../libs/heartbeat';
import { createOkResponse, createErrorResponse } from '../libs/api-helpers';
import { sendEmail, buildEmailFooterHtml, buildEmailFooterText, getAppUrl } from '../libs/email-utils';

const INACTIVITY_PERIOD_DAYS = 14; // 2 weeks
const MIN_DAYS_BETWEEN_REMINDERS = 14; // Don't send more than once per 2 weeks

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
  return withHeartbeat('Inactive User Notification Check', async () => {
    console.info('📧 Starting inactive user notification check', {
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

        console.info(`📦 Processing batch ${batchNumber} with ${users.length} users`);
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

      console.info('✅ Inactive user notification check completed successfully', {
        ...stats,
        completedAt: new Date().toISOString(),
      });

      return createOkResponse({
        message: 'Inactive user notification check completed successfully',
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Fatal error in inactive user notification:', error);

      return createErrorResponse(
        500,
        error instanceof Error ? error.message : 'Unknown error occurred',
        {
          error: error instanceof Error ? error.stack : String(error),
          stats,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }); // 10 second default heartbeat interval
};

/**
 * Process a single user: check activity and send email if needed
 */
async function processUser(user: UserProfile, stats: InactivityStats): Promise<void> {
  // Skip if user has opted out of coach check-ins
  const emailNotificationsEnabled = user.preferences?.emailNotifications?.coachCheckIns ?? true;
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
  const lastReminderSent = user.emailNotificationMetadata?.lastInactivityReminderSent;
  if (lastReminderSent) {
    const daysSinceLastReminder = Math.floor(
      (Date.now() - new Date(lastReminderSent).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastReminder < MIN_DAYS_BETWEEN_REMINDERS) {
      console.info(
        `⏭️ User ${user.userId} received reminder ${daysSinceLastReminder} days ago, skipping`
      );
      stats.emailsSkipped.recentReminder++;
      return;
    }
  }

  // Check workout activity
  const workoutCount = await queryWorkoutsCount(user.userId, {
    fromDate: new Date(Date.now() - INACTIVITY_PERIOD_DAYS * 24 * 60 * 60 * 1000),
  });

  if (workoutCount > 0) {
    console.info(`✅ User ${user.userId} has logged ${workoutCount} workouts, active`);
    stats.activeUsers++;
    return;
  }

  // User is inactive, send reminder email
  console.info(`📧 User ${user.userId} is inactive, sending reminder email to ${user.email}`);
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
      color: #00ffff;
      font-size: 28px;
      margin-bottom: 10px;
      margin-top: 0;
    }
    .subtitle {
      color: #666;
      font-size: 16px;
      margin-bottom: 20px;
    }
    .highlight-box {
      background: linear-gradient(135deg, rgba(255, 110, 199, 0.35) 0%, rgba(255, 16, 240, 0.25) 50%, rgba(0, 255, 255, 0.35) 100%);
      border: 3px solid rgba(255, 110, 199, 0.8);
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    .highlight-box h3 {
      color: #FF10F0;
      margin-top: 0;
      font-size: 18px;
      font-weight: 700;
    }
    .highlight-box p {
      color: #1a1a1a;
      margin: 10px 0;
    }
    .cta-button {
      background-color: #00ffff;
      color: #0A0A0A;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      display: inline-block;
      margin: 20px 0;
      font-weight: 600;
      font-size: 16px;
    }
    .signature {
      margin-top: 30px;
      font-style: italic;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="logo-header">
        <img src="https://neonpanda.ai/images/logo-light-sm.png" alt="NeonPanda Logo">
      </div>

      <h1>Hey ${firstName}! 👋</h1>
      <p class="subtitle">We noticed it's been a couple weeks since your last workout, and we wanted to check in with you.</p>

      <p>Your goals are important, and we're here to help you achieve them. Whether you took a planned break or life got busy, there's no judgment—just support.</p>

      <div class="highlight-box">
        <h3>🎯 Remember:</h3>
        <p><strong>Consistency beats perfection.</strong> Every workout counts, no matter how small. Your coach is ready when you are.</p>
      </div>

      <p>Ready to get back to it? Log into NeonPanda and let's keep building momentum toward your goals.</p>

      <div style="text-align: center;">
        <a href="${getAppUrl()}" class="cta-button">Log Your Next Workout</a>
      </div>

      <p>We believe in you and we're here to support your journey. 💪</p>

      <div class="signature">
        <p>Keep training,<br>
        <strong>The NeonPanda Team</strong></p>
      </div>

${buildEmailFooterHtml(user.email, 'coach-checkins')}
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `
Hey ${firstName}! 👋

We noticed it's been a couple weeks since your last workout, and we wanted to check in with you.

Your goals are important, and we're here to help you achieve them. Whether you took a planned break or life got busy, there's no judgment—just support.

🎯 Remember:
Consistency beats perfection. Every workout counts, no matter how small. Your coach is ready when you are.

Ready to get back to it? Log into NeonPanda and let's keep building momentum toward your goals.

Visit: ${getAppUrl()}

We believe in you and we're here to support your journey. 💪

Keep training,
The NeonPanda Team
${buildEmailFooterText(user.email, 'coach-checkins')}
  `.trim();

  const result = await sendEmail({
    to: user.email,
    subject: `${firstName}, we miss you! 💙`,
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
 * Update the lastInactivityReminderSent timestamp for the user
 */
async function updateLastReminderSent(userId: string): Promise<void> {
  await updateUserProfile(userId, {
    emailNotificationMetadata: {
      lastInactivityReminderSent: new Date(),
    },
  });

  console.info(`Updated lastInactivityReminderSent for user ${userId}`);
}
