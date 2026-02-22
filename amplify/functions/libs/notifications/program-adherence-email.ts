/**
 * Program Adherence Reminder Email
 *
 * Sent to users who have one or more active training programs but haven't
 * logged a session in 5+ days. More targeted than the general inactivity
 * reminder – references the specific program(s) they're enrolled in.
 *
 * Tone: warm, coach-like, specific, and encouraging without being preachy.
 */

import { Program } from "../program/types";
import { UserProfile } from "../user/types";
import {
  sendEmail,
  buildEmailFooterHtml,
  buildEmailFooterText,
  getAppUrl,
} from "../email-utils";
import { logger } from "../logger";

const PROGRAM_INACTIVITY_DAYS = 5;

/**
 * Determine whether a program is lagging:
 * - lastActivityAt is older than PROGRAM_INACTIVITY_DAYS, OR
 * - lastActivityAt is null but startDate is older than PROGRAM_INACTIVITY_DAYS
 *   (grace period for brand-new programs before any workouts are expected)
 */
export function isProgramLagging(program: Program): boolean {
  const cutoff = Date.now() - PROGRAM_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

  if (program.lastActivityAt) {
    return new Date(program.lastActivityAt).getTime() < cutoff;
  }

  // No activity yet — only flag if the program started more than PROGRAM_INACTIVITY_DAYS ago
  return new Date(program.startDate).getTime() < cutoff;
}

/**
 * Send a program adherence reminder email for one or more lagging programs.
 */
export async function sendProgramAdherenceEmail(
  user: UserProfile,
  laggingPrograms: Program[],
): Promise<void> {
  const firstName = user.firstName || user.username;
  const isSingle = laggingPrograms.length === 1;
  const program = laggingPrograms[0];

  const subject = isSingle
    ? `NeonPanda - ${firstName}, ${program.name} is at Day ${program.currentDay}`
    : `NeonPanda - ${firstName}, your training programs need you`;

  const htmlBody = buildProgramAdherenceHtml(firstName, laggingPrograms, user);
  const textBody = buildProgramAdherenceText(firstName, laggingPrograms, user);

  const result = await sendEmail({
    to: user.email,
    subject,
    htmlBody,
    textBody,
  });

  if (!result.success) {
    throw new Error(
      `Failed to send program adherence email: ${result.error?.message}`,
    );
  }

  const programNames = laggingPrograms.map((p) => p.name).join(", ");
  logger.info(
    `✅ Successfully sent program adherence reminder to ${user.email}`,
    {
      messageId: result.messageId,
      requestId: result.requestId,
      programs: programNames,
    },
  );
}

