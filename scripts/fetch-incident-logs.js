#!/usr/bin/env node

/**
 * Fetch Incident Logs Script
 *
 * Fetches CloudWatch log streams for a Lambda function and saves them to a
 * timestamped incidents/ directory. Optionally invokes the Cursor Agent CLI
 * (agent chat) directly to trigger the analyze-incident-logs skill for root
 * cause and remediation analysis without leaving the terminal.
 *
 * Enhancements over fetch-log-streams.js:
 * - Auto-discovers the N most recent log streams for a log group
 * - Creates incidents/{timestamp}-{function-name}/ directory automatically
 * - Writes incident-context.json alongside logs.csv
 * - Optionally invokes Cursor Agent CLI (--run-agent) for fully automated analysis
 *
 * Prerequisites for --run-agent:
 *   curl https://cursor.com/install -fsSL | bash   (installs the `agent` CLI)
 *
 * Usage:
 *   node scripts/fetch-incident-logs.js --log-group=<name> [--streams=<s1,s2>|--auto-recent=N]
 *
 * Options:
 *   --log-group=NAME        CloudWatch log group name (required)
 *   --streams=STREAMS       Comma-separated stream names (use this OR --auto-recent)
 *   --auto-recent=N         Auto-discover N most recent streams (default: 1)
 *   --region=REGION         AWS region (default: us-west-2)
 *   --note=TEXT             Optional note to embed in incident-context.json
 *   --run-agent             Invoke the Cursor Agent CLI after fetching (requires `agent` CLI)
 *   --apply                 Run in full agent mode (can edit files). Default is --plan (read-only).
 *   --model=NAME            LLM to use (e.g. claude-sonnet-4-5, gpt-4o). Run `agent models` to list.
 *   --verbose               Show detailed progress
 *   --help, -h              Show this help message
 *
 * Examples:
 *   # Fetch and produce a read-only remediation plan (safe default)
 *   node scripts/fetch-incident-logs.js \
 *     --log-group='/aws/lambda/amplify-neonpandaprotov1--streamcoachconversationl-YrHSi4Ltryf1' \
 *     --auto-recent=1 \
 *     --run-agent
 *
 *   # Fetch, produce plan, use a specific model
 *   node scripts/fetch-incident-logs.js \
 *     --log-group='/aws/lambda/amplify-neonpandaprotov1--streamcoachconversationl-YrHSi4Ltryf1' \
 *     --auto-recent=1 \
 *     --run-agent \
 *     --model=claude-sonnet-4-5
 *
 *   # Fetch and apply fixes automatically (agent mode — edits files)
 *   node scripts/fetch-incident-logs.js \
 *     --log-group='/aws/lambda/amplify-neonpandaprotov1--streamcoachconversationl-YrHSi4Ltryf1' \
 *     --auto-recent=1 \
 *     --run-agent --apply
 *
 *   # Fetch only, print prompt for manual paste into Cursor IDE
 *   node scripts/fetch-incident-logs.js \
 *     --log-group='/aws/lambda/amplify-neonpandaprotov1--streamcoachconversationl-YrHSi4Ltryf1' \
 *     --streams='2026/03/24/[$LATEST]f035c29d5606471a9ae42cbeeb884cf3' \
 *     --note='User reported timeout during program generation'
 */

import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
  DescribeLogStreamsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import fs from "fs/promises";
import { createWriteStream, mkdirSync } from "fs";
import path from "path";
import { spawn } from "child_process";

const DEFAULT_REGION = "us-west-2";
const INCIDENTS_DIR = "incidents";

// ─── Argument Parsing ────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const options = {
    logGroup: null,
    streams: [],
    autoRecent: null,
    region: DEFAULT_REGION,
    note: null,
    runAgent: args.includes("--run-agent"),
    apply: args.includes("--apply"),
    model: null,
    verbose: args.includes("--verbose"),
  };

  for (const arg of args) {
    if (arg.startsWith("--log-group=")) {
      options.logGroup = arg.slice("--log-group=".length);
    } else if (arg.startsWith("--streams=")) {
      const raw = arg.slice("--streams=".length);
      options.streams = raw.split(",").map((s) => s.trim());
    } else if (arg.startsWith("--auto-recent=")) {
      options.autoRecent = parseInt(arg.slice("--auto-recent=".length), 10);
    } else if (arg === "--auto-recent") {
      options.autoRecent = 1;
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--note=")) {
      options.note = arg.slice("--note=".length);
    } else if (arg.startsWith("--model=")) {
      options.model = arg.slice("--model=".length);
    }
  }

  if (!options.logGroup) {
    console.error("Error: --log-group is required");
    process.exit(1);
  }

  if (options.streams.length === 0 && options.autoRecent === null) {
    console.error(
      "Error: provide --streams=... or --auto-recent=N to specify which streams to fetch",
    );
    process.exit(1);
  }

  return options;
}

