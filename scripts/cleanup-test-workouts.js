#!/usr/bin/env node

/**
 * Cleanup Test Workouts Script
 *
 * This script queries all workouts from the past 2 weeks and deletes them.
 * Useful for cleaning up test data deployed across the system.
 *
 * Strategy:
 * - Query workouts for user from the past 2 weeks using get-workouts Lambda
 * - For each workout, call delete-workout Lambda to remove it
 * - Clean up both DynamoDB and Pinecone data
 *
 * Usage:
 *   node scripts/cleanup-test-workouts.js <userId> [options]
 *   node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik --weeks=2
 *
 * Authentication:
 *   This script invokes Lambda functions directly (bypassing API Gateway).
 *   The get-workouts and delete-workout handlers use allowInternalCalls: true
 *   in their withAuth middleware, enabling production-safe internal calls.
 *
 * Options:
 *   --weeks=N       Number of weeks to look back (default: 2)
 *   --dry-run       Show what would be deleted without actually deleting
 *   --auto-confirm  Skip confirmation prompt (use with caution!)
 *   --region=REGION AWS region (default: us-west-2)
 *   --get-workouts=NAME     Override Lambda function name for get-workouts
 *   --delete-workout=NAME   Override Lambda function name for delete-workout
 *   --verbose       Show detailed progress and responses
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import readline from "readline";

// Configuration
const DEFAULT_REGION = "us-west-2";
const DEFAULT_WEEKS = 2;

// Lambda function names (hardcoded for this deployment)
const LAMBDA_FUNCTION_NAMES = {
  getWorkouts:
    "amplify-neonpandaprotov1--getworkoutslambdaEAF152A-IdHGeN2OadmD",
  deleteWorkout:
    "amplify-neonpandaprotov1--deleteworkoutlambda15FBE-k79HpBzKYXAZ",
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
Cleanup Test Workouts Script

Usage:
  node scripts/cleanup-test-workouts.js <userId> [options]

Arguments:
  userId          The user ID to clean up workouts for (required)

Options:
  --weeks=N           Number of weeks to look back (default: ${DEFAULT_WEEKS})
  --dry-run           Show what would be deleted without actually deleting
  --auto-confirm      Skip confirmation prompt (use with caution!)
  --region=REGION     AWS region (default: ${DEFAULT_REGION})
  --get-workouts=NAME     Override Lambda function name for get-workouts (optional)
  --delete-workout=NAME   Override Lambda function name for delete-workout (optional)
  --verbose           Show detailed progress and responses
  --help, -h          Show this help message

Note: Lambda function names are pre-configured for this deployment.
      Use --get-workouts and --delete-workout only if you need to override them.

Examples:
  node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik --dry-run
  node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik --weeks=1
  node scripts/cleanup-test-workouts.js 63gocaz-j-AYRsb0094ik --auto-confirm --verbose
    `);
    process.exit(0);
  }

  const userId = args[0];
  if (!userId || userId.startsWith("--")) {
    console.error("❌ Error: userId is required as the first argument");
    console.error("   Run with --help for usage information");
    process.exit(1);
  }

  const options = {
    userId,
    weeks: DEFAULT_WEEKS,
    dryRun: args.includes("--dry-run"),
    autoConfirm: args.includes("--auto-confirm"),
    verbose: args.includes("--verbose"),
    region: DEFAULT_REGION,
    getWorkoutsFunction: LAMBDA_FUNCTION_NAMES.getWorkouts,
    deleteWorkoutFunction: LAMBDA_FUNCTION_NAMES.deleteWorkout,
  };

  for (const arg of args.slice(1)) {
    if (arg.startsWith("--weeks=")) {
      const weeks = parseInt(arg.split("=")[1]);
      if (isNaN(weeks) || weeks < 1) {
        console.error("❌ Error: --weeks must be a positive number");
        process.exit(1);
      }
      options.weeks = weeks;
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
    } else if (arg.startsWith("--get-workouts=")) {
      options.getWorkoutsFunction = arg.split("=")[1];
    } else if (arg.startsWith("--delete-workout=")) {
      options.deleteWorkoutFunction = arg.split("=")[1];
    }
  }

  return options;
}

/**
 * Create an authenticated event for Lambda invocation
 *
 * Note: This bypasses API Gateway and invokes Lambda directly.
 * The Lambda handlers use allowInternalCalls: true in the withAuth middleware,
 * which allows direct Lambda-to-Lambda invocation by extracting the userId
 * from pathParameters and treating it as an authenticated internal call.
 *
 * This is production-safe as it's designed for admin/internal operations.
 */
