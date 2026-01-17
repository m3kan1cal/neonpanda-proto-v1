#!/usr/bin/env node

/**
 * Diagnose Orphaned Programs Script
 *
 * This script identifies programs that reference coaches that no longer exist.
 * It queries all programs and coaches for a user and compares them.
 *
 * Usage:
 *   node scripts/diagnose-orphaned-programs.js <userId> --table=<tableName>
 *   node scripts/diagnose-orphaned-programs.js 63gocaz-j-AYRsb0094ik --table=NeonPanda-ProtoApi-AllItems-V2
 *
 * Options:
 *   --table=NAME    DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
 *   --region=REGION AWS region (default: us-west-2)
 *   --verbose       Show detailed output
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
    verbose: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--table=")) {
      options.tableName = arg.split("=")[1];
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
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
        ":sk_prefix": "coachConfig#",
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
 * Main function
 */
async function main() {
  const options = parseArgs();

  // Validate required arguments
  if (!options.userId) {
    console.error("❌ Error: userId is required");
    console.error(
      "Usage: node scripts/diagnose-orphaned-programs.js <userId> --table=<tableName>",
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

  console.log("\n========================================");
  console.log("  ORPHANED PROGRAMS DIAGNOSTIC TOOL");
  console.log("========================================\n");

  console.log(`📋 Configuration:`);
  console.log(`   User ID:    ${options.userId}`);
  console.log(`   Table:      ${options.tableName}`);
  console.log(`   Region:     ${options.region}`);
  console.log("");

  // Initialize DynamoDB client
  const client = new DynamoDBClient({ region: options.region });
  const docClient = DynamoDBDocumentClient.from(client);

  try {
    // Step 1: Query all programs
    console.log("🔍 Step 1: Querying all programs for user...");
    const programs = await queryAllPrograms(
      docClient,
      options.tableName,
      options.userId,
    );
    console.log(`   Found ${programs.length} programs total\n`);

    // Step 2: Query all coaches
    console.log("🔍 Step 2: Querying all coaches for user...");
    const coaches = await queryAllCoaches(
      docClient,
      options.tableName,
      options.userId,
    );
    console.log(`   Found ${coaches.length} coaches total\n`);

    // Extract valid coach IDs
    const validCoachIds = new Set(
      coaches.map((c) => c.attributes?.coach_id || c.coach_id),
    );

    console.log("📊 Valid Coach IDs:");
    for (const coachId of validCoachIds) {
      const coach = coaches.find(
        (c) => (c.attributes?.coach_id || c.coach_id) === coachId,
      );
      const coachName =
        coach?.attributes?.coach_name || coach?.coach_name || "Unknown";
      console.log(`   - ${coachId} (${coachName})`);
    }
    console.log("");

    // Step 3: Analyze programs
    console.log("🔍 Step 3: Analyzing programs...\n");

    const orphanedPrograms = [];
    const validPrograms = [];
    const programsWithMissingCoachIds = [];
    const allReferencedCoachIds = new Set();

    for (const program of programs) {
      const attrs = program.attributes || program;
      const programId = attrs.programId;
      const programName = attrs.name || "Unnamed";
      const status = attrs.status || "unknown";
      const coachIds = attrs.coachIds || [];

      if (!coachIds || coachIds.length === 0) {
        programsWithMissingCoachIds.push({
          programId,
          name: programName,
          status,
          coachIds,
        });
        continue;
      }

      // Track all referenced coach IDs
      coachIds.forEach((id) => allReferencedCoachIds.add(id));

      // Check if any coachId is invalid
      const invalidCoachIds = coachIds.filter((id) => !validCoachIds.has(id));

      if (invalidCoachIds.length > 0) {
        orphanedPrograms.push({
          programId,
          name: programName,
          status,
          coachIds,
          invalidCoachIds,
        });
      } else {
        validPrograms.push({
          programId,
          name: programName,
          status,
          coachIds,
        });
      }
    }

    // Report findings
    console.log("========================================");
    console.log("  DIAGNOSTIC RESULTS");
    console.log("========================================\n");

    console.log(`📊 Summary:`);
    console.log(`   Total Programs:           ${programs.length}`);
    console.log(`   Valid Programs:           ${validPrograms.length}`);
    console.log(`   Orphaned Programs:        ${orphanedPrograms.length}`);
    console.log(
      `   Missing coachIds:         ${programsWithMissingCoachIds.length}`,
    );
    console.log(`   Total Valid Coaches:      ${validCoachIds.size}`);
    console.log(`   Total Referenced Coaches: ${allReferencedCoachIds.size}`);
    console.log("");

    // Find coach IDs referenced but not valid
    const orphanedCoachIds = [...allReferencedCoachIds].filter(
      (id) => !validCoachIds.has(id),
    );

    if (orphanedCoachIds.length > 0) {
      console.log("⚠️  Orphaned Coach IDs (referenced but don't exist):");
      for (const coachId of orphanedCoachIds) {
        const programsWithThisCoach = orphanedPrograms.filter((p) =>
          p.coachIds.includes(coachId),
        );
        console.log(
          `   - ${coachId} (referenced by ${programsWithThisCoach.length} program(s))`,
        );
      }
      console.log("");
    }

    if (orphanedPrograms.length > 0) {
      console.log("❌ Orphaned Programs (referencing invalid coaches):");
      for (const program of orphanedPrograms) {
        console.log(`   Program: ${program.name}`);
        console.log(`     ID:              ${program.programId}`);
        console.log(`     Status:          ${program.status}`);
        console.log(`     Coach IDs:       ${program.coachIds.join(", ")}`);
        console.log(
          `     Invalid Coaches: ${program.invalidCoachIds.join(", ")}`,
        );
        console.log("");
      }
    }

    if (programsWithMissingCoachIds.length > 0) {
      console.log("⚠️  Programs with Missing coachIds:");
      for (const program of programsWithMissingCoachIds) {
        console.log(
          `   - ${program.name} (${program.programId}) - Status: ${program.status}`,
        );
      }
      console.log("");
    }

    if (validPrograms.length > 0 && options.verbose) {
      console.log("✅ Valid Programs:");
      for (const program of validPrograms) {
        console.log(`   - ${program.name} (${program.programId})`);
        console.log(`     Status:    ${program.status}`);
        console.log(`     Coach IDs: ${program.coachIds.join(", ")}`);
      }
      console.log("");
    }

    // Recommendation
    console.log("========================================");
    console.log("  RECOMMENDATIONS");
    console.log("========================================\n");

    if (
      orphanedPrograms.length === 0 &&
      programsWithMissingCoachIds.length === 0
    ) {
      console.log(
        "✅ No issues found! All programs have valid coach associations.\n",
      );
    } else {
      if (orphanedPrograms.length > 0) {
        console.log("🔧 To fix orphaned programs, you have these options:");
        console.log(
          "   1. Delete the orphaned programs (if they're old/unused)",
        );
        console.log("   2. Update coachIds to reference a valid coach");
        console.log(
          "   3. Re-create the deleted coach to restore association\n",
        );
      }

      if (programsWithMissingCoachIds.length > 0) {
        console.log(
          "🔧 Programs with missing coachIds need to be updated with valid coach IDs.\n",
        );
      }

      console.log("Run the cleanup script to fix these issues:");
      console.log(
        `   node scripts/cleanup-orphaned-programs.js ${options.userId} --table=${options.tableName}\n`,
      );
    }

    // Return data for programmatic use
    return {
      totalPrograms: programs.length,
      validPrograms: validPrograms.length,
      orphanedPrograms: orphanedPrograms.length,
      programsWithMissingCoachIds: programsWithMissingCoachIds.length,
      orphanedCoachIds,
      details: {
        orphanedPrograms,
        programsWithMissingCoachIds,
        validPrograms,
      },
    };
  } catch (error) {
    console.error("❌ Error during diagnostic:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