function printHelp() {
  console.info(`
Fetch Incident Logs

Usage:
  node scripts/fetch-incident-logs.js --log-group=<name> [--streams=<s>|--auto-recent=N] [options]

Options:
  --log-group=NAME     CloudWatch log group name (required)
  --streams=STREAMS    Comma-separated log stream names
  --auto-recent=N      Auto-discover N most recent streams (default: 1)
  --region=REGION      AWS region (default: ${DEFAULT_REGION})
  --note=TEXT          Short note to include in incident context
  --run-agent          Invoke Cursor Agent CLI after fetching (requires 'agent' CLI)
  --apply              Run in full agent mode — edits files (default is plan mode, read-only)
  --model=NAME         LLM to use (e.g. claude-sonnet-4-5). Run 'agent models' to list options.
  --verbose            Show detailed progress
  --help, -h           Show this message

Modes (with --run-agent):
  Default (--plan)     Read-only. Produces a plan for you to review. No files are changed.
  --apply              Full agent mode. Agent can read, write, and run shell commands.

Examples:
  # Fetch and produce a read-only remediation plan (safe default)
  node scripts/fetch-incident-logs.js \\
    --log-group='/aws/lambda/...' --auto-recent=1 --run-agent

  # Use a specific model
  node scripts/fetch-incident-logs.js \\
    --log-group='/aws/lambda/...' --auto-recent=1 --run-agent --model=claude-sonnet-4-5

  # Fetch and apply fixes immediately (agent mode)
  node scripts/fetch-incident-logs.js \\
    --log-group='/aws/lambda/...' --auto-recent=1 --run-agent --apply

  # Fetch only, print prompt for manual paste into Cursor IDE
  node scripts/fetch-incident-logs.js \\
    --log-group='/aws/lambda/...' \\
    --streams='2026/03/24/[$LATEST]abc123' --note='User reported 504'

Install Cursor Agent CLI (prerequisite for --run-agent):
  curl https://cursor.com/install -fsSL | bash
  `);
}

// ─── AWS Helpers ─────────────────────────────────────────────────────────────

function buildClient(region) {
  return new CloudWatchLogsClient({ region });
}

async function discoverRecentStreams(client, logGroup, count, verbose) {
  if (verbose) {
    console.info(
      `  Discovering ${count} most recent stream(s) for ${logGroup}...`,
    );
  }

  const command = new DescribeLogStreamsCommand({
    logGroupName: logGroup,
    orderBy: "LastEventTime",
    descending: true,
    limit: count,
  });

  const response = await client.send(command);
  const streams = (response.logStreams || []).map((s) => s.logStreamName);

  if (verbose) {
    streams.forEach((s) => console.info(`    Found: ${s}`));
  }

  return streams;
}

async function fetchStreamEvents(client, logGroup, streamName, verbose) {
  const events = [];
  let nextToken = null;
  let isFirstRequest = true;
  let requestCount = 0;

  if (verbose) {
    console.info(`  Fetching: ${streamName}`);
  }

  try {
    while (true) {
      requestCount++;

      const params = {
        logGroupName: logGroup,
        logStreamName: streamName,
        startFromHead: isFirstRequest,
      };

      if (!isFirstRequest && nextToken) {
        params.nextToken = nextToken;
      }

      const response = await client.send(new GetLogEventsCommand(params));

      if (!response.events || response.events.length === 0) break;

      events.push(...response.events);

      if (verbose && requestCount % 5 === 0) {
        console.info(`    ${events.length} events fetched so far...`);
      }

      const prevToken = nextToken;
      nextToken = response.nextForwardToken;

      if (!nextToken || nextToken === prevToken) break;

      isFirstRequest = false;

      if (requestCount % 10 === 0) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (verbose) {
      console.info(`    Done: ${events.length} total events`);
    }
  } catch (err) {
    console.error(`    Error fetching stream: ${err.message}`);
  }

  return events;
}

// ─── CSV / File Helpers ───────────────────────────────────────────────────────

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function extractFunctionShortName(logGroup) {
  // /aws/lambda/amplify-neonpandaprotov1--streamcoachconversationl-YrHSi4Ltryf1
  // -> streamcoachconversation
  const lambdaMatch = logGroup.match(/\/aws\/lambda\/(.+)/);
  if (!lambdaMatch) return logGroup.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40);

  const fullName = lambdaMatch[1];

  // Strip amplify env prefix (amplify-<app>--<fn>-<hash> or amplify-<env>-<date>-<fn>-<hash>)
  const amplifyMatch = fullName.match(/amplify-[^-]+-+(.+?)-[A-Za-z0-9]{10,}$/);
  if (amplifyMatch) {
    return amplifyMatch[1].slice(0, 40).toLowerCase();
  }

  return fullName.slice(0, 40).toLowerCase();
}

function buildIncidentDirName(logGroup) {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const shortName = extractFunctionShortName(logGroup);
  return `${timestamp}_${shortName}`;
}

// ─── Cursor Agent CLI ─────────────────────────────────────────────────────────

/**
 * Invoke the Cursor Agent CLI with the analysis prompt.
 *
 * Defaults to --plan (read-only, produces a reviewable plan without editing files).
 * Pass apply=true to run in full agent mode with write/shell access.
 *
 * Requires the `agent` CLI: curl https://cursor.com/install -fsSL | bash
 */
