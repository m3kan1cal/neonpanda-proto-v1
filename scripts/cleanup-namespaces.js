#!/usr/bin/env node

/**
 * Cleanup Test Namespaces Script
 *
 * This script deletes all namespaces from a Pinecone index that match a given prefix.
 * Useful for cleaning up test user data deployed across the system.
 *
 * Strategy:
 * - List all namespaces in the Pinecone index
 * - Filter namespaces by prefix (default: "user_test_")
 * - Delete each matching namespace
 *
 * Usage:
 *   node scripts/cleanup-test-namespaces.js [options]
 *   node scripts/cleanup-test-namespaces.js --prefix=user_test_
 *   node scripts/cleanup-test-namespaces.js --index=my-index --prefix=user_test_
 *
 * Options:
 *   --index=NAME    Pinecone index name (default: coach-creator-proto-v1-dev)
 *   --prefix=PREFIX Namespace prefix to filter (default: user_test_)
 *   --dry-run       Show what would be deleted without actually deleting
 *   --auto-confirm  Skip confirmation prompt (use with caution!)
 *   --verbose       Show detailed progress and responses
 */

import { Pinecone } from "@pinecone-database/pinecone";
import readline from "readline";

// Configuration
const DEFAULT_INDEX_NAME = "coach-creator-proto-v1-dev";
const DEFAULT_PREFIX = "user_test_";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "pcsk_replace_me";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.info(`
Cleanup Test Namespaces Script

Usage:
  node scripts/cleanup-test-namespaces.js [options]

Options:
  --index=NAME    Pinecone index name (default: ${DEFAULT_INDEX_NAME})
  --prefix=PREFIX Namespace prefix to filter (default: ${DEFAULT_PREFIX})
  --dry-run       Show what would be deleted without actually deleting
  --auto-confirm  Skip confirmation prompt (use with caution!)
  --verbose       Show detailed progress and responses
  --help, -h      Show this help message

Examples:
  node scripts/cleanup-test-namespaces.js --dry-run
  node scripts/cleanup-test-namespaces.js --prefix=user_test_ --verbose
  node scripts/cleanup-test-namespaces.js --index=my-index --prefix=test_
    `);
    process.exit(0);
  }

  const options = {
    indexName: DEFAULT_INDEX_NAME,
    prefix: DEFAULT_PREFIX,
    dryRun: args.includes("--dry-run"),
    autoConfirm: args.includes("--auto-confirm"),
    verbose: args.includes("--verbose"),
  };

  for (const arg of args) {
    if (arg.startsWith("--index=")) {
      options.indexName = arg.split("=")[1];
    } else if (arg.startsWith("--prefix=")) {
      options.prefix = arg.split("=")[1];
    }
  }

  return options;
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
 * List all namespaces in the index
 */
async function listNamespaces(pc, indexName, verbose) {
  try {
    console.info(`\n📊 Fetching namespaces from index: ${indexName}...`);

    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();

    if (!stats.namespaces) {
      return [];
    }

    const namespaces = Object.keys(stats.namespaces);
    console.info(
      `✅ Found ${namespaces.length} total namespace${namespaces.length !== 1 ? "s" : ""}`,
    );

    if (verbose) {
      console.info("\nAll namespaces:");
      namespaces.forEach((ns, i) => {
        const vectorCount = stats.namespaces[ns].recordCount || 0;
        console.info(`  ${i + 1}. ${ns} (${vectorCount} vectors)`);
      });
    }

    return namespaces.map((ns) => ({
      name: ns,
      vectorCount: stats.namespaces[ns].recordCount || 0,
    }));
  } catch (error) {
    console.error("❌ Error listing namespaces:", error.message);
    throw error;
  }
}

/**
 * Filter namespaces by prefix
 */
function filterNamespacesByPrefix(namespaces, prefix) {
  return namespaces.filter((ns) => ns.name.startsWith(prefix));
}

/**
 * Display namespaces to be deleted
 */
