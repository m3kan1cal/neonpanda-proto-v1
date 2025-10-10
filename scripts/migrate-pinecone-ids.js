#!/usr/bin/env node

/**
 * Migration script to update Pinecone record IDs and convert metadata to camelCase
 *
 * User Namespaces:
 * - Problem: Pinecone IDs were timestamp-based (e.g., user_memory_userId_timestamp)
 *   but should use metadata ID fields (memory_id, workout_id, summary_id) for stable upserting.
 * - Solution: Extract metadata ID field and use it as the Pinecone ID
 *
 * Methodology Namespace:
 * - Problem: Metadata uses snake_case (logged_at) instead of camelCase (loggedAt)
 * - Solution: Convert all metadata fields to camelCase while keeping the same Pinecone ID
 *
 * Migration Process:
 * 1. Fetch all records from namespace(s)
 * 2. Analyze which records need migration
 * 3. Convert snake_case metadata to camelCase
 * 4. Upsert records with correct IDs and metadata
 * 5. Delete old records (if ID changed)
 *
 * Usage:
 *   node scripts/migrate-pinecone-ids.js [namespace] [--all] [--dry-run]
 *
 * Examples:
 *   # Migrate all namespaces (auto-discovery)
 *   node scripts/migrate-pinecone-ids.js --all --dry-run
 *   node scripts/migrate-pinecone-ids.js --all
 *
 *   # Migrate specific namespace
 *   node scripts/migrate-pinecone-ids.js user_63gocaz-j-AYRsb0094ik --dry-run
 *   node scripts/migrate-pinecone-ids.js methodology
 */

import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_INDEX_NAME = 'coach-creator-proto-v1-dev';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_replace_me';

/**
 * Get Pinecone client and index
 */
async function getPineconeClient() {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  return {
    client: pc,
    index: pc.index(PINECONE_INDEX_NAME)
  };
}

/**
 * List all namespaces in the index
 */
async function listAllNamespaces(index) {
  console.log(`\n🔍 Discovering namespaces in index: ${PINECONE_INDEX_NAME}`);

  try {
    const stats = await index.describeIndexStats();

    if (!stats.namespaces || Object.keys(stats.namespaces).length === 0) {
      console.log('⚠️  No namespaces found in index');
      return [];
    }

    const namespaces = Object.keys(stats.namespaces);
    console.log(`✅ Found ${namespaces.length} namespace(s):\n`);

    namespaces.forEach((ns, i) => {
      const recordCount = stats.namespaces[ns].recordCount || 0;
      console.log(`   ${i + 1}. ${ns} (${recordCount} records)`);
    });

    return namespaces;
  } catch (error) {
    console.error(`❌ Error listing namespaces:`, error.message);
    throw error;
  }
}

/**
 * Fetch all records from a namespace using searchRecords API
 * (Same approach as inspect-pinecone-namespace.js)
 */
async function fetchAllRecords(index, namespace) {
  console.log(`\n📥 Fetching all records from namespace: ${namespace}`);

  try {
    // Use searchRecords API with a broad text query
    const searchQuery = {
      query: {
        inputs: { text: "training fitness workout goals progress memory context" },
        topK: 10000 // Fetch as many as possible
      }
    };

    const response = await index.namespace(namespace).searchRecords(searchQuery);

    if (!response.result || !response.result.hits) {
      console.log('⚠️  No results returned from Pinecone');
      return [];
    }

    const records = response.result.hits;
    console.log(`✅ Total records fetched: ${records.length}`);

    return records;
  } catch (error) {
    console.error(`   ❌ Error fetching records:`, error.message);
    throw error;
  }
}

/**
 * Determine the correct Pinecone ID for a record based on its metadata
 *
 * Handles both old (snake_case) and new (camelCase) field formats
 * Will also convert all metadata fields to camelCase for consistency
 */
