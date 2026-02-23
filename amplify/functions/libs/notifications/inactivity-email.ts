/**
 * Inactivity Reminder Email
 *
 * Sent to users who haven't logged any workout in 14+ days.
 * Warm, supportive, non-judgmental tone – no pressure, just a check-in.
 */

import { UserProfile } from "../user/types";
import {
  sendEmail,
  buildEmailFooterHtml,
  buildEmailFooterText,
  getAppUrl,
} from "../email-utils";
import { logger } from "../logger";

/**
 * Send a general inactivity reminder email to a user who hasn't logged
 * any workout in the past 14 days.
 */
export async function sendInactivityReminderEmail(
  user: UserProfile,
): Promise<void> {
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
    throw new Error(
      `Failed to send inactivity reminder email: ${result.error?.message}`,
    );
  }

  logger.info(`✅ Successfully sent inactivity reminder to ${user.email}`, {
    messageId: result.messageId,
    requestId: result.requestId,
  });
}
