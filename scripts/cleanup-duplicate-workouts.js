#!/usr/bin/env node

/**
 * Cleanup Duplicate Workouts Script
 *
 * Finds and removes duplicate workouts for a user by identifying multiple
 * workouts with the same conversationId + completedAt date combination.
 * Keeps the oldest workout (first logged) and deletes subsequent duplicates.
 *
 * Usage:
 *   node scripts/cleanup-duplicate-workouts.js <userId> [options]
 *
 * Options:
 *   --dry-run           Show what would be deleted without actually deleting
 *   --auto-confirm      Skip confirmation prompt
 *   --region=REGION     AWS region (default: us-west-2)
 *   --get-workouts=NAME     Override get-workouts Lambda function name
 *   --delete-workout=NAME   Override delete-workout Lambda function name
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import readline from "readline";

const DEFAULT_REGION = "us-west-2";

const LAMBDA_FUNCTION_NAMES = {
  getWorkouts:
    "amplify-neonpandaprotov1--getworkoutslambdaEAF152A-IdHGeN2OadmD",
  deleteWorkout:
    "amplify-neonpandaprotov1--deleteworkoutlambda15FBE-k79HpBzKYXAZ",
};

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
Cleanup Duplicate Workouts Script

Usage:
  node scripts/cleanup-duplicate-workouts.js <userId> [options]

Arguments:
  userId          The user ID to scan for duplicate workouts (required)

Options:
  --dry-run           Show what would be deleted without actually deleting
  --auto-confirm      Skip confirmation prompt
  --region=REGION     AWS region (default: ${DEFAULT_REGION})
  --get-workouts=NAME     Override get-workouts Lambda function name
  --delete-workout=NAME   Override delete-workout Lambda function name
  --help, -h          Show this help message

Examples:
  node scripts/cleanup-duplicate-workouts.js Ag3kacNYlJahVlIZdbQ63 --dry-run
  node scripts/cleanup-duplicate-workouts.js Ag3kacNYlJahVlIZdbQ63
    `);
    process.exit(0);
  }

  const userId = args[0];
  const options = {
    dryRun: args.includes("--dry-run"),
    autoConfirm: args.includes("--auto-confirm"),
    region: DEFAULT_REGION,
    getWorkoutsFunction: LAMBDA_FUNCTION_NAMES.getWorkouts,
    deleteWorkoutFunction: LAMBDA_FUNCTION_NAMES.deleteWorkout,
  };

  for (const arg of args) {
    if (arg.startsWith("--region=")) options.region = arg.split("=")[1];
    if (arg.startsWith("--get-workouts="))
      options.getWorkoutsFunction = arg.split("=")[1];
    if (arg.startsWith("--delete-workout="))
      options.deleteWorkoutFunction = arg.split("=")[1];
  }

  return { userId, options };
}

async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function invokeLambda(client, functionName, payload) {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: new TextEncoder().encode(JSON.stringify(payload)),
  });

  const response = await client.send(command);
  const responsePayload = JSON.parse(
    new TextDecoder().decode(response.Payload),
  );

  if (response.FunctionError) {
    throw new Error(
      `Lambda error: ${responsePayload.errorMessage || response.FunctionError}`,
    );
  }

  if (responsePayload.statusCode && responsePayload.statusCode >= 400) {
    throw new Error(
      `API error (${responsePayload.statusCode}): ${JSON.stringify(responsePayload.body)}`,
    );
  }

  return typeof responsePayload.body === "string"
    ? JSON.parse(responsePayload.body)
    : responsePayload.body || responsePayload;
}

function findDuplicates(workouts) {
  // Group by conversationId + completedAt date
  const groups = new Map();

  for (const workout of workouts) {
    const dateOnly = new Date(workout.completedAt).toISOString().split("T")[0];
    const key = `${workout.conversationId}::${dateOnly}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(workout);
  }

  // Find groups with more than one workout (duplicates)
  const duplicateGroups = [];
  for (const [key, group] of groups) {
    if (group.length > 1) {
      // Sort by createdAt ascending — keep the oldest (first logged)
      group.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      duplicateGroups.push({
        key,
        keep: group[0],
        remove: group.slice(1),
      });
    }
  }

  return duplicateGroups;
}

async function main() {
  const { userId, options } = parseArgs();

  console.info(`\n--- Cleanup Duplicate Workouts ---`);
  console.info(`User ID: ${userId}`);
  console.info(`Region:  ${options.region}`);
  console.info(`Mode:    ${options.dryRun ? "DRY RUN" : "LIVE"}\n`);

  const client = new LambdaClient({ region: options.region });

  // Fetch all workouts for the user
  console.info("Fetching workouts...");
  const result = await invokeLambda(client, options.getWorkoutsFunction, {
    requestContext: { http: { method: "GET" } },
    rawPath: `/users/${userId}/workouts`,
    headers: { "x-internal-call": "true" },
  });

  const workouts = result.workouts || result || [];
  console.info(`Found ${workouts.length} total workouts.\n`);

  if (workouts.length === 0) {
    console.info("No workouts found. Nothing to clean up.");
    process.exit(0);
  }

  // Identify duplicates
  const duplicateGroups = findDuplicates(workouts);

  if (duplicateGroups.length === 0) {
    console.info("No duplicate workouts found. Everything looks clean.");
    process.exit(0);
  }

  // Display findings
  let totalToRemove = 0;
  for (const group of duplicateGroups) {
    const [convId, date] = group.key.split("::");
    console.info(`Duplicate group: ${convId} on ${date}`);
    console.info(
      `  KEEP:   ${group.keep.workoutId} (created ${group.keep.createdAt})`,
    );
    console.info(
      `          "${group.keep.workoutData?.workout_name || group.keep.workoutName || "Unnamed"}"`,
    );
    for (const dup of group.remove) {
      console.info(`  DELETE: ${dup.workoutId} (created ${dup.createdAt})`);
      console.info(
        `          "${dup.workoutData?.workout_name || dup.workoutName || "Unnamed"}"`,
      );
      totalToRemove++;
    }
    console.info("");
  }

  console.info(
    `Summary: ${duplicateGroups.length} duplicate group(s), ${totalToRemove} workout(s) to remove.\n`,
  );

  if (options.dryRun) {
    console.info("DRY RUN — no changes made.");
    process.exit(0);
  }

  // Confirm deletion
  if (!options.autoConfirm) {
    const confirmed = await confirm(
      `Delete ${totalToRemove} duplicate workout(s)?`,
    );
    if (!confirmed) {
      console.info("Cancelled.");
      process.exit(0);
    }
  }

  // Delete duplicates
  let deleted = 0;
  let failed = 0;

  for (const group of duplicateGroups) {
    for (const dup of group.remove) {
      try {
        await invokeLambda(client, options.deleteWorkoutFunction, {
          requestContext: { http: { method: "DELETE" } },
          rawPath: `/users/${userId}/workouts/${dup.workoutId}`,
          headers: { "x-internal-call": "true" },
        });
        deleted++;
        console.info(`  Deleted: ${dup.workoutId}`);
      } catch (error) {
        failed++;
        console.error(`  Failed to delete ${dup.workoutId}: ${error.message}`);
      }
    }
  }

  console.info(`\nDone. Deleted: ${deleted}, Failed: ${failed}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
