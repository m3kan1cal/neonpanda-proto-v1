#!/usr/bin/env npx tsx

/**
 * Send Platform Update Email Script
 *
 * Queries all active users from DynamoDB and sends the platform update
 * HTML email via Amazon SES. Respects user notification preferences
 * (featureAnnouncements opt-out) and includes personalized unsubscribe links.
 *
 * Strategy:
 * - Query all active users via GSI-3 (entityType = "user", isActive = true)
 * - Filter out users with no email or featureAnnouncements opted out
 * - Load HTML template from public/updates/platform-update-mar-2026.html
 * - Personalize footer with per-user unsubscribe/settings links
 * - Send via SES with rate limiting
 *
 * Usage:
 *   npx tsx scripts/send-platform-update-email.ts --table=<tableName> [options]
 *   npx tsx scripts/send-platform-update-email.ts --table=NeonPanda-ProtoApi-AllItems-V2 --dry-run
 *
 * Options:
 *   --table=NAME         DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
 *   --region=REGION      AWS region (default: us-west-2)
 *   --dry-run            Show what would be sent without actually sending
 *   --auto-confirm       Skip confirmation prompt (use with caution!)
 *   --verbose            Show detailed progress and responses
 *   --batch-size=N       Users per DynamoDB query batch (default: 50)
 *   --delay-ms=N         Delay between emails in ms (default: 100)
 *   --test-email=EMAIL   Send only to this email address (for testing)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const scriptDir = dirname(fileURLToPath(import.meta.url));

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_REGION = "us-west-2";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_DELAY_MS = 100;
const FROM_EMAIL = "NeonPanda <no-reply@neonpanda.ai>";
const EMAIL_SUBJECT = "The Biggest Update in NeonPanda History";
const APP_URL = "https://neonpanda.ai";
const API_URL = "https://api-prod.neonpanda.ai";
const HTML_TEMPLATE_PATH = join(
  scriptDir,
  "..",
  "public",
  "updates",
  "platform-update-mar-2026.html",
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRecord {
  pk: string;
  sk: string;
  entityType: string;
  attributes: {
    userId: string;
    email?: string;
    firstName?: string;
    displayName?: string;
    preferences?: {
      emailNotifications?: {
        featureAnnouncements?: boolean;
      };
    };
    metadata?: {
      isActive?: boolean;
    };
  };
}

interface Config {
  tableName: string;
  region: string;
  dryRun: boolean;
  autoConfirm: boolean;
  verbose: boolean;
  batchSize: number;
  delayMs: number;
  testEmail: string | null;
}

interface Stats {
  totalUsers: number;
  eligible: number;
  sent: number;
  skipped: {
    noEmail: number;
    optedOut: number;
    testEmailFilter: number;
  };
  errors: number;
}

// ─── Argument Parsing ────────────────────────────────────────────────────────

function parseArgs(): Config {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.info(`
Send Platform Update Email Script

Usage:
  npx tsx scripts/send-platform-update-email.ts --table=<tableName> [options]

Options:
  --table=NAME         DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
  --region=REGION      AWS region (default: ${DEFAULT_REGION})
  --dry-run            Show what would be sent without actually sending
  --auto-confirm       Skip confirmation prompt (use with caution!)
  --verbose            Show detailed progress and responses
  --batch-size=N       Users per DynamoDB query batch (default: ${DEFAULT_BATCH_SIZE})
  --delay-ms=N         Delay between emails in ms (default: ${DEFAULT_DELAY_MS})
  --test-email=EMAIL   Send only to this email address (for testing)
  --help, -h           Show this help message

Examples:
  npx tsx scripts/send-platform-update-email.ts --table=NeonPanda-ProtoApi-AllItems-V2 --dry-run
  npx tsx scripts/send-platform-update-email.ts --table=NeonPanda-ProtoApi-AllItems-V2 --test-email=you@example.com
  npx tsx scripts/send-platform-update-email.ts --table=NeonPanda-ProtoApi-AllItems-V2 --auto-confirm --verbose
`);
    process.exit(0);
  }

  const getArg = (name: string): string | undefined => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg?.split("=").slice(1).join("=");
  };

  const tableName = getArg("table") || process.env.DYNAMODB_TABLE_NAME || "";
  if (!tableName) {
    console.error(
      "❌ Table name required. Use --table=NAME or set DYNAMODB_TABLE_NAME env var.",
    );
    process.exit(1);
  }

  return {
    tableName,
    region: getArg("region") || DEFAULT_REGION,
    dryRun: args.includes("--dry-run"),
    autoConfirm: args.includes("--auto-confirm"),
    verbose: args.includes("--verbose"),
    batchSize: parseInt(getArg("batch-size") || String(DEFAULT_BATCH_SIZE), 10),
    delayMs: parseInt(getArg("delay-ms") || String(DEFAULT_DELAY_MS), 10),
    testEmail: getArg("test-email") || null,
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// ─── Unsubscribe / Settings Links ────────────────────────────────────────────

function buildUnsubscribeLink(email: string): string {
  return `${API_URL}/unsubscribe?email=${encodeURIComponent(email)}&type=features`;
}

function buildSettingsLink(userId: string): string {
  return `${APP_URL}/settings?userId=${encodeURIComponent(userId)}`;
}

// ─── HTML Personalization ────────────────────────────────────────────────────

function personalizeHtml(
  template: string,
  email: string,
  userId: string,
): string {
  const unsubscribeLink = buildUnsubscribeLink(email);
  const settingsLink = buildSettingsLink(userId);

  // Replace the placeholder unsubscribe link
  let html = template.replace("{{UNSUBSCRIBE_LINK}}", unsubscribeLink);

  // Inject an "Update Preferences" link before the Unsubscribe link in the footer
  html = html.replace(
    `<a href="${unsubscribeLink}">Unsubscribe</a>`,
    `<a href="${settingsLink}" style="margin-right: 15px">Update Preferences</a>\n            <a href="${unsubscribeLink}">Unsubscribe</a>`,
  );

  return html;
}

// ─── Plain Text Version ──────────────────────────────────────────────────────

function buildPlainText(email: string, userId: string): string {
  return `
The Biggest Update in NeonPanda History — March 2026

This isn't a minor release. Over the past two months, we shipped 141 updates across the entire platform. Here's the highlights:

TRAINING PULSE — Visual Analytics Dashboard
See your progress like never before. Volume trend charts, strength curves with PR markers, body balance radar, recovery load tracking, weekly comparisons, and more. Find it at Training Grounds > Training Pulse.

SHARED PROGRAMS
Share your training programs with anyone. Generate a link, anyone can preview it, and they can copy it into their account with one click.

YOUR COACH NOW KNOWS EVERYTHING
We rebuilt the AI coaching engine with full cross-context awareness. Your coach can now search past conversations, query your memories, browse your programs, pull exercise history, log multiple workouts at once, check today's prescribed workout, and more — 11 tools total.

SMARTER WORKOUT LOGGING
Powered by 10+ tools that work together so the system can make real decisions about what to extract, how to validate, and when to save. Multi-workout support (many workouts in a single message) and program linking included.

COACH CREATOR & PROGRAM DESIGNER — REBUILT
Both migrated to conversation agent architecture. Agentic memory means no more repeating yourself. Training directives give your coaches deeper understanding.

EXPANDED TRAINING KNOWLEDGE
5 new methodologies: GPP, Hybrid Athlete, Renaissance Periodization, RPE/Autoregulation, Zone-2 Aerobic Base. 38+ total methodologies. 10 supported training disciplines.

FRESH NEW LOOK
Purple gradient theme, floating desktop sidebar, cleaner chat UI, refined cards, updated fonts.

QUALITY OF LIFE
Edit modals for everything, fullscreen workout notes, training intelligence, streak tracking, top exercises, personal records, public changelog.

UNDER THE HOOD
70+ bug fixes, performance improvements, data integrity upgrades.

Open NeonPanda: ${APP_URL}
Full Changelog: ${APP_URL}/changelog

– The NeonPanda Team

NeonPanda – Where electric intelligence meets approachable excellence.
Visit NeonPanda: ${APP_URL}
Update Preferences: ${buildSettingsLink(userId)}
Unsubscribe: ${buildUnsubscribeLink(email)}
`.trim();
}

// ─── DynamoDB Query ──────────────────────────────────────────────────────────

async function queryAllActiveUsers(
  docClient: DynamoDBDocumentClient,
  config: Config,
): Promise<UserRecord[]> {
  const allUsers: UserRecord[] = [];
  let lastEvaluatedKey: any = undefined;
  let batchNumber = 0;

  do {
    batchNumber++;
    const command = new QueryCommand({
      TableName: config.tableName,
      IndexName: "gsi3",
      KeyConditionExpression: "entityType = :entityType",
      FilterExpression: "attributes.metadata.isActive = :isActive",
      ExpressionAttributeValues: {
        ":entityType": "user",
        ":isActive": true,
      },
      Limit: config.batchSize,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await docClient.send(command);
    const items = (result.Items || []) as UserRecord[];
    allUsers.push(...items);
    lastEvaluatedKey = result.LastEvaluatedKey;

    if (config.verbose) {
      console.info(
        `  📦 Batch ${batchNumber}: fetched ${items.length} users (total: ${allUsers.length})`,
      );
    }
  } while (lastEvaluatedKey);

  return allUsers;
}

// ─── SES Send ────────────────────────────────────────────────────────────────

async function sendEmail(
  sesClient: SESClient,
  to: string,
  htmlBody: string,
  textBody: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: EMAIL_SUBJECT,
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: "UTF-8",
        },
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
      },
    },
  });

  try {
    const result = await sesClient.send(command);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const config = parseArgs();

  console.info("\n📧 NeonPanda Platform Update Email Sender");
  console.info("─".repeat(50));
  console.info(`  Table:      ${config.tableName}`);
  console.info(`  Region:     ${config.region}`);
  console.info(`  Dry Run:    ${config.dryRun}`);
  console.info(`  Batch Size: ${config.batchSize}`);
  console.info(`  Delay:      ${config.delayMs}ms`);
  if (config.testEmail) {
    console.info(`  Test Email: ${config.testEmail}`);
  }
  console.info("─".repeat(50));

  // Load HTML template
  console.info("\n📄 Loading HTML template...");
  let htmlTemplate: string;
  try {
    htmlTemplate = readFileSync(HTML_TEMPLATE_PATH, "utf-8");
    console.info(
      `  ✅ Loaded template (${(htmlTemplate.length / 1024).toFixed(1)} KB)`,
    );
  } catch (error) {
    console.error(
      `  ❌ Failed to load template at ${HTML_TEMPLATE_PATH}:`,
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  // Initialize AWS clients
  const dynamoClient = new DynamoDBClient({ region: config.region });
  const docClient = DynamoDBDocumentClient.from(dynamoClient);
  const sesClient = new SESClient({ region: config.region });

  // Query all active users
  console.info("\n🔍 Querying active users from DynamoDB...");
  const users = await queryAllActiveUsers(docClient, config);
  console.info(`  📊 Found ${users.length} active users`);

  // Filter users
  const stats: Stats = {
    totalUsers: users.length,
    eligible: 0,
    sent: 0,
    skipped: {
      noEmail: 0,
      optedOut: 0,
      testEmailFilter: 0,
    },
    errors: 0,
  };

  const eligibleUsers: UserRecord[] = [];

  for (const user of users) {
    const attrs = user.attributes;

    if (!attrs.email) {
      stats.skipped.noEmail++;
      if (config.verbose) {
        console.info(`  ⏭️  Skipping ${attrs.userId}: no email`);
      }
      continue;
    }

    if (attrs.preferences?.emailNotifications?.featureAnnouncements === false) {
      stats.skipped.optedOut++;
      if (config.verbose) {
        console.info(
          `  ⏭️  Skipping ${attrs.email}: opted out of feature announcements`,
        );
      }
      continue;
    }

    if (config.testEmail && attrs.email !== config.testEmail) {
      stats.skipped.testEmailFilter++;
      continue;
    }

    eligibleUsers.push(user);
  }

  stats.eligible = eligibleUsers.length;

  console.info(`\n📊 Eligibility Summary:`);
  console.info(`  Total active users:    ${stats.totalUsers}`);
  console.info(`  Eligible to send:      ${stats.eligible}`);
  console.info(`  Skipped (no email):    ${stats.skipped.noEmail}`);
  console.info(`  Skipped (opted out):   ${stats.skipped.optedOut}`);
  if (config.testEmail) {
    console.info(`  Skipped (test filter): ${stats.skipped.testEmailFilter}`);
  }

  if (stats.eligible === 0) {
    console.info("\n✅ No eligible users to send to. Done.");
    process.exit(0);
  }

  // Confirm
  if (config.dryRun) {
    console.info("\n🏃 DRY RUN — listing eligible recipients:");
    for (const user of eligibleUsers) {
      const attrs = user.attributes;
      const name = attrs.displayName || attrs.firstName || "Unknown";
      console.info(`  📧 ${attrs.email} (${name})`);
    }
    console.info(
      `\n✅ Dry run complete. ${stats.eligible} emails would be sent.`,
    );
    process.exit(0);
  }

  if (!config.autoConfirm) {
    const confirmed = await askConfirmation(
      `\n⚠️  Ready to send ${stats.eligible} emails. Proceed?`,
    );
    if (!confirmed) {
      console.info("❌ Cancelled.");
      process.exit(0);
    }
  }

  // Send emails
  console.info(`\n📤 Sending ${stats.eligible} emails...`);

  for (let i = 0; i < eligibleUsers.length; i++) {
    const user = eligibleUsers[i];
    const attrs = user.attributes;
    const email = attrs.email!;
    const userId = attrs.userId;
    const name = attrs.displayName || attrs.firstName || "User";

    const personalizedHtml = personalizeHtml(htmlTemplate, email, userId);
    const plainText = buildPlainText(email, userId);

    const result = await sendEmail(
      sesClient,
      email,
      personalizedHtml,
      plainText,
    );

    if (result.success) {
      stats.sent++;
      if (config.verbose) {
        console.info(
          `  ✅ [${i + 1}/${stats.eligible}] Sent to ${email} (${name}) — MessageId: ${result.messageId}`,
        );
      } else if ((i + 1) % 10 === 0 || i + 1 === stats.eligible) {
        console.info(`  📤 Progress: ${i + 1}/${stats.eligible} sent`);
      }
    } else {
      stats.errors++;
      console.error(
        `  ❌ [${i + 1}/${stats.eligible}] Failed for ${email}: ${result.error}`,
      );
    }

    // Rate limit delay between sends
    if (i < eligibleUsers.length - 1 && config.delayMs > 0) {
      await sleep(config.delayMs);
    }
  }

  // Final summary
  console.info("\n" + "─".repeat(50));
  console.info("📊 Final Results:");
  console.info(`  Total active users:    ${stats.totalUsers}`);
  console.info(`  Eligible:              ${stats.eligible}`);
  console.info(`  Successfully sent:     ${stats.sent}`);
  console.info(`  Errors:                ${stats.errors}`);
  console.info(`  Skipped (no email):    ${stats.skipped.noEmail}`);
  console.info(`  Skipped (opted out):   ${stats.skipped.optedOut}`);
  if (config.testEmail) {
    console.info(`  Skipped (test filter): ${stats.skipped.testEmailFilter}`);
  }
  console.info("─".repeat(50));

  if (stats.errors > 0) {
    console.info(
      `\n⚠️  Completed with ${stats.errors} error(s). Check logs above.`,
    );
    process.exit(1);
  } else {
    console.info("\n✅ All emails sent successfully!");
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