function getCorrectRecordId(record) {
  const currentId = record._id;
  const metadata = record.fields || {};

  // Determine the correct ID based on metadata (handle both snake_case and camelCase)
  const memoryId = metadata.memoryId || metadata.memory_id;
  if (memoryId) {
    // Check if memoryId is missing userId (old pattern: user_memory_${timestamp}_${shortId})
    const hasMissingUserId = /^user_memory_\d+_[a-z0-9]+$/i.test(memoryId);

    // Check if metadata has any snake_case fields that need conversion
    const hasSnakeCaseFields = Object.keys(metadata).some(key => key.includes('_'));

    let newId = memoryId;
    let needsRegeneration = false;

    // If it's missing userId, regenerate it with userId
    if (hasMissingUserId) {
      const userId = metadata.userId || metadata.user_id;
      // Extract timestamp and shortId from current ID
      const match = memoryId.match(/^user_memory_(\d+)_([a-z0-9]+)$/i);
      if (match && userId) {
        const [, timestamp, shortId] = match;
        newId = `user_memory_${userId}_${timestamp}_${shortId}`;
        needsRegeneration = true;
      }
    }

    return {
      newId,
      type: 'user_memory',
      needsMigration: currentId !== newId || hasSnakeCaseFields,
      needsRegeneration,
      hasSnakeCaseFields
    };
  }

  const workoutId = metadata.workoutId || metadata.workout_id;
  if (workoutId) {
    // Check if workoutId uses old ws_ prefix or is missing shortId
    const hasOldPrefix = workoutId.startsWith('ws_');
    // Pattern without shortId: workout_summary_${userId}_${timestamp} (no third underscore segment)
    const hasMissingShortId = /^workout_summary_[^_]+_\d+$/.test(workoutId);

    // Check if metadata has any snake_case fields that need conversion
    const hasSnakeCaseFields = Object.keys(metadata).some(key => key.includes('_'));

    let newId = workoutId;
    let needsRegeneration = false;

    // If it uses ws_ prefix, convert to workout_summary_
    if (hasOldPrefix) {
      newId = workoutId.replace(/^ws_/, 'workout_summary_');
      needsRegeneration = true;

      // Check if the converted ID is also missing shortId
      if (/^workout_summary_[^_]+_\d+$/.test(newId)) {
        // Add shortId suffix
        const shortId = Math.random().toString(36).substring(2, 11);
        newId = `${newId}_${shortId}`;
      }
    } else if (hasMissingShortId) {
      // Add shortId suffix to existing workout_summary_ IDs
      const shortId = Math.random().toString(36).substring(2, 11);
      newId = `${workoutId}_${shortId}`;
      needsRegeneration = true;
    }

    return {
      newId,
      type: 'workout_summary',
      needsMigration: currentId !== newId || hasSnakeCaseFields,
      needsRegeneration,
      hasSnakeCaseFields
    };
  }

  // Check recordType first to distinguish between conversation and coach creator summaries
  const recordType = metadata.recordType || metadata.record_type;
  const summaryId = metadata.summaryId || metadata.summary_id;

  // Handle coach creator summaries (check this first since they also have summaryId)
  if (recordType === 'coach_creator_summary') {
    // Check if metadata has any snake_case fields that need conversion
    const hasSnakeCaseFields = Object.keys(metadata).some(key => key.includes('_'));

    // Use existing summaryId if available, otherwise generate new one
    let newId = summaryId;
    let needsRegeneration = false;

    if (!summaryId) {
      // Generate new summaryId if missing
      const userId = metadata.userId || metadata.user_id;
      const creationDate = metadata.creationDate || metadata.creation_date;
      let timestamp;

      if (creationDate) {
        timestamp = new Date(creationDate).getTime();
      } else {
        // Try to extract timestamp from current ID
        const timestampMatch = currentId.match(/_(\d{13})$/);
        timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
      }

      const shortId = Math.random().toString(36).substring(2, 11);
      newId = `coach_creator_summary_${userId}_${timestamp}_${shortId}`;
      needsRegeneration = true;
    }

    return {
      newId,
      type: 'coach_creator_summary',
      needsMigration: currentId !== newId || hasSnakeCaseFields,
      needsRegeneration,
      hasSnakeCaseFields
    };
  }

  // Handle conversation summaries (check after coach_creator_summary)
  if (summaryId) {
    // Check if summaryId is a UUID (8-4-4-4-12 hex format)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(summaryId);

    // Check if metadata has any snake_case fields that need conversion
    const hasSnakeCaseFields = Object.keys(metadata).some(key => key.includes('_'));

    let newId = summaryId;
    let needsRegeneration = false;

    // If it's a UUID, regenerate it with structured format
    if (isUUID) {
      const userId = metadata.userId || metadata.user_id;
      // Use createdAt timestamp if available, otherwise use a timestamp from the UUID
      const createdAt = metadata.createdAt || metadata.created_at;
      const timestamp = createdAt ? new Date(createdAt).getTime() : Date.now();
      const shortId = Math.random().toString(36).substring(2, 11);

      newId = `conversation_summary_${userId}_${timestamp}_${shortId}`;
      needsRegeneration = true;
    }

    return {
      newId,
      type: 'conversation_summary',
      needsMigration: currentId !== newId || hasSnakeCaseFields,
      needsRegeneration,
      hasSnakeCaseFields
    };
  }

  // Handle methodology records (different namespace, no ID field needed)
  // Methodology records use filename-based IDs (e.g., methodology_comptrain-strength-programming)
  if (currentId.startsWith('methodology_')) {
    // Check if metadata has any snake_case fields that need conversion
    const hasSnakeCaseFields = Object.keys(metadata).some(key => key.includes('_'));

    return {
      newId: currentId, // Keep the same ID (filename-based)
      type: 'methodology',
      needsMigration: hasSnakeCaseFields, // Only migrate if metadata needs camelCase conversion
      needsRegeneration: false,
      hasSnakeCaseFields
    };
  }

  // No metadata ID found - skip this record
  return {
    newId: null,
    type: 'unknown',
    needsMigration: false
  };
}

