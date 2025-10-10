#!/usr/bin/env node

/**
 * Cleanup Duplicate Pinecone Memory Records
 *
 * This script finds and removes duplicate memory records in Pinecone.
 * Duplicates occur when the same memory_id has multiple Pinecone records.
 *
 * Strategy:
 * - Group records by memory_id
 * - Keep the record with the highest usage_count (most recent/accurate)
 * - Delete all other duplicates
 *
 * Usage:
 *   node scripts/cleanup-duplicate-memories.js <namespace>
 *   node scripts/cleanup-duplicate-memories.js user_63gocaz-j-AYRsb0094ik
 *
 * Options:
 *   --dry-run       Show what would be deleted without actually deleting
 *   --auto-confirm  Skip confirmation prompt (dangerous!)
 */

import { Pinecone } from '@pinecone-database/pinecone';
import readline from 'readline';

// Configuration
const PINECONE_INDEX_NAME = 'coach-creator-proto-v1-dev';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_replace_me';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Cleanup Duplicate Pinecone Memory Records

Usage:
  node scripts/cleanup-duplicate-memories.js <namespace> [options]

Arguments:
  namespace       The Pinecone namespace to clean (required)

Options:
  --dry-run       Show what would be deleted without actually deleting
  --auto-confirm  Skip confirmation prompt (use with caution!)
  --help, -h      Show this help message

Examples:
  node scripts/cleanup-duplicate-memories.js user_63gocaz-j-AYRsb0094ik --dry-run
  node scripts/cleanup-duplicate-memories.js user_63gocaz-j-AYRsb0094ik
    `);
    process.exit(0);
  }

  const namespace = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    autoConfirm: args.includes('--auto-confirm')
  };

  return { namespace, options };
}

/**
 * Get Pinecone client
 */
async function getPineconeClient() {
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY
  });

  return pc.index(PINECONE_INDEX_NAME);
}

/**
 * Fetch all memory records from namespace
 */
async function fetchMemoryRecords(index, namespace) {
  try {
    console.log(`\n📊 Fetching memory records from namespace: ${namespace}\n`);

    const searchQuery = {
      query: {
        inputs: { text: "training fitness workout goals" },
        topK: 1000 // Fetch up to 1000 records
      },
      filter: {
        record_type: "user_memory"
      }
    };

    const response = await index.namespace(namespace).searchRecords(searchQuery);

    if (!response.result || !response.result.hits) {
      return [];
    }

    console.log(`✅ Found ${response.result.hits.length} memory records\n`);
    return response.result.hits;
  } catch (error) {
    console.error('❌ Error fetching records:', error.message);
    throw error;
  }
}

/**
 * Group records by memory_id and find duplicates
 */
function findDuplicates(records) {
  const memoryGroups = new Map();

  records.forEach(hit => {
    // Handle both old (snake_case) and new (camelCase) field formats
    const memoryId = hit.fields.memoryId || hit.fields.memory_id;

    if (!memoryId) {
      return; // Skip records without memoryId
    }

    if (!memoryGroups.has(memoryId)) {
      memoryGroups.set(memoryId, []);
    }

    memoryGroups.get(memoryId).push({
      pineconeId: hit._id,
      memoryId: memoryId,
      usageCount: hit.fields.usageCount || hit.fields.usage_count || 0,
      loggedAt: hit.fields.loggedAt || hit.fields.logged_at,
      contentPreview: (hit.fields.text || '').substring(0, 100)
    });
  });

  // Filter to only groups with duplicates
  const duplicates = [];
  memoryGroups.forEach((records, memoryId) => {
    if (records.length > 1) {
      // Sort by usage_count desc, then by loggedAt desc
      records.sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return new Date(b.loggedAt) - new Date(a.loggedAt);
      });

      duplicates.push({
        memoryId,
        totalRecords: records.length,
        keep: records[0], // Keep the one with highest usage_count
        delete: records.slice(1) // Delete the rest
      });
    }
  });

  return duplicates;
}

/**
 * Display duplicate analysis
 */
function displayDuplicates(duplicates) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('DUPLICATE MEMORY ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found! All memories have unique IDs.\n');
    return;
  }

  let totalDuplicates = 0;

  duplicates.forEach((dup, i) => {
    console.log(`\n━━━ DUPLICATE GROUP ${i + 1} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Memory ID: ${dup.memoryId}`);
    console.log(`Total Records: ${dup.totalRecords}`);
    console.log(`Duplicates to Delete: ${dup.delete.length}`);

    console.log('\n✅ KEEP:');
    console.log(`  Pinecone ID: ${dup.keep.pineconeId}`);
    console.log(`  Usage Count: ${dup.keep.usageCount}`);
    console.log(`  Logged At: ${dup.keep.loggedAt}`);
    console.log(`  Content: ${dup.keep.contentPreview}...`);

    console.log('\n❌ DELETE:');
    dup.delete.forEach((rec, j) => {
      console.log(`  ${j + 1}. ${rec.pineconeId} (usage: ${rec.usageCount})`);
      totalDuplicates++;
    });
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`Summary: ${duplicates.length} memory groups with duplicates`);
  console.log(`Total duplicate records to delete: ${totalDuplicates}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  return totalDuplicates;
}

