#!/usr/bin/env node

/**
 * Pinecone Namespace Copy Script
 *
 * This script copies all records from a source namespace to multiple target namespaces
 * following the same patterns as upsert-methodologies.js and seed-coach-templates.js
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Pinecone } from '@pinecone-database/pinecone';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PINECONE_INDEX_NAME = 'coach-creator-proto-v1-dev';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_replace_me';
const BATCH_SIZE = 100; // Process records in batches to manage memory
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay to avoid rate limits

// Source and target namespaces
const SOURCE_NAMESPACE = 'user_4sVTVPd6aJdRq';
const TARGET_NAMESPACES = [
  'user_63gocaz-j-AYRsb0094ik',
  'user_8aRtnBukPk0nY4VjKM-K5',
  'user_wcf5CfcUlHx1ZfJpvUvmg'
];

/**
 * Get Pinecone client (same pattern as upsert-methodologies.js)
 */
export const getPineconeClient = async () => {
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY
  });

  return {
    client: pc,
    index: pc.index(PINECONE_INDEX_NAME)
  };
};

/**
 * Sleep utility for rate limiting
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get all vector IDs from namespace using listPaginated (if available)
 */
async function getAllVectorIds(index, namespace) {
  console.info(`📋 Getting all vector IDs from namespace: ${namespace}`);

  let allIds = [];
  let paginationToken = undefined;
  let pageCount = 0;

  try {
    do {
      console.info(`   Fetching page ${pageCount + 1}...`);

      // List IDs from the specified namespace, with pagination
      const result = await index.namespace(namespace).listPaginated({
        paginationToken
      });

      // Add the fetched IDs to our list
      if (result.vectors && result.vectors.length > 0) {
        const pageIds = result.vectors.map(v => v.id);
        allIds = allIds.concat(pageIds);
        pageCount++;
        console.info(`     Page ${pageCount}: Found ${pageIds.length} IDs (Total: ${allIds.length})`);
      }

      // Check if there's another page of results
      paginationToken = result.pagination?.next;

      // Small delay between pages
      if (paginationToken) {
        await sleep(100);
      }

    } while (paginationToken);

    console.info(`✅ Found ${allIds.length} vector IDs across ${pageCount} pages`);
    return allIds;

  } catch (error) {
    console.error(`❌ Error listing vector IDs from namespace ${namespace}:`, error.message);
    throw error;
  }
}

/**
 * Fetch vectors by IDs in batches
 */
async function fetchVectorsByIds(index, namespace, vectorIds) {
  console.info(`📦 Fetching ${vectorIds.length} vectors from namespace: ${namespace}`);

  const allVectors = [];
  let successCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < vectorIds.length; i += BATCH_SIZE) {
    const batch = vectorIds.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vectorIds.length / BATCH_SIZE);

    try {
      console.info(`   Batch ${batchNumber}/${totalBatches}: Fetching ${batch.length} vectors...`);

      const fetchResult = await index.namespace(namespace).fetch(batch);

      if (fetchResult && fetchResult.records) {
        const vectors = Object.values(fetchResult.records);
        allVectors.push(...vectors);
        successCount += vectors.length;
        console.info(`   ✅ Batch ${batchNumber}: Retrieved ${vectors.length} vectors`);
      } else {
        console.info(`   ⚠️  Batch ${batchNumber}: No records found in fetchResult`);
      }

    } catch (error) {
      console.error(`   ❌ Batch ${batchNumber}: Error fetching vectors:`, error.message);
      errorCount += batch.length;
    }

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < vectorIds.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.info(`📊 Fetch Summary: ${successCount} success, ${errorCount} errors`);
  return allVectors;
}

/**
 * Upsert vectors to a target namespace using standard upsert API
 */