function buildProgramAdherenceHtml(
  firstName: string,
  laggingPrograms: Program[],
  user: UserProfile,
): string {
  const isSingle = laggingPrograms.length === 1;
  const program = laggingPrograms[0];

  const openingParagraph = isSingle
    ? buildSingleProgramOpening(program)
    : buildMultiProgramOpening(laggingPrograms.length);

  const programSection = isSingle
    ? buildSingleProgramHtml(program)
    : buildMultiProgramListHtml(laggingPrograms);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Training Program Needs You</title>
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
    .program-card {
      background-color: #f5f5f5;
      border-radius: 6px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .program-card .program-name {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 6px 0;
    }
    .program-card .program-meta {
      color: #555;
      font-size: 14px;
      margin: 0;
    }
    .program-list {
      background-color: #f5f5f5;
      border-radius: 6px;
      padding: 15px 20px;
      margin: 20px 0;
    }
    .program-item {
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
      line-height: 1.5;
    }
    .program-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .program-item:first-child {
      padding-top: 0;
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

      <h1>Hey ${firstName}! 💪</h1>

      ${openingParagraph}

      ${programSection}

      <div class="feature-box">
        <h2>⚡ Pick up right where you left off:</h2>
        <p>No need to restart, no need to make up missed sessions. Your coach has your next workout queued and ready. Just open the app, log it, and you're back in rhythm.</p>
      </div>

      <p>Consistency beats perfection every time – and one session is all it takes to flip the switch back on. Your coach is ready when you are.</p>

      <p style="margin-top: 30px; font-style: italic; color: #333;">– The NeonPanda Team</p>

${buildEmailFooterHtml(user.email, "program-adherence", user.userId)}
    </div>
  </div>
</body>
</html>
  `.trim();
}

function buildProgramAdherenceText(
  firstName: string,
  laggingPrograms: Program[],
  user: UserProfile,
): string {
  const isSingle = laggingPrograms.length === 1;
  const programListText = laggingPrograms
    .map((program) => {
      const coachDisplay =
        program.coachNames?.length > 0
          ? program.coachNames.join(", ")
          : "your coach";
      const progressDisplay =
        program.totalDays > 0
          ? `Day ${program.currentDay} of ${program.totalDays}`
          : `Day ${program.currentDay}`;
      return `  - ${program.name} (${progressDisplay} · Coach: ${coachDisplay} · ${program.trainingFrequency}x/week)`;
    })
    .join("\n");

  const programWord = isSingle ? "program" : "programs";

  return `
Hey ${firstName}! 💪

It's been a few days since your last session, and your ${programWord} ${isSingle ? "is" : "are"} waiting on you.

${isSingle ? buildSingleProgramTextBlurb(laggingPrograms[0]) : `Your active programs:\n${programListText}`}

⚡ Pick up right where you left off:

No need to restart, no need to make up missed sessions. Your coach has your next workout queued and ready. Just open the app, log it, and you're back in rhythm.

Consistency beats perfection every time – and one session is all it takes to flip the switch back on. Your coach is ready when you are.

– The NeonPanda Team

Visit NeonPanda: ${getAppUrl()}
${buildEmailFooterText(user.email, "program-adherence", user.userId)}
  `.trim();
}

// ─── Per-program section builders ───────────────────────────────────────────

function buildSingleProgramOpening(program: Program): string {
  const coachDisplay =
    program.coachNames?.length > 0 ? program.coachNames[0] : "your coach";
  const progressDisplay =
    program.totalDays > 0
      ? `Day ${program.currentDay} of ${program.totalDays}`
      : `Day ${program.currentDay}`;

  return `<p>It's been a few days since your last session on <strong>${program.name}</strong>. You're at ${progressDisplay} – you've put in real work to get here, and ${coachDisplay} wants to help you keep that momentum going.</p>`;
}

function buildMultiProgramOpening(count: number): string {
  return `<p>It's been a few days since your last training session, and ${count} of your active programs are waiting on you. You put real work into building these – let's not let that slip.</p>`;
}

function buildSingleProgramHtml(program: Program): string {
  const coachDisplay =
    program.coachNames?.length > 0
      ? program.coachNames.join(", ")
      : "your coach";
  const progressDisplay =
    program.totalDays > 0
      ? `Day ${program.currentDay} of ${program.totalDays}`
      : `Day ${program.currentDay}`;

  return `
  <div class="program-card">
    <p class="program-name">${program.name}</p>
    <p class="program-meta">${progressDisplay} &nbsp;·&nbsp; Coach: ${coachDisplay} &nbsp;·&nbsp; ${program.trainingFrequency}x/week</p>
  </div>`;
}

function buildMultiProgramListHtml(programs: Program[]): string {
  const items = programs
    .map((program) => {
      const coachDisplay =
        program.coachNames?.length > 0
          ? program.coachNames.join(", ")
          : "your coach";
      const progressDisplay =
        program.totalDays > 0
          ? `Day ${program.currentDay} of ${program.totalDays}`
          : `Day ${program.currentDay}`;
      return `
      <div class="program-item">
        <strong>${program.name}</strong><br>
        <span style="color: #555; font-size: 14px;">${progressDisplay} &nbsp;·&nbsp; Coach: ${coachDisplay} &nbsp;·&nbsp; ${program.trainingFrequency}x/week</span>
      </div>`;
    })
    .join("");

  return `<div class="program-list">${items}</div>`;
}

function buildSingleProgramTextBlurb(program: Program): string {
  const coachDisplay =
    program.coachNames?.length > 0 ? program.coachNames[0] : "your coach";
  const progressDisplay =
    program.totalDays > 0
      ? `Day ${program.currentDay} of ${program.totalDays}`
      : `Day ${program.currentDay}`;

  return `${program.name} – ${progressDisplay} · Coach: ${coachDisplay} · ${program.trainingFrequency}x/week`;
}