function createAuthenticatedEvent(userId, eventData = {}) {
  return {
    // Path parameters for the handler (userId is used for internal auth)
    pathParameters: {
      userId,
      ...eventData.pathParameters,
    },
    // Query parameters if provided
    queryStringParameters: eventData.queryStringParameters || {},
    // Request context (minimal for direct invocation)
    requestContext: {
      http: {
        method: eventData.method || "GET",
      },
    },
  };
}

/**
 * Invoke Lambda function
 */
async function invokeLambda(client, functionName, payload) {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.Payload));

  // Handle Lambda error responses
  if (result.statusCode && result.statusCode !== 200) {
    const body =
      typeof result.body === "string" ? JSON.parse(result.body) : result.body;
    throw new Error(
      `Lambda returned ${result.statusCode}: ${body.error || body.message || "Unknown error"}`,
    );
  }

  // Parse body if it's a string (API Gateway format)
  if (result.body && typeof result.body === "string") {
    result.body = JSON.parse(result.body);
  }

  return result;
}

/**
 * Query workouts for the past N weeks
 */
async function queryWorkouts(client, functionName, userId, weeks, verbose) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - weeks * 7);

  const event = createAuthenticatedEvent(userId, {
    queryStringParameters: {
      fromDate: fromDate.toISOString(),
      limit: "100", // Max per request
      sortBy: "completedAt",
      sortOrder: "desc",
    },
  });

  if (verbose) {
    console.info("\n🔍 Querying workouts with parameters:", {
      userId,
      fromDate: fromDate.toISOString(),
      weeks,
    });
  }

  try {
    console.info(
      `\n📊 Querying workouts from the past ${weeks} week${weeks > 1 ? "s" : ""}...`,
    );
    const result = await invokeLambda(client, functionName, event);

    const body = result.body || result;
    const workouts = body.workouts || [];

    console.info(
      `✅ Found ${workouts.length} workout${workouts.length !== 1 ? "s" : ""}`,
    );

    if (verbose && workouts.length > 0) {
      console.info("\nWorkout summary:");
      workouts.forEach((w, i) => {
        console.info(
          `  ${i + 1}. ${w.workoutId} - ${w.workoutName || "Unnamed"} (${w.discipline || "unknown"}) - ${w.completedAt}`,
        );
      });
    }

    return workouts;
  } catch (error) {
    console.error("❌ Error querying workouts:", error.message);
    throw error;
  }
}

/**
 * Delete a single workout
 */
async function deleteWorkout(client, functionName, userId, workoutId, verbose) {
  const event = createAuthenticatedEvent(userId, {
    pathParameters: {
      workoutId,
    },
  });

  try {
    const result = await invokeLambda(client, functionName, event);

    if (verbose) {
      const body = result.body || result;
      console.info(
        `  ✅ Deleted: ${workoutId}`,
        body.pineconeCleanup ? "(Pinecone cleaned)" : "",
      );
    }

    return { success: true, workoutId };
  } catch (error) {
    console.error(`  ❌ Failed to delete ${workoutId}: ${error.message}`);
    return { success: false, workoutId, error: error.message };
  }
}

/**
 * Display workouts to be deleted
 */
function displayWorkouts(workouts) {
  console.info("\n═══════════════════════════════════════════════════════════");
  console.info("WORKOUTS TO DELETE");
  console.info("═══════════════════════════════════════════════════════════\n");

  if (workouts.length === 0) {
    console.info("✅ No workouts found. Nothing to delete.\n");
    return;
  }

  workouts.forEach((workout, i) => {
    console.info(`${i + 1}. ${workout.workoutId}`);
    console.info(`   Name: ${workout.workoutName || "Unnamed"}`);
    console.info(`   Discipline: ${workout.discipline || "unknown"}`);
    console.info(`   Completed: ${workout.completedAt || "unknown"}`);
    console.info(
      `   Duration: ${workout.duration ? `${workout.duration} minutes` : "unknown"}`,
    );
    if (workout.performanceMetrics) {
      const metrics = [];
      if (workout.performanceMetrics.intensity)
        metrics.push(`Intensity: ${workout.performanceMetrics.intensity}/10`);
      if (workout.performanceMetrics.perceived_exertion)
        metrics.push(
          `RPE: ${workout.performanceMetrics.perceived_exertion}/10`,
        );
      if (metrics.length > 0) {
        console.info(`   Metrics: ${metrics.join(", ")}`);
      }
    }
    console.info("");
  });

  console.info("═══════════════════════════════════════════════════════════");
  console.info(`Total workouts to delete: ${workouts.length}`);
  console.info("═══════════════════════════════════════════════════════════\n");
}

