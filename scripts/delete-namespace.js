#!/usr/bin/env node

/**
 * Delete Namespace Script
 *
 * This script completely deletes a Pinecone namespace by removing all records.
 * In Pinecone, deleting all records effectively removes the namespace (empty
 * namespaces don't exist). Useful for resetting a user namespace to a clean state.
 *
 * Strategy:
 * - Get namespace stats to show what will be deleted
 * - Optionally list record types (using list-namespace-record-types logic)
 * - Delete namespace directly (using deleteAll() which effectively removes it)
 * - Verify namespace is gone by checking stats
 *
 * Note: Pinecone namespaces are removed when all records are deleted.
 * The deleteAll() method effectively deletes the namespace.
 *
 * Usage:
 *   node scripts/delete-namespace.js <namespace>
 *   node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik
 *
 * Options:
 *   --index=NAME    Pinecone index name (default: coach-creator-proto-v1-dev)
 *   --dry-run       Show what would be deleted without actually deleting
 *   --auto-confirm  Skip confirmation prompt (use with caution!)
 *   --verbose       Show detailed progress and responses
 *   --list-types    List record types before deletion
 *   --exclude-types=TYPES Comma-separated list of record types to exclude from deletion
 *                        (e.g., --exclude-types=methodology,program_summary)
 *   --include-types=TYPES Comma-separated list of record types to include (only delete these)
 *                        If specified, only these types will be deleted (exclusions still apply)
 *                        (e.g., --include-types=user_memory,workout_summary)
 */

import { Pinecone } from "@pinecone-database/pinecone";
import readline from "readline";

// Configuration
const DEFAULT_INDEX_NAME = "coach-creator-proto-v1-dev";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "pcsk_replace_me";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
Delete Namespace Script

Usage:
  node scripts/delete-namespace.js <namespace> [options]

Arguments:
  namespace       The Pinecone namespace to delete (required)

Options:
  --index=NAME    Pinecone index name (default: ${DEFAULT_INDEX_NAME})
  --dry-run       Show what would be deleted without actually deleting
  --auto-confirm  Skip confirmation prompt (use with caution!)
  --verbose       Show detailed progress and responses
  --list-types    List record types before deletion
  --exclude-types=TYPES Comma-separated list of record types to exclude from deletion
                        (e.g., --exclude-types=methodology,program_summary)
  --include-types=TYPES Comma-separated list of record types to include (only delete these)
                        If specified, only these types will be deleted (exclusions still apply)
                        (e.g., --include-types=user_memory,workout_summary)
  --help, -h      Show this help message