async function upsertVectorsToNamespace(index, targetNamespace, vectors) {
  console.info(`🔄 Upserting ${vectors.length} vectors to namespace: ${targetNamespace}`);

  let successCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);

    try {
      console.info(`   Batch ${batchNumber}/${totalBatches}: Upserting ${batch.length} vectors...`);

      // Vectors should already be in the correct format from fetch
      await index.namespace(targetNamespace).upsert(batch);

      successCount += batch.length;
      console.info(`   ✅ Batch ${batchNumber}: Successfully upserted ${batch.length} vectors`);

    } catch (error) {
      console.error(`   ❌ Batch ${batchNumber}: Error upserting vectors:`, error.message);
      errorCount += batch.length;
    }

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < vectors.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.info(`📊 Upsert Summary for ${targetNamespace}: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount };
}

/**
 * Main function to copy namespace
 */
async function copyNamespaceRecords() {
  try {
    console.info('🚀 Starting Pinecone namespace copy operation...');
    console.info(`📊 Configuration:`);
    console.info(`   Index: ${PINECONE_INDEX_NAME}`);
    console.info(`   Source: ${SOURCE_NAMESPACE}`);
    console.info(`   Targets: ${TARGET_NAMESPACES.join(', ')}`);
    console.info(`   Batch Size: ${BATCH_SIZE}`);
    console.info(`   API Key set: ${process.env.PINECONE_API_KEY ? 'Yes' : 'No (using fallback!)'}`);
    console.info('');

    // Get Pinecone client
    const { index } = await getPineconeClient();
    console.info('✅ Pinecone client initialized');

    // Step 1: Get all vector IDs from source namespace
    console.info('\n📋 STEP 1: Getting vector IDs from source namespace...');
    const vectorIds = await getAllVectorIds(index, SOURCE_NAMESPACE);

    if (vectorIds.length === 0) {
      console.info('⚠️  No vectors found in source namespace. Exiting.');
      return;
    }

    // Step 2: Fetch all vectors from source namespace
    console.info('\n📦 STEP 2: Fetching vectors from source namespace...');
    const vectors = await fetchVectorsByIds(index, SOURCE_NAMESPACE, vectorIds);

    if (vectors.length === 0) {
      console.error('❌ No vectors could be fetched. Exiting.');
      process.exit(1);
    }

    console.info(`✅ Successfully fetched ${vectors.length} vectors`);

    // Step 3: Upsert vectors to each target namespace
    console.info('\n🔄 STEP 3: Copying vectors to target namespaces...');

    const results = {};
    for (const targetNamespace of TARGET_NAMESPACES) {
      console.info(`\n📝 Processing target namespace: ${targetNamespace}`);
      const result = await upsertVectorsToNamespace(index, targetNamespace, vectors);
      results[targetNamespace] = result;
    }

    // Final summary
    console.info('\n🎉 COPY OPERATION COMPLETED!');
    console.info('\n📊 Final Summary:');
    console.info(`   Source namespace: ${SOURCE_NAMESPACE}`);
    console.info(`   Vector IDs found: ${vectorIds.length}`);
    console.info(`   Vectors fetched: ${vectors.length}`);
    console.info('');

    let totalSuccess = 0;
    let totalErrors = 0;

    TARGET_NAMESPACES.forEach(namespace => {
      const result = results[namespace];
      console.info(`   ${namespace}:`);
      console.info(`     ✅ Success: ${result.successCount}`);
      console.info(`     ❌ Errors: ${result.errorCount}`);
      totalSuccess += result.successCount;
      totalErrors += result.errorCount;
    });

    console.info('');
    console.info(`   🏆 Total operations: ${totalSuccess + totalErrors}`);
    console.info(`   ✅ Total successful: ${totalSuccess}`);
    console.info(`   ❌ Total errors: ${totalErrors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Handle script execution
 */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.info(`
Pinecone Namespace Copy Script

Usage: node scripts/copy-pinecone-namespace.js

Environment Variables:
  PINECONE_API_KEY    Pinecone API key (required)

Configuration (edit script to change):
  Source Namespace:   ${SOURCE_NAMESPACE}
  Target Namespaces:  ${TARGET_NAMESPACES.join(', ')}

Examples:
  PINECONE_API_KEY=your_key node scripts/copy-pinecone-namespace.js
`);
    process.exit(0);
  }

  // Run the copy operation
  copyNamespaceRecords()
    .then(() => {
      console.info('🎉 Namespace copy completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { copyNamespaceRecords, getAllVectorIds, fetchVectorsByIds, upsertVectorsToNamespace };
