#!/usr/bin/env node

/**
 * Pinecone Namespace Inspector
 *
 * This script queries a specified Pinecone namespace and returns all records
 * in their raw structure exactly as stored in Pinecone.
 *
 * Useful for debugging how memories and records are actually stored.
 *
 * Usage:
 *   node scripts/inspect-pinecone-namespace.js <namespace>
 *   node scripts/inspect-pinecone-namespace.js user_63gocaz-j-AYRsb0094ik
 *   node scripts/inspect-pinecone-namespace.js methodology
 *
 * Optional flags:
 *   --limit=N       Limit number of records to fetch (default: 100)
 *   --filter=TYPE   Filter by recordType (e.g., user_memory, methodology)
 *   --output=FILE   Save results to file instead of console
 *   --ids-only      Only show record IDs (useful for large namespaces)
 */

import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs/promises';

// Configuration
const PINECONE_INDEX_NAME = 'coach-creator-proto-v1-dev';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_replace_me';
const DEFAULT_LIMIT = 100;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Pinecone Namespace Inspector

Usage:
  node scripts/inspect-pinecone-namespace.js <namespace> [options]

Arguments:
  namespace       The Pinecone namespace to inspect (required)

Options:
  --limit=N       Limit number of records (default: 100, max: 1000)
  --filter=TYPE   Filter by recordType (e.g., user_memory, methodology)
  --output=FILE   Save results to JSON file
  --ids-only      Only show record IDs (for quick overview)
  --help, -h      Show this help message

Examples:
  node scripts/inspect-pinecone-namespace.js user_63gocaz-j-AYRsb0094ik
  node scripts/inspect-pinecone-namespace.js methodology --limit=50
  node scripts/inspect-pinecone-namespace.js user_63gocaz-j-AYRsb0094ik --filter=user_memory
  node scripts/inspect-pinecone-namespace.js user_63gocaz-j-AYRsb0094ik --output=records.json
  node scripts/inspect-pinecone-namespace.js user_63gocaz-j-AYRsb0094ik --ids-only
    `);
    process.exit(0);
  }

  const namespace = args[0];
  const options = {
    limit: DEFAULT_LIMIT,
    filter: null,
    output: null,
    idsOnly: false
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--limit=')) {
      options.limit = Math.min(parseInt(arg.split('=')[1]), 1000);
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--ids-only') {
      options.idsOnly = true;
    }
  }

  return { namespace, options };
}

/**
 * Get Pinecone client
 */
async function getPineconeClient() {
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY
  });

  return {
    client: pc,
    index: pc.index(PINECONE_INDEX_NAME)
  };
}

/**
 * Fetch records from a namespace using semantic search
 * (Pinecone doesn't have a direct "list all" API, so we use search with a broad query)
 */
async function fetchRecordsFromNamespace(index, namespace, options) {
  try {
    console.log(`\n📊 Fetching records from namespace: ${namespace}`);
    console.log(`   Index: ${PINECONE_INDEX_NAME}`);
    console.log(`   Limit: ${options.limit}`);
    if (options.filter) {
      console.log(`   Filter: recordType = ${options.filter}`);
    }
    console.log('');

    // Build filter if specified
    let filter = {};
    if (options.filter) {
      filter = { recordType: options.filter };
    }

    // Use a broad search query to get records
    // We'll use a generic text query that should match most records
    const searchQuery = {
      query: {
        inputs: { text: "training fitness workout goals progress" },
        topK: options.limit
      }
    };

    // Add filter if specified
    if (Object.keys(filter).length > 0) {
      searchQuery.filter = filter;
    }

    const response = await index.namespace(namespace).searchRecords(searchQuery);

    if (!response.result || !response.result.hits) {
      console.log('⚠️  No results returned from Pinecone');
      return [];
    }

    console.log(`✅ Found ${response.result.hits.length} records\n`);

    return response.result.hits;
  } catch (error) {
    console.error('❌ Error fetching records:', error.message);
    throw error;
  }
}

/**
 * Format a single record for display
 */
function formatRecord(hit, index) {
  const record = {
    index: index + 1,
    id: hit._id,
    score: hit._score,
    fields: hit.fields || {}
  };

  return record;
}

/**
 * Display records in a readable format
 */
function displayRecords(records, options) {
  if (options.idsOnly) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RECORD IDs');
    console.log('═══════════════════════════════════════════════════════════\n');

    records.forEach((hit, i) => {
      console.log(`${i + 1}. ${hit._id}`);
    });

    console.log(`\nTotal: ${records.length} records`);
    return;
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('RAW PINECONE RECORDS');
  console.log('═══════════════════════════════════════════════════════════\n');

  records.forEach((hit, i) => {
    const record = formatRecord(hit, i);

    console.log(`\n━━━ RECORD ${record.index} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`ID: ${record.id}`);
    console.log(`Score: ${record.score}`);
    console.log('\nFIELDS:');

    // Display metadata/fields
    const fields = record.fields;
    const fieldKeys = Object.keys(fields).sort();

    for (const key of fieldKeys) {
      let value = fields[key];

      // Truncate long text fields for display
      if (typeof value === 'string' && value.length > 200) {
        value = value.substring(0, 200) + '... [truncated]';
      }

      // Format arrays and objects nicely
      if (Array.isArray(value)) {
        console.log(`  ${key}: [${value.length} items] ${JSON.stringify(value)}`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}: ${JSON.stringify(value, null, 2).split('\n').join('\n    ')}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`Total: ${records.length} records`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Save records to a JSON file
 */
async function saveToFile(records, filename) {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      count: records.length,
      records: records.map((hit, i) => formatRecord(hit, i))
    };

    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`\n✅ Saved ${records.length} records to ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving to file:`, error.message);
    throw error;
  }
}

