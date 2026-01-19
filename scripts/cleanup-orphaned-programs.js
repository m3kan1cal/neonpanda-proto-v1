#!/usr/bin/env node

/**
 * Cleanup Orphaned Programs Script
 *
 * This script fixes programs that reference coaches that no longer exist.
 * It can archive, delete, or reassign orphaned programs.
 *
 * Usage:
 *   node scripts/cleanup-orphaned-programs.js <userId> --table=<tableName> --action=<action>
 *
 * Actions:
 *   --action=archive     Archive orphaned programs (soft delete)
 *   --action=delete      Permanently delete orphaned programs
 *   --action=reassign    Reassign to another coach (requires --new-coach-id)
 *
 * Options:
 *   --table=NAME         DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
 *   --region=REGION      AWS region (default: us-west-2)
 *   --action=ACTION      Action to perform: archive, delete, or reassign
 *   --new-coach-id=ID    Coach ID to reassign orphaned programs to (for reassign action)
 *   --dry-run            Show what would be changed without actually changing
 *   --auto-confirm       Skip confirmation prompt (use with caution!)
 *   --verbose            Show detailed output
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import readline from "readline";

// Configuration
const DEFAULT_REGION = "us-west-2";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    userId: null,
    tableName: process.env.DYNAMODB_TABLE_NAME || null,
    region: DEFAULT_REGION,
    action: null,
    newCoachId: null,
    dryRun: false,
    autoConfirm: false,
    verbose: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--table=")) {
      options.tableName = arg.split("=")[1];
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
    } else if (arg.startsWith("--action=")) {
      options.action = arg.split("=")[1];
    } else if (arg.startsWith("--new-coach-id=")) {
      options.newCoachId = arg.split("=")[1];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--auto-confirm") {
      options.autoConfirm = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (!arg.startsWith("--") && !options.userId) {
      options.userId = arg;
    }
  }

  return options;
}

/**
 * Query all programs for a user using GSI1
 */
async function queryAllPrograms(docClient, tableName, userId) {
  const programs = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "gsi1",
      KeyConditionExpression:
        "gsi1pk = :gsi1pk AND begins_with(gsi1sk, :gsi1sk_prefix)",
      FilterExpression: "#entityType = :entityType",
      ExpressionAttributeNames: {
        "#entityType": "entityType",
      },
      ExpressionAttributeValues: {
        ":gsi1pk": `user#${userId}`,
        ":gsi1sk_prefix": "program#",
        ":entityType": "program",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await docClient.send(command);
    programs.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return programs;
}

/**
 * Query all coaches for a user
 */
async function queryAllCoaches(docClient, tableName, userId) {
  const coaches = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk_prefix)",
      FilterExpression: "#entityType = :entityType",
      ExpressionAttributeNames: {
        "#entityType": "entityType",
      },
      ExpressionAttributeValues: {
        ":pk": `user#${userId}`,
        ":sk_prefix": "coach#",
        ":entityType": "coachConfig",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await docClient.send(command);
    coaches.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return coaches;
}

/**
 * Archive a program (set status to 'archived')
 */
async function archiveProgram(docClient, tableName, program, dryRun) {
  const pk = program.pk;
  const sk = program.sk;

  if (dryRun) {
    console.info(`   [DRY RUN] Would archive program: ${pk} / ${sk}`);
    return true;
  }

  const command = new UpdateCommand({
    TableName: tableName,
    Key: { pk, sk },
    UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      "#status": "attributes.status",
      "#updatedAt": "updatedAt",
    },
    ExpressionAttributeValues: {
      ":status": "archived",
      ":updatedAt": new Date().toISOString(),
    },
    ConditionExpression: "attribute_exists(pk)",
  });

  await docClient.send(command);
  return true;
}

/**
 * Delete a program permanently
 */
