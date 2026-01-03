#!/usr/bin/env node

/**
 * List Namespace Record Types Script
 *
 * This script lists all record types found in a Pinecone namespace, along with
 * counts and sample record IDs for each type. Useful for understanding what
 * data exists before resetting or cleaning a namespace.
 *
 * Strategy:
 * - Query the namespace using multiple broad searches to get comprehensive coverage
 * - Group records by recordType field
 * - Display counts and sample IDs for each type
 *
 * Usage:
 *   node scripts/list-namespace-record-types.js <namespace>
 *   node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik
 *
 * Options:
 *   --index=NAME    Pinecone index name (default: coach-creator-proto-v1-dev)
 *   --limit=N       Max records to fetch per query (default: 1000)
 *   --samples=N     Number of sample IDs to show per type (default: 5)
 *   --output=FILE   Save results to JSON file
 */

import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs/promises";

// Configuration
const DEFAULT_INDEX_NAME = "coach-creator-proto-v1-dev";
const DEFAULT_LIMIT = 1000;
const DEFAULT_SAMPLES = 5;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "pcsk_replace_me";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
List Namespace Record Types Script

Usage:
  node scripts/list-namespace-record-types.js <namespace> [options]

Arguments:
  namespace       The Pinecone namespace to analyze (required)

Options:
  --index=NAME    Pinecone index name (default: ${DEFAULT_INDEX_NAME})
  --limit=N       Max records to fetch per query (default: ${DEFAULT_LIMIT})
  --samples=N     Number of sample IDs to show per type (default: ${DEFAULT_SAMPLES})
  --output=FILE   Save results to JSON file
  --help, -h      Show this help message