/**
 * Convert snake_case metadata fields to camelCase
 */
function convertMetadataToCamelCase(metadata) {
  const converted = {};

  // Field mapping: snake_case → camelCase
  const fieldMap = {
    // Common fields
    record_type: 'recordType',
    user_id: 'userId',
    logged_at: 'loggedAt',

    // Methodology fields
    query_type: 'queryType',

    // Memory fields
    memory_id: 'memoryId',
    memory_type: 'memoryType',
    coach_id: 'coachId',
    created_at: 'createdAt',
    usage_count: 'usageCount',
    is_global: 'isGlobal',
    last_used: 'lastUsed',

    // Workout fields
    workout_id: 'workoutId',
    workout_name: 'workoutName',
    workout_type: 'workoutType',
    perceived_exertion: 'perceivedExertion',
    workout_format: 'workoutFormat',
    rx_status: 'rxStatus',
    total_time: 'totalTime',
    rounds_completed: 'roundsCompleted',
    total_reps: 'totalReps',
    completed_at: 'completedAt',
    extraction_confidence: 'extractionConfidence',
    data_completeness: 'dataCompleteness',
    coach_name: 'coachName',
    conversation_id: 'conversationId',
    pr_achievements: 'prAchievements',
    has_pr: 'hasPr',

    // Summary fields (both conversation and coach creator)
    summary_id: 'summaryId',
    message_count: 'messageCount',
    trigger_reason: 'triggerReason',
    has_goals: 'hasGoals',
    has_progress: 'hasProgress',
    has_emotional_state: 'hasEmotionalState',
    has_insights: 'hasInsights',
    has_methodology_preferences: 'hasMethodologyPreferences',

    // Coach creator fields
    sophistication_level: 'sophisticationLevel',
    selected_personality: 'selectedPersonality',
    selected_methodology: 'selectedMethodology',
    safety_considerations: 'safetyConsiderations',
    creation_date: 'creationDate',
    session_id: 'sessionId',
    questions_completed: 'questionsCompleted',
    session_duration_minutes: 'sessionDurationMinutes',
    programming_focus: 'programmingFocus',
    experience_level: 'experienceLevel',
    training_frequency: 'trainingFrequency',
    methodology_reasoning: 'methodologyReasoning',
    programming_emphasis: 'programmingEmphasis',
    periodization_approach: 'periodizationApproach',
    personality_reasoning: 'personalityReasoning',
    personality_blending: 'personalityBlending',
    injury_considerations: 'injuryConsiderations',
    equipment_available: 'equipmentAvailable',
    goal_timeline: 'goalTimeline',
    preferred_intensity: 'preferredIntensity',
    user_satisfaction: 'userSatisfaction',

    // Methodology fields (for consistency)
    query_type: 'queryType'
  };

  // Convert each field
  for (const [key, value] of Object.entries(metadata)) {
    const camelKey = fieldMap[key] || key; // Use mapped name or keep original
    converted[camelKey] = value;
  }

  return converted;
}