async function deleteProgram(docClient, tableName, program, dryRun) {
  const pk = program.pk;
  const sk = program.sk;

  if (dryRun) {
    console.info(`   [DRY RUN] Would delete program: ${pk} / ${sk}`);
    return true;
  }

  const command = new DeleteCommand({
    TableName: tableName,
    Key: { pk, sk },
    ConditionExpression: "attribute_exists(pk)",
  });

  await docClient.send(command);
  return true;
}

/**
 * Reassign a program to a new coach
 */
async function reassignProgram(
  docClient,
  tableName,
  program,
  newCoachId,
  newCoachName,
  dryRun,
) {
  const pk = program.pk;
  const sk = program.sk;

  if (dryRun) {
    console.info(
      `   [DRY RUN] Would reassign program ${pk} / ${sk} to coach ${newCoachId}`,
    );
    return true;
  }

  const command = new UpdateCommand({
    TableName: tableName,
    Key: { pk, sk },
    UpdateExpression:
      "SET #coachIds = :coachIds, #coachNames = :coachNames, #updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      "#coachIds": "attributes.coachIds",
      "#coachNames": "attributes.coachNames",
      "#updatedAt": "updatedAt",
    },
    ExpressionAttributeValues: {
      ":coachIds": [newCoachId],
      ":coachNames": [newCoachName],
      ":updatedAt": new Date().toISOString(),
    },
    ConditionExpression: "attribute_exists(pk)",
  });

  await docClient.send(command);
  return true;
}

/**
 * Prompt for confirmation
 */