Examples:
  node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik
  node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik --samples=10
  node scripts/list-namespace-record-types.js user_63gocaz-j-AYRsb0094ik --output=types.json
    `);
    process.exit(0);
  }

  const namespace = args[0];
  const options = {
    indexName: DEFAULT_INDEX_NAME,
    limit: DEFAULT_LIMIT,
    samples: DEFAULT_SAMPLES,
    output: null,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--index=")) {
      options.indexName = arg.split("=")[1];
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1]);
    } else if (arg.startsWith("--samples=")) {
      options.samples = parseInt(arg.split("=")[1]);
    } else if (arg.startsWith("--output=")) {
      options.output = arg.split("=")[1];
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
 * Fetch records from namespace using multiple broad queries
 * This helps ensure we get comprehensive coverage of all record types
 */
async function fetchAllRecords(index, namespace, limit) {
  try {
    console.info(`\n📊 Fetching records from namespace: ${namespace}`);
    console.info(`   Limit per query: ${limit}\n`);

    // Use multiple broad queries to try to get different types of records
    const queries = [
      "training fitness workout goals progress",
      "conversation coach advice guidance",
      "program design structure phases",
      "memory experience reflection learning",
      "methodology technique strategy approach",
    ];

    const allRecords = new Map(); // Use Map to deduplicate by ID

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
            // Deduplicate by ID
            if (!allRecords.has(hit._id)) {
              allRecords.set(hit._id, hit);
            }
          });
        }
      } catch (error) {
        console.warn(
          `⚠️  Warning: Query "${queryText}" failed: ${error.message}`,
        );
      }
    }

    const records = Array.from(allRecords.values());
    console.info(`✅ Found ${records.length} unique records\n`);

    return records;
  } catch (error) {
    console.error("❌ Error fetching records:", error.message);
    throw error;
  }
}

/**
 * Group records by recordType and collect statistics
 */
function analyzeRecordTypes(records) {
  const typeGroups = new Map();

  records.forEach((hit) => {
    const fields = hit.fields || {};
    const recordType = fields.recordType || "MISSING_RECORD_TYPE";

    if (!typeGroups.has(recordType)) {
      typeGroups.set(recordType, {
        type: recordType,
        count: 0,
        sampleIds: [],
        fields: new Set(),
      });
    }

    const group = typeGroups.get(recordType);
    group.count++;
    group.sampleIds.push(hit._id);

    // Collect unique field names for this type
    Object.keys(fields).forEach((key) => {
      group.fields.add(key);
    });
  });

  // Convert to array and sort by count (descending)
  const types = Array.from(typeGroups.values()).map((group) => ({
    type: group.type,
    count: group.count,
    sampleIds: group.sampleIds.slice(0, 100), // Keep up to 100 for potential output
    fields: Array.from(group.fields).sort(),
  }));

  types.sort((a, b) => b.count - a.count);

  return types;
}

/**
 * Display record types in a readable format
 */
function displayRecordTypes(types, samples) {
  console.info("═══════════════════════════════════════════════════════════");
  console.info("RECORD TYPES IN NAMESPACE");
  console.info("═══════════════════════════════════════════════════════════\n");

  if (types.length === 0) {
    console.info("⚠️  No records found in namespace\n");
    return;
  }

  const totalRecords = types.reduce((sum, t) => sum + t.count, 0);

  types.forEach((typeInfo, i) => {
    const percentage = ((typeInfo.count / totalRecords) * 100).toFixed(1);
    console.info(`${i + 1}. ${typeInfo.type}`);
    console.info(`   Count: ${typeInfo.count} (${percentage}%)`);

    if (typeInfo.sampleIds.length > 0) {
      const displaySamples = typeInfo.sampleIds.slice(0, samples);
      console.info(`   Sample IDs:`);
      displaySamples.forEach((id) => {
        console.info(`     - ${id}`);
      });
      if (typeInfo.sampleIds.length > samples) {
        console.info(
          `     ... and ${typeInfo.sampleIds.length - samples} more`,
        );
      }
    }

    if (typeInfo.fields.length > 0) {
      console.info(`   Fields: ${typeInfo.fields.join(", ")}`);
    }

    console.info("");
  });

  console.info("═══════════════════════════════════════════════════════════");
  console.info(`Total records: ${totalRecords}`);
  console.info(`Total record types: ${types.length}`);
  console.info("═══════════════════════════════════════════════════════════\n");
}

/**
 * Save results to JSON file
 */
async function saveToFile(types, namespace, filename) {
  try {
    const data = {
      namespace,
      timestamp: new Date().toISOString(),
      totalRecords: types.reduce((sum, t) => sum + t.count, 0),
      totalTypes: types.length,
      types: types.map((t) => ({
        type: t.type,
        count: t.count,
        sampleIds: t.sampleIds,
        fields: t.fields,
      })),
    };

    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.info(`\n✅ Saved results to ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving to file:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.info("📋 Pinecone Namespace Record Types Lister\n");

  const { namespace, options } = parseArgs();

  // Validate API key
  if (!PINECONE_API_KEY || PINECONE_API_KEY === "pcsk_replace_me") {
    console.error("❌ Error: PINECONE_API_KEY environment variable not set");
    console.error("   Please set it to your Pinecone API key");
    process.exit(1);
  }

  try {
    // Get Pinecone client
    const pc = await getPineconeClient();
    const index = pc.index(options.indexName);

    // Get namespace stats first
    try {
      const stats = await index.describeIndexStats();
      const namespaceStats = stats.namespaces?.[namespace];
      if (namespaceStats) {
        console.info(
          `📊 Namespace stats: ${namespaceStats.recordCount?.toLocaleString() || 0} total records\n`,
        );
      }
    } catch (error) {
      console.warn(`⚠️  Could not fetch namespace stats: ${error.message}\n`);
    }

    // Fetch all records
    const records = await fetchAllRecords(index, namespace, options.limit);

    if (records.length === 0) {
      console.info("✅ No records found in namespace\n");
      return;
    }

    // Analyze record types
    const types = analyzeRecordTypes(records);

    // Display or save results
    if (options.output) {
      await saveToFile(types, namespace, options.output);
      console.info(`\nTo view the file:\n  cat ${options.output} | jq .`);
    } else {
      displayRecordTypes(types, options.samples);
    }

    console.info("✅ Done!\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
