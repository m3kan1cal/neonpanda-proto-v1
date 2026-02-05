#!/usr/bin/env node

/**
 * Fetch CloudWatch Log Streams Script
 *
 * This script fetches all logs from specific CloudWatch log streams and saves them to CSV format.
 * Useful for analyzing logs offline or exporting specific log streams for debugging.
 *
 * Features:
 * - Fetches all events from specified log streams (handles pagination automatically)
 * - Saves logs to CSV format (timestamp, logStreamName, message)
 * - Supports multiple log streams
 * - Handles rate limiting with automatic delays
 * - Optional verbose mode for detailed progress
 *
 * Usage:
 *   node scripts/fetch-log-streams.js --log-group=<name> --streams=<stream1,stream2>
 *   node scripts/fetch-log-streams.js --log-group=/aws/lambda/MyFunction --streams=2026/01/25/[$LATEST]abc123
 *
 * Options:
 *   --log-group=NAME    CloudWatch log group name (required)
 *   --streams=STREAMS   Comma-separated list of log stream names (required)
 *   --output=FILE       Output CSV file path (default: cloudwatch-logs.csv)
 *   --region=REGION     AWS region (default: us-west-2)
 *   --verbose           Show detailed progress
 *   --help, -h          Show this help message
 *
 * Examples:
 *   node scripts/fetch-log-streams.js --log-group=/aws/lambda/MyFunc --streams="2026/01/25/[$LATEST]abc123" --output=logs.csv
 *   node scripts/fetch-log-streams.js --log-group=/aws/lambda/MyFunc --streams="stream1,stream2,stream3" --verbose
 */

import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import fs from "fs/promises";
import { createWriteStream } from "fs";

// Configuration
const DEFAULT_REGION = "us-west-2";
const DEFAULT_OUTPUT_FILE = "cloudwatch-logs.csv";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
Fetch CloudWatch Log Streams Script

Usage:
  node scripts/fetch-log-streams.js --log-group=<name> --streams=<stream1,stream2> [options]

Options:
  --log-group=NAME    CloudWatch log group name (required)
  --streams=STREAMS   Comma-separated list of log stream names (required)
  --output=FILE       Output CSV file path (default: ${DEFAULT_OUTPUT_FILE})
  --region=REGION     AWS region (default: ${DEFAULT_REGION})
  --verbose           Show detailed progress
  --help, -h          Show this help message