function promptConfirmation(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  // Validate required arguments
  if (!options.userId) {
    console.error("❌ Error: userId is required");
    console.error(
      "Usage: node scripts/cleanup-orphaned-programs.js <userId> --table=<tableName> --action=<action>",
    );
    process.exit(1);
  }

  if (!options.tableName) {
    console.error("❌ Error: table name is required");
    console.error(
      "Provide --table=<tableName> or set DYNAMODB_TABLE_NAME env var",
    );
    process.exit(1);
  }

  if (!options.action) {
    console.error("❌ Error: action is required");
    console.error(
      "Use --action=archive, --action=delete, or --action=reassign",
    );
    process.exit(1);
  }

  if (!["archive", "delete", "reassign"].includes(options.action)) {
    console.error(`❌ Error: Invalid action "${options.action}"`);
    console.error("Valid actions: archive, delete, reassign");
    process.exit(1);
  }

  if (options.action === "reassign" && !options.newCoachId) {
    console.error("❌ Error: --new-coach-id is required for reassign action");
    process.exit(1);
  }

  console.info("\n========================================");
  console.info("  ORPHANED PROGRAMS CLEANUP TOOL");
  console.info("========================================\n");

  console.info(`📋 Configuration:`);
  console.info(`   User ID:        ${options.userId}`);
  console.info(`   Table:          ${options.tableName}`);
  console.info(`   Region:         ${options.region}`);
  console.info(`   Action:         ${options.action}`);
  console.info(`   Dry Run:        ${options.dryRun ? "Yes" : "No"}`);
  if (options.newCoachId) {
    console.info(`   New Coach ID:   ${options.newCoachId}`);
  }
  console.info("");

  // Initialize DynamoDB client
  const client = new DynamoDBClient({ region: options.region });
  const docClient = DynamoDBDocumentClient.from(client);

  try {
    // Step 1: Query all programs and coaches
    console.info("🔍 Querying programs and coaches...");
    const [programs, coaches] = await Promise.all([
      queryAllPrograms(docClient, options.tableName, options.userId),
      queryAllCoaches(docClient, options.tableName, options.userId),
    ]);

    console.info(`   Found ${programs.length} programs`);
    console.info(`   Found ${coaches.length} coaches\n`);

    // Extract valid coach IDs
    const validCoachIds = new Set(
      coaches.map((c) => c.attributes?.coach_id || c.coach_id),
    );

    // If reassigning, verify the new coach exists
    let newCoachName = null;
    if (options.action === "reassign") {
      if (!validCoachIds.has(options.newCoachId)) {
        console.error(
          `❌ Error: New coach ID "${options.newCoachId}" does not exist`,
        );
        console.error("Valid coach IDs:");
        for (const coachId of validCoachIds) {
          console.error(`   - ${coachId}`);
        }
        process.exit(1);
      }

      const newCoach = coaches.find(
        (c) => (c.attributes?.coach_id || c.coach_id) === options.newCoachId,
      );
      newCoachName =
        newCoach?.attributes?.coach_name || newCoach?.coach_name || "Unknown";
    }

    // Find orphaned programs
    const orphanedPrograms = [];

    for (const program of programs) {
      const attrs = program.attributes || program;
      const coachIds = attrs.coachIds || [];

      if (!coachIds || coachIds.length === 0) {
        orphanedPrograms.push(program);
        continue;
      }

      const invalidCoachIds = coachIds.filter((id) => !validCoachIds.has(id));
      if (invalidCoachIds.length > 0) {
        orphanedPrograms.push(program);
      }
    }

    if (orphanedPrograms.length === 0) {
      console.info("✅ No orphaned programs found. Nothing to clean up.\n");
      return;
    }

    console.info(`⚠️  Found ${orphanedPrograms.length} orphaned program(s):\n`);

    for (const program of orphanedPrograms) {
      const attrs = program.attributes || program;
      console.info(`   - ${attrs.name || "Unnamed"}`);
      console.info(`     ID:        ${attrs.programId}`);
      console.info(`     Status:    ${attrs.status}`);
      console.info(
        `     Coach IDs: ${(attrs.coachIds || []).join(", ") || "None"}`,
      );
      console.info("");
    }

    // Confirm action
    if (!options.autoConfirm && !options.dryRun) {
      let confirmMessage;
      switch (options.action) {
        case "archive":
          confirmMessage = `Archive ${orphanedPrograms.length} orphaned program(s)?`;
          break;
        case "delete":
          confirmMessage = `PERMANENTLY DELETE ${orphanedPrograms.length} orphaned program(s)?`;
          break;
        case "reassign":
          confirmMessage = `Reassign ${orphanedPrograms.length} orphaned program(s) to coach "${newCoachName}" (${options.newCoachId})?`;
          break;
      }

      const confirmed = await promptConfirmation(confirmMessage);
      if (!confirmed) {
        console.info("\n❌ Operation cancelled.\n");
        return;
      }
    }

    // Execute the action
    console.info(`\n🔧 Executing ${options.action}...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const program of orphanedPrograms) {
      const attrs = program.attributes || program;
      try {
        switch (options.action) {
          case "archive":
            await archiveProgram(
              docClient,
              options.tableName,
              program,
              options.dryRun,
            );
            console.info(`   ✅ Archived: ${attrs.name || attrs.programId}`);
            break;
          case "delete":
            await deleteProgram(
              docClient,
              options.tableName,
              program,
              options.dryRun,
            );
            console.info(`   ✅ Deleted: ${attrs.name || attrs.programId}`);
            break;
          case "reassign":
            await reassignProgram(
              docClient,
              options.tableName,
              program,
              options.newCoachId,
              newCoachName,
              options.dryRun,
            );
            console.info(`   ✅ Reassigned: ${attrs.name || attrs.programId}`);
            break;
        }
        successCount++;
      } catch (error) {
        console.info(
          `   ❌ Error: ${attrs.name || attrs.programId} - ${error.message}`,
        );
        errorCount++;
      }
    }

    console.info("\n========================================");
    console.info("  RESULTS");
    console.info("========================================\n");
    console.info(`   Successful: ${successCount}`);
    console.info(`   Errors:     ${errorCount}`);
    console.info(`   Total:      ${orphanedPrograms.length}`);

    if (options.dryRun) {
      console.info("\n⚠️  DRY RUN - No changes were made.\n");
      console.info("Remove --dry-run to apply changes.\n");
    } else {
      console.info("\n✅ Cleanup complete.\n");
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