/**
 * Ask for user confirmation
 */
async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Delete all workouts
 */
async function deleteAllWorkouts(
  client,
  functionName,
  userId,
  workouts,
  verbose,
) {
  console.info("\n🗑️  Deleting workouts...\n");

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const workout of workouts) {
    const result = await deleteWorkout(
      client,
      functionName,
      userId,
      workout.workoutId,
      verbose,
    );

    if (result.success) {
      results.success++;
      if (!verbose) {
        // Show progress in non-verbose mode
        process.stdout.write(".");
      }
    } else {
      results.failed++;
      results.errors.push({
        workoutId: workout.workoutId,
        error: result.error,
      });
    }

    // Small delay to avoid throttling
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!verbose) {
    console.info(""); // New line after progress dots
  }

  console.info("\n═══════════════════════════════════════════════════════════");
  console.info(
    `✅ Successfully deleted: ${results.success} workout${results.success !== 1 ? "s" : ""}`,
  );
  if (results.failed > 0) {
    console.info(
      `❌ Failed to delete: ${results.failed} workout${results.failed !== 1 ? "s" : ""}`,
    );
    console.info("\nErrors:");
    results.errors.forEach((e) => {
      console.info(`  - ${e.workoutId}: ${e.error}`);
    });
  }
  console.info("═══════════════════════════════════════════════════════════\n");

  return results;
}

/**
 * Main function
 */
async function main() {
  console.info("🧹 Workout Cleanup Script\n");

  const options = parseArgs();

  console.info("Configuration:");
  console.info(`  User ID: ${options.userId}`);
  console.info(`  Weeks: ${options.weeks}`);
  console.info(`  Region: ${options.region}`);
  console.info(`  Dry Run: ${options.dryRun}`);
  console.info(`  Verbose: ${options.verbose}`);

  // Initialize AWS Lambda client
  const lambdaClient = new LambdaClient({ region: options.region });

  try {
    // Use hardcoded Lambda function names (can be overridden via CLI)
    const getWorkoutsFunction = options.getWorkoutsFunction;
    const deleteWorkoutFunction = options.deleteWorkoutFunction;

    console.info(`\n📋 Using Lambda functions:`);
    console.info(`   get-workouts: ${getWorkoutsFunction}`);
    console.info(`   delete-workout: ${deleteWorkoutFunction}`);

    // Query workouts
    const workouts = await queryWorkouts(
      lambdaClient,
      getWorkoutsFunction,
      options.userId,
      options.weeks,
      options.verbose,
    );

    if (workouts.length === 0) {
      console.info("\n✅ No workouts found. Nothing to delete.\n");
      return;
    }

    // Display workouts
    displayWorkouts(workouts);

    // Dry run - just show what would be deleted
    if (options.dryRun) {
      console.info("🔍 DRY RUN: No workouts were deleted");
      console.info("   Remove --dry-run flag to actually delete workouts\n");
      return;
    }

    // Confirm deletion
    if (!options.autoConfirm) {
      const confirmed = await confirm(
        `\n⚠️  Are you sure you want to delete ${workouts.length} workout${workouts.length !== 1 ? "s" : ""}? (y/N): `,
      );

      if (!confirmed) {
        console.info("\n❌ Deletion cancelled by user\n");
        return;
      }
    }

    // Delete workouts
    const results = await deleteAllWorkouts(
      lambdaClient,
      deleteWorkoutFunction,
      options.userId,
      workouts,
      options.verbose,
    );

    if (results.failed === 0) {
      console.info("✅ Cleanup complete! All workouts deleted successfully.\n");
    } else {
      console.info(
        "⚠️  Cleanup completed with some errors. Check the error list above.\n",
      );
      process.exit(1);
    }
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