async function invokeAgentCli(prompt, { apply = false, model = null } = {}) {
  const modeLabel = apply ? "agent (will edit files)" : "plan (read-only)";
  console.info("─── Invoking Cursor Agent CLI ──────────────────────────────");
  console.info(`Mode:   ${modeLabel}`);
  if (model) console.info(`Model:  ${model}`);
  console.info(`Prompt: ${prompt}\n`);

  // agent <prompt> [--plan] [--model=NAME]
  // Note: no "chat" subcommand — the prompt is a positional argument
  const cliArgs = [prompt];
  if (!apply) cliArgs.push("--plan");
  if (model) cliArgs.push(`--model=${model}`);

  return new Promise((resolve) => {
    const child = spawn("agent", cliArgs, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        console.error(
          "\nError: Cursor Agent CLI not found. Install it with:\n" +
            "  curl https://cursor.com/install -fsSL | bash\n" +
            "\nAlternatively, paste this prompt into the Cursor Agent chat in the IDE:\n" +
            `  ${prompt}\n`,
        );
      } else {
        console.error(`\nError invoking agent CLI: ${err.message}`);
      }
      resolve(); // Non-fatal — logs are already saved regardless
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.warn(`\nAgent CLI exited with code ${code}`);
      }
      resolve();
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.info("CloudWatch Incident Log Fetcher\n");

  const options = parseArgs();

  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
    console.warn(
      "Warning: No AWS credentials found in environment. Ensure AWS_PROFILE or credentials are set.",
    );
  }

  const client = buildClient(options.region);

  // Resolve stream names
  let streamNames = options.streams;
  if (options.autoRecent !== null) {
    streamNames = await discoverRecentStreams(
      client,
      options.logGroup,
      options.autoRecent,
      options.verbose,
    );

    if (streamNames.length === 0) {
      console.error("No streams found for the given log group.");
      process.exit(1);
    }
  }

  // Create incident directory
  const incidentDirName = buildIncidentDirName(options.logGroup);
  const incidentDirPath = path.join(INCIDENTS_DIR, incidentDirName);
  mkdirSync(incidentDirPath, { recursive: true });

  const logsFile = path.join(incidentDirPath, "logs.csv");
  const contextFile = path.join(incidentDirPath, "incident-context.json");

  console.info(`Log Group:  ${options.logGroup}`);
  console.info(`Streams:    ${streamNames.length}`);
  console.info(`Incident:   ${incidentDirPath}\n`);

  // Fetch all streams and write CSV
  const writeStream = createWriteStream(logsFile);
  writeStream.write("timestamp,logStreamName,message\n");

  let totalEvents = 0;
  const streamSummaries = [];

  for (const streamName of streamNames) {
    const events = await fetchStreamEvents(
      client,
      options.logGroup,
      streamName,
      options.verbose,
    );

    if (events.length > 0) {
      for (const event of events) {
        const row = [
          escapeCsv(event.timestamp),
          escapeCsv(streamName),
          escapeCsv(event.message),
        ].join(",");
        writeStream.write(row + "\n");
      }

      totalEvents += events.length;

      const firstTs = new Date(events[0].timestamp).toISOString();
      const lastTs = new Date(
        events[events.length - 1].timestamp,
      ).toISOString();

      streamSummaries.push({
        streamName,
        eventCount: events.length,
        firstEvent: firstTs,
        lastEvent: lastTs,
      });

      if (!options.verbose) {
        console.info(
          `  ${streamName}: ${events.length.toLocaleString()} events`,
        );
      }
    } else {
      console.info(`  ${streamName}: (empty)`);
    }
  }

  writeStream.end();
  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  // Write incident-context.json
  const context = {
    fetchedAt: new Date().toISOString(),
    logGroup: options.logGroup,
    region: options.region,
    streams: streamSummaries,
    totalEvents,
    logsFile,
    ...(options.note ? { note: options.note } : {}),
  };

  await fs.writeFile(contextFile, JSON.stringify(context, null, 2));

  // Summary
  console.info("\n═══════════════════════════════════════════════════════════");
  console.info("Incident Logs Fetched");
  console.info("═══════════════════════════════════════════════════════════");
  console.info(
    `  Streams:      ${streamSummaries.length}/${streamNames.length}`,
  );
  console.info(`  Total Events: ${totalEvents.toLocaleString()}`);
  console.info(`  Logs:         ${logsFile}`);
  console.info(`  Context:      ${contextFile}`);
  console.info("═══════════════════════════════════════════════════════════\n");

  const agentPrompt = `Analyze the incident logs in ${incidentDirPath} and produce a remediation plan.`;

  if (options.runAgent) {
    await invokeAgentCli(agentPrompt, {
      apply: options.apply,
      model: options.model,
    });
  } else {
    console.info(
      "─── Cursor Agent Prompt ────────────────────────────────────",
    );
    console.info("");
    console.info(agentPrompt);
    console.info("");
    console.info(
      "────────────────────────────────────────────────────────────",
    );
    console.info(
      "\nPaste the prompt above into the Cursor Agent chat, or re-run with --run-agent to invoke automatically.\n",
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  if (process.env.VERBOSE) console.error(err);
  process.exit(1);
});