/**
 * Ask for user confirmation
 */
async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Delete duplicate records
 */
async function deleteDuplicates(index, namespace, duplicates) {
  console.log('\n🗑️  Deleting duplicate records...\n');

  let deletedCount = 0;
  let errorCount = 0;

  // Collect all IDs to delete
  const idsToDelete = [];
  for (const dup of duplicates) {
    for (const rec of dup.delete) {
      idsToDelete.push(rec.pineconeId);
    }
  }

  // Delete in batches of 100 (Pinecone limit)
  const batchSize = 100;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);

    try {
      // Use deleteMany with ids array
      await index.namespace(namespace).deleteMany(batch);

      batch.forEach(id => {
        console.log(`✅ Deleted: ${id}`);
      });

      deletedCount += batch.length;
    } catch (error) {
      console.error(`❌ Failed to delete batch:`, error.message);
      errorCount += batch.length;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✅ Successfully deleted: ${deletedCount} records`);
  if (errorCount > 0) {
    console.log(`❌ Failed to delete: ${errorCount} records`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🧹 Pinecone Duplicate Memory Cleanup\n');

  const { namespace, options } = parseArgs();

  // Validate API key
  if (!PINECONE_API_KEY || PINECONE_API_KEY === 'pcsk_replace_me') {
    console.error('❌ Error: PINECONE_API_KEY environment variable not set');
    console.error('   Please set it to your Pinecone API key');
    process.exit(1);
  }

  try {
    // Get Pinecone client
    const index = await getPineconeClient();

    // Fetch memory records
    const records = await fetchMemoryRecords(index, namespace);

    if (records.length === 0) {
      console.log('No memory records found in namespace');
      return;
    }

    // Find duplicates
    const duplicates = findDuplicates(records);

    // Display duplicates
    const totalDuplicates = displayDuplicates(duplicates);

    if (!totalDuplicates) {
      return;
    }

    // Dry run - just show what would be deleted
    if (options.dryRun) {
      console.log('🔍 DRY RUN: No records were deleted');
      console.log('   Remove --dry-run flag to actually delete duplicates\n');
      return;
    }

    // Confirm deletion
    if (!options.autoConfirm) {
      const confirmed = await confirm(
        `\n⚠️  Are you sure you want to delete ${totalDuplicates} duplicate records? (y/N): `
      );

      if (!confirmed) {
        console.log('\n❌ Deletion cancelled by user\n');
        return;
      }
    }

    // Delete duplicates
    await deleteDuplicates(index, namespace, duplicates);

    console.log('✅ Cleanup complete!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

