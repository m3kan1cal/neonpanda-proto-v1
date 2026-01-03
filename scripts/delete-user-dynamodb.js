#!/usr/bin/env node

/**
 * Delete User DynamoDB Records Script
 *
 * This script completely deletes all DynamoDB records for a user by removing all items
 * with partition key pk="user#${userId}". Useful for resetting a user's data to a clean state.
 *
 * Strategy:
 * - Query all records for the user (pk="user#${userId}")
 * - Group records by entityType to show what will be deleted
 * - Optionally list record types before deletion
 * - Delete all records for the user
 * - Verify deletion by querying again
 *
 * Usage:
 *   node scripts/delete-user-dynamodb.js <userId> --table=<tableName>
 *   node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=NeonPanda-ProtoApi-AllItems-V2
 *
 * Options:
 *   --table=NAME    DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
 *   --region=REGION AWS region (default: us-west-2)
 *   --dry-run       Show what would be deleted without actually deleting
 *   --auto-confirm  Skip confirmation prompt (use with caution!)
 *   --verbose       Show detailed progress and responses
 *   --list-types    List record types before deletion
 *   --exclude-types=TYPES Comma-separated list of entity types to exclude from deletion
 *                        (default: user,subscription)
 *                        (e.g., --exclude-types=user,subscription,coachConfig)
 *   --include-types=TYPES Comma-separated list of entity types to include (only delete these)
 *                        If specified, only these types will be deleted (exclusions still apply)
 *                        (e.g., --include-types=userMemory,workout)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
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

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
Delete User DynamoDB Records Script

Usage:
  node scripts/delete-user-dynamodb.js <userId> [options]

Arguments:
  userId          The user ID to delete records for (required)

Options:
  --table=NAME    DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
  --region=REGION AWS region (default: ${DEFAULT_REGION})
  --dry-run       Show what would be deleted without actually deleting
  --auto-confirm  Skip confirmation prompt (use with caution!)
  --verbose       Show detailed progress and responses
  --list-types    List record types before deletion
  --exclude-types=TYPES Comma-separated list of entity types to exclude from deletion
                        (default: user,subscription)
                        (e.g., --exclude-types=user,subscription,coachConfig)
  --include-types=TYPES Comma-separated list of entity types to include (only delete these)
                        If specified, only these types will be deleted (exclusions still apply)
                        (e.g., --include-types=userMemory,workout)
  --help, -h      Show this help message

Examples:
  node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable --dry-run
  node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable --list-types
  node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable --exclude-types=user,subscription
  node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable --include-types=userMemory --dry-run
  node scripts/delete-user-dynamodb.js 63gocaz-j-AYRsb0094ik --table=MyTable --auto-confirm --verbose
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
    tableName: process.env.DYNAMODB_TABLE_NAME || null,
    region: DEFAULT_REGION,
    dryRun: args.includes("--dry-run"),
    autoConfirm: args.includes("--auto-confirm"),
    verbose: args.includes("--verbose"),
    listTypes: args.includes("--list-types"),
    excludeTypes: ["user", "subscription"], // Default excluded types
    includeTypes: [], // If specified, only delete these types
  };

  for (const arg of args.slice(1)) {
    if (arg.startsWith("--table=")) {
      options.tableName = arg.split("=")[1];
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
    } else if (arg.startsWith("--exclude-types=")) {
      const types = arg.split("=")[1];
      options.excludeTypes = types.split(",").map((t) => t.trim());
    } else if (arg.startsWith("--include-types=")) {
      const types = arg.split("=")[1];
      options.includeTypes = types.split(",").map((t) => t.trim());
    }
  }

  if (!options.tableName) {
    console.error("❌ Error: Table name is required");
    console.error(
      "   Use --table=NAME or set DYNAMODB_TABLE_NAME environment variable",
    );
    process.exit(1);
  }

  return options;
}

/**
 * Get DynamoDB client
 */
function getDynamoDBClient(region) {
  const client = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(client);
}

/**
 * Query all records for a user
 */
async function queryUserRecords(docClient, tableName, userId) {
  try {
    const pk = `user#${userId}`;
    const allItems = [];
    let lastEvaluatedKey = undefined;

    do {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": pk,
        },
      });

      if (lastEvaluatedKey) {
        command.input.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.send(command);
      if (result.Items) {
        allItems.push(...result.Items);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  } catch (error) {
    console.error("❌ Error querying user records:", error.message);
    throw error;
  }
}

/**
 * Group records by entityType
 */
function groupRecordsByType(items) {
  const typeGroups = new Map();

  items.forEach((item) => {
    const entityType = item.entityType || "MISSING_ENTITY_TYPE";
    const sk = item.sk || "MISSING_SK";

    if (!typeGroups.has(entityType)) {
      typeGroups.set(entityType, {
        type: entityType,
        count: 0,
        sampleKeys: [],
      });
    }

    const group = typeGroups.get(entityType);
    group.count++;
    if (group.sampleKeys.length < 10) {
      group.sampleKeys.push(sk);
    }
  });

  return Array.from(typeGroups.values()).sort((a, b) => b.count - a.count);
}