/**
 * Analyze record structure
 */
function analyzeRecordStructure(records) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RECORD STRUCTURE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Collect all unique field keys
  const allFieldKeys = new Set();
  const fieldFrequency = {};
  const recordTypeCounts = {};
  const missingMemoryIds = [];

  records.forEach((hit) => {
    const fields = hit.fields || {};

    Object.keys(fields).forEach(key => {
      allFieldKeys.add(key);
      fieldFrequency[key] = (fieldFrequency[key] || 0) + 1;
    });

    // Track record types (use camelCase)
    const recordType = fields.recordType || 'MISSING';
    recordTypeCounts[recordType] = (recordTypeCounts[recordType] || 0) + 1;

    // Track records without memoryId
    if (!fields.memoryId && !fields.recordType) {
      missingMemoryIds.push(hit._id);
    }
  });

  console.log('Field Coverage:');
  console.log('───────────────────────────────────────────────────────────');
  const sortedKeys = Array.from(allFieldKeys).sort();
  sortedKeys.forEach(key => {
    const frequency = fieldFrequency[key];
    const percentage = ((frequency / records.length) * 100).toFixed(1);
    console.log(`  ${key}: ${frequency}/${records.length} records (${percentage}%)`);
  });

  console.log('\nRecord Type Distribution:');
  console.log('───────────────────────────────────────────────────────────');
  Object.entries(recordTypeCounts).forEach(([type, count]) => {
    const percentage = ((count / records.length) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${percentage}%)`);
  });

  if (missingMemoryIds.length > 0) {
    console.log('\n⚠️  Records Missing Both recordType AND memoryId:');
    console.log('───────────────────────────────────────────────────────────');
    missingMemoryIds.slice(0, 10).forEach(id => {
      console.log(`  - ${id}`);
    });
    if (missingMemoryIds.length > 10) {
      console.log(`  ... and ${missingMemoryIds.length - 10} more`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Pinecone Namespace Inspector\n');

  const { namespace, options } = parseArgs();

  // Validate API key
  if (!PINECONE_API_KEY || PINECONE_API_KEY === 'pcsk_replace_me') {
    console.error('❌ Error: PINECONE_API_KEY environment variable not set');
    console.error('   Please set it to your Pinecone API key');
    process.exit(1);
  }

  try {
    // Get Pinecone client
    const { index } = await getPineconeClient();

    // Fetch records
    const records = await fetchRecordsFromNamespace(index, namespace, options);

    if (records.length === 0) {
      console.log('No records found in namespace');
      return;
    }

    // Display or save results
    if (options.output) {
      await saveToFile(records, options.output);
      console.log(`\nTo view the file:\n  cat ${options.output} | jq .`);
    } else {
      displayRecords(records, options);
    }

    // Show analysis
    if (!options.idsOnly) {
      analyzeRecordStructure(records);
    }

    console.log('✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