Examples:
  node scripts/fetch-log-streams.js --log-group=/aws/lambda/MyFunc --streams="2026/01/25/[$LATEST]abc123"
  node scripts/fetch-log-streams.js --log-group=/aws/lambda/MyFunc --streams="stream1,stream2" --output=my-logs.csv --verbose
    `);
    process.exit(0);
  }

  const options = {
    logGroup: null,
    streams: [],
    outputFile: DEFAULT_OUTPUT_FILE,
    region: DEFAULT_REGION,
    verbose: args.includes("--verbose"),
  };

  for (const arg of args) {
    if (arg.startsWith("--log-group=")) {
      options.logGroup = arg.split("=")[1];
    } else if (arg.startsWith("--streams=")) {
      const streamsArg = arg.split("=")[1];
      options.streams = streamsArg.split(",").map((s) => s.trim());
    } else if (arg.startsWith("--output=")) {
      options.outputFile = arg.split("=")[1];
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
    }
  }

  if (!options.logGroup) {
    console.error("❌ Error: Log group is required");
    console.error("   Use --log-group=NAME");
    process.exit(1);
  }

  if (options.streams.length === 0) {
    console.error("❌ Error: At least one log stream is required");
    console.error('   Use --streams="stream1,stream2"');
    process.exit(1);
  }

  return options;
}

/**
 * Get CloudWatch Logs client
 */
function getCloudWatchLogsClient(region) {
  return new CloudWatchLogsClient({ region });
}

/**
 * Escape CSV field (handle quotes and commas)
 */
function escapeCsvField(field) {
  if (field === null || field === undefined) {
    return "";
  }
  const stringField = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (
    stringField.includes(",") ||
    stringField.includes('"') ||
    stringField.includes("\n")
  ) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

/**
 * Fetch all events from a log stream
 */
async function fetchLogStreamEvents(
  client,
  logGroup,
  streamName,
  verbose = false,
) {
  const events = [];
  let nextToken = null;
  let isFirstRequest = true;
  let requestCount = 0;

  if (verbose) {
    console.info(`  📥 Fetching logs from stream: ${streamName}`);
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

      const command = new GetLogEventsCommand(params);
      const response = await client.send(command);

      if (!response.events || response.events.length === 0) {
        if (verbose && events.length === 0) {
          console.info(`     ⚠️  Stream is empty or does not exist`);
        }
        break;
      }

      events.push(...response.events);

      if (verbose && requestCount % 5 === 0) {
        console.info(`     Fetched ${events.length} events so far...`);
      }

      // Check for pagination
      const prevToken = nextToken;
      nextToken = response.nextForwardToken;

      // If token is same or no more events, we're done
      if (!nextToken || nextToken === prevToken) {
        break;
      }

      isFirstRequest = false;

      // Small delay to avoid rate limiting
      if (requestCount % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (verbose) {
      console.info(`     ✅ Fetched ${events.length} total events`);
    }

    return events;
  } catch (error) {
    console.error(`     ❌ Error fetching stream: ${error.message}`);
    if (verbose) {
      console.error(error);
    }
    return [];
  }
}

/**
 * Write events to CSV file
 */
async function writeEventsToCsv(outputFile, streamName, events) {
  const rows = events.map((event) => {
    const timestamp = event.timestamp || "";
    const message = event.message || "";
    return `${timestamp},${escapeCsvField(streamName)},${escapeCsvField(message)}`;
  });

  return rows;
}

/**
 * Main function
 */
async function main() {
  console.info("📊 CloudWatch Log Streams Fetcher\n");

  const options = parseArgs();

  // Validate AWS credentials (basic check)
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
    console.warn(
      "⚠️  Warning: AWS credentials not found. Ensure AWS credentials are configured.",
    );
  }

  console.info("Configuration:");
  console.info(`  Log Group: ${options.logGroup}`);
  console.info(`  Streams: ${options.streams.length}`);
  console.info(`  Output File: ${options.outputFile}`);
  console.info(`  Region: ${options.region}`);
  console.info(`  Verbose: ${options.verbose}\n`);

  try {
    // Get CloudWatch Logs client
    const client = getCloudWatchLogsClient(options.region);

    // Create output file with header
    const writeStream = createWriteStream(options.outputFile);
    writeStream.write("timestamp,logStreamName,message\n");

    let totalEvents = 0;
    let totalStreams = 0;

    console.info(
      `📥 Fetching logs from ${options.streams.length} stream(s)...\n`,
    );

    // Process each stream
    for (const streamName of options.streams) {
      const events = await fetchLogStreamEvents(
        client,
        options.logGroup,
        streamName,
        options.verbose,
      );

      if (events.length > 0) {
        const csvRows = await writeEventsToCsv(
          options.outputFile,
          streamName,
          events,
        );
        csvRows.forEach((row) => writeStream.write(row + "\n"));

        totalEvents += events.length;
        totalStreams++;

        if (!options.verbose) {
          console.info(
            `  ✅ ${streamName}: ${events.length.toLocaleString()} events`,
          );
        }
      }
    }

    writeStream.end();

    // Wait for write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    console.info(
      "\n═══════════════════════════════════════════════════════════",
    );
    console.info("✅ Log Fetch Complete");
    console.info("═══════════════════════════════════════════════════════════");
    console.info(
      `  Streams Processed: ${totalStreams}/${options.streams.length}`,
    );
    console.info(`  Total Events: ${totalEvents.toLocaleString()}`);
    console.info(`  Output File: ${options.outputFile}`);
    console.info(
      "═══════════════════════════════════════════════════════════\n",
    );
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the script
main();