/**
 * Filter items by excluding/including specified entity types
 */
function filterItems(items, excludeTypes, includeTypes = []) {
  return items.filter((item) => {
    const entityType = item.entityType || "MISSING_ENTITY_TYPE";

    // First apply exclusions (always respected)
    if (
      excludeTypes &&
      excludeTypes.length > 0 &&
      excludeTypes.includes(entityType)
    ) {
      return false;
    }

    // Then apply inclusions (if specified, only include these types)
    if (includeTypes && includeTypes.length > 0) {
      return includeTypes.includes(entityType);
    }

    // If no inclusions specified, include all non-excluded items
    return true;
  });
}

/**
 * Display user records information
 */
function displayUserRecords(
  userId,
  items,
  recordTypes,
  excludeTypes = [],
  includeTypes = [],
) {
  console.info("\n═══════════════════════════════════════════════════════════");
  console.info("USER RECORDS TO DELETE");
  console.info("═══════════════════════════════════════════════════════════\n");

  console.info(`User ID: ${userId}`);
  console.info(`Partition Key: user#${userId}`);
  console.info(`Total Records: ${items.length.toLocaleString()}`);

  const filteredItems = filterItems(items, excludeTypes, includeTypes);
  const excludedItems = items.filter((item) => {
    const entityType = item.entityType || "MISSING_ENTITY_TYPE";
    return excludeTypes.includes(entityType);
  });
  const includedItems =
    includeTypes.length > 0
      ? items.filter((item) =>
          includeTypes.includes(item.entityType || "MISSING_ENTITY_TYPE"),
        )
      : null;

  if (excludeTypes.length > 0 || includeTypes.length > 0) {
    if (excludeTypes.length > 0) {
      console.info(`Excluded Types: ${excludeTypes.join(", ")}`);
    }
    if (includeTypes.length > 0) {
      console.info(`Included Types (only these): ${includeTypes.join(", ")}`);
    }
    console.info(`Records to Delete: ${filteredItems.length.toLocaleString()}`);
    if (excludedItems.length > 0) {
      console.info(
        `Records Excluded: ${excludedItems.length.toLocaleString()}`,
      );
    }
    if (includedItems && includedItems.length !== filteredItems.length) {
      console.info(
        `Records Matching Include Filter: ${includedItems.length.toLocaleString()}`,
      );
    }
  }

  if (recordTypes && recordTypes.length > 0) {
    console.info("\nRecord Types:");
    recordTypes.forEach((typeInfo) => {
      const percentage = ((typeInfo.count / items.length) * 100).toFixed(1);
      const isExcluded = excludeTypes.includes(typeInfo.type);
      const isIncluded =
        includeTypes.length > 0 && includeTypes.includes(typeInfo.type);
      let marker = "";
      if (isExcluded) {
        marker = " ⚠️  (EXCLUDED)";
      } else if (isIncluded) {
        marker = " ✅ (INCLUDED)";
      } else if (includeTypes.length > 0) {
        marker = " ⏭️  (SKIPPED - not in include list)";
      }
      console.info(
        `  - ${typeInfo.type}: ${typeInfo.count} (${percentage}%)${marker}`,
      );
      if (typeInfo.sampleKeys.length > 0) {
        console.info(
          `    Sample SKs: ${typeInfo.sampleKeys.slice(0, 3).join(", ")}`,
        );
        if (typeInfo.sampleKeys.length > 3) {
          console.info(`    ... and ${typeInfo.sampleKeys.length - 3} more`);
        }
      }
    });
  }

  console.info(
    "\n═══════════════════════════════════════════════════════════\n",
  );
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
 * Delete all records for a user
 */
async function deleteUserRecords(docClient, tableName, userId, items, verbose) {
  try {
    console.info(`\n🗑️  Deleting records for user: ${userId}...`);

    const pk = `user#${userId}`;
    let deletedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const item of items) {
      try {
        const command = new DeleteCommand({
          TableName: tableName,
          Key: {
            pk: pk,
            sk: item.sk,
          },
          ConditionExpression: "attribute_exists(pk)", // Safety check
        });

        await docClient.send(command);
        deletedCount++;

        if (verbose && deletedCount % 10 === 0) {
          process.stdout.write(".");
        }
      } catch (error) {
        failedCount++;
        errors.push({
          sk: item.sk,
          error: error.message,
        });

        if (verbose) {
          console.error(`  ❌ Failed to delete ${item.sk}: ${error.message}`);
        }
      }

      // Small delay to avoid throttling
      if (deletedCount % 25 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    if (verbose && deletedCount > 0) {
      console.info(""); // New line after progress dots
    }

    return {
      success: failedCount === 0,
      deletedCount,
      failedCount,
      errors,
    };
  } catch (error) {
    console.error(`  ❌ Failed to delete user records: ${error.message}`);
    return {
      success: false,
      deletedCount: 0,
      failedCount: items.length,
      errors: [{ error: error.message }],
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.info("🗑️  DynamoDB User Records Deletion Script\n");

  const options = parseArgs();

  // Validate AWS credentials (basic check)
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
    console.warn(
      "⚠️  Warning: AWS credentials not found. Ensure AWS credentials are configured.",
    );
  }

  console.info("Configuration:");
  console.info(`  User ID: ${options.userId}`);
  console.info(`  Table: ${options.tableName}`);
  console.info(`  Region: ${options.region}`);
  console.info(`  Dry Run: ${options.dryRun}`);
  console.info(`  Verbose: ${options.verbose}`);
  console.info(`  List Types: ${options.listTypes}`);
  if (options.excludeTypes.length > 0) {
    console.info(`  Exclude Types: ${options.excludeTypes.join(", ")}`);
  }
  if (options.includeTypes.length > 0) {
    console.info(`  Include Types: ${options.includeTypes.join(", ")}`);
  }

  try {
    // Get DynamoDB client
    const docClient = getDynamoDBClient(options.region);

    // Query all user records
    console.info(`\n📊 Querying records for user: ${options.userId}...`);
    const items = await queryUserRecords(
      docClient,
      options.tableName,
      options.userId,
    );

    if (items.length === 0) {
      console.info(
        `\n✅ No records found for user "${options.userId}". Nothing to delete.\n`,
      );
      return;
    }

    console.info(
      `✅ Found ${items.length} record${items.length !== 1 ? "s" : ""}`,
    );

    // Group by entity type
    const recordTypes = groupRecordsByType(items);

    // Optionally list record types
    if (options.listTypes) {
      console.info("\n📋 Record Types:");
      recordTypes.forEach((typeInfo) => {
        const percentage = ((typeInfo.count / items.length) * 100).toFixed(1);
        console.info(`  ${typeInfo.type}: ${typeInfo.count} (${percentage}%)`);
      });
    }

    // Filter items to exclude/include specified types
    const itemsToDelete = filterItems(
      items,
      options.excludeTypes,
      options.includeTypes,
    );
    const excludedCount = items.length - itemsToDelete.length;

    // Display user records info
    displayUserRecords(
      options.userId,
      items,
      recordTypes,
      options.excludeTypes,
      options.includeTypes,
    );

    if (itemsToDelete.length === 0) {
      console.info(
        `\n✅ No records to delete (all records are excluded or namespace is empty).\n`,
      );
      return;
    }

    // Dry run - just show what would be deleted
    if (options.dryRun) {
      console.info("🔍 DRY RUN: No records were deleted");
      console.info("   Remove --dry-run flag to actually delete the records\n");
      return;
    }

    // Confirm deletion
    if (!options.autoConfirm) {
      let confirmMessage = `\n⚠️  Are you sure you want to delete ${itemsToDelete.length.toLocaleString()} record${itemsToDelete.length !== 1 ? "s" : ""} for user "${options.userId}"?`;
      if (excludedCount > 0) {
        confirmMessage += `\n   (${excludedCount} record${excludedCount !== 1 ? "s" : ""} will be excluded)`;
      }
      confirmMessage += `\n   This action cannot be undone! (y/N): `;

      const confirmed = await confirm(confirmMessage);

      if (!confirmed) {
        console.info("\n❌ Deletion cancelled by user\n");
        return;
      }
    }

    // Delete records
    const result = await deleteUserRecords(
      docClient,
      options.tableName,
      options.userId,
      itemsToDelete,
      options.verbose,
    );

    if (result.success) {
      console.info(
        "\n═══════════════════════════════════════════════════════════",
      );
      console.info(
        `✅ Successfully deleted ${result.deletedCount.toLocaleString()} record${result.deletedCount !== 1 ? "s" : ""}`,
      );
      console.info("   All user records have been removed from DynamoDB");
      console.info(
        "═══════════════════════════════════════════════════════════\n",
      );
    } else {
      console.error("\n❌ Deletion completed with errors:");
      console.error(`   Deleted: ${result.deletedCount}`);
      console.error(`   Failed: ${result.failedCount}`);
      if (result.errors.length > 0) {
        console.error("\nErrors:");
        result.errors.slice(0, 10).forEach((e) => {
          console.error(`   - ${e.sk || "unknown"}: ${e.error}`);
        });
        if (result.errors.length > 10) {
          console.error(`   ... and ${result.errors.length - 10} more errors`);
        }
      }
      process.exit(1);
    }

    // Verify deletion
    if (options.verbose) {
      console.info("🔍 Verifying deletion...");
      const remainingItems = await queryUserRecords(
        docClient,
        options.tableName,
        options.userId,
      );
      if (remainingItems.length === 0) {
        console.info("✅ Verification: All records deleted successfully\n");
      } else {
        console.warn(
          `⚠️  Verification: ${remainingItems.length} records still remain\n`,
        );
      }
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