Examples:
  node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik --dry-run
  node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik --list-types
  node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik --include-types=user_memory --dry-run
  node scripts/delete-namespace.js user_63gocaz-j-AYRsb0094ik --auto-confirm --verbose
    `);
    process.exit(0);
  }

  const namespace = args[0];
  const options = {
    indexName: DEFAULT_INDEX_NAME,
    dryRun: args.includes("--dry-run"),
    autoConfirm: args.includes("--auto-confirm"),
    verbose: args.includes("--verbose"),
    listTypes: args.includes("--list-types"),
    excludeTypes: [],
    includeTypes: [],
  };

  for (const arg of args.slice(1)) {
    if (arg.startsWith("--index=")) {
      options.indexName = arg.split("=")[1];
    } else if (arg.startsWith("--exclude-types=")) {
      const types = arg.split("=")[1];
      options.excludeTypes = types.split(",").map((t) => t.trim());
    } else if (arg.startsWith("--include-types=")) {
      const types = arg.split("=")[1];
      options.includeTypes = types.split(",").map((t) => t.trim());
    }
  }

  return { namespace, options };
}

/**
 * Get Pinecone client
 */
async function getPineconeClient() {
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });

  return pc;
}

/**
 * Get namespace statistics
 */
async function getNamespaceStats(index, namespace) {
  try {
    const stats = await index.describeIndexStats();
    const namespaceStats = stats.namespaces?.[namespace];

    if (!namespaceStats) {
      return null; // Namespace doesn't exist or is empty
    }

    return {
      recordCount: namespaceStats.recordCount || 0,
      vectorCount: namespaceStats.vectorCount || 0,
    };
  } catch (error) {
    console.error("❌ Error fetching namespace stats:", error.message);
    throw error;
  }
}

/**
 * List record types in namespace (simplified version)
 */
async function listRecordTypes(index, namespace, limit = 1000) {
  try {
    const queries = [
      "training fitness workout goals progress",
      "conversation coach advice guidance",
      "program design structure phases",
      "memory experience reflection learning",
    ];

    const allRecords = new Map();

    for (const queryText of queries) {
      try {
        const searchQuery = {
          query: {
            inputs: { text: queryText },
            topK: limit,
          },
        };

        const response = await index
          .namespace(namespace)
          .searchRecords(searchQuery);

        if (response.result && response.result.hits) {
          response.result.hits.forEach((hit) => {
            if (!allRecords.has(hit._id)) {
              allRecords.set(hit._id, hit);
            }
          });
        }
      } catch (error) {
        // Ignore query errors
      }
    }

    const records = Array.from(allRecords.values());
    const typeGroups = new Map();

    records.forEach((hit) => {
      const fields = hit.fields || {};
      const recordType = fields.recordType || "MISSING_RECORD_TYPE";

      if (!typeGroups.has(recordType)) {
        typeGroups.set(recordType, {
          type: recordType,
          count: 0,
        });
      }

      typeGroups.get(recordType).count++;
    });

    return {
      records: Array.from(allRecords.values()),
      types: Array.from(typeGroups.values()).sort((a, b) => b.count - a.count),
    };
  } catch (error) {
    console.warn("⚠️  Could not list record types:", error.message);
    return { records: [], types: [] };
  }
}

/**
 * Filter records by excluding/including specified record types
 */
function filterRecords(records, excludeTypes = [], includeTypes = []) {
  return records.filter((hit) => {
    const fields = hit.fields || {};
    const recordType = fields.recordType || "MISSING_RECORD_TYPE";

    // First apply exclusions (always respected)
    if (excludeTypes.length > 0 && excludeTypes.includes(recordType)) {
      return false;
    }

    // Then apply inclusions (if specified, only include these types)
    if (includeTypes.length > 0) {
      return includeTypes.includes(recordType);
    }

    // If no inclusions specified, include all non-excluded records
    return true;
  });
}

/**
 * Display namespace information
 */
function displayNamespaceInfo(
  namespace,
  stats,
  recordTypes,
  excludeTypes = [],
  includeTypes = [],
  totalRecords = 0,
) {
  console.info("\n═══════════════════════════════════════════════════════════");
  console.info("NAMESPACE TO DELETE");
  console.info("═══════════════════════════════════════════════════════════\n");

  console.info(`Namespace: ${namespace}`);

  if (!stats) {
    console.info("Status: ⚠️  Namespace does not exist or is empty\n");
    return;
  }

  console.info(`Total Records: ${stats.recordCount.toLocaleString()}`);
  console.info(`Total Vectors: ${stats.vectorCount.toLocaleString()}`);

  if (excludeTypes.length > 0 || includeTypes.length > 0) {
    if (excludeTypes.length > 0) {
      console.info(`Excluded Types: ${excludeTypes.join(", ")}`);
    }
    if (includeTypes.length > 0) {
      console.info(`Included Types (only these): ${includeTypes.join(", ")}`);
    }
    if (totalRecords > 0) {
      const toDelete = totalRecords;
      const excluded = stats.recordCount - totalRecords;
      console.info(`Records to Delete: ${toDelete.toLocaleString()}`);
      if (excluded > 0) {
        console.info(`Records Excluded/Skipped: ${excluded.toLocaleString()}`);
      }
    }
  }

  if (recordTypes && recordTypes.length > 0) {
    console.info("\nRecord Types:");
    recordTypes.forEach((typeInfo) => {
      const percentage = ((typeInfo.count / stats.recordCount) * 100).toFixed(
        1,
      );
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
 * Delete namespace by removing all records
 *
 * In Pinecone, namespaces are logical containers that exist only when they contain records.
 * Calling deleteAll() removes all records, which effectively deletes the namespace.
 * This is the standard and direct way to delete a namespace using the Pinecone JavaScript SDK.
 *
 * Note: While Pinecone's REST API has a DELETE /namespaces/{namespace} endpoint, the
 * JavaScript SDK uses deleteAll() as the standard method. Both achieve the same result.
 */
async function deleteNamespace(index, namespace, indexName, verbose) {
  try {
    console.info(`\n🗑️  Deleting namespace: ${namespace}...`);

    // Delete all records in the namespace - this effectively deletes the namespace
    // In Pinecone, empty namespaces don't exist, so removing all records removes the namespace
    await index.namespace(namespace).deleteAll();

    if (verbose) {
      console.info(`  ✅ Deleted all records (namespace removed)`);
    }

    // Verify deletion by checking stats
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for propagation

    const stats = await getNamespaceStats(index, namespace);
    if (stats && stats.recordCount > 0) {
      console.warn(
        `  ⚠️  Warning: Namespace still has ${stats.recordCount} records after deletion`,
      );
      return {
        success: false,
        namespace,
        error: "Namespace still contains records after deletion",
      };
    }

    return { success: true, namespace };
  } catch (error) {
    console.error(`  ❌ Failed to delete namespace: ${error.message}`);
    return { success: false, namespace, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.info("🗑️  Pinecone Namespace Deletion Script\n");

  const { namespace, options } = parseArgs();

  // Validate API key
  if (!PINECONE_API_KEY || PINECONE_API_KEY === "pcsk_replace_me") {
    console.error("❌ Error: PINECONE_API_KEY environment variable not set");
    console.error("   Please set it to your Pinecone API key");
    process.exit(1);
  }

  console.info("Configuration:");
  console.info(`  Namespace: ${namespace}`);
  console.info(`  Index: ${options.indexName}`);
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
    // Get Pinecone client
    const pc = await getPineconeClient();
    const index = pc.index(options.indexName);

    // Get namespace stats
    const stats = await getNamespaceStats(index, namespace);

    if (!stats || stats.recordCount === 0) {
      console.info(
        `\n✅ Namespace "${namespace}" is already empty or doesn't exist.\n`,
      );
      return;
    }

    // Optionally list record types (required if using include/exclude filters)
    let recordTypes = null;
    let allRecords = [];
    if (
      options.listTypes ||
      options.excludeTypes.length > 0 ||
      options.includeTypes.length > 0
    ) {
      console.info("\n📋 Analyzing record types...");
      const result = await listRecordTypes(index, namespace);
      recordTypes = result.types;
      allRecords = result.records;
    }

    // Filter records if include/exclude types specified
    let recordsToDelete = [];
    if (options.excludeTypes.length > 0 || options.includeTypes.length > 0) {
      recordsToDelete = filterRecords(
        allRecords,
        options.excludeTypes,
        options.includeTypes,
      );
    }

    // Display namespace info
    displayNamespaceInfo(
      namespace,
      stats,
      recordTypes,
      options.excludeTypes,
      options.includeTypes,
      recordsToDelete.length,
    );

    // Dry run - just show what would be deleted
    if (options.dryRun) {
      console.info("🔍 DRY RUN: No records were deleted");
      console.info(
        "   Remove --dry-run flag to actually delete the namespace\n",
      );
      return;
    }

    // If include/exclude filters are specified, we need to delete selectively
    // Otherwise, delete all records (which removes the namespace)
    if (options.excludeTypes.length > 0 || options.includeTypes.length > 0) {
      // Selective deletion based on filters
      if (recordsToDelete.length === 0) {
        console.info(
          `\n✅ No records to delete (all records are excluded or filtered out).\n`,
        );
        return;
      }

      // Confirm deletion
      if (!options.autoConfirm) {
        let confirmMessage = `\n⚠️  Are you sure you want to delete ${recordsToDelete.length.toLocaleString()} record${recordsToDelete.length !== 1 ? "s" : ""} from namespace "${namespace}"?`;
        if (stats.recordCount - recordsToDelete.length > 0) {
          confirmMessage += `\n   (${(stats.recordCount - recordsToDelete.length).toLocaleString()} record${stats.recordCount - recordsToDelete.length !== 1 ? "s" : ""} will be preserved)`;
        }
        confirmMessage += `\n   This action cannot be undone! (y/N): `;

        const confirmed = await confirm(confirmMessage);

        if (!confirmed) {
          console.info("\n❌ Deletion cancelled by user\n");
          return;
        }
      }

      // Delete specific records by ID
      console.info(
        `\n🗑️  Deleting ${recordsToDelete.length.toLocaleString()} records...`,
      );
      let deletedCount = 0;
      let failedCount = 0;

      // Delete in batches (Pinecone deleteMany supports up to 100 IDs)
      const batchSize = 100;
      for (let i = 0; i < recordsToDelete.length; i += batchSize) {
        const batch = recordsToDelete.slice(i, i + batchSize);
        const idsToDelete = batch.map((r) => r._id);

        try {
          await index.namespace(namespace).deleteMany(idsToDelete);
          deletedCount += batch.length;
          if (options.verbose && deletedCount % 100 === 0) {
            process.stdout.write(".");
          }
        } catch (error) {
          failedCount += batch.length;
          if (options.verbose) {
            console.error(`\n  ❌ Failed to delete batch: ${error.message}`);
          }
        }
      }

      if (options.verbose && deletedCount > 0) {
        console.info(""); // New line after progress dots
      }

      if (failedCount === 0) {
        console.info(
          `\n✅ Successfully deleted ${deletedCount.toLocaleString()} record${deletedCount !== 1 ? "s" : ""}\n`,
        );
      } else {
        console.error(
          `\n⚠️  Deletion completed with errors: ${deletedCount} deleted, ${failedCount} failed\n`,
        );
        process.exit(1);
      }
    } else {
      // Delete entire namespace (all records)
      // Confirm deletion
      if (!options.autoConfirm) {
        const confirmed = await confirm(
          `\n⚠️  Are you sure you want to completely delete namespace "${namespace}"?\n` +
            `   This will delete ${stats.recordCount.toLocaleString()} records and cannot be undone! (y/N): `,
        );

        if (!confirmed) {
          console.info("\n❌ Deletion cancelled by user\n");
          return;
        }
      }

      // Delete namespace
      const result = await deleteNamespace(
        index,
        namespace,
        options.indexName,
        options.verbose,
      );

      if (result.success) {
        console.info(
          "\n═══════════════════════════════════════════════════════════",
        );
        console.info(`✅ Successfully deleted namespace: ${namespace}`);
        console.info(
          "   Namespace has been completely removed (all records deleted)",
        );
        console.info(
          "═══════════════════════════════════════════════════════════\n",
        );
      } else {
        console.error("\n❌ Failed to delete namespace:", result.error);
        process.exit(1);
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