function displayNamespaces(namespaces, prefix) {
  console.info("\n═══════════════════════════════════════════════════════════");
  console.info(`NAMESPACES TO DELETE (prefix: "${prefix}")`);
  console.info("═══════════════════════════════════════════════════════════\n");

  if (namespaces.length === 0) {
    console.info(
      `✅ No namespaces found with prefix "${prefix}". Nothing to delete.\n`,
    );
    return;
  }

  namespaces.forEach((ns, i) => {
    console.info(`${i + 1}. ${ns.name}`);
    console.info(`   Vectors: ${ns.vectorCount.toLocaleString()}`);
    console.info("");
  });

  const totalVectors = namespaces.reduce((sum, ns) => sum + ns.vectorCount, 0);

  console.info("═══════════════════════════════════════════════════════════");
  console.info(`Total namespaces to delete: ${namespaces.length}`);
  console.info(`Total vectors to delete: ${totalVectors.toLocaleString()}`);
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
 * Delete a single namespace
 */
async function deleteNamespace(index, namespace, verbose) {
  try {
    // Delete all vectors in the namespace
    await index.namespace(namespace.name).deleteAll();

    if (verbose) {
      console.info(
        `  ✅ Deleted: ${namespace.name} (${namespace.vectorCount} vectors)`,
      );
    }

    return { success: true, namespace: namespace.name };
  } catch (error) {
    console.error(`  ❌ Failed to delete ${namespace.name}: ${error.message}`);
    return { success: false, namespace: namespace.name, error: error.message };
  }
}

/**
 * Delete all namespaces
 */
async function deleteAllNamespaces(index, namespaces, verbose) {
  console.info("\n🗑️  Deleting namespaces...\n");

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const namespace of namespaces) {
    const result = await deleteNamespace(index, namespace, verbose);

    if (result.success) {
      results.success++;
      if (!verbose) {
        // Show progress in non-verbose mode
        process.stdout.write(".");
      }
    } else {
      results.failed++;
      results.errors.push({
        namespace: namespace.name,
        error: result.error,
      });
    }

    // Small delay to avoid throttling
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (!verbose) {
    console.info(""); // New line after progress dots
  }

  console.info("\n═══════════════════════════════════════════════════════════");
  console.info(
    `✅ Successfully deleted: ${results.success} namespace${results.success !== 1 ? "s" : ""}`,
  );
  if (results.failed > 0) {
    console.info(
      `❌ Failed to delete: ${results.failed} namespace${results.failed !== 1 ? "s" : ""}`,
    );
    console.info("\nErrors:");
    results.errors.forEach((e) => {
      console.info(`  - ${e.namespace}: ${e.error}`);
    });
  }
  console.info("═══════════════════════════════════════════════════════════\n");

  return results;
}

/**
 * Main function
 */
async function main() {
  console.info("🧹 Pinecone Namespace Cleanup Script\n");

  const options = parseArgs();

  // Validate API key
  if (!PINECONE_API_KEY || PINECONE_API_KEY === "pcsk_replace_me") {
    console.error("❌ Error: PINECONE_API_KEY environment variable not set");
    console.error("   Please set it to your Pinecone API key");
    process.exit(1);
  }

  console.info("Configuration:");
  console.info(`  Index: ${options.indexName}`);
  console.info(`  Prefix: ${options.prefix}`);
  console.info(`  Dry Run: ${options.dryRun}`);
  console.info(`  Verbose: ${options.verbose}`);

  try {
    // Get Pinecone client
    const pc = await getPineconeClient();
    const index = pc.index(options.indexName);

    // List all namespaces
    const allNamespaces = await listNamespaces(
      pc,
      options.indexName,
      options.verbose,
    );

    if (allNamespaces.length === 0) {
      console.info("\n✅ No namespaces found in index. Nothing to delete.\n");
      return;
    }

    // Filter by prefix
    const matchingNamespaces = filterNamespacesByPrefix(
      allNamespaces,
      options.prefix,
    );

    console.info(
      `\n🔍 Found ${matchingNamespaces.length} namespace${matchingNamespaces.length !== 1 ? "s" : ""} matching prefix "${options.prefix}"`,
    );

    if (matchingNamespaces.length === 0) {
      console.info(
        `\n✅ No namespaces found with prefix "${options.prefix}". Nothing to delete.\n`,
      );
      return;
    }

    // Display namespaces
    displayNamespaces(matchingNamespaces, options.prefix);

    // Dry run - just show what would be deleted
    if (options.dryRun) {
      console.info("🔍 DRY RUN: No namespaces were deleted");
      console.info("   Remove --dry-run flag to actually delete namespaces\n");
      return;
    }

    // Confirm deletion
    if (!options.autoConfirm) {
      const confirmed = await confirm(
        `\n⚠️  Are you sure you want to delete ${matchingNamespaces.length} namespace${matchingNamespaces.length !== 1 ? "s" : ""}? This action cannot be undone! (y/N): `,
      );

      if (!confirmed) {
        console.info("\n❌ Deletion cancelled by user\n");
        return;
      }
    }

    // Delete namespaces
    const results = await deleteAllNamespaces(
      index,
      matchingNamespaces,
      options.verbose,
    );

    if (results.failed === 0) {
      console.info(
        "✅ Cleanup complete! All namespaces deleted successfully.\n",
      );
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