/**
 * Migrate records in a namespace
 */
async function migrateNamespace(namespace, dryRun = false) {
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}\n`);

  try {
    const { index } = await getPineconeClient();

    // Fetch all records
    const records = await fetchAllRecords(index, namespace);

    if (records.length === 0) {
      console.log('⚠️  No records found in namespace');
      return { success: true, migrated: 0, skipped: 0, errors: 0 };
    }

    // Analyze what needs to be migrated
    console.log(`\n📊 Analyzing records...`);
    const analysis = {
      needsMigration: [],
      alreadyCorrect: [],
      noMetadataId: [],
      hasOldSummaryIdField: []
    };

    for (const record of records) {
      const idInfo = getCorrectRecordId(record);

      if (!idInfo.newId) {
        analysis.noMetadataId.push(record);
      } else if (idInfo.needsMigration) {
        analysis.needsMigration.push({ record, idInfo });
        if (idInfo.hasOldField) {
          analysis.hasOldSummaryIdField.push(record);
        }
      } else {
        analysis.alreadyCorrect.push(record);
      }
    }

    // Count UUID regenerations
    const uuidRegenerations = analysis.needsMigration.filter(({ idInfo }) => idInfo.needsRegeneration).length;

    console.log(`\n📈 Migration Analysis:`);
    console.log(`   ✅ Already correct: ${analysis.alreadyCorrect.length}`);
    console.log(`   🔄 Need migration: ${analysis.needsMigration.length}`);
    console.log(`   ⚠️  No metadata ID: ${analysis.noMetadataId.length}`);
    console.log(`   📝 Have old summaryId field: ${analysis.hasOldSummaryIdField.length}`);
    if (uuidRegenerations > 0) {
      console.log(`   🔄 UUID → structured format: ${uuidRegenerations}`);
    }

    // Show breakdown by type
    const byType = analysis.needsMigration.reduce((acc, { idInfo }) => {
      acc[idInfo.type] = (acc[idInfo.type] || 0) + 1;
      return acc;
    }, {});

    if (Object.keys(byType).length > 0) {
      console.log(`\n   Records to migrate by type:`);
      for (const [type, count] of Object.entries(byType)) {
        console.log(`      - ${type}: ${count}`);
      }
    }

    if (analysis.needsMigration.length === 0) {
      console.log(`\n🎉 All records are already using correct IDs!`);
      return { success: true, migrated: 0, skipped: records.length, errors: 0 };
    }

    if (dryRun) {
      console.log(`\n🔍 DRY RUN - Showing first 5 migrations that would occur:\n`);
      analysis.needsMigration.slice(0, 5).forEach(({ record, idInfo }, i) => {
        const metadata = record.fields || {};
        const regenerationLabel = idInfo.needsRegeneration
          ? idInfo.type === 'user_memory'
            ? ' (adding userId)'
            : idInfo.type === 'workout_summary'
            ? ' (adding shortId or ws_ → workout_summary_)'
            : idInfo.type === 'coach_creator_summary'
            ? ' (adding summaryId)'
            : ' (UUID → structured format)'
          : '';
        const caseLabel = idInfo.hasSnakeCaseFields ? ' + snake_case → camelCase' : '';
        console.log(`${i + 1}. ${idInfo.type}${regenerationLabel}${caseLabel}`);
        console.log(`   Old ID: ${record._id}`);
        console.log(`   New ID: ${idInfo.newId}`);
        if (idInfo.needsRegeneration) {
          const message = idInfo.type === 'user_memory'
            ? '   ⚠️  Missing userId will be added'
            : idInfo.type === 'workout_summary'
            ? '   ⚠️  Missing shortId will be added (or ws_ prefix converted)'
            : idInfo.type === 'coach_creator_summary'
            ? '   ⚠️  Missing summaryId field will be added'
            : '   ⚠️  UUID will be regenerated to structured format';
          console.log(message);
        }
        if (idInfo.hasSnakeCaseFields) {
          console.log('   🔄  Metadata will be converted to camelCase');
        }

        // Show only fields that will be migrated (snake_case fields)
        if (idInfo.hasSnakeCaseFields) {
          const snakeCaseFields = {};
          Object.keys(metadata).forEach(key => {
            if (key.includes('_')) {
              snakeCaseFields[key] = metadata[key];
            }
          });
          console.log(`   Fields to migrate: ${JSON.stringify(snakeCaseFields, null, 2)}`);
        }
        console.log();
      });

      if (analysis.needsMigration.length > 5) {
        console.log(`   ... and ${analysis.needsMigration.length - 5} more\n`);
      }

      console.log(`ℹ️  Run without --dry-run to perform the migration`);
      return { success: true, migrated: 0, skipped: records.length, errors: 0 };
    }

    // Perform migration
    console.log(`\n🚀 Starting migration...`);
    let migrated = 0;
    let errors = 0;
    const batchSize = 96; // Pinecone max batch size

    for (let i = 0; i < analysis.needsMigration.length; i += batchSize) {
      const batch = analysis.needsMigration.slice(i, i + batchSize);

      try {
        // Prepare records for upserting with new IDs
        // Use upsertRecords API which auto-embeds the text field
        const upsertRecords = batch.map(({ record, idInfo }) => {
          const fields = record.fields || {};

          // Convert snake_case fields to camelCase if needed
          let updatedFields = idInfo.hasSnakeCaseFields
            ? convertMetadataToCamelCase(fields)
            : { ...fields };

          // Update ID field based on type and regeneration status
          if (idInfo.needsRegeneration) {
            if (idInfo.type === 'conversation_summary') {
              updatedFields.summaryId = idInfo.newId;
            } else if (idInfo.type === 'user_memory') {
              updatedFields.memoryId = idInfo.newId;
            } else if (idInfo.type === 'workout_summary') {
              updatedFields.workoutId = idInfo.newId;
            } else if (idInfo.type === 'coach_creator_summary') {
              updatedFields.summaryId = idInfo.newId;
            }
          }

          // Ensure recordType is set (for all types)
          if (!updatedFields.recordType) {
            updatedFields.recordType = idInfo.type;
          }

          // Extract text field (required for auto-embedding)
          const text = updatedFields.text || '';

          return {
            id: idInfo.newId,
            text, // This will be auto-embedded by Pinecone
            ...updatedFields // All other metadata fields
          };
        });

        // Upsert with new IDs using upsertRecords API
        await index.namespace(namespace).upsertRecords(upsertRecords);

        // Delete old IDs (only if different from new IDs)
        const oldIds = batch
          .filter(({ record, idInfo }) => record._id !== idInfo.newId)
          .map(({ record }) => record._id);

        if (oldIds.length > 0) {
          await index.namespace(namespace).deleteMany(oldIds);
        }

        migrated += batch.length;
        console.log(`   ✅ Migrated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records (${migrated}/${analysis.needsMigration.length})`);
      } catch (error) {
        console.error(`   ❌ Error migrating batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      }
    }

    console.log(`\n✅ Namespace migration complete:`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Already correct: ${analysis.alreadyCorrect.length}`);
    console.log(`   Total: ${records.length}`);

    return {
      success: true,
      migrated,
      skipped: analysis.alreadyCorrect.length,
      errors
    };

  } catch (error) {
    console.error(`\n❌ Migration failed:`, error);
    return {
      success: false,
      migrated: 0,
      skipped: 0,
      errors: 1,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📋 Pinecone ID Migration Script

Usage:
  node scripts/migrate-pinecone-ids.js [namespace] [--all] [--dry-run]

Arguments:
  namespace   Optional. Specific namespace to migrate
              Examples: user_63gocaz-j-AYRsb0094ik, methodology
  --all       Migrate all namespaces in the index (auto-discovery)
  --dry-run   Run in dry-run mode (no changes will be made)

Examples:
  # Dry run for specific user namespace
  node scripts/migrate-pinecone-ids.js user_63gocaz-j-AYRsb0094ik --dry-run

  # Perform specific user namespace migration
  node scripts/migrate-pinecone-ids.js user_63gocaz-j-AYRsb0094ik

  # Migrate all namespaces (dry run)
  node scripts/migrate-pinecone-ids.js --all --dry-run

  # Migrate all namespaces (live)
  node scripts/migrate-pinecone-ids.js --all

  # Migrate methodology namespace only
  node scripts/migrate-pinecone-ids.js methodology

Environment:
  PINECONE_API_KEY   Your Pinecone API key (required)
  Index: ${PINECONE_INDEX_NAME}
`);
    process.exit(0);
  }

  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ Error: PINECONE_API_KEY environment variable is required');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const migrateAll = args.includes('--all');
  const namespace = args.find(arg => !arg.startsWith('--'));

  console.log(`\n🔍 Pinecone ID Migration`);
  console.log(`   Index: ${PINECONE_INDEX_NAME}`);
  console.log(`   API Key set: ${process.env.PINECONE_API_KEY ? 'Yes' : 'No'}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  try {
    const { index } = await getPineconeClient();
    let namespacesToMigrate = [];

    if (migrateAll) {
      console.log(`   Target: ALL NAMESPACES (auto-discovery)`);
      namespacesToMigrate = await listAllNamespaces(index);

      if (namespacesToMigrate.length === 0) {
        console.log('\n⚠️  No namespaces found. Nothing to migrate.');
        process.exit(0);
      }
    } else if (namespace) {
      console.log(`   Target: ${namespace}`);
      namespacesToMigrate = [namespace];
    } else {
      console.error('\n❌ Error: Either provide a namespace or use --all flag');
      console.log('   Run with --help for usage information');
      process.exit(1);
    }

    // Migrate each namespace
    const results = {
      total: namespacesToMigrate.length,
      successful: 0,
      failed: 0,
      totalMigrated: 0,
      totalErrors: 0
    };

    for (let i = 0; i < namespacesToMigrate.length; i++) {
      const ns = namespacesToMigrate[i];

      console.log(`\n${'═'.repeat(70)}`);
      console.log(`📦 Namespace ${i + 1}/${namespacesToMigrate.length}: ${ns}`);
      console.log(`${'═'.repeat(70)}`);

      try {
        const result = await migrateNamespace(ns, dryRun);

        if (result.success) {
          results.successful++;
          results.totalMigrated += result.migrated;
        } else {
          results.failed++;
          results.totalErrors += result.errors || 1;
        }
      } catch (error) {
        console.error(`\n❌ Failed to migrate namespace ${ns}:`, error.message);
        results.failed++;
        results.totalErrors++;
      }
    }

    // Print final summary
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 FINAL SUMMARY`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`   Namespaces processed: ${results.total}`);
    console.log(`   ✅ Successful: ${results.successful}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   Total records migrated: ${results.totalMigrated}`);
    console.log(`   Total errors: ${results.totalErrors}`);
    console.log(`${'═'.repeat(70)}\n`);

    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

